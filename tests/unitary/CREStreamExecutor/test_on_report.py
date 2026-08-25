import sys
from pathlib import Path

import boa
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "scripts"))

from cre_common import build_report  # noqa: E402


def test_executes_a_due_stream(
    executor, donation_streamer, forwarder, metadata, funded_stream, mock_pool
):
    report = build_report([funded_stream["id"]])

    with boa.env.prank(forwarder):
        executor.onReport(metadata, report)

    assert mock_pool.last_provider() == donation_streamer.address
    assert mock_pool.last_donation() is True

    assert executor.execution_count() == 1


def test_an_empty_report_is_a_no_op(executor, forwarder, metadata):
    with boa.env.prank(forwarder):
        executor.onReport(metadata, build_report([]))

    assert executor.execution_count() == 0


def test_a_batch_where_nothing_landed_reverts(executor, forwarder, metadata, funded_stream):
    stream_id = funded_stream["id"]
    report = build_report([stream_id])

    with boa.env.prank(forwarder):
        executor.onReport(metadata, report)
    boa.env.time_travel(seconds=100)
    with boa.env.prank(forwarder):
        executor.onReport(metadata, report)

    with boa.env.prank(forwarder), boa.reverts("every execution failed"):
        executor.onReport(metadata, report)


def test_a_stale_id_alongside_a_due_one_is_tolerated(
    executor, forwarder, metadata, funded_stream
):
    stream_id = funded_stream["id"]
    unknown_id = 999

    with boa.env.prank(forwarder):
        executor.onReport(metadata, build_report([unknown_id, stream_id]))

    assert executor.execution_count() == 1


@pytest.mark.parametrize("n_periods", (1, 2))
def test_execution_count_tracks_only_what_landed(
    executor, forwarder, metadata, funded_stream, n_periods
):
    stream_id = funded_stream["id"]

    for _ in range(n_periods):
        with boa.env.prank(forwarder):
            executor.onReport(metadata, build_report([stream_id]))
        boa.env.time_travel(seconds=100)

    assert executor.execution_count() == n_periods


def test_streamer_is_immutable_and_points_at_the_streamer(executor, donation_streamer):
    assert executor.STREAMER() == donation_streamer.address


def _bad_pool(deployer, tokens, metaregistry, mode):
    token0, token1 = tokens
    with boa.env.prank(deployer):
        pool = boa.load("tests/mocks/MockBadPool.vy", [token0.address, token1.address], mode)
    metaregistry.set_registered(pool.address, True)
    return pool


def _stream_into(donation_streamer, pool, tokens, donor, amounts, n_periods=1):
    for token, amount in zip(tokens, amounts):
        token.mint(donor, amount)
        with boa.env.prank(donor):
            token.approve(donation_streamer.address, amount)
    with boa.env.prank(donor):
        return donation_streamer.create_stream(
            pool.address,
            [tokens[0].address, tokens[1].address],
            amounts,
            10,
            n_periods,
        )


@pytest.mark.parametrize("mode", (0, 1))
def test_a_reverting_pool_does_not_take_the_rest_of_the_batch(
    executor, donation_streamer, forwarder, metadata, funded_stream, deployer, tokens,
    donor, metaregistry, mode
):
    bad = _bad_pool(deployer, tokens, metaregistry, mode)
    bad_id = _stream_into(donation_streamer, bad, tokens, donor, [1_000, 1_000])
    good_id = funded_stream["id"]

    with boa.env.prank(forwarder):
        executor.onReport(metadata, build_report([bad_id, good_id]))

    assert executor.execution_count() == 1
    assert donation_streamer.is_due(bad_id) is True


def test_a_batch_of_only_bad_streams_records_strikes_instead_of_reverting(
    executor, donation_streamer, forwarder, metadata, deployer, tokens, donor, metaregistry
):
    """Reverting here would roll back the strikes that retire a bad stream."""
    bad = _bad_pool(deployer, tokens, metaregistry, 0)
    bad_id = _stream_into(donation_streamer, bad, tokens, donor, [1_000, 1_000])

    with boa.env.prank(forwarder):
        executor.onReport(metadata, build_report([bad_id]))

    assert executor.strikes(bad_id) == 1
    assert executor.execution_count() == 0


def test_a_batch_of_only_stale_ids_still_reverts(executor, forwarder, metadata):
    """Nothing failed and nothing landed: an exhausted keeper looks like this."""
    with boa.env.prank(forwarder), boa.reverts("every execution failed"):
        executor.onReport(metadata, build_report([404, 405]))


