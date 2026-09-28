import boa


def _mint_and_approve(token, owner, spender, amount):
    token.mint(owner, amount)
    with boa.env.prank(owner):
        token.approve(spender, amount)


def _stream(donation_streamer, mock_pool, tokens, donor, n_periods=1, period_length=3600):
    token0, token1 = tokens
    amounts = [100, 200]
    _mint_and_approve(token0, donor, donation_streamer.address, amounts[0])
    _mint_and_approve(token1, donor, donation_streamer.address, amounts[1])
    with boa.env.prank(donor):
        return donation_streamer.create_stream(
            mock_pool.address,
            amounts,
            period_length,
            n_periods,
        )


def _active(donation_streamer):
    return [
        donation_streamer.active_stream_ids(i) for i in range(donation_streamer.active_count())
    ]


def test_ready_streams_lists_every_due_stream(donation_streamer, mock_pool, tokens, donor):
    for _ in range(3):
        _stream(donation_streamer, mock_pool, tokens, donor)

    boa.env.time_travel(seconds=3600)
    assert sorted(donation_streamer.ready_streams()) == [0, 1, 2]


def test_ready_streams_is_empty_with_nothing_active(donation_streamer):
    assert list(donation_streamer.ready_streams()) == []


def test_ready_streams_survives_the_final_period(donation_streamer, mock_pool, tokens, donor):
    _stream(donation_streamer, mock_pool, tokens, donor, n_periods=2)

    boa.env.time_travel(seconds=3600 * 2)
    assert donation_streamer.ready_streams() == [0]


def test_ready_streams_leaves_out_streams_that_are_not_due(
    donation_streamer, mock_pool, tokens, donor, caller
):
    executed = _stream(donation_streamer, mock_pool, tokens, donor, n_periods=2)
    waiting = _stream(donation_streamer, mock_pool, tokens, donor, n_periods=2)
    with boa.env.prank(caller):
        donation_streamer.execute(executed)

    assert donation_streamer.ready_streams() == [waiting]


def test_the_head_of_the_list_moves_with_the_block(
    donation_streamer, mock_pool, tokens, donor
):
    """So a stream that is due every run cannot keep the front of a batch to itself."""
    for _ in range(4):
        _stream(donation_streamer, mock_pool, tokens, donor, n_periods=100)

    heads = set()
    firsts = []
    for _ in range(4):
        boa.env.time_travel(blocks=1)
        ready = donation_streamer.ready_streams()
        assert sorted(ready) == [0, 1, 2, 3]
        heads.add(ready[0])
        firsts.append(ready[:2])

    assert len(heads) == 4
    # Every stream sits in the first two slots of some block, so a keeper taking two a run
    # reaches all four.
    assert sorted({id for pair in firsts for id in pair}) == [0, 1, 2, 3]


def test_a_finished_stream_leaves_the_active_set(
    donation_streamer, mock_pool, tokens, donor, caller
):
    for _ in range(3):
        _stream(donation_streamer, mock_pool, tokens, donor)

    with boa.env.prank(caller):
        donation_streamer.execute(0)

    assert donation_streamer.active_count() == 2
    assert _active(donation_streamer) == [2, 1]
    assert sorted(donation_streamer.ready_streams()) == [1, 2]


def test_a_cancelled_stream_leaves_the_active_set(donation_streamer, mock_pool, tokens, donor):
    for _ in range(3):
        _stream(donation_streamer, mock_pool, tokens, donor)

    with boa.env.prank(donor):
        donation_streamer.cancel_stream(2)
        donation_streamer.cancel_stream(0)

    assert _active(donation_streamer) == [1]
    assert donation_streamer.ready_streams() == [1]


def test_the_active_set_stays_consistent_through_mixed_removals(
    donation_streamer, mock_pool, tokens, donor, caller
):
    for _ in range(6):
        _stream(donation_streamer, mock_pool, tokens, donor, n_periods=2)

    with boa.env.prank(donor):
        donation_streamer.cancel_stream(1)
    boa.env.time_travel(seconds=3600 * 2)
    with boa.env.prank(caller):
        donation_streamer.execute_many([4, 0])
    with boa.env.prank(donor):
        donation_streamer.cancel_stream(5)
    _stream(donation_streamer, mock_pool, tokens, donor)

    active = _active(donation_streamer)
    assert sorted(active) == [2, 3, 6]
    assert sorted(donation_streamer.ready_streams()) == [2, 3, 6]


def test_a_full_batch_of_ready_streams_executes(
    donation_streamer, mock_pool, tokens, donor, caller
):
    """N_MAX_EXECUTE ids, the largest batch the contract accepts."""
    for _ in range(32):
        _stream(donation_streamer, mock_pool, tokens, donor)

    ready = list(donation_streamer.ready_streams())
    assert len(ready) == 32

    with boa.env.prank(caller):
        results = donation_streamer.execute_many(ready, gas=20_000_000)

    assert list(results) == [True] * 32
    assert donation_streamer.active_count() == 0
