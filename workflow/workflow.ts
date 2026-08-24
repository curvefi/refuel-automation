import {
	bytesToHex,
	cre,
	getNetwork,
	LAST_FINALIZED_BLOCK_NUMBER,
	LATEST_BLOCK_NUMBER,
	TxStatus,
	type Runtime,
} from '@chainlink/cre-sdk'
import { type Address, encodeAbiParameters, parseAbiParameters } from 'viem'
import { z } from 'zod'
import { CREStreamExecutor } from '../contracts/evm/ts/generated/CREStreamExecutor'

// ─── Config Schema ──────────────────────────────────────────
// Every tuning key is optional per chain and falls back to the top-level default.
const chainSchema = z.object({
	chainSelectorName: z.string(),
	// DonationStreamer is CREATE3-deployed, so this is the same address everywhere.
	streamerAddress: z.string(),
	executorAddress: z.string(),
	readBlockTag: z.enum(['finalized', 'latest']).optional(),
	maxBatch: z.coerce.number().int().positive().max(32).optional(),
	onReportGasLimit: z.string().optional(),
})
export type ChainEntry = z.infer<typeof chainSchema>

export const configSchema = z.object({
	schedule: z.string(),
	// Streams run on multi-day periods, so the ~15 min finality lag costs nothing
	// and every node reading the same block is what keeps consensus stable.
	readBlockTag: z.enum(['finalized', 'latest']).default('finalized'),
	// Measured at ~24k fixed + ~113k a stream, so the contract's own cap of 32 would
	// not fit a 3,000,000 limit. See tests/integration/CREStreamExecutor.
	maxBatch: z.coerce.number().int().positive().max(32).default(16),
	onReportGasLimit: z.string(),
	chains: z.array(chainSchema).min(1),
})
type Config = z.infer<typeof configSchema>

export type SelectOptions = {
	maxBatch: number
}

export type ResolvedChain = SelectOptions & {
	chainSelectorName: string
	streamerAddress: Address
	executorAddress: Address
	readBlockTag: 'finalized' | 'latest'
	onReportGasLimit: string
}

export const resolveChain = (config: Config, entry: ChainEntry): ResolvedChain => ({
	chainSelectorName: entry.chainSelectorName,
	streamerAddress: entry.streamerAddress as Address,
	executorAddress: entry.executorAddress as Address,
	readBlockTag: entry.readBlockTag ?? config.readBlockTag,
	onReportGasLimit: entry.onReportGasLimit ?? config.onReportGasLimit,
	maxBatch: entry.maxBatch ?? config.maxBatch,
})

export type Skip = { streamId: bigint; reason: string }
export type Selection = { items: bigint[]; skipped: Skip[] }

// ─── Selection ──────────────────────────────────────────────
// The executor's view already filters; this only decides what fits in one report.
export const selectStreams = (dueIds: readonly bigint[], opts: SelectOptions): Selection => {
	// Oldest id first. There is no reward to rank by and deliberately so: the streamer
	// pays none, so nothing can buy a place at the front of the queue.
	const candidates = [...dueIds].sort((a, b) => (a > b ? 1 : a < b ? -1 : 0))
	const skipped: Skip[] = candidates.slice(opts.maxBatch).map((streamId) => ({
		// Still due, so the next tick picks it up; nothing is lost by trimming.
		streamId,
		reason: `over maxBatch ${opts.maxBatch}`,
	}))

	return { items: candidates.slice(0, opts.maxBatch), skipped }
}

// Ids only. Amounts, pools and recipients live in DonationStreamer storage.
export const encodeReport = (streamIds: readonly bigint[]): `0x${string}` =>
	encodeAbiParameters(parseAbiParameters('uint256[] streamIds'), [streamIds as bigint[]])

// ─── Per-chain Sweep ────────────────────────────────────────
export type ChainResult = {
	chain: string
	due: number
	submitted: number
	skipped: number
	txHash?: string
	error?: string
}

const UNSET_ADDRESS = /^0x0{40}$/i

