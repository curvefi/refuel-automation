import boa
import pytest


def _mint_and_approve(token, owner, spender, amount):
    token.mint(owner, amount)
    with boa.env.prank(owner):
        token.approve(spender, amount)


@pytest.mark.parametrize("amounts", ([1_000, 2_000], [0, 2_000], [1_000, 0]))
def test_execute_sends_tokens(
    donation_streamer, mock_pool, tokens, donor, caller, amounts
):
    token0, token1 = tokens
    _mint_and_approve(token0, donor, donation_streamer.address, amounts[0])
    _mint_and_approve(token1, donor, donation_streamer.address, amounts[1])

    period_length = 10
    n_periods = 2

    with boa.env.prank(donor):
        donation_streamer.create_stream(
            mock_pool.address,
            [token0.address, token1.address],
            amounts,
            period_length,
            n_periods,
        )

    with boa.env.prank(caller):
        executed = donation_streamer.execute(0)

    assert executed is True
    assert token0.balanceOf(mock_pool.address) == amounts[0] // n_periods
    assert token1.balanceOf(mock_pool.address) == amounts[1] // n_periods

    assert token0.allowance(donation_streamer.address, mock_pool.address) == 0
    assert token1.allowance(donation_streamer.address, mock_pool.address) == 0

    stream = donation_streamer.streams(0)
    assert stream[7] == n_periods - 1


def test_execute_sends_leftover_on_final_period(
    donation_streamer, mock_pool, tokens, donor, caller
):
    token0, token1 = tokens
    amounts = [5, 7]
    _mint_and_approve(token0, donor, donation_streamer.address, amounts[0])
    _mint_and_approve(token1, donor, donation_streamer.address, amounts[1])

    period_length = 10
    n_periods = 2

    with boa.env.prank(donor):
        donation_streamer.create_stream(
            mock_pool.address,
            [token0.address, token1.address],
            amounts,
            period_length,
            n_periods,
        )

    pool_balance0 = token0.balanceOf(mock_pool.address)
    pool_balance1 = token1.balanceOf(mock_pool.address)
    with boa.env.prank(caller):
        donation_streamer.execute(0)

    assert token0.balanceOf(mock_pool.address) == pool_balance0 + amounts[0] // n_periods
    assert token1.balanceOf(mock_pool.address) == pool_balance1 + amounts[1] // n_periods

    boa.env.time_travel(seconds=period_length)
    with boa.env.prank(caller):
        donation_streamer.execute(0)

    assert token0.balanceOf(mock_pool.address) == pool_balance0 + amounts[0]
    assert token1.balanceOf(mock_pool.address) == pool_balance1 + amounts[1]
    assert token0.allowance(donation_streamer.address, mock_pool.address) == 0
    assert token1.allowance(donation_streamer.address, mock_pool.address) == 0


def test_execute_prevents_pool_drain(donation_streamer, mock_pool, tokens, donor, caller):
    token0, token1 = tokens
    amounts = [1_000, 2_000]
    _mint_and_approve(token0, donor, donation_streamer.address, amounts[0])
    _mint_and_approve(token1, donor, donation_streamer.address, amounts[1])

    period_length = 10
    n_periods = 2

    with boa.env.prank(donor):
        donation_streamer.create_stream(
            mock_pool.address,
            [token0.address, token1.address],
            amounts,
            period_length,
            n_periods,
        )

    assert token0.allowance(donation_streamer.address, mock_pool.address) == 0
    assert token1.allowance(donation_streamer.address, mock_pool.address) == 0

    with boa.env.prank(mock_pool.address), boa.reverts():
        token0.transferFrom(donation_streamer.address, mock_pool.address, amounts[0])
    with boa.env.prank(mock_pool.address), boa.reverts():
        token1.transferFrom(donation_streamer.address, mock_pool.address, amounts[1])

    with boa.env.prank(caller):
        assert donation_streamer.execute(0) is True
