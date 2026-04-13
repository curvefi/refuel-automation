# refuel-automation

Vyper contracts plus deployment and test helpers for the donation streaming flow.

## Setup

Install dependencies with `uv`:

```bash
uv sync
```

## Environment

The deployment script reads variables from the process environment only.

Required for `scripts/deploy_create3.py`:

- `ETHERSCAN_API_KEY`
- `ENCRYPTED_PK`
- Either `RPC_URL`, or `DRPC_API_KEY`

Optional:

- `DRPC_NETWORK` to build a DRPC endpoint when `RPC_URL` is not set. Defaults to `ethereum`.

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

## Tests

Run unit tests:

```bash
uv run pytest tests/unitary
```

Integration tests can use either `RPC_URL` directly or compute one from `DRPC_API_KEY`.

## github actions to execute the due refuel streams

Needs two secrets in repo's `/settings/secrets/actions`

- `ALCHEMY_RPC_API_KEY` - Alchemy API key
- `REFUEL_PRIVATE_KEY` - Private key
