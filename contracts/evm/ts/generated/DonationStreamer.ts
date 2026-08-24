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
 * Filter params for StreamCancelled. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type StreamCancelledTopics = {
  donor?: `0x${string}`
  pool?: `0x${string}`
}

/**
 * Decoded StreamCancelled event data.
 */
export type StreamCancelledDecoded = {
  streamId: bigint
  donor: `0x${string}`
  pool: `0x${string}`
  amounts: readonly bigint[]
}


/**
 * Filter params for StreamCreated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type StreamCreatedTopics = {
  donor?: `0x${string}`
  pool?: `0x${string}`
}

/**
 * Decoded StreamCreated event data.
 */
export type StreamCreatedDecoded = {
  streamId: bigint
  donor: `0x${string}`
  pool: `0x${string}`
  amounts: readonly bigint[]
  period_length: bigint
  nPeriods: bigint
}


/**
 * Filter params for StreamExecuted. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type StreamExecutedTopics = {
  caller?: `0x${string}`
  pool?: `0x${string}`
}

/**
 * Decoded StreamExecuted event data.
 */
export type StreamExecutedDecoded = {
  streamId: bigint
  caller: `0x${string}`
  pool: `0x${string}`
  periods: bigint
  amounts: readonly bigint[]
}


type BlockNumberOption = typeof LAST_FINALIZED_BLOCK_NUMBER

