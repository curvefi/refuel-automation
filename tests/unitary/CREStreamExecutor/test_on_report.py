import sys
from pathlib import Path

import boa
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "scripts"))

from cre_common import build_report  # noqa: E402


def test_executes_a_due_stream_and_sweeps_the_reward(
    executor, donation_streamer, forwarder, metadata, funded_stream, treasury, mock_pool
):
    report = build_report([funded_stream["id"]])

    with boa.env.prank(forwarder):
        executor.onReport(metadata, report)

    assert mock_pool.last_provider() == donation_streamer.address
    assert mock_pool.last_donation() is True

    assert boa.env.get_balance(treasury) == funded_stream["reward_per_period"]
    assert boa.env.get_balance(executor.address) == 0
    assert boa.env.get_balance(forwarder) == 0

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
    executor, forwarder, metadata, funded_stream, treasury
):
    stream_id = funded_stream["id"]
    unknown_id = 999

    with boa.env.prank(forwarder):
        executor.onReport(metadata, build_report([unknown_id, stream_id]))

    assert executor.execution_count() == 1
    assert boa.env.get_balance(treasury) == funded_stream["reward_per_period"]


def test_rewards_park_when_no_treasury_is_set(
    deployer, executor, forwarder, metadata, funded_stream, treasury
):
    with boa.env.prank(deployer):
        executor.set_treasury(boa.eval("empty(address)"))

    with boa.env.prank(forwarder):
        executor.onReport(metadata, build_report([funded_stream["id"]]))

    reward = funded_stream["reward_per_period"]
    assert boa.env.get_balance(executor.address) == reward
    assert boa.env.get_balance(treasury) == 0

    with boa.env.prank(deployer):
        executor.set_treasury(treasury)
    executor.sweep()

    assert boa.env.get_balance(treasury) == reward
    assert boa.env.get_balance(executor.address) == 0


def test_sweep_is_a_no_op_when_there_is_nothing_to_sweep(executor, treasury):
    executor.sweep()

    assert boa.env.get_balance(treasury) == 0


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
