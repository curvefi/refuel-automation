"""The CRE path against real pools: the donation signature, a full round trip, and gas.

Unit tests run against MockPool, which accepts any add_liquidity and costs nothing.
Neither the four-argument donation signature nor the reward's 2300 gas stipend is
proven until a real pool is on the other end.
"""

import json
import sys
from pathlib import Path

import boa
import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from cre_common import build_report  # noqa: E402
from pool_registry import DONATION_IMPLEMENTATIONS, supports_donation  # noqa: E402

pytestmark = [pytest.mark.fork, pytest.mark.ignore_isolation]

CONFIG = REPO_ROOT / "workflow" / "config.production.json"

# A measured batch must leave room for cold storage and a pricier pool than this one.
HEADROOM = 0.7

def test_the_pool_runs_a_donation_capable_implementation(real_pool):
    """Whether a donation is even possible is decided by the blueprint, offchain.

    Recorded in pools.json from the Curve API by scripts/pool_registry.py, so a pool
    that cannot receive donations is rejected by name here rather than by an
    undecodable revert once the fork is already running.
    """
    impl = real_pool.get("implementationAddress")
    assert impl, (
        f"{real_pool['name']} has no recorded implementation; run "
        f"scripts/pool_registry.py {real_pool['chain']} {real_pool['address']}"
    )
    assert supports_donation(impl), (
        f"{real_pool['name']} runs {impl}, which is not one of the donation-capable "
        f"implementations {sorted(DONATION_IMPLEMENTATIONS.values())}"
    )


def test_the_pool_accepts_a_donation_add_liquidity(executor, metadata, make_stream, pool, coins):
    stream_id = make_stream()
    token0, token1 = coins
    before = [token0.balanceOf(pool.address), token1.balanceOf(pool.address)]

    with boa.env.prank(executor.forwarder_address()):
        executor.onReport(metadata, build_report([stream_id]))

    assert token0.balanceOf(pool.address) > before[0]
    assert token1.balanceOf(pool.address) > before[1]


def test_on_report_donates_and_sweeps_the_reward(executor, metadata, make_stream, actors):
    _, _, forwarder, treasury = actors
    reward_per_period = 10**14
    stream_id = make_stream(reward_per_period=reward_per_period)

    with boa.env.prank(forwarder):
        executor.onReport(metadata, build_report([stream_id]))

    # The 2300 gas stipend has to reach the payable fallback, or this is zero.
    assert boa.env.get_balance(treasury) == reward_per_period
    assert boa.env.get_balance(executor.address) == 0
    assert boa.env.get_balance(forwarder) == 0
    assert executor.execution_count() == 1


def test_a_stream_runs_to_completion_against_the_real_pool(executor, metadata, make_stream, actors):
    _, _, forwarder, treasury = actors
    stream_id = make_stream(n_periods=2, period_length=120)

    for _ in range(2):
        with boa.env.prank(forwarder):
            executor.onReport(metadata, build_report([stream_id]))
        boa.env.time_travel(seconds=200)

    assert executor.execution_count() == 2
    # Storage is cleared on the final period, so the stream stops being due.
    with boa.env.prank(forwarder), boa.reverts("every execution failed"):
        executor.onReport(metadata, build_report([stream_id]))
    assert boa.env.get_balance(treasury) > 0


def _report_gas(executor, metadata, stream_ids):
    with boa.env.prank(executor.forwarder_address()):
        executor.onReport(metadata, build_report(stream_ids))
    return executor._computation.get_gas_used()


def _cost_model(executor, metadata, make_stream):
    """(fixed, per_stream) measured from a one-stream and a four-stream report."""
    one = _report_gas(executor, metadata, [make_stream(n_periods=1)])
    boa.env.time_travel(seconds=200)
    many_ids = [make_stream(n_periods=1) for _ in range(4)]
    many = _report_gas(executor, metadata, many_ids)
    per_stream = (many - one) / (len(many_ids) - 1)
    fixed = one - per_stream
    print(
        f"\nmeasured: {fixed:,.0f} fixed + {per_stream:,.0f}/stream "
        f"(1 stream {one:,}, {len(many_ids)} streams {many:,})"
    )
    return fixed, per_stream


def test_a_full_batch_fits_the_configured_gas_limit(executor, metadata, make_stream, real_pool):
    """maxBatch x per-stream must fit onReportGasLimit, or a busy tick reverts wholesale."""
    cfg = json.loads(CONFIG.read_text())
    entry = next(
        (c for c in cfg["chains"] if real_pool["chain"] in c["chainSelectorName"]),
        None,
    )
    max_batch = (entry or {}).get("maxBatch", cfg["maxBatch"])
    limit = int((entry or {}).get("onReportGasLimit", cfg["onReportGasLimit"]), 0)

    fixed, per_stream = _cost_model(executor, metadata, make_stream)
    projected = fixed + max_batch * per_stream

    assert projected <= limit * HEADROOM, (
        f"a full batch of {max_batch} projects to {projected:,.0f} gas against a "
        f"{limit:,} limit ({projected / limit:.0%}). Lower maxBatch or raise "
        f"onReportGasLimit - measured {fixed:,.0f} fixed + {per_stream:,.0f}/stream."
    )


def test_every_configured_chain_declares_a_gas_limit_it_can_meet(executor, metadata, make_stream):
    """A per-chain override must still clear the fixed cost plus one stream."""
    cfg = json.loads(CONFIG.read_text())
    fixed, per_stream = _cost_model(executor, metadata, make_stream)
    floor = fixed + per_stream

    for entry in cfg["chains"]:
        limit = int(entry.get("onReportGasLimit", cfg["onReportGasLimit"]), 0)
        assert limit > floor, (
            f"{entry['chainSelectorName']}: onReportGasLimit {limit:,} is under the "
            f"{floor:,.0f} a single execution costs"
        )
