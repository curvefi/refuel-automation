"""The initcode suffix and the verification calldata must be the same bytes.
A mismatch only surfaces as a failed verification, after the deploy is paid for.
"""

import importlib
import sys
from pathlib import Path

import boa
import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

deploy_create3 = importlib.import_module("deploy_create3")

STREAMER = "0x2b786BB995978CC2242C567Ae62fd617b0eBC828"
TREASURY = "0x000000000000000000000000000000000000dEaD"
ZERO = "0x" + "00" * 20


@pytest.fixture()
def cre_executor_selected(monkeypatch):
    monkeypatch.setattr(deploy_create3, "CONTRACT_NAME", "CREStreamExecutor")
    monkeypatch.setattr(
        deploy_create3, "CONTRACT_PATH", "contracts/evm/src/CREStreamExecutor.vy"
    )
    monkeypatch.setattr(deploy_create3, "CTOR_SCHEMA", "(address,address,address)")
    monkeypatch.setenv("DONATION_STREAMER_ADDRESS", STREAMER)
    monkeypatch.setenv("TREASURY_ADDRESS", TREASURY)


def test_donation_streamer_still_encodes_nothing():
    assert deploy_create3.ctor_calldata() == b""


def test_ctor_calldata_round_trips_through_a_real_deploy(cre_executor_selected):
    encoded = deploy_create3.ctor_calldata()
    assert len(encoded) == 96  # three words, one per address

    bytecode = boa.load_partial(str(REPO_ROOT / deploy_create3.CONTRACT_PATH))
    deployed = bytecode.deploy(STREAMER, ZERO, TREASURY)

    assert deployed.STREAMER() == STREAMER
    assert deployed.treasury() == TREASURY
    assert deployed.forwarder_address() == ZERO

    decoded = boa.util.abi.abi_decode(deploy_create3.CTOR_SCHEMA, encoded)
    assert [a.lower() for a in decoded] == [STREAMER.lower(), ZERO, TREASURY.lower()]


def test_the_forwarder_is_left_zero_at_deploy(cre_executor_selected):
    _, forwarder, _ = boa.util.abi.abi_decode(
        deploy_create3.CTOR_SCHEMA, deploy_create3.ctor_calldata()
    )

    assert forwarder == ZERO


@pytest.mark.parametrize("missing", ("DONATION_STREAMER_ADDRESS", "TREASURY_ADDRESS"))
def test_a_missing_address_fails_before_broadcasting(cre_executor_selected, monkeypatch, missing):
    monkeypatch.delenv(missing)

    with pytest.raises(ValueError, match=missing):
        deploy_create3.ctor_calldata()
