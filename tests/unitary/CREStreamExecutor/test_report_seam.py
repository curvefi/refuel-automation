"""workflow.ts and cre_common.py each declare the report layout; only this catches drift."""

import shutil
import subprocess
import sys
from pathlib import Path

import boa
import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from cre_common import build_report  # noqa: E402

WORKFLOW_DIR = REPO_ROOT / "workflow"

pytestmark = pytest.mark.skipif(shutil.which("bun") is None, reason="needs bun")


def encode_in_typescript(cases):
    lines = []
    for stream_ids in cases:
        entries = ", ".join(f"{i}n" for i in stream_ids)
        lines.append(f"console.log(encodeReport([{entries}]))")
    script = "import { encodeReport } from './workflow'\n" + "\n".join(lines) + "\n"

    out = subprocess.run(
        ["bun", "-e", script],
        cwd=WORKFLOW_DIR,
        capture_output=True,
        text=True,
        timeout=180,
    )
    assert out.returncode == 0, out.stderr[:400]

    encoded = [bytes.fromhex(line.strip().removeprefix("0x")) for line in out.stdout.splitlines()]
    assert len(encoded) == len(cases), out.stdout[:400]
    return encoded


CASES = [
    [0],
    [],
    [1, 2, 3],
    [2**256 - 1],
    list(range(32)),  # MAX_BATCH
]


@pytest.fixture(scope="module")
def encoded_cases():
    return encode_in_typescript(CASES)


@pytest.mark.parametrize("case", range(len(CASES)))
def test_typescript_and_python_encoders_agree(encoded_cases, case):
    assert encoded_cases[case] == build_report(CASES[case])


def test_the_contract_decodes_what_typescript_produces(
    executor, forwarder, metadata, funded_stream
):
    (report,) = encode_in_typescript([[funded_stream["id"]]])

    with boa.env.prank(forwarder):
        executor.onReport(metadata, report)

    assert executor.execution_count() == 1


def test_the_contract_accepts_a_full_typescript_batch(executor, forwarder, metadata):
    (report,) = encode_in_typescript([list(range(32))])

    with boa.env.prank(forwarder), boa.reverts("every execution failed"):
        executor.onReport(metadata, report)
