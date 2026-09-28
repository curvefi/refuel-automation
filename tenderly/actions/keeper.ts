import type { ActionFn, Context } from '@tenderly/actions'
import { Contract, JsonRpcProvider, Wallet, formatEther, type ContractTransactionResponse } from 'ethers'
import {
	base as baseConfig,
	ethereum as ethereumConfig,
	gnosis as gnosisConfig,
	polygon as polygonConfig,
	type ChainConfig,
} from './config'

const ZERO_ADDRESS = /^0x0{40}$/i
const PRIVATE_KEY_SECRET = 'KEEPER_PRIVATE_KEY'

// DonationStreamer.EXECUTE_GAS + GAS_RESERVE, what the contract demands per stream, plus
// the fixed cost of the call. The batch is sent with this budget rather than an estimate:
// ethers estimates with no margin and at gasprice 0, so a stream that costs more at
// inclusion than at estimation would revert the batch.
const GAS_PER_STREAM = 600_000n
const GAS_FIXED = 150_000n

// Runs need to keep going, so the key must cover more than the batch in flight.
const RUNS_OF_HEADROOM = 3n

// Tenderly kills a run at 30s. A batch not mined by then fails the run rather than passing
// as a success: unmined is exactly the silent stall this keeper exists to catch.
const RECEIPT_TIMEOUT_MS = 20_000

const STREAMER_ABI = [
	'function ready_streams() view returns (uint256[])',
	'function execute_many(uint256[] stream_ids) returns (bool[])',
]

// A node admits a transaction only if the sender can pay gasLimit x maxFeePerGas up front,
// whatever it ends up spending, so that product is what "enough gas money" means.
export const gasBudget = (streams: number, maxFeePerGas: bigint) => {
	const gasLimit = GAS_FIXED + GAS_PER_STREAM * BigInt(streams)
	return { gasLimit, required: gasLimit * maxFeePerGas * RUNS_OF_HEADROOM }
}

// RPC URLs carry API keys and ethers puts the failing URL in the error message, so only the
// error code is logged. Reads only: retrying a send risks broadcasting the batch twice.
const retryRead = async <T>(label: string, call: () => Promise<T>): Promise<T> => {
	let lastError: unknown
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			return await call()
		} catch (error) {
			lastError = error
			const code = (error as { code?: string }).code ?? 'unknown error'
			console.log(`${label} failed (attempt ${attempt}): ${code}`)
			await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
		}
	}
	throw new Error(`${label} failed three times: ${(lastError as { code?: string })?.code ?? 'unknown error'}`)
}

export type Connection = {
	provider: {
		getBalance(address: string): Promise<bigint>
		getFeeData(): Promise<{ maxFeePerGas: bigint | null; gasPrice: bigint | null }>
	}
	streamer: {
		ready_streams(): Promise<bigint[]>
		execute_many(ids: bigint[], overrides: object): Promise<ContractTransactionResponse>
	}
	address: string
}

export const sweep = async (config: ChainConfig, connection: Connection) => {
	const { provider, streamer, address } = connection

	// The contract decides what is ready and in which order, rotating the head with the
	// block, so there is nothing to page through and nothing to choose between here.
	const ready = await retryRead('ready_streams', () => streamer.ready_streams())
	// Copied, not sliced: the contract call returns a frozen ethers Result and its slice is
	// frozen too, while encoding the batch writes into the array it is handed.
	const selected = Array.from(ready).slice(0, config.maxBatch)
	if (selected.length === 0) {
		console.log(`[${config.name}] nothing ready`)
		return { ready: 0, submitted: 0 }
	}

	const fees = await retryRead('getFeeData', () => provider.getFeeData())
	const maxFeePerGas = fees.maxFeePerGas ?? fees.gasPrice
	if (maxFeePerGas === null) throw new Error(`${config.name}: no fee data`)
	const { gasLimit, required } = gasBudget(selected.length, maxFeePerGas)

	// Before sending, so a key that cannot pay says so instead of failing as an RPC error.
	// With no bounty this key is the only thing executing streams, and an empty one stalled
	// a live stream for a month unnoticed.
	const balance = await retryRead('getBalance', () => provider.getBalance(address))
	if (balance < required) {
		throw new Error(
			`${config.name}: ${address} holds ${formatEther(balance)}, under the ` +
				`${formatEther(required)} that ${RUNS_OF_HEADROOM} runs of ${selected.length} streams need`,
		)
	}

	const transaction = await streamer.execute_many(selected, { gasLimit })
	console.log(
		`[${config.name}] sent ${selected.length} of ${ready.length} ready (${selected
			.map((id) => `#${id}`)
			.join(', ')}): ${transaction.hash}`,
	)

	// Not caught: a revert rejects here (ethers throws CALL_EXCEPTION rather than returning
	// a status-0 receipt) and a batch still unmined at the timeout rejects too. Both should
	// fail the run, because a green run is what let the old keeper stall unnoticed.
	await transaction.wait(1, RECEIPT_TIMEOUT_MS)

	return { ready: ready.length, submitted: selected.length, transactionHash: transaction.hash }
}

const connect = async (context: Context, config: ChainConfig): Promise<Connection> => {
	const provider = new JsonRpcProvider(await context.secrets.get(config.rpcSecret))
	const signer = new Wallet(await context.secrets.get(PRIVATE_KEY_SECRET), provider)
	return {
		provider: provider as unknown as Connection['provider'],
		streamer: new Contract(config.streamer, STREAMER_ABI, signer) as unknown as Connection['streamer'],
		address: signer.address,
	}
}

const action =
	(config: ChainConfig): ActionFn =>
	async (context) => {
		if (ZERO_ADDRESS.test(config.streamer)) {
			throw new Error(`${config.name}: streamer address is unset`)
		}
		return sweep(config, await connect(context, config))
	}

export const ethereum = action(ethereumConfig)
export const gnosis = action(gnosisConfig)
export const base = action(baseConfig)
export const polygon = action(polygonConfig)
