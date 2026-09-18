import boa
import pytest


REVERTS = 0
BURNS_GAS = 1
HEALTHY = 2


def _mint_and_approve(token, owner, spender, amount):
    token.mint(owner, amount)
    with boa.env.prank(owner):
        token.approve(spender, amount)


def _stream(donation_streamer, mock_pool, tokens, donor, amounts, n_periods=2):
    for token, amount in zip(tokens, amounts):
        _mint_and_approve(token, donor, donation_streamer.address, amount)
    with boa.env.prank(donor):
        return donation_streamer.create_stream(
            mock_pool.address,
            amounts,
            3600,
            n_periods,
        )


@pytest.fixture()
def bad_pool(deployer, tokens, metaregistry):
    token0, token1 = tokens
    with boa.env.prank(deployer):
        pool = boa.load("tests/mocks/MockBadPool.vy", [token0.address, token1.address], HEALTHY)
    metaregistry.set_registered(pool.address, True)
    return pool


def test_execute_many_returns_a_result_per_id_in_input_order(
    donation_streamer, mock_pool, tokens, donor, caller
):
    due = _stream(donation_streamer, mock_pool, tokens, donor, [1_000, 2_000])
    stale = 999

    with boa.env.prank(caller):
        results = donation_streamer.execute_many([stale, due])

    assert list(results) == [False, True]


def test_execute_many_donates_every_due_stream(
    donation_streamer, mock_pool, tokens, donor, caller
):
    first = _stream(donation_streamer, mock_pool, tokens, donor, [1_000, 2_000])
    second = _stream(donation_streamer, mock_pool, tokens, donor, [3_000, 4_000])
    token0, token1 = tokens
    before = [token0.balanceOf(mock_pool.address), token1.balanceOf(mock_pool.address)]

    with boa.env.prank(caller):
        results = donation_streamer.execute_many([first, second])

    assert list(results) == [True, True]
    assert token0.balanceOf(mock_pool.address) == before[0] + 1_000 // 2 + 3_000 // 2
    assert token1.balanceOf(mock_pool.address) == before[1] + 2_000 // 2 + 4_000 // 2


def test_execute_many_donates_every_period_that_came_due(
    donation_streamer, mock_pool, tokens, donor, caller
):
    """The ordinary case at an 8-hourly cron: several periods, none of them the last."""
    stream_id = _stream(donation_streamer, mock_pool, tokens, donor, [24_000, 24_000], n_periods=24)
    token0, token1 = tokens

    boa.env.time_travel(seconds=3600 * 8)
    with boa.env.prank(caller):
        assert list(donation_streamer.execute_many([stream_id])) == [True]

    assert token0.balanceOf(mock_pool.address) == 9 * 1_000
    assert token1.balanceOf(mock_pool.address) == 9 * 1_000
    stream = donation_streamer.streams(stream_id)
    assert stream[6] == 24 - 9
    assert stream[5] == [24_000 - 9_000, 24_000 - 9_000]

    boa.env.time_travel(seconds=3600 * 8)
    with boa.env.prank(caller):
        donation_streamer.execute_many([stream_id])

    assert token0.balanceOf(mock_pool.address) == 17 * 1_000
    assert donation_streamer.streams(stream_id)[6] == 24 - 17


def test_execute_many_on_an_empty_batch_is_a_no_op(donation_streamer, caller):
    with boa.env.prank(caller):
        assert list(donation_streamer.execute_many([])) == []


def test_execute_many_does_not_double_execute_a_repeated_id(
    donation_streamer, mock_pool, tokens, donor, caller
):
    stream_id = _stream(donation_streamer, mock_pool, tokens, donor, [1_000, 2_000])

    with boa.env.prank(caller):
        results = donation_streamer.execute_many([stream_id, stream_id])

    assert list(results) == [True, False]
    assert donation_streamer.streams(stream_id)[6] == 1


@pytest.mark.parametrize("mode", [REVERTS, BURNS_GAS])
def test_a_failing_pool_does_not_sink_the_rest_of_the_batch(
    donation_streamer, mock_pool, bad_pool, tokens, donor, caller, mode
):
    healthy_before = _stream(donation_streamer, mock_pool, tokens, donor, [1_000, 2_000])
    broken = _stream(donation_streamer, bad_pool, tokens, donor, [1_000, 2_000])
    healthy_after = _stream(donation_streamer, mock_pool, tokens, donor, [3_000, 4_000])
    bad_pool.set_mode(mode)
    token0 = tokens[0]

    # A realistic transaction budget, not boa's ~100M default: without the EXECUTE_GAS cap
    # a burning pool takes 63/64 of whatever is left, and only a tight envelope shows it.
    with boa.env.prank(caller):
        results = donation_streamer.execute_many(
            [healthy_before, broken, healthy_after], gas=3_000_000
        )

    assert list(results) == [True, False, True]
    assert token0.balanceOf(mock_pool.address) == 1_000 // 2 + 3_000 // 2
    # The failed execution was unwound, so the stream still holds everything it was given.
    assert donation_streamer.streams(broken)[6] == 2
    assert token0.balanceOf(bad_pool.address) == 0


def test_a_failing_stream_is_retried_until_its_pool_recovers(
    donation_streamer, bad_pool, tokens, donor, caller
):
    """Nothing is recorded against a failure, so recovery needs no owner and no second call."""
    stream_id = _stream(donation_streamer, bad_pool, tokens, donor, [1_000, 2_000])
    bad_pool.set_mode(REVERTS)

    for _ in range(4):
        boa.env.time_travel(blocks=1)
        with boa.env.prank(caller):
            assert list(donation_streamer.execute_many([stream_id])) == [False]
        assert list(donation_streamer.ready_streams()) == [stream_id]

    bad_pool.set_mode(HEALTHY)
    with boa.env.prank(caller):
        assert list(donation_streamer.execute_many([stream_id])) == [True]


def test_a_failed_stream_logs_which_stream_failed(
    donation_streamer, bad_pool, tokens, donor, caller
):
    stream_id = _stream(donation_streamer, bad_pool, tokens, donor, [1_000, 2_000])
    bad_pool.set_mode(REVERTS)

    with boa.env.prank(caller):
        donation_streamer.execute_many([stream_id, stream_id])

    failed = [log for log in donation_streamer.get_logs() if type(log).__name__ == "StreamFailed"]
    assert [log.stream_id for log in failed] == [stream_id, stream_id]


def test_a_batch_short_of_gas_reverts_whole(
    donation_streamer, mock_pool, bad_pool, tokens, donor, caller
):
    """So eth_estimateGas sizes a batch by what all of its streams cost, not the first one."""
    broken = _stream(donation_streamer, bad_pool, tokens, donor, [1_000, 2_000])
    later = _stream(donation_streamer, mock_pool, tokens, donor, [1_000, 2_000])
    bad_pool.set_mode(BURNS_GAS)

    with boa.env.prank(caller), boa.reverts("gas too low for batch"):
        donation_streamer.execute_many([broken, later], gas=1_050_000)

    assert donation_streamer.streams(later)[6] == 2
