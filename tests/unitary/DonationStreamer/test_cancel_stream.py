import boa
import pytest


def _mint_and_approve(token, owner, spender, amount):
    token.mint(owner, amount)
    with boa.env.prank(owner):
        token.approve(spender, amount)


@pytest.mark.parametrize("amounts", ([1_000, 2_000], [0, 2_000], [1_000, 0]))
def test_cancel_stream_refunds_tokens(donation_streamer, mock_pool, tokens, donor, amounts):
    token0, token1 = tokens
    _mint_and_approve(token0, donor, donation_streamer.address, amounts[0])
    _mint_and_approve(token1, donor, donation_streamer.address, amounts[1])

    period_length = 3600
    n_periods = 3

    with boa.env.prank(donor):
        donation_streamer.create_stream(
            mock_pool.address,
            amounts,
            period_length,
            n_periods,
        )
    with boa.env.prank(donor):
        donation_streamer.cancel_stream(0)

    assert token0.balanceOf(donor) == amounts[0]
    assert token1.balanceOf(donor) == amounts[1]
    assert token0.allowance(donation_streamer.address, mock_pool.address) == 0
    assert token1.allowance(donation_streamer.address, mock_pool.address) == 0

    stream = donation_streamer.streams(0)
    assert stream[0] == boa.eval("empty(address)")


def test_cancel_stream_requires_donor(donation_streamer, mock_pool, tokens, donor, caller):
    token0, token1 = tokens
    amounts = [1_000, 2_000]
    _mint_and_approve(token0, donor, donation_streamer.address, amounts[0])
    _mint_and_approve(token1, donor, donation_streamer.address, amounts[1])
    with boa.env.prank(donor):
        donation_streamer.create_stream(
            mock_pool.address,
            amounts,
            3600,
            1,
        )

    with boa.env.prank(caller), boa.reverts():
        donation_streamer.cancel_stream(0)


def test_cancel_stream_removes_a_failing_stream_from_the_active_set(
    donation_streamer, tokens, donor, caller, deployer, metaregistry
):
    token0, token1 = tokens
    amounts = [1_000, 2_000]
    with boa.env.prank(deployer):
        pool = boa.load("tests/mocks/MockBadPool.vy", [token0.address, token1.address], 0)
    metaregistry.set_registered(pool.address, True)
    _mint_and_approve(token0, donor, donation_streamer.address, amounts[0])
    _mint_and_approve(token1, donor, donation_streamer.address, amounts[1])
    with boa.env.prank(donor):
        stream_id = donation_streamer.create_stream(
pool.address, amounts, 3600, 2
        )

    with boa.env.prank(caller):
        assert list(donation_streamer.execute_many([stream_id])) == [False]
    assert list(donation_streamer.ready_streams()) == [stream_id]

    with boa.env.prank(donor):
        donation_streamer.cancel_stream(stream_id)

    assert donation_streamer.active_count() == 0
    assert list(donation_streamer.ready_streams()) == []
    assert token0.balanceOf(donor) == amounts[0]
