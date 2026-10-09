export type ChainConfig = {
	name: string
	rpcSecret: string
	streamer: string
	maxBatch: number
}

// DonationStreamer is CREATE3-deployed, so the same deployer key reaches this address on
// every chain. Gnosis and Ethereum are live; Base and Polygon stay zero until they are
// deployed, and the action refuses a zero address rather than reading an empty account.
const STREAMER = '0xc33375b0bb4F0A192Bd3cBd5Ea7d53B1F9E3509E'
const NOT_DEPLOYED = '0x0000000000000000000000000000000000000000'

// The batch is sent with 600k of gas budgeted per stream, so 16 fits under 10M. A full 32
// would ask for ~19.3M, past Ethereum's 16,777,216 per-transaction cap and a Gnosis block.
// There is no per-chain balance floor to keep in step: the run works out what it needs
// from the gas limit and the chain's own fee data.
const defaults = { streamer: NOT_DEPLOYED, maxBatch: 16 }

export const ethereum: ChainConfig = { ...defaults, name: 'ethereum', rpcSecret: 'ETHEREUM_RPC', streamer: STREAMER }
export const gnosis: ChainConfig = { ...defaults, name: 'gnosis', rpcSecret: 'GNOSIS_RPC', streamer: STREAMER }
export const base: ChainConfig = { ...defaults, name: 'base', rpcSecret: 'BASE_RPC' }
export const polygon: ChainConfig = { ...defaults, name: 'polygon', rpcSecret: 'POLYGON_RPC' }
