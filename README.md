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
- `ENCRYPTED_PK` - the key `scripts/secure_key_utils.py` prints
- Either `RPC_URL`, or `DRPC_API_KEY` together with `DRPC_NETWORK`

`DRPC_NETWORK` has no default: a deploy script must not pick a chain for you.

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

The ethereum fork tests read `RPC_URL`; the real-pool suite resolves gnosis, base and polygon from `ANKR_API_KEY`, or `RPC_URL_<CHAIN>` per chain. Without any of them every fork test skips.

```bash
uv run pytest -m fork
```

## Executing streams

`DonationStreamer` pays no bounty, and anyone may execute. A keeper needs two calls:

1. `ready_streams()` returns the ids that can be executed now, up to 256.
2. `execute_many(ids)` executes up to 32 of them.

`execute_many` runs each stream in its own call frame with a 500k gas ceiling, so a pool that reverts or burns gas fails alone instead of reverting the batch. A failure is logged as `StreamFailed` and recorded nowhere: the stream stays due, is retried next run, and starts working again the moment its pool does. Nothing is set aside and nothing needs an owner to bring it back.

Budget 600k of gas per stream. A batch given less reverts rather than executing part of itself, so `eth_estimateGas` returns a limit that covers every id in it.

`create_stream` takes pools the Curve MetaRegistry knows, periods between an hour and a total of two years, and amounts that do not divide to nothing.

`ready_streams()` walks at most 256 active streams, starting at a position that moves with the block. A longer active set is still covered in full over successive blocks, and no stream can keep the front of the queue.

## Tenderly keeper

`tenderly/` holds one Web3 Action per chain (ethereum, gnosis, base, polygon), run at `19 */8 * * *`. Each run reads `ready_streams()`, sends the first 16 ids in one `execute_many` with an explicit gas budget, and waits for the receipt. Which ids those are is the contract's decision, not the keeper's.

A run fails, and so alerts, when the batch reverts, when it is still unmined after 20 seconds, or when the key holds less than three runs' worth of `gasLimit x maxFeePerGas`. That last one is worked out per run from the chain's own fee data rather than a floor someone has to keep in step with gas prices, and it is checked before sending, so a key that cannot pay says so instead of failing as an RPC error. With no bounty this key is the only executor, so a silent stall has nothing else to catch it.

Local checks:

```bash
cd tenderly/actions && npm ci && npm run typecheck && npm run build
cd .. && bun test
```

Install the action's dependencies with `npm` from inside `tenderly/actions`, not with bun and not with `npm --prefix`. `tenderly actions deploy` uploads that directory's `node_modules` as it stands: bun's layout leaves ethers' own dependencies outside it, and `npm --prefix actions install` run from `tenderly/` adds the parent package as a `file:..` dependency, which the CLI's zip walker then follows in a loop.

Before `tenderly actions deploy`, set the streamer address in `tenderly/actions/config.ts`, and add these Action Secrets to the `curve-finance/refuel-keepers` project, never committing them:

- `ETHEREUM_RPC`, `GNOSIS_RPC`, `BASE_RPC`, `POLYGON_RPC` - RPC URL per chain
- `KEEPER_PRIVATE_KEY` - the actor's private key, funded with gas on all four chains

The previous streamer at `0x2b786BB995978CC2242C567Ae62fd617b0eBC828` is not kept alive from here: it pays a bounty and has no `ready_streams`, so this keeper cannot drive it. Its remaining stream is left to the donor or to a third-party keeper collecting that bounty.
