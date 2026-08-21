// Code generated — DO NOT EDIT.
import {
  decodeEventLog,
  decodeFunctionResult,
  encodeEventTopics,
  encodeFunctionData,
  zeroAddress,
} from 'viem'
import type { Address, Hex } from 'viem'
import {
  bytesToHex,
  encodeCallMsg,
  EVMClient,
  hexToBase64,
  LAST_FINALIZED_BLOCK_NUMBER,
  prepareReportRequest,
  type EVMLog,
  type Runtime,
} from '@chainlink/cre-sdk'

export interface DecodedLog<T> extends Omit<EVMLog, 'data'> { data: T }

const encodeTopicValue = (t: Hex | Hex[] | null): string[] => {
  if (t == null) return []
  if (Array.isArray(t)) return t.map(hexToBase64)
  return [hexToBase64(t)]
}





/**
 * Filter params for CRESecurityWarning. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type CRESecurityWarningTopics = {
}

/**
 * Decoded CRESecurityWarning event data.
 */
export type CRESecurityWarningDecoded = {
  message: string
}


/**
 * Filter params for ExpectedAuthorUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type ExpectedAuthorUpdatedTopics = {
  previousAuthor?: `0x${string}`
  newAuthor?: `0x${string}`
}

/**
 * Decoded ExpectedAuthorUpdated event data.
 */
export type ExpectedAuthorUpdatedDecoded = {
  previousAuthor: `0x${string}`
  newAuthor: `0x${string}`
}


/**
 * Filter params for ExpectedWorkflowIdUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type ExpectedWorkflowIdUpdatedTopics = {
  previousId?: `0x${string}`
  newId?: `0x${string}`
}

/**
 * Decoded ExpectedWorkflowIdUpdated event data.
 */
export type ExpectedWorkflowIdUpdatedDecoded = {
  previousId: `0x${string}`
  newId: `0x${string}`
}


/**
 * Filter params for ExpectedWorkflowNameUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type ExpectedWorkflowNameUpdatedTopics = {
  previousName?: `0x${string}`
  newName?: `0x${string}`
}

/**
 * Decoded ExpectedWorkflowNameUpdated event data.
 */
export type ExpectedWorkflowNameUpdatedDecoded = {
  previousName: `0x${string}`
  newName: `0x${string}`
}


/**
 * Filter params for ForwarderAddressUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type ForwarderAddressUpdatedTopics = {
  previousForwarder?: `0x${string}`
  newForwarder?: `0x${string}`
}

/**
 * Decoded ForwarderAddressUpdated event data.
 */
export type ForwarderAddressUpdatedDecoded = {
  previousForwarder: `0x${string}`
  newForwarder: `0x${string}`
}


/**
 * Filter params for OwnershipTransferred. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type OwnershipTransferredTopics = {
  previousOwner?: `0x${string}`
  newOwner?: `0x${string}`
}

/**
 * Decoded OwnershipTransferred event data.
 */
export type OwnershipTransferredDecoded = {
  previousOwner: `0x${string}`
  newOwner: `0x${string}`
}


/**
 * Filter params for RewardSweepFailed. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type RewardSweepFailedTopics = {
  treasury?: `0x${string}`
}

/**
 * Decoded RewardSweepFailed event data.
 */
export type RewardSweepFailedDecoded = {
  treasury: `0x${string}`
  amount: bigint
}


/**
 * Filter params for RewardSwept. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type RewardSweptTopics = {
  treasury?: `0x${string}`
}

/**
 * Decoded RewardSwept event data.
 */
export type RewardSweptDecoded = {
  treasury: `0x${string}`
  amount: bigint
}


/**
 * Filter params for StreamFailed. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type StreamFailedTopics = {
  streamId?: bigint
}

/**
 * Decoded StreamFailed event data.
 */
export type StreamFailedDecoded = {
  streamId: bigint
  strikes: bigint
}


/**
 * Filter params for StreamSetAside. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type StreamSetAsideTopics = {
  streamId?: bigint
}

/**
 * Decoded StreamSetAside event data.
 */
