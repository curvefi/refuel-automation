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
