// Code generated — DO NOT EDIT.
import type { Address } from 'viem'
import { addContractMock, type ContractMock, type EvmMock } from '@chainlink/cre-sdk/test'

import { DonationStreamerABI } from './DonationStreamer'

export type DonationStreamerMock = {
  isDue?: (streamId: bigint) => boolean
  streamCount?: () => bigint
  streams?: (arg0: bigint) => { donor: `0x${string}`; pool: `0x${string}`; coins: readonly `0x${string}`[]; amounts_per_period: readonly bigint[]; period_length: bigint; reward_per_period: bigint; next_ts: bigint; reward_remaining: bigint; amounts_remaining: readonly bigint[]; periods_remaining: bigint }
  streamsAndRewardsDue?: () => readonly [readonly bigint[], readonly bigint[]]
} & Pick<ContractMock<typeof DonationStreamerABI>, 'writeReport'>

export function newDonationStreamerMock(address: Address, evmMock: EvmMock): DonationStreamerMock {
  return addContractMock(evmMock, { address, abi: DonationStreamerABI }) as DonationStreamerMock
}

