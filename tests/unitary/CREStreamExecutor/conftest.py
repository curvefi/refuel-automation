import sys
from pathlib import Path

import boa
import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from cre_common import (  # noqa: E402
    EXECUTOR_SOURCE,
    WORKFLOW_NAME_PRODUCTION,
    build_metadata,
    encoded_workflow_name,
)


@pytest.fixture()
def forwarder():
    return boa.env.generate_address()


@pytest.fixture()
def workflow_owner():
    return boa.env.generate_address()


@pytest.fixture()
def executor(deployer, donation_streamer, forwarder, workflow_owner):
    with boa.env.prank(deployer):
        contract = boa.load(
            str(REPO_ROOT / EXECUTOR_SOURCE),
            donation_streamer.address,
            forwarder,
            deployer,
        )
        contract.set_expected_author(workflow_owner)
        contract.set_expected_workflow_name(WORKFLOW_NAME_PRODUCTION)
    return contract


@pytest.fixture()
def metadata(workflow_owner):
    return build_metadata(
        workflow_name=encoded_workflow_name(WORKFLOW_NAME_PRODUCTION),
        workflow_owner=workflow_owner,
    )


@pytest.fixture()
def funded_stream(donation_streamer, mock_pool, tokens, donor):
    token0, token1 = tokens
    amounts = [1_000, 2_000]
    period_length = 10
    n_periods = 2

    for token, amount in zip(tokens, amounts):
        token.mint(donor, amount)
        with boa.env.prank(donor):
            token.approve(donation_streamer.address, amount)

    with boa.env.prank(donor):
        stream_id = donation_streamer.create_stream(
            mock_pool.address,
            [token0.address, token1.address],
            amounts,
            period_length,
            n_periods,
        )

    return {"id": stream_id}
