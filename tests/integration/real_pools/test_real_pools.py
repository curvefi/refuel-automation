"""execute_many against real pools. MockPool accepts any add_liquidity and costs nothing,
so neither the donation signature nor the per-stream gas ceiling is proven until a real pool
is on the end."""

import re
import sys
from pathlib import Path

import boa
import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from pool_registry import DONATION_IMPLEMENTATIONS, supports_donation  # noqa: E402

pytestmark = [pytest.mark.fork, pytest.mark.ignore_isolation]

EXECUTE_GAS = int(
    re.search(
        r"^EXECUTE_GAS: constant\(uint256\) = ([\d_]+)$",
        (REPO_ROOT / "contracts" / "DonationStreamer.vy").read_text(),
        re.MULTILINE,
    )
    .group(1)
    .replace("_", "")
)

# A stream must leave room under the ceiling for cold storage and a pricier pool than this one.
HEADROOM = 0.5


def test_the_pool_runs_a_donation_capable_implementation(real_pool):
    """Decided by the blueprint, offchain: rejected by name, not by a revert mid-fork."""
    impl = real_pool.get("implementationAddress")
    assert impl, (
        f"{real_pool['name']} has no recorded implementation; run "
        f"scripts/pool_registry.py {real_pool['chain']} {real_pool['address']}"
    )
    assert supports_donation(impl), (
        f"{real_pool['name']} runs {impl}, which is not one of the donation-capable "
        f"implementations {sorted(DONATION_IMPLEMENTATIONS.values())}"
    )


def test_the_pool_accepts_a_donation_add_liquidity(streamer, make_stream, pool, coins, actors):
    stream_id = make_stream()
    token0, token1 = coins
    before = [token0.balanceOf(pool.address), token1.balanceOf(pool.address)]

    with boa.env.prank(actors[1]):
        assert list(streamer.execute_many([stream_id])) == [True]

    assert token0.balanceOf(pool.address) > before[0]
    assert token1.balanceOf(pool.address) > before[1]


def test_a_stream_runs_to_completion_against_the_real_pool(streamer, make_stream, actors):
    stream_id = make_stream(n_periods=2, period_length=3600)

    for _ in range(2):
        assert list(streamer.ready_streams()) == [stream_id]
        with boa.env.prank(actors[1]):
            assert list(streamer.execute_many([stream_id])) == [True]
        boa.env.time_travel(seconds=3700)

    assert streamer.active_count() == 0
    assert list(streamer.ready_streams()) == []


def _batch_gas(streamer, keeper, stream_ids):
    with boa.env.prank(keeper):
        assert all(streamer.execute_many(stream_ids))
    return streamer._computation.get_gas_used()


def test_a_real_donation_fits_well_under_the_per_stream_ceiling(streamer, make_stream, actors):
    """Measured from two WARM batches: the first on a fresh streamer pays cold costs no
    later one does, which would understate the marginal stream."""
    keeper = actors[1]
    _batch_gas(streamer, keeper, [make_stream(n_periods=1)])  # warm-up, discarded
    one = _batch_gas(streamer, keeper, [make_stream(n_periods=1)])
    many_ids = [make_stream(n_periods=1) for _ in range(4)]
    many = _batch_gas(streamer, keeper, many_ids)
    per_stream = (many - one) / (len(many_ids) - 1)
    print(f"\nmeasured: {one - per_stream:,.0f} fixed + {per_stream:,.0f}/stream")

    assert per_stream <= EXECUTE_GAS * HEADROOM, (
        f"a donation costs {per_stream:,.0f} gas against the {EXECUTE_GAS:,} per-stream "
        f"ceiling ({per_stream / EXECUTE_GAS:.0%}); raise EXECUTE_GAS before a pricier pool "
        "starts failing every run"
    )
