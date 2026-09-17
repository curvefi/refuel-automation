import { describe, expect, it } from 'bun:test'
import { gasBudget, sweep, type Connection } from './keeper'
import { ethereum } from './config'

type Sent = { ids: bigint[]; overrides: { gasLimit: bigint } }

const connection = (options: {
	ready?: bigint[]
	balance?: bigint
	sent?: Sent[]
	wait?: () => Promise<unknown>
}): Connection => ({
	provider: {
		getBalance: async () => options.balance ?? 10n ** 20n,
		getFeeData: async () => ({ maxFeePerGas: 1_000_000_000n, gasPrice: 1_000_000_000n }),
	},
	streamer: {
		ready_streams: async () => options.ready ?? [],
		execute_many: async (ids, overrides) => {
			options.sent?.push({ ids, overrides: overrides as { gasLimit: bigint } })
			return {
				hash: '0xbatch',
				wait: options.wait ?? (async () => ({ status: 1 })),
			} as never
		},
	},
	address: '0xkeeper',
})

describe('the gas budget', () => {
	it('asks for what the contract demands per stream', () => {
		expect(gasBudget(16, 1n).gasLimit).toBe(9_750_000n)
	})

	it('requires the full reservation a node makes, several runs over', () => {
		// 9.75M gas at 11 gwei is 0.107 ETH for one run, so a floor near it is not enough.
		expect(gasBudget(16, 11_000_000_000n).required).toBe(321_750_000_000_000_000n)
	})
})

describe('a run', () => {
	it('sends nothing when no stream is ready', async () => {
		const sent: Sent[] = []
		const result = await sweep(ethereum, connection({ ready: [], sent }))
		expect(sent).toEqual([])
		expect(result.submitted).toBe(0)
	})

	it('sends the ready ids with the budgeted gas limit', async () => {
		const sent: Sent[] = []
		await sweep(ethereum, connection({ ready: [4n, 5n], sent }))
		expect(sent.length).toBe(1)
		expect(sent[0].ids).toEqual([4n, 5n])
		expect(sent[0].overrides.gasLimit).toBe(gasBudget(2, 1n).gasLimit)
	})

	it('takes the contract order and sends at most one batch', async () => {
		const sent: Sent[] = []
		const ready = Array.from({ length: 20 }, (_, i) => BigInt(i))
		await sweep(ethereum, connection({ ready, sent }))
		expect(sent[0].ids).toEqual(ready.slice(0, ethereum.maxBatch))
	})

	it('refuses to send when the key cannot cover the reservation', async () => {
		const sent: Sent[] = []
		const thin = gasBudget(2, 1_000_000_000n).required - 1n
		expect(sweep(ethereum, connection({ ready: [4n, 5n], balance: thin, sent }))).rejects.toThrow(
			/under the/,
		)
		expect(sent).toEqual([])
	})

	it('fails the run when the batch reverts', async () => {
		const reverted = async () => {
			throw Object.assign(new Error('transaction execution reverted'), { code: 'CALL_EXCEPTION' })
		}
		expect(sweep(ethereum, connection({ ready: [4n], wait: reverted }))).rejects.toThrow(/reverted/)
	})

	it('fails the run when the batch is not mined in time', async () => {
		const timeout = async () => {
			throw Object.assign(new Error('wait for transaction timeout'), { code: 'TIMEOUT' })
		}
		expect(sweep(ethereum, connection({ ready: [4n], wait: timeout }))).rejects.toThrow(/timeout/)
	})
})
