# refuel-automation

Vyper contracts plus deployment and test helpers for the donation streaming flow.

## Setup

Install dependencies with `uv`:

```bash
uv sync
```

Fetch the `CREReceiver` submodule:

```bash
git submodule update --init --recursive
```

Install workflow and binding dependencies. Needs [Bun](https://bun.sh) 1.2.21+ and [CRE CLI](https://docs.chain.link/cre/getting-started/cli-installation) 1.5.0+:

```bash
cd contracts && bun install && cd ..
cd workflow && bun install && cd ..
```

## Environment

The deployment script reads variables from the process environment only.

Required for `scripts/deploy_create3.py`:

- `ETHERSCAN_API_KEY`
- `ENCRYPTED_PK`
- Either `RPC_URL`, or `DRPC_API_KEY`

Optional:

- `DRPC_NETWORK` to build a DRPC endpoint when `RPC_URL` is not set. Defaults to `ethereum`.

Also required when deploying `CREStreamExecutor`:

- `DONATION_STREAMER_ADDRESS` - streamer the executor drives, immutable once set
- `OWNER_ADDRESS` - owner allowed to configure the executor after deployment

The owner is an argument rather than `msg.sender` because CREATE3 constructs through an ephemeral proxy: an owner taken from the caller would be that proxy, and nothing could ever be configured.

The forwarder is not an environment variable. It deploys as zero and is set per chain afterwards, leaving `onReport` disabled until then.

Example environment:

```bash
export ETHERSCAN_API_KEY=your_etherscan_key
export ENCRYPTED_PK=your_encrypted_private_key
export DRPC_API_KEY=your_drpc_key
export DRPC_NETWORK=ethereum
```

If `RPC_URL` is not provided, the deploy script computes it as:

```text
https://lb.drpc.org/ogrpc?network=<DRPC_NETWORK>&dkey=<DRPC_API_KEY>
```

## Scripts

Encrypt a deployer key:

```bash
uv run python scripts/secure_key_utils.py
```

Deploy via CREATE3:

```bash
uv run python scripts/deploy_create3.py
```

The script deploys the contract selected by the constants at the top of the file. `CREStreamExecutor` is the only one taking constructor arguments; CREATE3 addresses ignore initcode, so passing them does not move the target address.

## Tests

Run unit tests:

```bash
uv run pytest tests/unitary
```

Integration tests can use either `RPC_URL` directly or compute one from `DRPC_API_KEY`.

Run workflow tests:

```bash
cd workflow && bun test && bun run typecheck
```

`tests/unitary/CREStreamExecutor/test_report_seam.py` checks that the workflow encoder, `boa` and the Vyper decoder agree on the report layout. Skipped when `bun` is missing.

## CRE workflow

`workflow/` holds the Chainlink CRE workflow that executes due streams. On a cron it reads `executable_due()` per chain and sends the due stream ids to `CREStreamExecutor` as a signed report naming only ids. There is no keeper key and no bounty: the DON signs, and `DonationStreamer` pays nobody for executing.

Simulate without broadcasting:

```bash
cre workflow simulate workflow/ --target production-settings --non-interactive --trigger-index 0
```

`config.production.json` ships with zeroed `executorAddress` fields, so a run fails until the executors are deployed and the addresses filled in. `config.staging.json` also needs a testnet `DonationStreamer`.

After deploying, the owner must call `set_forwarder_address` and at least one of `set_expected_author` / `set_expected_workflow_id` per chain. `CREReceiver` is strict: an executor with no workflow identity rejects every report.

