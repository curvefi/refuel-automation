# pragma version 0.4.3
"""
@title CREStreamExecutor
@author Curve.Fi
@license Copyright (c) Curve.Fi, 2025 - all rights reserved
@notice Execute due streams from a Chainlink CRE report and sweep rewards to a treasury.
"""

############### INTERFACES #################
from ...modules.chainlink.src import IReceiver

implements: IReceiver


interface DonationStreamer:
    def execute(stream_id: uint256) -> bool: nonpayable
    def streams_and_rewards_due() -> (
        DynArray[uint256, N_MAX_VIEW], DynArray[uint256, N_MAX_VIEW]
    ): view


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

# An EOA needs 2300, a Safe more; bounded so a broken treasury cannot burn the batch.
SWEEP_GAS: constant(uint256) = 50_000

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
treasury: public(address)

execution_count: public(uint256)

# At MAX_STRIKES executable_due() stops offering it and onReport skips it.
strikes: public(HashMap[uint256, uint256])


################ EVENTS ###################
event StreamsExecuted:
    requested: uint256
    executed: uint256
    reward: uint256


event StreamFailed:
    stream_id: indexed(uint256)
    strikes: uint256


event StreamSetAside:
    stream_id: indexed(uint256)


event StrikesReset:
    stream_id: indexed(uint256)


event RewardSwept:
    treasury: indexed(address)
    amount: uint256


event RewardSweepFailed:
    treasury: indexed(address)
    amount: uint256


event TreasuryUpdated:
    previous_treasury: indexed(address)
    new_treasury: indexed(address)


################ INIT ####################
@deploy
def __init__(
    _streamer: address,
    _forwarder_address: address,
    _treasury: address,
    _owner: address,
):
    """
    @notice Deploy the executor.
    @param _streamer The DonationStreamer this executor drives. Immutable.
    @param _forwarder_address The CRE forwarder. Zero disables onReport until set.
    @param _treasury Where execution rewards go. Zero parks them here until set.
    @param _owner Explicit because CREATE3 constructs from an ephemeral proxy, so a
           msg.sender owner would be that proxy and nothing could ever be configured.
    """
    ownable.__init__()

    assert _streamer != empty(address), "streamer required"
    assert _owner != empty(address), "owner required"
    STREAMER = _streamer
    ownable._transfer_ownership(_owner)

    CREReceiver.__init__(_forwarder_address)

    self.treasury = _treasury
    log TreasuryUpdated(
        previous_treasury=empty(address),
        new_treasury=_treasury,
    )


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


@external
def set_treasury(_treasury: address):
    """
    @notice Set where execution rewards are swept.
    @dev Zero parks rewards here; a later set_treasury plus sweep() releases them.
    """
    ownable._check_owner()

    previous_treasury: address = self.treasury

    self.treasury = _treasury
    log TreasuryUpdated(
        previous_treasury=previous_treasury,
        new_treasury=_treasury,
    )


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
    @param report ABI-encoded (uint256[] stream_ids)
    """
    CREReceiver._on_report(metadata, report)

    stream_ids: DynArray[uint256, MAX_BATCH] = abi_decode(
        report, DynArray[uint256, MAX_BATCH]
    )

    balance_before: uint256 = self.balance
    executed: uint256 = 0
    failed: uint256 = 0
    executed, failed = self._execute_isolated(stream_ids)

    # All no-ops means an exhausted keeper, so revert. Streams that actively failed must
    # not, or the revert rolls back the strikes that would eventually retire them.
    assert len(stream_ids) == 0 or executed > 0 or failed > 0, "every execution failed"

    self.execution_count += executed

    # Safe only because both entry points are nonreentrant; sweep() is permissionless.
    reward: uint256 = self.balance - balance_before
    log StreamsExecuted(
        requested=len(stream_ids),
        executed=executed,
        reward=reward,
    )

    self._sweep()


@external
@nonreentrant
def sweep():
    """
    @notice Push any parked rewards to the treasury.
    @dev Permissionless, but the destination is owner-set.
    """
    self._sweep()


@view
@external
def executable_due() -> (DynArray[uint256, N_MAX_VIEW], DynArray[uint256, N_MAX_VIEW]):
    """
    @notice The streamer's due list minus anything set aside. The read the workflow makes.
    @dev Filtering here costs a known-bad stream no batch slot and no workflow redeploy.
    """
    due_ids: DynArray[uint256, N_MAX_VIEW] = empty(DynArray[uint256, N_MAX_VIEW])
    rewards: DynArray[uint256, N_MAX_VIEW] = empty(DynArray[uint256, N_MAX_VIEW])
    due_ids, rewards = staticcall DonationStreamer(STREAMER).streams_and_rewards_due()

    out_ids: DynArray[uint256, N_MAX_VIEW] = empty(DynArray[uint256, N_MAX_VIEW])
    out_rewards: DynArray[uint256, N_MAX_VIEW] = empty(DynArray[uint256, N_MAX_VIEW])

    for i: uint256 in range(len(due_ids), bound=N_MAX_VIEW):
        if self.strikes[due_ids[i]] >= MAX_STRIKES:
            continue
        out_ids.append(due_ids[i])
        out_rewards.append(rewards[i])

    return out_ids, out_rewards


@external
@payable
def __default__():
    """
    @dev How the reward arrives. Empty and not nonreentrant on purpose: reached from
         inside onReport on a 2300 gas stipend.
    """
    pass


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


@internal
def _sweep():
    amount: uint256 = self.balance
    if amount == 0:
        return

    treasury: address = self.treasury
    if treasury == empty(address):
        return

    # A treasury that reverts must not strand the donation that funded it.
    success: bool = raw_call(
        treasury,
        b"",
        value=amount,
        gas=SWEEP_GAS,
        revert_on_failure=False,
    )

    if success:
        log RewardSwept(treasury=treasury, amount=amount)
    else:
        log RewardSweepFailed(treasury=treasury, amount=amount)
