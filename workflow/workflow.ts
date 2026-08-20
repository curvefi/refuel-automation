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
import { DonationStreamer } from '../contracts/evm/ts/generated/DonationStreamer'
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
	minReward: z.string().optional(),
	onReportGasLimit: z.string().optional(),
})
export type ChainEntry = z.infer<typeof chainSchema>

export const configSchema = z.object({
	schedule: z.string(),
	// Streams run on multi-day periods, so the ~15 min finality lag costs nothing
	// and every node reading the same block is what keeps consensus stable.
	readBlockTag: z.enum(['finalized', 'latest']).default('finalized'),
	// Streams per report. The executor's own MAX_BATCH is 32, but each stream
	// costs an add_liquidity and CRE caps a transaction at 5,000,000 gas.
	maxBatch: z.coerce.number().int().positive().max(32).default(8),
	// Skip a stream whose reward would not cover its own execution. "0" takes all.
	minReward: z.string().default('0'),
	onReportGasLimit: z.string(),
	chains: z.array(chainSchema).min(1),
})
type Config = z.infer<typeof configSchema>

export type SelectOptions = {
	maxBatch: number
	minReward: bigint
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
	minReward: BigInt(entry.minReward ?? config.minReward),
})

export type DueStream = { streamId: bigint; reward: bigint }
export type Skip = { streamId: bigint; reason: string }
export type Selection = { items: DueStream[]; skipped: Skip[] }

// ─── Selection ──────────────────────────────────────────────
// streams_and_rewards_due() already filters to what is due, so this only decides
// what is worth executing and what fits in one report.
export const selectStreams = (
	dueIds: readonly bigint[],
	rewards: readonly bigint[],
	opts: SelectOptions,
): Selection => {
	if (dueIds.length !== rewards.length) {
		throw new Error(`streamer returned ${dueIds.length} ids for ${rewards.length} rewards`)
	}

	const candidates: DueStream[] = []
	const skipped: Skip[] = []

	for (const [i, streamId] of dueIds.entries()) {
		const reward = rewards[i] as bigint
		if (reward < opts.minReward) {
			skipped.push({ streamId, reason: `reward ${reward} under minReward ${opts.minReward}` })
			continue
		}
		candidates.push({ streamId, reward })
	}

	// Richest first, so a maxBatch cut drops the least valuable, and the rest stay
	// due for the next run - nothing is lost by trimming.
	candidates.sort((a, b) => (b.reward > a.reward ? 1 : b.reward < a.reward ? -1 : 0))

	const kept = candidates.slice(0, opts.maxBatch)
	for (const dropped of candidates.slice(opts.maxBatch)) {
		skipped.push({ streamId: dropped.streamId, reason: `over maxBatch ${opts.maxBatch}` })
	}

	return { items: kept, skipped }
}

// The report names streams and nothing else. Amounts, pools and recipients all
// live in DonationStreamer storage, set by the donor at create_stream.
export const encodeReport = (items: readonly DueStream[]): `0x${string}` =>
	encodeAbiParameters(parseAbiParameters('uint256[] streamIds'), [items.map((i) => i.streamId)])

// ─── Per-chain Sweep ────────────────────────────────────────
export type ChainResult = {
	chain: string
	due: number
	executed: number
	skipped: number
	reward: string
	txHash?: string
	error?: string
}

const UNSET_ADDRESS = /^0x0{40}$/i

const sweepChain = (runtime: Runtime<Config>, chain: ResolvedChain): ChainResult => {
	const result: ChainResult = {
		chain: chain.chainSelectorName,
		due: 0,
		executed: 0,
		skipped: 0,
		reward: '0',
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
	const streamer = new DonationStreamer(evmClient, chain.streamerAddress)
	const executor = new CREStreamExecutor(evmClient, chain.executorAddress)

	const blockTag =
		chain.readBlockTag === 'latest' ? LATEST_BLOCK_NUMBER : LAST_FINALIZED_BLOCK_NUMBER

	// One read per chain.
	const [dueIds, rewards] = streamer.streamsAndRewardsDue(runtime, blockTag)
	result.due = dueIds.length

	runtime.log(
		`[${chain.chainSelectorName}] ${dueIds.length} due on ${streamer.address}, ` +
			`read@${chain.readBlockTag}, maxBatch ${chain.maxBatch}`,
	)

	const { items, skipped } = selectStreams(dueIds, rewards, chain)
	result.skipped = skipped.length
	for (const s of skipped) {
		runtime.log(`[${chain.chainSelectorName}] skip #${s.streamId}: ${s.reason}`)
	}

	if (items.length === 0) return result

	const reward = items.reduce((sum, i) => sum + i.reward, 0n)
	result.reward = reward.toString()

	const reportData = encodeReport(items)
	runtime.log(
		`[${chain.chainSelectorName}] executing ${items.length}: ` +
			`${items.map((i) => `#${i.streamId}`).join(', ')} for ${reward}`,
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

	result.executed = items.length
	runtime.log(`[${chain.chainSelectorName}] executed ${items.length}, tx ${txHash}`)
	return result
}

// ─── Cron Callback ──────────────────────────────────────────
export const summarise = (results: readonly ChainResult[]) => ({
	chains: results.length,
	executed: results.reduce((n, r) => n + r.executed, 0),
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
				executed: 0,
				skipped: 0,
				reward: '0',
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
	// CRE does not retry, so throwing only signals - it cannot double-execute.
	// A stream another keeper took first is a no-op onchain, never a double donation.
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
