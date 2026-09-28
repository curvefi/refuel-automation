export type ChainConfig = {
	name: string
	rpcSecret: string
	streamer: string
	maxBatch: number
}

// DonationStreamer is CREATE3-deployed, so one address on every chain. Zero until this
// version is deployed, and the action refuses to run against it.
const STREAMER = '0x0000000000000000000000000000000000000000'

// The batch is sent with 600k of gas budgeted per stream, so 16 fits under 10M. A full 32
// would ask for ~19.3M, past Ethereum's 16,777,216 per-transaction cap and a Gnosis block.
// There is no per-chain balance floor to keep in step: the run works out what it needs
// from the gas limit and the chain's own fee data.
const defaults = { streamer: STREAMER, maxBatch: 16 }

export const ethereum: ChainConfig = { ...defaults, name: 'ethereum', rpcSecret: 'ETHEREUM_RPC' }
export const gnosis: ChainConfig = { ...defaults, name: 'gnosis', rpcSecret: 'GNOSIS_RPC' }
export const base: ChainConfig = { ...defaults, name: 'base', rpcSecret: 'BASE_RPC' }
export const polygon: ChainConfig = { ...defaults, name: 'polygon', rpcSecret: 'POLYGON_RPC' }
