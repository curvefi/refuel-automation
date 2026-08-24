"""What the workflow, the tests and the deploy script must agree on, declared once.
workflow.ts encodes the report and CREStreamExecutor.vy decodes it; test_report_seam is
the only thing that catches drift between them."""

import hashlib

import boa

STREAMER_SOURCE = "contracts/DonationStreamer.vy"
EXECUTOR_SOURCE = "contracts/evm/src/CREStreamExecutor.vy"

# Must match encodeReport() in workflow/workflow.ts.
REPORT_SCHEMA = "(uint256[])"

# The names registered in workflow/workflow.yaml.
WORKFLOW_NAME_PRODUCTION = "refuel-production"
WORKFLOW_NAME_STAGING = "refuel-staging"


def build_report(stream_ids):
    """Byte-for-byte what workflow.ts encodeReport() produces."""
    return boa.util.abi.abi_encode(REPORT_SCHEMA, (list(stream_ids),))


def encoded_workflow_name(name):
    """sha256 -> hex of the first 5 bytes -> those 10 ASCII chars, as CREReceiver does."""
    return hashlib.sha256(name.encode()).hexdigest()[:10].encode()


def build_metadata(workflow_id=b"\x00" * 32, workflow_name=b"\x00" * 10, workflow_owner=None):
    """The Forwarder's abi.encodePacked(workflow_id, workflow_name, workflow_owner)."""
    owner = workflow_owner or "0x" + "00" * 20
    return workflow_id + workflow_name + bytes.fromhex(owner[2:])
