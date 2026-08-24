# pragma version 0.4.3
"""
@title CREStreamExecutor
@author Curve.Fi
@license Copyright (c) Curve.Fi, 2025 - all rights reserved
@notice Execute due streams from a Chainlink CRE report.
"""

############### INTERFACES #################
from ...modules.chainlink.src import IReceiver

implements: IReceiver


interface DonationStreamer:
    def execute(stream_id: uint256) -> bool: nonpayable
    def streams_due() -> DynArray[uint256, N_MAX_VIEW]: view


################ MODULES ##################
from snekmate.auth import ownable

initializes: ownable
exports: (
    ownable.owner,
    ownable.transfer_ownership,
    ownable.renounce_ownership,
)

from ...modules.chainlink.src import CREReceiver

initializes: CREReceiver[ownable := ownable]
exports: CREReceiver.__interface__


############### CONSTANTS #################
# DonationStreamer.N_MAX_EXECUTE, so a report never needs chunking.
MAX_BATCH: constant(uint256) = 32

# DonationStreamer.N_MAX_VIEW, the cap on its own due-stream scan.
N_MAX_VIEW: constant(uint256) = 1024

# Consecutive failures before a stream is set aside. A success clears the count.
MAX_STRIKES: constant(uint256) = 3

# Per-stream ceiling: one call each isolates a reverting pool, this bound isolates one
# that burns gas instead. Measured cost is ~110k a stream.
EXECUTE_GAS: constant(uint256) = 500_000


############## IMMUTABLES #################
STREAMER: public(immutable(address))


################ DATA ####################
execution_count: public(uint256)

# At MAX_STRIKES executable_due() stops offering it and onReport skips it.
strikes: public(HashMap[uint256, uint256])


################ EVENTS ###################
event StreamsExecuted:
    requested: uint256
    executed: uint256


event StreamFailed:
    stream_id: indexed(uint256)
    strikes: uint256


event StreamSetAside:
    stream_id: indexed(uint256)


event StrikesReset:
    stream_id: indexed(uint256)


################ INIT ####################
@deploy
def __init__(
    _streamer: address,
    _forwarder_address: address,
    _owner: address,
):
    """
    @notice Deploy the executor.
    @param _streamer The DonationStreamer this executor drives. Immutable.
    @param _forwarder_address The CRE forwarder. Zero disables onReport until set.
    @param _owner Explicit because CREATE3 constructs from an ephemeral proxy, so a
           msg.sender owner would be that proxy and nothing could ever be configured.
    """
    ownable.__init__()

    assert _streamer != empty(address), "streamer required"
    assert _owner != empty(address), "owner required"
    STREAMER = _streamer
    ownable._transfer_ownership(_owner)

    CREReceiver.__init__(_forwarder_address)


############ OWNER FUNCTIONS #############
@external
def reset_strikes(stream_ids: DynArray[uint256, MAX_BATCH]):
    """
    @notice Put set-aside streams back in circulation.
    @dev Only needed at MAX_STRIKES; a success clears the count on its own.
    """
    ownable._check_owner()

    for stream_id: uint256 in stream_ids:
        self.strikes[stream_id] = 0
        log StrikesReset(stream_id=stream_id)


############### EXTERNAL ACTIONS #########
@external
@payable
@nonreentrant
def onReport(
    metadata: Bytes[CREReceiver.MAX_METADATA_SIZE],
    report: Bytes[CREReceiver.MAX_REPORT_SIZE],
):
    """
    @notice Called by the forwarder, after CREReceiver validates it and the workflow.
    @dev Payable only because IReceiver declares it so; v2 pays no reward and nothing
         here expects value, so any sent would be stranded.
    @param report ABI-encoded (uint256[] stream_ids)
    """
    CREReceiver._on_report(metadata, report)

    stream_ids: DynArray[uint256, MAX_BATCH] = abi_decode(
        report, DynArray[uint256, MAX_BATCH]
    )

    executed: uint256 = 0
    failed: uint256 = 0
    executed, failed = self._execute_isolated(stream_ids)

    # All no-ops means an exhausted keeper, so revert. Streams that actively failed must
    # not, or the revert rolls back the strikes that would eventually retire them.
    assert len(stream_ids) == 0 or executed > 0 or failed > 0, "every execution failed"

    self.execution_count += executed

    log StreamsExecuted(requested=len(stream_ids), executed=executed)


@view
@external
def executable_due() -> DynArray[uint256, N_MAX_VIEW]:
    """
    @notice The streamer's due list minus anything set aside. The read the workflow makes.
    @dev Filtering here costs a known-bad stream no batch slot and no workflow redeploy.
    """
    due_ids: DynArray[uint256, N_MAX_VIEW] = staticcall DonationStreamer(STREAMER).streams_due()

    out_ids: DynArray[uint256, N_MAX_VIEW] = empty(DynArray[uint256, N_MAX_VIEW])
    for i: uint256 in range(len(due_ids), bound=N_MAX_VIEW):
        if self.strikes[due_ids[i]] >= MAX_STRIKES:
            continue
        out_ids.append(due_ids[i])

    return out_ids


############ INTERNAL HELPERS ############
@internal
def _execute_isolated(stream_ids: DynArray[uint256, MAX_BATCH]) -> (uint256, uint256):
    """
    @dev One call per stream, not execute_many: that batches atomically, so one
         reverting pool would discard every other donation and do so again every tick.
    """
    executed: uint256 = 0
    failed: uint256 = 0

    for stream_id: uint256 in stream_ids:
        if self.strikes[stream_id] >= MAX_STRIKES:
            continue

        success: bool = False
        response: Bytes[32] = b""
        success, response = raw_call(
            STREAMER,
            concat(method_id("execute(uint256)"), abi_encode(stream_id)),
            max_outsize=32,
            gas=EXECUTE_GAS,
            revert_on_failure=False,
        )

        if not success:
            # Reverted, or burnt the whole per-stream allowance trying to.
            struck: uint256 = self.strikes[stream_id] + 1
            self.strikes[stream_id] = struck
            log StreamFailed(stream_id=stream_id, strikes=struck)
            if struck == MAX_STRIKES:
                log StreamSetAside(stream_id=stream_id)
            failed += 1
            continue

        if len(response) == 32 and abi_decode(response, bool):
            executed += 1
            # Recovered, so it is no longer part-way to being set aside.
            if self.strikes[stream_id] != 0:
                self.strikes[stream_id] = 0
                log StrikesReset(stream_id=stream_id)

    return executed, failed


