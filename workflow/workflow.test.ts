import { describe, expect, it } from 'bun:test'
import { decodeAbiParameters, parseAbiParameters } from 'viem'
import {
	encodeReport,
	resolveChain,
	selectStreams,
	summarise,
	sweepAll,
	type ChainResult,
	type ResolvedChain,
	type SelectOptions,
} from './workflow'

const params = (over: Partial<SelectOptions> = {}): SelectOptions => ({
	maxBatch: 8,
	minReward: 0n,
	...over,
})

const chain = (over: Partial<ResolvedChain> = {}): ResolvedChain => ({
	chainSelectorName: 'ethereum-mainnet',
	streamerAddress: '0x2b786BB995978CC2242C567Ae62fd617b0eBC828',
	executorAddress: '0x00000000000000000000000000000000000000ee',
	readBlockTag: 'finalized',
	onReportGasLimit: '3000000',
	maxBatch: 8,
	minReward: 0n,
	...over,
})

const result = (over: Partial<ChainResult> = {}): ChainResult => ({
	chain: 'ethereum-mainnet',
	due: 0,
	submitted: 0,
	skipped: 0,
	reward: '0',
	...over,
})

const reasons = (skipped: { reason: string }[]) => skipped.map((s) => s.reason)

describe('selectStreams', () => {
	it('takes every due stream, oldest id first, whatever the rewards', () => {
		// The streamer returns newest first; a zero-reward stream must not sort last.
		const { items, skipped } = selectStreams([2n, 1n], [0n, 10n], params())

		expect(items).toEqual([
			{ streamId: 1n, reward: 10n },
			{ streamId: 2n, reward: 0n },
		])
		expect(skipped).toEqual([])
	})

	it('returns nothing when nothing is due', () => {
		expect(selectStreams([], [], params())).toEqual({ items: [], skipped: [] })
	})

	it('drops a stream under minReward', () => {
		const { items, skipped } = selectStreams([1n, 2n], [5n, 100n], params({ minReward: 50n }))

		expect(items).toEqual([{ streamId: 2n, reward: 100n }])
		expect(reasons(skipped)).toEqual(['reward 5 under minReward 50'])
	})

	it('keeps a reward exactly at minReward', () => {
		const { items } = selectStreams([1n], [50n], params({ minReward: 50n }))

		expect(items).toEqual([{ streamId: 1n, reward: 50n }])
	})

	it('cuts to maxBatch, dropping the newest rather than the poorest', () => {
		const { items, skipped } = selectStreams([1n, 2n, 3n], [10n, 30n, 20n], params({ maxBatch: 2 }))

		expect(items).toEqual([
			{ streamId: 1n, reward: 10n },
			{ streamId: 2n, reward: 30n },
		])
		expect(reasons(skipped)).toEqual(['over maxBatch 2'])
		// The dropped stream stays due, so the next run picks it up.
		expect(skipped[0]?.streamId).toBe(3n)
	})

	it('cannot be jumped by naming a large reward', () => {
		const { items } = selectStreams([9n, 1n], [10n ** 18n, 0n], params({ maxBatch: 1 }))

		expect(items).toEqual([{ streamId: 1n, reward: 0n }])
	})

	it('throws when the streamer returns mismatched arrays', () => {
		expect(() => selectStreams([1n, 2n], [10n], params())).toThrow(/2 ids for 1 rewards/)
	})
})

describe('encodeReport', () => {
	it('encodes only stream ids, in selection order', () => {
		const encoded = encodeReport([
			{ streamId: 7n, reward: 999n },
			{ streamId: 3n, reward: 1n },
		])

		const [decoded] = decodeAbiParameters(parseAbiParameters('uint256[]'), encoded)
		expect(decoded).toEqual([7n, 3n])
	})

	it('encodes an empty batch without throwing', () => {
		const [decoded] = decodeAbiParameters(parseAbiParameters('uint256[]'), encodeReport([]))
		expect(decoded).toEqual([])
	})
})

describe('resolveChain', () => {
	const config = {
		schedule: '0 19 */8 * * *',
		readBlockTag: 'finalized' as const,
		maxBatch: 8,
		minReward: '100',
		onReportGasLimit: '3000000',
		chains: [],
	}

	it('falls back to the top-level defaults', () => {
		const resolved = resolveChain(config, {
			chainSelectorName: 'polygon-mainnet',
			streamerAddress: '0x00000000000000000000000000000000000000aa',
			executorAddress: '0x00000000000000000000000000000000000000bb',
		})

		expect(resolved.maxBatch).toBe(8)
		expect(resolved.minReward).toBe(100n)
		expect(resolved.readBlockTag).toBe('finalized')
		expect(resolved.onReportGasLimit).toBe('3000000')
	})

	it('lets a chain override every tuning key', () => {
		const resolved = resolveChain(config, {
			chainSelectorName: 'ethereum-mainnet',
			streamerAddress: '0x00000000000000000000000000000000000000aa',
			executorAddress: '0x00000000000000000000000000000000000000bb',
			maxBatch: 4,
			minReward: '999',
			readBlockTag: 'latest',
			onReportGasLimit: '1000000',
		})

		expect(resolved.maxBatch).toBe(4)
		expect(resolved.minReward).toBe(999n)
		expect(resolved.readBlockTag).toBe('latest')
		expect(resolved.onReportGasLimit).toBe('1000000')
	})
})

describe('sweepAll', () => {
	it('isolates a failing chain and still sweeps the rest', () => {
		const chains = [chain({ chainSelectorName: 'a' }), chain({ chainSelectorName: 'b' })]

		const results = sweepAll(chains, (c) => {
			if (c.chainSelectorName === 'a') throw new Error('rpc exploded')
			return result({ chain: 'b', submitted: 2 })
		})

		expect(results[0]?.error).toBe('rpc exploded')
		expect(results[1]?.submitted).toBe(2)
	})

	it('sweeps in config order', () => {
		const seen: string[] = []
		const chains = [chain({ chainSelectorName: 'a' }), chain({ chainSelectorName: 'b' })]

		sweepAll(chains, (c) => {
			seen.push(c.chainSelectorName)
			return result({ chain: c.chainSelectorName })
		})

		expect(seen).toEqual(['a', 'b'])
	})
})

describe('summarise', () => {
	it('totals executions and names the failed chains', () => {
		const summary = summarise([
			result({ chain: 'a', submitted: 2 }),
			result({ chain: 'b', error: 'boom' }),
		])

		expect(summary.chains).toBe(2)
		expect(summary.submitted).toBe(2)
		expect(summary.failed).toEqual(['b'])
	})

	it('reports no failures when every chain is quiet', () => {
		expect(summarise([result(), result()]).failed).toEqual([])
	})
})
