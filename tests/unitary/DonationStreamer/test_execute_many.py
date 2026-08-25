import boa


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
            [tokens[0].address, tokens[1].address],
            amounts,
            10,
            n_periods,
        )


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
    assert donation_streamer.streams(stream_id)[7] == 1