const sweepChain = (runtime: Runtime<Config>, chain: ResolvedChain): ChainResult => {
	const result: ChainResult = {
		chain: chain.chainSelectorName,
		due: 0,
		submitted: 0,
		skipped: 0,
	}

	// An unset address reads back as 0x, which viem reports as an opaque decode error.
	if (UNSET_ADDRESS.test(chain.streamerAddress)) {
		throw new Error(`streamerAddress unset for ${chain.chainSelectorName}`)
	}
	if (UNSET_ADDRESS.test(chain.executorAddress)) {
		throw new Error(`executorAddress unset for ${chain.chainSelectorName} - deploy it first`)
	}

	const network = getNetwork({ chainFamily: 'evm', chainSelectorName: chain.chainSelectorName })
	if (!network) throw new Error(`Network not found: ${chain.chainSelectorName}`)

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)
	const executor = new CREStreamExecutor(evmClient, chain.executorAddress)

	const blockTag =
		chain.readBlockTag === 'latest' ? LATEST_BLOCK_NUMBER : LAST_FINALIZED_BLOCK_NUMBER

	// The executor's view drops set-aside streams, so a broken pool costs no batch slot.
	const dueIds = executor.executableDue(runtime, blockTag)
	result.due = dueIds.length

	runtime.log(
		`[${chain.chainSelectorName}] ${dueIds.length} due on ${chain.executorAddress}, ` +
			`read@${chain.readBlockTag}, maxBatch ${chain.maxBatch}`,
	)

	const { items, skipped } = selectStreams(dueIds, chain)
	result.skipped = skipped.length
	for (const s of skipped) {
		runtime.log(`[${chain.chainSelectorName}] skip #${s.streamId}: ${s.reason}`)
	}

	if (items.length === 0) return result

	// Config sanity only now: catches an executorAddress bound to a different streamer.
	let boundStreamer: string
	try {
		boundStreamer = executor.sTREAMER(runtime, blockTag)
	} catch {
		throw new Error(
			`no CREStreamExecutor at ${chain.executorAddress} on ${chain.chainSelectorName}`,
		)
	}
	if (boundStreamer.toLowerCase() !== chain.streamerAddress.toLowerCase()) {
		throw new Error(
			`executor ${chain.executorAddress} is bound to streamer ${boundStreamer}, ` +
				`but config reads ids from ${chain.streamerAddress}`,
		)
	}

	const reportData = encodeReport(items)
	runtime.log(
		`[${chain.chainSelectorName}] executing ${items.length}: ` +
			`${items.map((id) => `#${id}`).join(', ')}`,
	)

	const writeResult = executor.writeReport(runtime, reportData, {
		gasLimit: chain.onReportGasLimit,
	})

	const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32))
	result.txHash = txHash

	// A transaction can succeed while the receiver reverts; both must be checked.
	if (
		writeResult.txStatus !== TxStatus.SUCCESS ||
		writeResult.receiverContractExecutionStatus != 0
	) {
		throw new Error(`TX ${txHash} failed: ${writeResult.errorMessage || writeResult.txStatus}`)
	}

	result.submitted = items.length
	runtime.log(`[${chain.chainSelectorName}] submitted ${items.length}, tx ${txHash}`)
	return result
}

// ─── Cron Callback ──────────────────────────────────────────
export const summarise = (results: readonly ChainResult[]) => ({
	chains: results.length,
	submitted: results.reduce((n, r) => n + r.submitted, 0),
	failed: results.filter((r) => r.error).map((r) => r.chain),
	results,
})

// Orchestration only, so it can be tested without a CRE runtime.
export const sweepAll = (
	chains: readonly ResolvedChain[],
	sweepOne: (chain: ResolvedChain) => ChainResult,
	log: (message: string) => void = () => {},
): ChainResult[] => {
	const results: ChainResult[] = []

	// Swept in config order, so an abort on a later chain cannot undo an earlier write.
	for (const chain of chains) {
		try {
			results.push(sweepOne(chain))
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e)
			log(`[${chain.chainSelectorName}] FAILED: ${message}`)
			results.push({
				chain: chain.chainSelectorName,
				due: 0,
				submitted: 0,
				skipped: 0,
						error: message,
			})
		}
	}

	return results
}

export const onCron = (runtime: Runtime<Config>): string => {
	const config = runtime.config
	const chains = config.chains.map((entry) => resolveChain(config, entry))

	const results = sweepAll(
		chains,
		(chain) => sweepChain(runtime, chain),
		(message) => runtime.log(message),
	)

	const summary = summarise(results)
	// CRE does not retry, so throwing only signals; a stream taken first is a no-op.
	if (summary.failed.length > 0) {
		throw new Error(`chain(s) failed: ${JSON.stringify(summary)}`)
	}

	return JSON.stringify(summary)
}

// ─── Workflow Init ──────────────────────────────────────────
export function initWorkflow(config: Config) {
	const cron = new cre.capabilities.CronCapability()

	return [cre.handler(cron.trigger({ schedule: config.schedule }), onCron)]
}
