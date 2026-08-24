import boa


def _mint_and_approve(token, owner, spender, amount):
    token.mint(owner, amount)
    with boa.env.prank(owner):
        token.approve(spender, amount)


def test_streams_due_orders_latest_first(donation_streamer, mock_pool, tokens, donor):
    token0, token1 = tokens
    period_length = 4

    for i in range(3):
        amounts = [100 + i, 200 + i]
        _mint_and_approve(token0, donor, donation_streamer.address, amounts[0])
        _mint_and_approve(token1, donor, donation_streamer.address, amounts[1])
        with boa.env.prank(donor):
            donation_streamer.create_stream(
                mock_pool.address,
                [token0.address, token1.address],
                amounts,
                period_length,
                1,
            )

    boa.env.time_travel(seconds=period_length)
    due_ids = donation_streamer.streams_due()
    assert due_ids == [2, 1, 0]


def test_streams_due_survives_the_final_period(
    donation_streamer, mock_pool, tokens, donor
):
    token0, token1 = tokens
    amounts = [100, 200]
    _mint_and_approve(token0, donor, donation_streamer.address, amounts[0])
    _mint_and_approve(token1, donor, donation_streamer.address, amounts[1])

    period_length = 4
    n_periods = 2

    with boa.env.prank(donor):
        donation_streamer.create_stream(
            mock_pool.address,
            [token0.address, token1.address],
            amounts,
            period_length,
            n_periods,
        )

    boa.env.time_travel(seconds=period_length * n_periods)
    due_ids = donation_streamer.streams_due()
    assert due_ids == [0]
