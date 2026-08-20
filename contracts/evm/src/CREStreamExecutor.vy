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
    def execute_many(
        stream_ids: DynArray[uint256, MAX_BATCH]
    ) -> DynArray[bool, MAX_BATCH]: nonpayable


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
# DonationStreamer.N_MAX_EXECUTE. A report may never carry more than the
# streamer can execute in one call, so nothing here needs chunking.
MAX_BATCH: constant(uint256) = 32

# A treasury that is an EOA needs 2300; a Safe needs more. Bounded so a broken
# treasury cannot burn the gas the donations were meant to use.
SWEEP_GAS: constant(uint256) = 50_000


############## IMMUTABLES #################
STREAMER: public(immutable(address))


################ DATA ####################
treasury: public(address)

execution_count: public(uint256)


################ EVENTS ###################
event StreamsExecuted:
    requested: uint256
    executed: uint256
    reward: uint256


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
def __init__(_streamer: address, _forwarder_address: address, _treasury: address):
    """
    @notice Deploy the executor.
    @param _streamer The DonationStreamer this executor drives. Immutable.
    @param _forwarder_address The CRE forwarder. Zero disables onReport until set.
    @param _treasury Where execution rewards go. Zero parks them here until set.
    """
    ownable.__init__()

    assert _streamer != empty(address), "streamer required"
    STREAMER = _streamer

    CREReceiver.__init__(_forwarder_address)

    self.treasury = _treasury
    log TreasuryUpdated(
        previous_treasury=empty(address),
        new_treasury=_treasury,
    )


############ OWNER FUNCTIONS #############
@external
def set_treasury(_treasury: address):
    """
    @notice Set where execution rewards are swept.
    @dev Zero parks rewards in this contract; they are not lost, and a later
         set_treasury plus sweep() releases them.
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
def onReport(
    metadata: Bytes[CREReceiver.MAX_METADATA_SIZE],
    report: Bytes[CREReceiver.MAX_REPORT_SIZE],
):
    """
    @notice Called by the CRE forwarder via CREReceiver after it validates the
            caller and the workflow identity.
    @param report ABI-encoded (uint256[] stream_ids)
    """
    CREReceiver._on_report(metadata, report)

    stream_ids: DynArray[uint256, MAX_BATCH] = abi_decode(
        report, DynArray[uint256, MAX_BATCH]
    )

    balance_before: uint256 = self.balance
    results: DynArray[bool, MAX_BATCH] = extcall DonationStreamer(
        STREAMER
    ).execute_many(stream_ids)

    executed: uint256 = 0
    for ok: bool in results:
        executed += convert(ok, uint256)

    # A stream someone else executed between the read and this tx is a no-op, so
    # a partial batch is normal. A batch where nothing landed is not: an
    # exhausted keeper would look identical to a working one.
    assert len(stream_ids) == 0 or executed > 0, "every execution failed"

    self.execution_count += executed

    reward: uint256 = self.balance - balance_before
    log StreamsExecuted(
        requested=len(stream_ids),
        executed=executed,
        reward=reward,
    )

    self._sweep()


@external
def sweep():
    """
    @notice Push any parked rewards to the treasury.
    @dev Permissionless: the destination is owner-set, so this only ever moves
         funds where the owner already pointed them.
    """
    self._sweep()


@external
@payable
def __default__():
    """
    @dev How DonationStreamer pays the reward. Deliberately empty and
         deliberately not nonreentrant: it is reached from inside onReport with
         only a 2300 gas stipend.
    """
    pass


############ INTERNAL HELPERS ############
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
