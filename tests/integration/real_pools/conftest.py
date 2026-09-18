import json
import os
from pathlib import Path

import boa
import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
STREAMER_SOURCE = "contracts/DonationStreamer.vy"

POOLS = json.loads((REPO_ROOT / "tests" / "integration" / "pools.json").read_text())

ERC20_ABI = """
[
 {"name":"balanceOf","type":"function","inputs":[{"name":"a","type":"address"}],
  "outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
 {"name":"decimals","type":"function","inputs":[],
  "outputs":[{"name":"","type":"uint8"}],"stateMutability":"view"},
 {"name":"approve","type":"function",
  "inputs":[{"name":"s","type":"address"},{"name":"v","type":"uint256"}],
  "outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable"}
]
"""

POOL_ABI = """
[
 {"name":"coins","type":"function","inputs":[{"name":"i","type":"uint256"}],
  "outputs":[{"name":"","type":"address"}],"stateMutability":"view"}
]
"""


def _env(name):
    value = os.getenv(name)
    if value:
        return value
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return None
    for line in env_path.read_text(encoding="utf-8").splitlines():
        key, sep, raw = line.strip().partition("=")
        if sep and key.strip() == name:
            return raw.strip().strip('"').strip("'")
    return None


ANKR_NET = {"ethereum": "eth", "gnosis": "gnosis", "base": "base", "polygon": "polygon"}
INFURA_HOST = {
    "ethereum": "mainnet",
    "base": "base-mainnet",
    "polygon": "polygon-mainnet",
}


def _rpc_for(network):
    """Ankr first: the only one of the three that reliably serves a boa fork."""
    explicit = _env(f"RPC_URL_{network.upper()}")
    if explicit:
        return explicit
    if network == "ethereum" and _env("RPC_URL"):
        return _env("RPC_URL")

    ankr = _env("ANKR_API_KEY")
    if ankr and network in ANKR_NET:
        return f"https://rpc.ankr.com/{ANKR_NET[network]}/{ankr}"

    infura = _env("INFURA_API_KEY")
    if infura and network in INFURA_HOST:
        return f"https://{INFURA_HOST[network]}.infura.io/v3/{infura}"

    # Last resort: serves state, but times out partway through a fork.
    drpc = _env("DRPC_API_KEY")
    if drpc:
        return f"https://lb.drpc.org/ogrpc?network={network}&dkey={drpc}"
    return None


def _cases():
    cases = []
    for chain, cfg in POOLS.items():
        if chain.startswith("_"):
            continue
        for pool in cfg["pools"]:
            cases.append(
                pytest.param(
                    {**pool, "chain": chain, "network": cfg["network"],
                     "fork_block": cfg["fork_block"]},
                    id=f"{chain}-{pool['name']}",
                )
            )
    return cases


@pytest.fixture(params=_cases())
def real_pool(request):
    case = request.param
    if case["fork_block"] is None:
        pytest.skip(f"{case['chain']} has no pinned fork block")
    rpc = _rpc_for(case["network"])
    if not rpc:
        pytest.skip(
            f"no RPC for {case['network']}: set RPC_URL_{case['network'].upper()}, "
            "ANKR_API_KEY or DRPC_API_KEY"
        )

    # A fresh env per pool: boa.fork refuses a global env any earlier test has dirtied.
    with boa.swap_env(boa.Env()):
        boa.fork(url=rpc, block_identifier=case["fork_block"], allow_dirty=True)
        boa.env.enable_fast_mode()
        if not boa.env.get_code(case["address"]):
            pytest.skip(f"{case['name']} not deployed at block {case['fork_block']}")
        yield case


@pytest.fixture()
def pool(real_pool):
    return boa.loads_abi(POOL_ABI, name="CurvePool").at(real_pool["address"])


@pytest.fixture()
def coins(pool):
    erc20 = boa.loads_abi(ERC20_ABI, name="ERC20")
    return erc20.at(pool.coins(0)), erc20.at(pool.coins(1))


@pytest.fixture()
def actors(real_pool):
    donor = boa.env.generate_address()
    keeper = boa.env.generate_address()
    boa.env.set_balance(donor, 10**20)
    return donor, keeper


@pytest.fixture()
def streamer(actors):
    with boa.env.prank(actors[0]):
        return boa.load(str(REPO_ROOT / STREAMER_SOURCE))


@pytest.fixture()
def make_stream(streamer, pool, coins, actors):
    donor, _ = actors
    token0, token1 = coins
    units = [10 ** token0.decimals(), 10 ** token1.decimals()]

    def _make(n_periods=2, period_length=3600):
        amounts = [2 * units[0], 2 * units[1]]
        for token, amount in zip(coins, amounts):
            try:
                boa.deal(token, donor, amount, adjust_supply=False)
            except ValueError as exc:
                # Packed or computed balances: unfundable here, not broken.
                pytest.skip(f"cannot fund {token.address}: {exc}")
            with boa.env.prank(donor):
                token.approve(streamer.address, amount)

        with boa.env.prank(donor):
            return streamer.create_stream(
                pool.address,
                amounts,
                period_length,
                n_periods,
            )

    return _make
