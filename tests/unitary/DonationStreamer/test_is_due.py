import boa


def _mint_and_approve(token, owner, spender, amount):
    token.mint(owner, amount)
    with boa.env.prank(owner):
        token.approve(spender, amount)


def test_is_due_tracks_schedule(donation_streamer, mock_pool, tokens, donor):
    token0, token1 = tokens
    amounts = [100, 200]
    _mint_and_approve(token0, donor, donation_streamer.address, amounts[0])
    _mint_and_approve(token1, donor, donation_streamer.address, amounts[1])

    period_length = 5
    with boa.env.prank(donor):
        donation_streamer.create_stream(
            mock_pool.address,
            [token0.address, token1.address],
            amounts,
            period_length,
            1,
        )

    assert donation_streamer.is_due(0) is True
    boa.env.time_travel(seconds=period_length)
    assert donation_streamer.is_due(0) is True


def test_internal_due_periods(donation_streamer, mock_pool, tokens, donor):
    token0, token1 = tokens
    amounts = [100, 200]
    _mint_and_approve(token0, donor, donation_streamer.address, amounts[0])
    _mint_and_approve(token1, donor, donation_streamer.address, amounts[1])

    period_length = 10
    n_periods = 3
    with boa.env.prank(donor):
        donation_streamer.create_stream(
            mock_pool.address,
            [token0.address, token1.address],
            amounts,
            period_length,
            n_periods,
        )

    due_ids = donation_streamer.streams_due()
    assert due_ids == [0]

    boa.env.time_travel(seconds=period_length * 2 + 5)
    due_ids = donation_streamer.streams_due()
    assert due_ids == [0]
