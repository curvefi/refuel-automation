import boa
import pytest


def _mint_and_approve(token, owner, spender, amount):
    token.mint(owner, amount)
    with boa.env.prank(owner):
        token.approve(spender, amount)


@pytest.mark.parametrize("amounts", ([1_000, 2_000], [0, 2_000], [1_000, 0]))
def test_create_stream_records_and_transfers(donation_streamer, mock_pool, tokens, donor, amounts):
    token0, token1 = tokens
    _mint_and_approve(token0, donor, donation_streamer.address, amounts[0])
    _mint_and_approve(token1, donor, donation_streamer.address, amounts[1])

    period_length = 10
    n_periods = 4
    now = boa.env.timestamp

    with boa.env.prank(donor):
        stream_id = donation_streamer.create_stream(
            mock_pool.address,
            [token0.address, token1.address],
            amounts,
            period_length,
            n_periods,
        )

    assert stream_id == 0
    assert donation_streamer.stream_count() == 1
    stream = donation_streamer.streams(stream_id)
    assert stream[0] == donor
    assert stream[1] == mock_pool.address
    assert stream[2][0] == token0.address
    assert stream[2][1] == token1.address
    assert stream[3][0] == amounts[0] // n_periods
    assert stream[3][1] == amounts[1] // n_periods
    assert stream[4] == period_length
    assert stream[5] == now
    assert stream[6][0] == amounts[0]
    assert stream[6][1] == amounts[1]
    assert stream[7] == n_periods

    assert token0.allowance(donation_streamer.address, mock_pool.address) == 0
    assert token1.allowance(donation_streamer.address, mock_pool.address) == 0

    assert token0.balanceOf(donation_streamer.address) == amounts[0]
    assert token1.balanceOf(donation_streamer.address) == amounts[1]


def test_create_stream_checks_pool_coins(donation_streamer, mock_pool, tokens, donor):
    token0, token1 = tokens
    amounts = [100, 200]

    with boa.env.prank(donor), boa.reverts():
        donation_streamer.create_stream(
            mock_pool.address,
            [token1.address, token0.address],
            amounts,
            10,
            1,
        )


def test_create_stream_rejects_a_pool_curve_does_not_know(
    donation_streamer, tokens, donor, deployer, metaregistry
):
    token0, token1 = tokens
    with boa.env.prank(deployer):
        rogue = boa.load("tests/mocks/MockPool.vy", [token0.address, token1.address])

    _mint_and_approve(token0, donor, donation_streamer.address, 1_000)
    with boa.env.prank(donor), boa.reverts("pool not registered"):
        donation_streamer.create_stream(
            rogue.address, [token0.address, token1.address], [1_000, 0], 10, 2
        )


def test_create_stream_rejects_amounts_that_truncate_to_nothing(
    donation_streamer, mock_pool, tokens, donor
):
    """Such a stream donates nothing for its whole life yet reports success every period."""
    token0, token1 = tokens
    _mint_and_approve(token0, donor, donation_streamer.address, 5)
    _mint_and_approve(token1, donor, donation_streamer.address, 5)

    with boa.env.prank(donor), boa.reverts("amounts below n_periods"):
        donation_streamer.create_stream(
            mock_pool.address, [token0.address, token1.address], [5, 5], 10, 1_000
        )


def test_create_stream_allows_one_coin_to_truncate_when_the_other_does_not(
    donation_streamer, mock_pool, tokens, donor
):
    token0, token1 = tokens
    _mint_and_approve(token0, donor, donation_streamer.address, 1_000)
    _mint_and_approve(token1, donor, donation_streamer.address, 5)

    with boa.env.prank(donor):
        stream_id = donation_streamer.create_stream(
            mock_pool.address, [token0.address, token1.address], [1_000, 5], 10, 10
        )

    assert donation_streamer.streams(stream_id)[3] == [100, 0]
