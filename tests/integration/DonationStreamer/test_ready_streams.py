import boa
import pytest


pytestmark = [pytest.mark.fork, pytest.mark.ignore_isolation]


def _fund_and_approve(token, owner, spender, amount):
    boa.deal(token, owner, amount, adjust_supply=False)
    with boa.env.prank(owner):
        token.approve(spender, amount)


def _due_periods(stream, now, zero_address):
    donor = stream[0]
    period_length = stream[3]
    periods_remaining = stream[6]
    next_ts = stream[4]

    if donor == zero_address:
        return 0
    if periods_remaining == 0 or period_length == 0:
        return 0
    if now < next_ts:
        return 0

    periods_due = (now - next_ts) // period_length + 1
    if periods_due > periods_remaining:
        periods_due = periods_remaining
    return periods_due


def test_ready_streams_are_due(donation_streamer, pool_contract, tokens, donor):
    token0, token1 = tokens
    period_length = 3600

    for i in range(3):
        amounts = [10**18 + i, 2 * 10**18 + i]
        _fund_and_approve(token0, donor, donation_streamer.address, amounts[0])
        _fund_and_approve(token1, donor, donation_streamer.address, amounts[1])
        with boa.env.prank(donor):
            donation_streamer.create_stream(
                pool_contract.address,
                amounts,
                period_length,
                1,
            )

    boa.env.time_travel(seconds=period_length)
    due_ids = donation_streamer.ready_streams()

    # Order rotates with the block; membership is what the keeper acts on.
    assert sorted(due_ids) == [0, 1, 2]


def test_ready_streams_matches_periods(donation_streamer, pool_contract, tokens, donor):
    token0, token1 = tokens
    period_length = 3600


    for i in range(3):
        amounts = [10**18 + i, 2 * 10**18 + i]
        _fund_and_approve(token0, donor, donation_streamer.address, amounts[0])
        _fund_and_approve(token1, donor, donation_streamer.address, amounts[1])
        with boa.env.prank(donor):
            donation_streamer.create_stream(
                pool_contract.address,
                amounts,
                period_length,
                3,
            )

    with boa.env.prank(donor):
        donation_streamer.cancel_stream(1)
    boa.env.time_travel(seconds=period_length * 2)

    ready_ids = list(donation_streamer.ready_streams())
    now = boa.env.timestamp
    zero_address = boa.eval("empty(address)")
    expected = [
        stream_id
        for stream_id in range(donation_streamer.stream_count())
        if _due_periods(donation_streamer.streams(stream_id), now, zero_address) > 0
    ]

    assert sorted(ready_ids) == expected == [0, 2]
    for stream_id in ready_ids:
        assert _due_periods(donation_streamer.streams(stream_id), now, zero_address) == 3
