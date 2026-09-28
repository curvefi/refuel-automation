"""Vet a pool for donation support offchain, before it goes near a test.

The donation form of add_liquidity exists only on newer implementations, and which one a
factory pool runs is published by the Curve API - no need to infer it from bytecode.

    uv run python scripts/pool_registry.py base 0x1C53971800C111a32B7889177C56E3488cfe0BE0
    uv run python scripts/pool_registry.py --verify
"""

import json
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
REGISTRY = REPO_ROOT / "tests" / "integration" / "pools.json"

API = "https://api.curve.finance/api/getPools/{chain}/{endpoint}"

# Curve's own chain slugs differ from the names used here.
API_SLUG = {"ethereum": "ethereum", "gnosis": "xdai", "base": "base", "polygon": "polygon"}

ENDPOINTS = (
    "factory-twocrypto",
    "factory-stable-ng",
    "factory-crvusd",
    "factory-tricrypto",
    "main",
    "crypto",
)

# Blueprints exposing the donation form; same address on every chain. Extend only after
# confirming a donation lands, not from the name.
DONATION_IMPLEMENTATIONS = {
    "0x04fd6bec7d45efa99a27d29fb94b55c56dd07223": "twocrypto-optimized",
}


def _get(url):
    request = urllib.request.Request(url, headers={"User-Agent": "curl/8.5.0"})
    return json.loads(urllib.request.urlopen(request, timeout=30).read())


def fetch_pool(chain, address):
    """Pool metadata from the Curve API, or None if no endpoint lists it."""
    slug = API_SLUG.get(chain, chain)
    reachable = False
    for endpoint in ENDPOINTS:
        try:
            payload = _get(API.format(chain=slug, endpoint=endpoint))
            reachable = True
        except Exception as exc:
            # Otherwise an unreachable API reads exactly like a pool Curve does not list.
            print(f"warning: {endpoint} on {slug} failed: {exc}")
            continue
        if not payload.get("success"):
            continue
        for pool in payload["data"]["poolData"]:
            if pool["address"].lower() == address.lower():
                return {
                    "address": pool["address"],
                    "endpoint": endpoint,
                    "implementation": pool.get("implementation") or "",
                    "implementationAddress": pool.get("implementationAddress") or "",
                    "coins": [c["symbol"] for c in pool.get("coins", [])],
                    "usdTotal": float(pool.get("usdTotal") or 0),
                }
    if not reachable:
        raise RuntimeError(f"no Curve API endpoint answered for {slug}")
    return None


def supports_donation(implementation_address):
    return (implementation_address or "").lower() in DONATION_IMPLEMENTATIONS


def load_registry():
    return json.loads(REGISTRY.read_text(encoding="utf-8"))


def registry_pools(registry=None):
    """(chain, entry) for every pool in the registry."""
    registry = registry or load_registry()
    for chain, cfg in registry.items():
        if chain.startswith("_"):
            continue
        for entry in cfg["pools"]:
            yield chain, entry


def _describe(chain, address):
    meta = fetch_pool(chain, address)
    if meta is None:
        print(f"{address} not listed by the Curve API for {chain}")
        return 1
    ok = supports_donation(meta["implementationAddress"])
    print(f"  pool           {meta['address']} ({'/'.join(meta['coins'])})")
    print(f"  endpoint       {meta['endpoint']}")
    print(f"  implementation {meta['implementation'] or '(unnamed)'} {meta['implementationAddress']}")
    print(f"  tvl            ${meta['usdTotal']:,.0f}")
    print(f"  donation       {'YES' if ok else 'NO - DonationStreamer cannot use this pool'}")
    return 0 if ok else 1


def _verify():
    """Re-check the registry against the API; catches a pool being migrated."""
    failures = 0
    for chain, entry in registry_pools():
        meta = fetch_pool(chain, entry["address"])
        recorded = (entry.get("implementationAddress") or "").lower()
        if meta is None:
            print(f"FAIL {chain}/{entry['name']}: not listed by the Curve API")
            failures += 1
            continue
        live = meta["implementationAddress"].lower()
        if recorded and recorded != live:
            print(f"FAIL {chain}/{entry['name']}: recorded {recorded}, API now says {live}")
            failures += 1
        elif not supports_donation(live):
            print(f"FAIL {chain}/{entry['name']}: implementation {live} has no donation")
            failures += 1
        else:
            print(f"ok   {chain}/{entry['name']}: {meta['implementation'] or '(unnamed)'}")
    return 1 if failures else 0


def main(argv):
    if len(argv) == 1 and argv[0] == "--verify":
        return _verify()
    if len(argv) == 2:
        return _describe(argv[0], argv[1])
    print(__doc__)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