export const DonationStreamerABI = [{"name":"StreamCreated","inputs":[{"name":"stream_id","type":"uint256","indexed":false},{"name":"donor","type":"address","indexed":true},{"name":"pool","type":"address","indexed":true},{"name":"amounts","type":"uint256[2]","indexed":false},{"name":"period_length","type":"uint256","indexed":false},{"name":"n_periods","type":"uint256","indexed":false}],"anonymous":false,"type":"event"},{"name":"StreamExecuted","inputs":[{"name":"stream_id","type":"uint256","indexed":false},{"name":"caller","type":"address","indexed":true},{"name":"pool","type":"address","indexed":true},{"name":"periods","type":"uint256","indexed":false},{"name":"amounts","type":"uint256[2]","indexed":false}],"anonymous":false,"type":"event"},{"name":"StreamCancelled","inputs":[{"name":"stream_id","type":"uint256","indexed":false},{"name":"donor","type":"address","indexed":true},{"name":"pool","type":"address","indexed":true},{"name":"amounts","type":"uint256[2]","indexed":false}],"anonymous":false,"type":"event"},{"stateMutability":"view","type":"function","name":"is_due","inputs":[{"name":"stream_id","type":"uint256"}],"outputs":[{"name":"","type":"bool"}]},{"stateMutability":"view","type":"function","name":"streams_due","inputs":[],"outputs":[{"name":"","type":"uint256[]"}]},{"stateMutability":"nonpayable","type":"function","name":"create_stream","inputs":[{"name":"pool","type":"address"},{"name":"coins","type":"address[2]"},{"name":"amounts","type":"uint256[2]"},{"name":"period_length","type":"uint256"},{"name":"n_periods","type":"uint256"}],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"nonpayable","type":"function","name":"cancel_stream","inputs":[{"name":"stream_id","type":"uint256"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"execute","inputs":[{"name":"stream_id","type":"uint256"}],"outputs":[{"name":"","type":"bool"}]},{"stateMutability":"nonpayable","type":"function","name":"execute_many","inputs":[{"name":"stream_ids","type":"uint256[]"}],"outputs":[{"name":"","type":"bool[]"}]},{"stateMutability":"view","type":"function","name":"stream_count","inputs":[],"outputs":[{"name":"","type":"uint256"}]},{"stateMutability":"view","type":"function","name":"streams","inputs":[{"name":"arg0","type":"uint256"}],"outputs":[{"name":"","type":"tuple","components":[{"name":"donor","type":"address"},{"name":"pool","type":"address"},{"name":"coins","type":"address[2]"},{"name":"amounts_per_period","type":"uint256[2]"},{"name":"period_length","type":"uint256"},{"name":"next_ts","type":"uint256"},{"name":"amounts_remaining","type":"uint256[2]"},{"name":"periods_remaining","type":"uint256"}]}]},{"stateMutability":"nonpayable","type":"constructor","inputs":[],"outputs":[]}] as const

export class DonationStreamer {
  constructor(
    private readonly client: EVMClient,
    public readonly address: Address,
  ) {}

  isDue(
    runtime: Runtime<unknown>,
    streamId: bigint,
    callBlockNumber: BlockNumberOption = LAST_FINALIZED_BLOCK_NUMBER,
  ): boolean {
    const callData = encodeFunctionData({
      abi: DonationStreamerABI,
      functionName: 'is_due' as const,
      args: [streamId],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: callBlockNumber,
      })
      .result()

    return decodeFunctionResult({
      abi: DonationStreamerABI,
      functionName: 'is_due' as const,
      data: bytesToHex(result.data),
    }) as boolean
  }

  streamCount(
    runtime: Runtime<unknown>,
    callBlockNumber: BlockNumberOption = LAST_FINALIZED_BLOCK_NUMBER,
  ): bigint {
    const callData = encodeFunctionData({
      abi: DonationStreamerABI,
      functionName: 'stream_count' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: callBlockNumber,
      })
      .result()

    return decodeFunctionResult({
      abi: DonationStreamerABI,
      functionName: 'stream_count' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  streams(
    runtime: Runtime<unknown>,
    arg0: bigint,
    callBlockNumber: BlockNumberOption = LAST_FINALIZED_BLOCK_NUMBER,
  ): { donor: `0x${string}`; pool: `0x${string}`; coins: readonly `0x${string}`[]; amounts_per_period: readonly bigint[]; period_length: bigint; next_ts: bigint; amounts_remaining: readonly bigint[]; periods_remaining: bigint } {
    const callData = encodeFunctionData({
      abi: DonationStreamerABI,
      functionName: 'streams' as const,
      args: [arg0],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: callBlockNumber,
      })
      .result()

    return decodeFunctionResult({
      abi: DonationStreamerABI,
      functionName: 'streams' as const,
      data: bytesToHex(result.data),
    }) as { donor: `0x${string}`; pool: `0x${string}`; coins: readonly `0x${string}`[]; amounts_per_period: readonly bigint[]; period_length: bigint; next_ts: bigint; amounts_remaining: readonly bigint[]; periods_remaining: bigint }
  }

  streamsDue(
    runtime: Runtime<unknown>,
    callBlockNumber: BlockNumberOption = LAST_FINALIZED_BLOCK_NUMBER,
  ): readonly bigint[] {
    const callData = encodeFunctionData({
      abi: DonationStreamerABI,
      functionName: 'streams_due' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: callBlockNumber,
      })
      .result()

    return decodeFunctionResult({
      abi: DonationStreamerABI,
      functionName: 'streams_due' as const,
      data: bytesToHex(result.data),
    }) as readonly bigint[]
  }

  writeReportFromCancelStream(
    runtime: Runtime<unknown>,
    streamId: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: DonationStreamerABI,
      functionName: 'cancel_stream' as const,
      args: [streamId],
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

  writeReportFromCreateStream(
    runtime: Runtime<unknown>,
    pool: `0x${string}`,
    coins: readonly [`0x${string}`, `0x${string}`],
    amounts: readonly [bigint, bigint],
    period_length: bigint,
    nPeriods: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: DonationStreamerABI,
      functionName: 'create_stream' as const,
      args: [pool, coins, amounts, period_length, nPeriods],
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

  writeReportFromExecute(
    runtime: Runtime<unknown>,
    streamId: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: DonationStreamerABI,
      functionName: 'execute' as const,
      args: [streamId],
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

  writeReportFromExecuteMany(
    runtime: Runtime<unknown>,
    streamIds: readonly bigint[],
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: DonationStreamerABI,
      functionName: 'execute_many' as const,
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
   * Creates a log trigger for StreamCancelled events.
   * The returned trigger's adapt method decodes the raw log into StreamCancelledDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerStreamCancelled(
    filters?: StreamCancelledTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: DonationStreamerABI,
        eventName: 'StreamCancelled' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        donor: f.donor,
        pool: f.pool,
      }
      const encoded = encodeEventTopics({
        abi: DonationStreamerABI,
        eventName: 'StreamCancelled' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          donor: f.donor,
          pool: f.pool,
        }
        return encodeEventTopics({
          abi: DonationStreamerABI,
          eventName: 'StreamCancelled' as const,
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
      adapt: (rawOutput: EVMLog): DecodedLog<StreamCancelledDecoded> => contract.decodeStreamCancelled(rawOutput),
    }
  }

  /**
   * Decodes a log into StreamCancelled data, preserving all log metadata.
   */
  decodeStreamCancelled(log: EVMLog): DecodedLog<StreamCancelledDecoded> {
    const decoded = decodeEventLog({
      abi: DonationStreamerABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as StreamCancelledDecoded }
  }

  /**
   * Creates a log trigger for StreamCreated events.
   * The returned trigger's adapt method decodes the raw log into StreamCreatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerStreamCreated(
    filters?: StreamCreatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: DonationStreamerABI,
        eventName: 'StreamCreated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        donor: f.donor,
        pool: f.pool,
      }
      const encoded = encodeEventTopics({
        abi: DonationStreamerABI,
        eventName: 'StreamCreated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          donor: f.donor,
          pool: f.pool,
        }
        return encodeEventTopics({
          abi: DonationStreamerABI,
          eventName: 'StreamCreated' as const,
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
      adapt: (rawOutput: EVMLog): DecodedLog<StreamCreatedDecoded> => contract.decodeStreamCreated(rawOutput),
    }
  }

  /**
   * Decodes a log into StreamCreated data, preserving all log metadata.
   */
  decodeStreamCreated(log: EVMLog): DecodedLog<StreamCreatedDecoded> {
    const decoded = decodeEventLog({
      abi: DonationStreamerABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as StreamCreatedDecoded }
  }

  /**
   * Creates a log trigger for StreamExecuted events.
   * The returned trigger's adapt method decodes the raw log into StreamExecutedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerStreamExecuted(
    filters?: StreamExecutedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: DonationStreamerABI,
        eventName: 'StreamExecuted' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        caller: f.caller,
        pool: f.pool,
      }
      const encoded = encodeEventTopics({
        abi: DonationStreamerABI,
        eventName: 'StreamExecuted' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          caller: f.caller,
          pool: f.pool,
        }
        return encodeEventTopics({
          abi: DonationStreamerABI,
          eventName: 'StreamExecuted' as const,
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
      adapt: (rawOutput: EVMLog): DecodedLog<StreamExecutedDecoded> => contract.decodeStreamExecuted(rawOutput),
    }
  }

  /**
   * Decodes a log into StreamExecuted data, preserving all log metadata.
   */
  decodeStreamExecuted(log: EVMLog): DecodedLog<StreamExecutedDecoded> {
    const decoded = decodeEventLog({
      abi: DonationStreamerABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as StreamExecutedDecoded }
  }
}

