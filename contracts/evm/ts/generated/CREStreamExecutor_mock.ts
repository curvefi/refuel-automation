// Code generated — DO NOT EDIT.
import type { Address } from 'viem'
import { addContractMock, type ContractMock, type EvmMock } from '@chainlink/cre-sdk/test'

import { CREStreamExecutorABI } from './CREStreamExecutor'

export type CREStreamExecutorMock = {
  sTREAMER?: () => `0x${string}`
  executionCount?: () => bigint
  expectedAuthor?: () => `0x${string}`
  expectedWorkflowId?: () => `0x${string}`
  expectedWorkflowName?: () => `0x${string}`
  forwarderAddress?: () => `0x${string}`
  owner?: () => `0x${string}`
  supportsInterface?: (interfaceId: `0x${string}`) => boolean
  treasury?: () => `0x${string}`
} & Pick<ContractMock<typeof CREStreamExecutorABI>, 'writeReport'>

export function newCREStreamExecutorMock(address: Address, evmMock: EvmMock): CREStreamExecutorMock {
  return addContractMock(evmMock, { address, abi: CREStreamExecutorABI }) as CREStreamExecutorMock
}