def test_a_stream_is_set_aside_after_three_failures(
    executor, donation_streamer, forwarder, metadata, deployer, tokens, donor, mock_pool,
    metaregistry
):
    good_id = _stream_into(
        donation_streamer, mock_pool, tokens, donor, [4_000, 4_000], n_periods=8
    )
    bad = _bad_pool(deployer, tokens, metaregistry, 0)
    bad_id = _stream_into(donation_streamer, bad, tokens, donor, [1_000, 1_000])

    for expected in (1, 2, 3):
        with boa.env.prank(forwarder):
            executor.onReport(metadata, build_report([bad_id, good_id]))
        assert executor.strikes(bad_id) == expected
        boa.env.time_travel(seconds=10)

    # Set aside: still due on the streamer, no longer offered to the workflow.
    assert donation_streamer.is_due(bad_id) is True
    due_ids = executor.executable_due()
    assert bad_id not in due_ids


def test_executable_due_still_offers_a_healthy_stream(executor, funded_stream):
    assert funded_stream["id"] in executor.executable_due()


def test_a_set_aside_stream_is_skipped_even_if_a_report_names_it(
    executor, donation_streamer, forwarder, metadata, deployer, tokens, donor, mock_pool,
    metaregistry
):
    good_id = _stream_into(
        donation_streamer, mock_pool, tokens, donor, [4_000, 4_000], n_periods=8
    )
    bad = _bad_pool(deployer, tokens, metaregistry, 0)
    bad_id = _stream_into(donation_streamer, bad, tokens, donor, [1_000, 1_000])

    for _ in range(3):
        with boa.env.prank(forwarder):
            executor.onReport(metadata, build_report([bad_id, good_id]))
        boa.env.time_travel(seconds=10)

    # A fourth attempt adds no strike: it is skipped before the call is made.
    with boa.env.prank(forwarder):
        executor.onReport(metadata, build_report([bad_id, good_id]))
    assert executor.strikes(bad_id) == 3


def test_a_success_clears_a_partial_strike_count(
    executor, donation_streamer, forwarder, metadata, deployer, tokens, donor, metaregistry
):
    """A pool broken then fixed must not stay one failure from the bin."""
    pool = _bad_pool(deployer, tokens, metaregistry, 0)
    stream_id = _stream_into(
        donation_streamer, pool, tokens, donor, [4_000, 4_000], n_periods=8
    )

    for expected in (1, 2):
        with boa.env.prank(forwarder):
            executor.onReport(metadata, build_report([stream_id]))
        assert executor.strikes(stream_id) == expected
        boa.env.time_travel(seconds=10)

    pool.set_mode(2)
    with boa.env.prank(forwarder):
        executor.onReport(metadata, build_report([stream_id]))

    assert executor.strikes(stream_id) == 0

    # Offered again once the next period comes round, rather than set aside.
    boa.env.time_travel(seconds=10)
    due_ids = executor.executable_due()
    assert stream_id in due_ids


def test_only_the_owner_can_reset_strikes(executor, caller, deployer):
    with boa.env.prank(caller), boa.reverts():
        executor.reset_strikes([1])

    with boa.env.prank(deployer):
        executor.reset_strikes([1])


def test_a_batch_too_heavy_for_the_gas_limit_truncates_instead_of_reverting(
    executor, donation_streamer, forwarder, metadata, deployer, tokens, donor, metaregistry
):
    """Reverting would discard the strikes recorded so far, so the offenders never retire."""
    burner = _bad_pool(deployer, tokens, metaregistry, 1)
    ids = [
        _stream_into(donation_streamer, burner, tokens, donor, [1_000, 1_000])
        for _ in range(16)
    ]

    with boa.env.prank(forwarder):
        executor.onReport(metadata, build_report(ids), gas=3_000_000)

    struck = sum(1 for i in ids if executor.strikes(i) > 0)
    assert 0 < struck < len(ids), f"expected a truncated batch, got {struck}/{len(ids)}"


def test_a_batch_that_fits_is_not_truncated(
    executor, donation_streamer, forwarder, metadata, deployer, tokens, donor, metaregistry
):
    burner = _bad_pool(deployer, tokens, metaregistry, 1)
    ids = [
        _stream_into(donation_streamer, burner, tokens, donor, [1_000, 1_000])
        for _ in range(4)
    ]

    with boa.env.prank(forwarder):
        executor.onReport(metadata, build_report(ids), gas=10_000_000)

    assert all(executor.strikes(i) == 1 for i in ids)
