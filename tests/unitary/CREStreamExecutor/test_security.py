import sys
from pathlib import Path

import boa
import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from cre_common import (  # noqa: E402
    EXECUTOR_SOURCE,
    WORKFLOW_NAME_PRODUCTION,
    WORKFLOW_NAME_STAGING,
    build_metadata,
    build_report,
    encoded_workflow_name,
)

ZERO = "0x" + "00" * 20


def test_only_the_forwarder_may_call_on_report(executor, metadata, funded_stream, caller):
    report = build_report([funded_stream["id"]])

    with boa.env.prank(caller), boa.reverts("Invalid sender"):
        executor.onReport(metadata, report)


def test_a_report_from_another_author_is_rejected(executor, forwarder, funded_stream):
    stranger = boa.env.generate_address()
    metadata = build_metadata(
        workflow_name=encoded_workflow_name(WORKFLOW_NAME_PRODUCTION),
        workflow_owner=stranger,
    )

    with boa.env.prank(forwarder), boa.reverts("Invalid author"):
        executor.onReport(metadata, build_report([funded_stream["id"]]))


def test_a_report_from_another_workflow_name_is_rejected(
    executor, forwarder, workflow_owner, funded_stream
):
    metadata = build_metadata(
        workflow_name=encoded_workflow_name(WORKFLOW_NAME_STAGING),
        workflow_owner=workflow_owner,
    )

    with boa.env.prank(forwarder), boa.reverts("Invalid workflow name"):
        executor.onReport(metadata, build_report([funded_stream["id"]]))


def test_an_unconfigured_executor_rejects_every_report(
    deployer, donation_streamer, forwarder, metadata, funded_stream
):
    with boa.env.prank(deployer):
        bare = boa.load(
            str(REPO_ROOT / EXECUTOR_SOURCE),
            donation_streamer.address,
            forwarder,
            deployer,
        )

    with boa.env.prank(forwarder), boa.reverts("Workflow parameters are not set"):
        bare.onReport(metadata, build_report([funded_stream["id"]]))


def test_a_zero_forwarder_disables_on_report(
    deployer, donation_streamer, workflow_owner, metadata, funded_stream
):
    with boa.env.prank(deployer):
        pending = boa.load(
            str(REPO_ROOT / EXECUTOR_SOURCE),
            donation_streamer.address,
            ZERO,
            deployer,
        )
        pending.set_expected_author(workflow_owner)

    with boa.env.prank(boa.env.generate_address()), boa.reverts("Invalid sender"):
        pending.onReport(metadata, build_report([funded_stream["id"]]))


def test_configuring_the_forwarder_opens_it(
    deployer, donation_streamer, forwarder, workflow_owner, funded_stream
):
    metadata = build_metadata(workflow_owner=workflow_owner)

    with boa.env.prank(deployer):
        pending = boa.load(
            str(REPO_ROOT / EXECUTOR_SOURCE),
            donation_streamer.address,
            ZERO,
            deployer,
        )
        pending.set_expected_author(workflow_owner)
        pending.set_forwarder_address(forwarder)

    with boa.env.prank(forwarder):
        pending.onReport(metadata, build_report([funded_stream["id"]]))

    assert pending.execution_count() == 1


@pytest.mark.parametrize(
    "method,args",
    [
        ("set_forwarder_address", (ZERO,)),
        ("set_expected_author", (ZERO,)),
        ("set_expected_workflow_id", (b"\x00" * 32,)),
    ],
)
def test_owner_only_setters(executor, caller, method, args):
    with boa.env.prank(caller), boa.reverts():
        getattr(executor, method)(*args)


def test_supports_the_ireceiver_interface(executor):
    assert executor.supportsInterface(bytes.fromhex("805f2132")) is True
    assert executor.supportsInterface(bytes.fromhex("01ffc9a7")) is True
    assert executor.supportsInterface(bytes.fromhex("deadbeef")) is False


def test_the_owner_comes_from_the_constructor_not_the_deployer(
    donation_streamer, forwarder, workflow_owner
):
    proxy = boa.env.generate_address()

    with boa.env.prank(proxy):
        deployed = boa.load(
            str(REPO_ROOT / EXECUTOR_SOURCE),
            donation_streamer.address,
            forwarder,
            workflow_owner,
        )

    assert deployed.owner() == workflow_owner
    assert deployed.owner() != proxy

    with boa.env.prank(workflow_owner):
        deployed.set_forwarder_address(forwarder)


def test_a_zero_owner_is_rejected(donation_streamer, forwarder, deployer):
    with boa.env.prank(deployer), boa.reverts("owner required"):
        boa.load(
            str(REPO_ROOT / EXECUTOR_SOURCE),
            donation_streamer.address,
            forwarder,
            ZERO,
        )
