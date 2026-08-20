"""What the CRE workflow, the tests and any deploy script must agree on, declared once.

The report layout lives in two places by necessity - `workflow/workflow.ts` encodes it
and `contracts/evm/src/CREStreamExecutor.vy` decodes it. Only the round trip in
`tests/unitary/CREStreamExecutor/test_report_seam.py` catches drift between them.
"""

import hashlib

import boa

# DonationStreamer, CREATE3-deployed to the same address on every chain.
DONATION_STREAMER = "0x2b786BB995978CC2242C567Ae62fd617b0eBC828"

EXECUTOR_SOURCE = "contracts/evm/src/CREStreamExecutor.vy"

# Must match encodeReport() in workflow/workflow.ts.
REPORT_SCHEMA = "(uint256[])"

# CREStreamExecutor.MAX_BATCH, itself DonationStreamer.N_MAX_EXECUTE.
MAX_BATCH = 32

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