export type StreamSetAsideDecoded = {
  streamId: bigint
}


/**
 * Filter params for StreamsExecuted. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type StreamsExecutedTopics = {
}

/**
 * Decoded StreamsExecuted event data.
 */
export type StreamsExecutedDecoded = {
  requested: bigint
  executed: bigint
  reward: bigint
}


/**
 * Filter params for StrikesReset. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type StrikesResetTopics = {
  streamId?: bigint
}

/**
 * Decoded StrikesReset event data.
 */
export type StrikesResetDecoded = {
  streamId: bigint
}


/**
 * Filter params for TreasuryUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type TreasuryUpdatedTopics = {
  previousTreasury?: `0x${string}`
  newTreasury?: `0x${string}`
}

/**
 * Decoded TreasuryUpdated event data.
 */
export type TreasuryUpdatedDecoded = {
  previousTreasury: `0x${string}`
  newTreasury: `0x${string}`
}


type BlockNumberOption = typeof LAST_FINALIZED_BLOCK_NUMBER

export const CREStreamExecutorABI = [{"name":"StreamsExecuted","inputs":[{"name":"requested","type":"uint256","indexed":false},{"name":"executed","type":"uint256","indexed":false},{"name":"reward","type":"uint256","indexed":false}],"anonymous":false,"type":"event"},{"name":"StreamFailed","inputs":[{"name":"stream_id","type":"uint256","indexed":true},{"name":"strikes","type":"uint256","indexed":false}],"anonymous":false,"type":"event"},{"name":"StreamSetAside","inputs":[{"name":"stream_id","type":"uint256","indexed":true}],"anonymous":false,"type":"event"},{"name":"StrikesReset","inputs":[{"name":"stream_id","type":"uint256","indexed":true}],"anonymous":false,"type":"event"},{"name":"RewardSwept","inputs":[{"name":"treasury","type":"address","indexed":true},{"name":"amount","type":"uint256","indexed":false}],"anonymous":false,"type":"event"},{"name":"RewardSweepFailed","inputs":[{"name":"treasury","type":"address","indexed":true},{"name":"amount","type":"uint256","indexed":false}],"anonymous":false,"type":"event"},{"name":"TreasuryUpdated","inputs":[{"name":"previous_treasury","type":"address","indexed":true},{"name":"new_treasury","type":"address","indexed":true}],"anonymous":false,"type":"event"},{"name":"OwnershipTransferred","inputs":[{"name":"previous_owner","type":"address","indexed":true},{"name":"new_owner","type":"address","indexed":true}],"anonymous":false,"type":"event"},{"name":"CRESecurityWarning","inputs":[{"name":"message","type":"string","indexed":false}],"anonymous":false,"type":"event"},{"name":"ForwarderAddressUpdated","inputs":[{"name":"previous_forwarder","type":"address","indexed":true},{"name":"new_forwarder","type":"address","indexed":true}],"anonymous":false,"type":"event"},{"name":"ExpectedAuthorUpdated","inputs":[{"name":"previous_author","type":"address","indexed":true},{"name":"new_author","type":"address","indexed":true}],"anonymous":false,"type":"event"},{"name":"ExpectedWorkflowNameUpdated","inputs":[{"name":"previous_name","type":"bytes10","indexed":true},{"name":"new_name","type":"bytes10","indexed":true}],"anonymous":false,"type":"event"},{"name":"ExpectedWorkflowIdUpdated","inputs":[{"name":"previous_id","type":"bytes32","indexed":true},{"name":"new_id","type":"bytes32","indexed":true}],"anonymous":false,"type":"event"},{"stateMutability":"view","type":"function","name":"owner","inputs":[],"outputs":[{"name":"","type":"address"}]},{"stateMutability":"nonpayable","type":"function","name":"transfer_ownership","inputs":[{"name":"new_owner","type":"address"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"renounce_ownership","inputs":[],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"set_forwarder_address","inputs":[{"name":"_forwarder_address","type":"address"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"set_expected_author","inputs":[{"name":"_expected_author","type":"address"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"set_expected_workflow_name","inputs":[{"name":"_expected_workflow_name","type":"string"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"set_expected_workflow_id","inputs":[{"name":"_expected_workflow_id","type":"bytes32"}],"outputs":[]},{"stateMutability":"view","type":"function","name":"supportsInterface","inputs":[{"name":"interface_id","type":"bytes4"}],"outputs":[{"name":"","type":"bool"}]},{"stateMutability":"view","type":"function","name":"forwarder_address","inputs":[],"outputs":[{"name":"","type":"address"}]},{"stateMutability":"view","type":"function","name":"expected_author","inputs":[],"outputs":[{"name":"","type":"address"}]},{"stateMutability":"view","type":"function","name":"expected_workflow_name","inputs":[],"outputs":[{"name":"","type":"bytes10"}]},{"stateMutability":"view","type":"function","name":"expected_workflow_id","inputs":[],"outputs":[{"name":"","type":"bytes32"}]},{"stateMutability":"nonpayable","type":"function","name":"reset_strikes","inputs":[{"name":"stream_ids","type":"uint256[]"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"set_treasury","inputs":[{"name":"_treasury","type":"address"}],"outputs":[]},{"stateMutability":"payable","type":"function","name":"onReport","inputs":[{"name":"metadata","type":"bytes"},{"name":"report","type":"bytes"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"sweep","inputs":[],"outputs":[]},{"stateMutability":"view","type":"function","name":"executable_due","inputs":[],"outputs":[{"name":"","type":"uint256[]"},{"name":"","type":"uint256[]"}]},{"stateMutability":"payable","type":"fallback"},{"stateMutability":"view","type":"function","name":"STREAMER","inputs":[],"outputs":[{"name":"","type":"address"}]},{"stateMutability":"view","type":"function","name":"treasury","inputs":[],"outputs":[{"name":"","type":"address"}]},{"stateMutability":"view","type":"function","name":"execution_count","inputs":[],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"strikes","inputs":[{"name":"arg0","type":"uint256"}],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"nonpayable","type":"constructor","inputs":[{"name":"_streamer","type":"address"},{"name":"_forwarder_address","type":"address"},{"name":"_treasury","type":"address"},{"name":"_owner","type":"address"}],"outputs":[]}] as const

export class CREStreamExecutor {
  constructor(
    private readonly client: EVMClient,
    public readonly address: Address,
  ) {}

  sTREAMER(
    runtime: Runtime<unknown>,
    callBlockNumber: BlockNumberOption = LAST_FINALIZED_BLOCK_NUMBER,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'STREAMER' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: callBlockNumber,
      })
      .result()

    return decodeFunctionResult({
      abi: CREStreamExecutorABI,
      functionName: 'STREAMER' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  executableDue(
    runtime: Runtime<unknown>,
    callBlockNumber: BlockNumberOption = LAST_FINALIZED_BLOCK_NUMBER,
  ): readonly [readonly bigint[], readonly bigint[]] {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'executable_due' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: callBlockNumber,
      })
      .result()

    return decodeFunctionResult({
      abi: CREStreamExecutorABI,
      functionName: 'executable_due' as const,
      data: bytesToHex(result.data),
    }) as readonly [readonly bigint[], readonly bigint[]]
  }

  executionCount(
    runtime: Runtime<unknown>,
    callBlockNumber: BlockNumberOption = LAST_FINALIZED_BLOCK_NUMBER,
  ): bigint {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'execution_count' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: callBlockNumber,
      })
      .result()

    return decodeFunctionResult({
      abi: CREStreamExecutorABI,
      functionName: 'execution_count' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  expectedAuthor(
    runtime: Runtime<unknown>,
    callBlockNumber: BlockNumberOption = LAST_FINALIZED_BLOCK_NUMBER,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'expected_author' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: callBlockNumber,
      })
      .result()

    return decodeFunctionResult({
      abi: CREStreamExecutorABI,
      functionName: 'expected_author' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  expectedWorkflowId(
    runtime: Runtime<unknown>,
    callBlockNumber: BlockNumberOption = LAST_FINALIZED_BLOCK_NUMBER,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'expected_workflow_id' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: callBlockNumber,
      })
      .result()

    return decodeFunctionResult({
      abi: CREStreamExecutorABI,
      functionName: 'expected_workflow_id' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  expectedWorkflowName(
    runtime: Runtime<unknown>,
    callBlockNumber: BlockNumberOption = LAST_FINALIZED_BLOCK_NUMBER,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'expected_workflow_name' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: callBlockNumber,
      })
      .result()

    return decodeFunctionResult({
      abi: CREStreamExecutorABI,
      functionName: 'expected_workflow_name' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  forwarderAddress(
    runtime: Runtime<unknown>,
    callBlockNumber: BlockNumberOption = LAST_FINALIZED_BLOCK_NUMBER,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'forwarder_address' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: callBlockNumber,
      })
      .result()

    return decodeFunctionResult({
      abi: CREStreamExecutorABI,
      functionName: 'forwarder_address' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  owner(
    runtime: Runtime<unknown>,
    callBlockNumber: BlockNumberOption = LAST_FINALIZED_BLOCK_NUMBER,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'owner' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: callBlockNumber,
      })
      .result()

    return decodeFunctionResult({
      abi: CREStreamExecutorABI,
      functionName: 'owner' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  strikes(
    runtime: Runtime<unknown>,
    arg0: bigint,
    callBlockNumber: BlockNumberOption = LAST_FINALIZED_BLOCK_NUMBER,
  ): bigint {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'strikes' as const,
      args: [arg0],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: callBlockNumber,
      })
      .result()

    return decodeFunctionResult({
      abi: CREStreamExecutorABI,
      functionName: 'strikes' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  supportsInterface(
    runtime: Runtime<unknown>,
    interfaceId: `0x${string}`,
    callBlockNumber: BlockNumberOption = LAST_FINALIZED_BLOCK_NUMBER,
  ): boolean {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'supportsInterface' as const,
      args: [interfaceId],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: callBlockNumber,
      })
      .result()

    return decodeFunctionResult({
      abi: CREStreamExecutorABI,
      functionName: 'supportsInterface' as const,
      data: bytesToHex(result.data),
    }) as boolean
  }

  treasury(
    runtime: Runtime<unknown>,
    callBlockNumber: BlockNumberOption = LAST_FINALIZED_BLOCK_NUMBER,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'treasury' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: callBlockNumber,
      })
      .result()

    return decodeFunctionResult({
      abi: CREStreamExecutorABI,
      functionName: 'treasury' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  writeReportFromOnReport(
    runtime: Runtime<unknown>,
    metadata: `0x${string}`,
    report: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'onReport' as const,
      args: [metadata, report],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromResetStrikes(
    runtime: Runtime<unknown>,
    streamIds: readonly bigint[],
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'reset_strikes' as const,
      args: [streamIds],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromSetExpectedAuthor(
    runtime: Runtime<unknown>,
    expectedAuthor: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'set_expected_author' as const,
      args: [expectedAuthor],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromSetExpectedWorkflowId(
    runtime: Runtime<unknown>,
    expectedWorkflowId: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'set_expected_workflow_id' as const,
      args: [expectedWorkflowId],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromSetExpectedWorkflowName(
    runtime: Runtime<unknown>,
    expectedWorkflowName: string,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'set_expected_workflow_name' as const,
      args: [expectedWorkflowName],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromSetForwarderAddress(
    runtime: Runtime<unknown>,
    forwarderAddress: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'set_forwarder_address' as const,
      args: [forwarderAddress],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromSetTreasury(
    runtime: Runtime<unknown>,
    treasury: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'set_treasury' as const,
      args: [treasury],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromTransferOwnership(
    runtime: Runtime<unknown>,
    newOwner: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: CREStreamExecutorABI,
      functionName: 'transfer_ownership' as const,
      args: [newOwner],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReport(
    runtime: Runtime<unknown>,
    callData: Hex,
    gasConfig?: { gasLimit?: string },
  ) {
    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  /**
   * Creates a log trigger for CRESecurityWarning events.
   * The returned trigger's adapt method decodes the raw log into CRESecurityWarningDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerCRESecurityWarning(
    filters?: CRESecurityWarningTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'CRESecurityWarning' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
      }
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'CRESecurityWarning' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
        }
        return encodeEventTopics({
          abi: CREStreamExecutorABI,
          eventName: 'CRESecurityWarning' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<CRESecurityWarningDecoded> => contract.decodeCRESecurityWarning(rawOutput),
    }
  }

  /**
   * Decodes a log into CRESecurityWarning data, preserving all log metadata.
   */
  decodeCRESecurityWarning(log: EVMLog): DecodedLog<CRESecurityWarningDecoded> {
    const decoded = decodeEventLog({
      abi: CREStreamExecutorABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as CRESecurityWarningDecoded }
  }

  /**
   * Creates a log trigger for ExpectedAuthorUpdated events.
   * The returned trigger's adapt method decodes the raw log into ExpectedAuthorUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerExpectedAuthorUpdated(
    filters?: ExpectedAuthorUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'ExpectedAuthorUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        previous_author: f.previousAuthor,
        new_author: f.newAuthor,
      }
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'ExpectedAuthorUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          previous_author: f.previousAuthor,
          new_author: f.newAuthor,
        }
        return encodeEventTopics({
          abi: CREStreamExecutorABI,
          eventName: 'ExpectedAuthorUpdated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<ExpectedAuthorUpdatedDecoded> => contract.decodeExpectedAuthorUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into ExpectedAuthorUpdated data, preserving all log metadata.
   */
  decodeExpectedAuthorUpdated(log: EVMLog): DecodedLog<ExpectedAuthorUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: CREStreamExecutorABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as ExpectedAuthorUpdatedDecoded }
  }

  /**
   * Creates a log trigger for ExpectedWorkflowIdUpdated events.
   * The returned trigger's adapt method decodes the raw log into ExpectedWorkflowIdUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerExpectedWorkflowIdUpdated(
    filters?: ExpectedWorkflowIdUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'ExpectedWorkflowIdUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        previous_id: f.previousId,
        new_id: f.newId,
      }
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'ExpectedWorkflowIdUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          previous_id: f.previousId,
          new_id: f.newId,
        }
        return encodeEventTopics({
          abi: CREStreamExecutorABI,
          eventName: 'ExpectedWorkflowIdUpdated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<ExpectedWorkflowIdUpdatedDecoded> => contract.decodeExpectedWorkflowIdUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into ExpectedWorkflowIdUpdated data, preserving all log metadata.
   */
  decodeExpectedWorkflowIdUpdated(log: EVMLog): DecodedLog<ExpectedWorkflowIdUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: CREStreamExecutorABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as ExpectedWorkflowIdUpdatedDecoded }
  }

  /**
   * Creates a log trigger for ExpectedWorkflowNameUpdated events.
   * The returned trigger's adapt method decodes the raw log into ExpectedWorkflowNameUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerExpectedWorkflowNameUpdated(
    filters?: ExpectedWorkflowNameUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'ExpectedWorkflowNameUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        previous_name: f.previousName,
        new_name: f.newName,
      }
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'ExpectedWorkflowNameUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          previous_name: f.previousName,
          new_name: f.newName,
        }
        return encodeEventTopics({
          abi: CREStreamExecutorABI,
          eventName: 'ExpectedWorkflowNameUpdated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<ExpectedWorkflowNameUpdatedDecoded> => contract.decodeExpectedWorkflowNameUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into ExpectedWorkflowNameUpdated data, preserving all log metadata.
   */
  decodeExpectedWorkflowNameUpdated(log: EVMLog): DecodedLog<ExpectedWorkflowNameUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: CREStreamExecutorABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as ExpectedWorkflowNameUpdatedDecoded }
  }

  /**
   * Creates a log trigger for ForwarderAddressUpdated events.
   * The returned trigger's adapt method decodes the raw log into ForwarderAddressUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerForwarderAddressUpdated(
    filters?: ForwarderAddressUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'ForwarderAddressUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        previous_forwarder: f.previousForwarder,
        new_forwarder: f.newForwarder,
      }
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'ForwarderAddressUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          previous_forwarder: f.previousForwarder,
          new_forwarder: f.newForwarder,
        }
        return encodeEventTopics({
          abi: CREStreamExecutorABI,
          eventName: 'ForwarderAddressUpdated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<ForwarderAddressUpdatedDecoded> => contract.decodeForwarderAddressUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into ForwarderAddressUpdated data, preserving all log metadata.
   */
  decodeForwarderAddressUpdated(log: EVMLog): DecodedLog<ForwarderAddressUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: CREStreamExecutorABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as ForwarderAddressUpdatedDecoded }
  }

  /**
   * Creates a log trigger for OwnershipTransferred events.
   * The returned trigger's adapt method decodes the raw log into OwnershipTransferredDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerOwnershipTransferred(
    filters?: OwnershipTransferredTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'OwnershipTransferred' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        previous_owner: f.previousOwner,
        new_owner: f.newOwner,
      }
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'OwnershipTransferred' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          previous_owner: f.previousOwner,
          new_owner: f.newOwner,
        }
        return encodeEventTopics({
          abi: CREStreamExecutorABI,
          eventName: 'OwnershipTransferred' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<OwnershipTransferredDecoded> => contract.decodeOwnershipTransferred(rawOutput),
    }
  }

  /**
   * Decodes a log into OwnershipTransferred data, preserving all log metadata.
   */
  decodeOwnershipTransferred(log: EVMLog): DecodedLog<OwnershipTransferredDecoded> {
    const decoded = decodeEventLog({
      abi: CREStreamExecutorABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as OwnershipTransferredDecoded }
  }

  /**
   * Creates a log trigger for RewardSweepFailed events.
   * The returned trigger's adapt method decodes the raw log into RewardSweepFailedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerRewardSweepFailed(
    filters?: RewardSweepFailedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'RewardSweepFailed' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        treasury: f.treasury,
      }
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'RewardSweepFailed' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          treasury: f.treasury,
        }
        return encodeEventTopics({
          abi: CREStreamExecutorABI,
          eventName: 'RewardSweepFailed' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<RewardSweepFailedDecoded> => contract.decodeRewardSweepFailed(rawOutput),
    }
  }

  /**
   * Decodes a log into RewardSweepFailed data, preserving all log metadata.
   */
  decodeRewardSweepFailed(log: EVMLog): DecodedLog<RewardSweepFailedDecoded> {
    const decoded = decodeEventLog({
      abi: CREStreamExecutorABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as RewardSweepFailedDecoded }
  }

  /**
   * Creates a log trigger for RewardSwept events.
   * The returned trigger's adapt method decodes the raw log into RewardSweptDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerRewardSwept(
    filters?: RewardSweptTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'RewardSwept' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        treasury: f.treasury,
      }
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'RewardSwept' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          treasury: f.treasury,
        }
        return encodeEventTopics({
          abi: CREStreamExecutorABI,
          eventName: 'RewardSwept' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<RewardSweptDecoded> => contract.decodeRewardSwept(rawOutput),
    }
  }

  /**
   * Decodes a log into RewardSwept data, preserving all log metadata.
   */
  decodeRewardSwept(log: EVMLog): DecodedLog<RewardSweptDecoded> {
    const decoded = decodeEventLog({
      abi: CREStreamExecutorABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as RewardSweptDecoded }
  }

  /**
   * Creates a log trigger for StreamFailed events.
   * The returned trigger's adapt method decodes the raw log into StreamFailedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerStreamFailed(
    filters?: StreamFailedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'StreamFailed' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        stream_id: f.streamId,
      }
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'StreamFailed' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          stream_id: f.streamId,
        }
        return encodeEventTopics({
          abi: CREStreamExecutorABI,
          eventName: 'StreamFailed' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<StreamFailedDecoded> => contract.decodeStreamFailed(rawOutput),
    }
  }

  /**
   * Decodes a log into StreamFailed data, preserving all log metadata.
   */
  decodeStreamFailed(log: EVMLog): DecodedLog<StreamFailedDecoded> {
    const decoded = decodeEventLog({
      abi: CREStreamExecutorABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as StreamFailedDecoded }
  }

  /**
   * Creates a log trigger for StreamSetAside events.
   * The returned trigger's adapt method decodes the raw log into StreamSetAsideDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerStreamSetAside(
    filters?: StreamSetAsideTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'StreamSetAside' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        stream_id: f.streamId,
      }
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'StreamSetAside' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          stream_id: f.streamId,
        }
        return encodeEventTopics({
          abi: CREStreamExecutorABI,
          eventName: 'StreamSetAside' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<StreamSetAsideDecoded> => contract.decodeStreamSetAside(rawOutput),
    }
  }

  /**
   * Decodes a log into StreamSetAside data, preserving all log metadata.
   */
  decodeStreamSetAside(log: EVMLog): DecodedLog<StreamSetAsideDecoded> {
    const decoded = decodeEventLog({
      abi: CREStreamExecutorABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as StreamSetAsideDecoded }
  }

  /**
   * Creates a log trigger for StreamsExecuted events.
   * The returned trigger's adapt method decodes the raw log into StreamsExecutedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerStreamsExecuted(
    filters?: StreamsExecutedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'StreamsExecuted' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
      }
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'StreamsExecuted' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
        }
        return encodeEventTopics({
          abi: CREStreamExecutorABI,
          eventName: 'StreamsExecuted' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<StreamsExecutedDecoded> => contract.decodeStreamsExecuted(rawOutput),
    }
  }

  /**
   * Decodes a log into StreamsExecuted data, preserving all log metadata.
   */
  decodeStreamsExecuted(log: EVMLog): DecodedLog<StreamsExecutedDecoded> {
    const decoded = decodeEventLog({
      abi: CREStreamExecutorABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as StreamsExecutedDecoded }
  }

  /**
   * Creates a log trigger for StrikesReset events.
   * The returned trigger's adapt method decodes the raw log into StrikesResetDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerStrikesReset(
    filters?: StrikesResetTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'StrikesReset' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        stream_id: f.streamId,
      }
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'StrikesReset' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          stream_id: f.streamId,
        }
        return encodeEventTopics({
          abi: CREStreamExecutorABI,
          eventName: 'StrikesReset' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<StrikesResetDecoded> => contract.decodeStrikesReset(rawOutput),
    }
  }

  /**
   * Decodes a log into StrikesReset data, preserving all log metadata.
   */
  decodeStrikesReset(log: EVMLog): DecodedLog<StrikesResetDecoded> {
    const decoded = decodeEventLog({
      abi: CREStreamExecutorABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as StrikesResetDecoded }
  }

  /**
   * Creates a log trigger for TreasuryUpdated events.
   * The returned trigger's adapt method decodes the raw log into TreasuryUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerTreasuryUpdated(
    filters?: TreasuryUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'TreasuryUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        previous_treasury: f.previousTreasury,
        new_treasury: f.newTreasury,
      }
      const encoded = encodeEventTopics({
        abi: CREStreamExecutorABI,
        eventName: 'TreasuryUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          previous_treasury: f.previousTreasury,
          new_treasury: f.newTreasury,
        }
        return encodeEventTopics({
          abi: CREStreamExecutorABI,
          eventName: 'TreasuryUpdated' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<TreasuryUpdatedDecoded> => contract.decodeTreasuryUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into TreasuryUpdated data, preserving all log metadata.
   */
  decodeTreasuryUpdated(log: EVMLog): DecodedLog<TreasuryUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: CREStreamExecutorABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as TreasuryUpdatedDecoded }
  }
}

