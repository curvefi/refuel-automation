# pragma version 0.4.3
"""
@title DonationStreamer
@author Curve.Fi
@license Copyright (c) Curve.Fi, 2025 - all rights reserved
@notice Permissionless donation streams that add liquidity on a schedule, without a keeper bounty.
@dev A keeper needs no logic of its own: read ready_streams(), pass the ids to execute_many().
"""

from ethereum.ercs import IERC20


############### INTERFACES #################
interface AddressProvider:
    def get_address(id: uint256) -> address: view


interface MetaRegistry:
    def is_registered(pool: address) -> bool: view


interface DonationPoolTarget:
    def add_liquidity(
        amounts: uint256[2],
        min_mint_amount: uint256,
        receiver: address,
        donation: bool,
    ) -> uint256: nonpayable
    def coins(i: uint256) -> address: view


################ EVENTS ###################
event StreamCreated:
    stream_id: uint256
    donor: indexed(address)
    pool: indexed(address)
    amounts: uint256[N_COINS]
    period_length: uint256
    n_periods: uint256


event StreamExecuted:
    stream_id: uint256
    pool: indexed(address)
    periods: uint256
    amounts: uint256[N_COINS]


event StreamCancelled:
    stream_id: uint256
    donor: indexed(address)
    pool: indexed(address)
    amounts: uint256[N_COINS]


event StreamFailed:
    stream_id: indexed(uint256)


################ DATA ####################
struct DonationStream:
    # Static
    donor: address
    pool: address
    coins: address[N_COINS]
    period_length: uint256
    # Dynamic
    next_ts: uint256
    amounts_remaining: uint256[N_COINS]
    periods_remaining: uint256


# Curve's AddressProviderNG, the same address on every chain it is deployed to, which is
# why this contract still takes no constructor arguments.
ADDRESS_PROVIDER: constant(address) = 0x5ffe7FB82894076ECB99A30D6A32e969e6e35E98
METAREGISTRY_ID: constant(uint256) = 7

N_COINS: constant(uint256) = 2
N_MAX_EXECUTE: constant(uint256) = 32
N_MAX_VIEW: constant(uint256) = 256

# A stream due more often than this would hold a batch slot on every run, so it is the
# floor on how much of the keeper's work one donor can claim.
MIN_PERIOD_LENGTH: constant(uint256) = 3600

# And this is the ceiling on how long it can hold a place in the active set: a stream that
# is not due for years still occupies a position ready_streams() walks over.
MAX_DURATION: constant(uint256) = 730 * 86400

# Per-stream ceiling inside execute_many, so a pool that burns gas rather than reverting
# still fails alone.
EXECUTE_GAS: constant(uint256) = 500_000

# Required on top of EXECUTE_GAS before each stream. Short of it the batch reverts rather
# than executing part of itself, so eth_estimateGas sizes a batch by what it all costs.
GAS_RESERVE: constant(uint256) = 100_000

stream_count: public(uint256)
streams: public(HashMap[uint256, DonationStream])

# Unfinished streams, packed into positions [0, active_count). Removal moves the last entry
# into the gap, so the scan never walks finished ids and there is no cap to fill with spam.
active_count: public(uint256)
active_stream_ids: public(HashMap[uint256, uint256])
active_position: HashMap[uint256, uint256]  # stream id -> position + 1, zero when inactive


################ INIT ####################
@deploy
def __init__():
    """
    @notice Initialize the donation streamer.
    """
    pass


############ INTERNAL HELPERS ############
@internal
def _approve(token: address, spender: address, amount: uint256):
    """
    @dev Set an allowance. Every donation approves what it is about to donate and sets the
         allowance back to zero afterwards, so this never raises one non-zero value to
         another and needs no reset for tokens that forbid it.
    """
    assert extcall IERC20(token).approve(
        spender, amount, default_return_value=True
    ), "approve failed"


@internal
def _activate(stream_id: uint256):
    """
    @dev Append a stream to the active set.
    """
    position: uint256 = self.active_count
    self.active_stream_ids[position] = stream_id
    self.active_position[stream_id] = position + 1
    self.active_count = position + 1


@internal
def _deactivate(stream_id: uint256):
    """
    @dev Remove a stream from the active set, moving the last entry into its position.
    """
    position_plus_one: uint256 = self.active_position[stream_id]
    if position_plus_one == 0:
        return

    last: uint256 = self.active_count - 1
    if position_plus_one - 1 != last:
        moved: uint256 = self.active_stream_ids[last]
        self.active_stream_ids[position_plus_one - 1] = moved
        self.active_position[moved] = position_plus_one

    self.active_stream_ids[last] = 0
    self.active_position[stream_id] = 0
    self.active_count = last


@internal
@view
def _due_periods(stream: DonationStream) -> uint256:
    """
    @dev Return the number of due periods for a stream.
    """
    if (
        stream.donor == empty(address)
        or stream.periods_remaining == 0
        or stream.period_length == 0
        or block.timestamp < stream.next_ts
    ):
        return 0

    return min(
        (block.timestamp - stream.next_ts) // stream.period_length + 1,
        stream.periods_remaining,
    )


@internal
def _execute_stream(stream_id: uint256) -> bool:
    """
    @dev Execute a single stream if due.
    """
    stream: DonationStream = self.streams[stream_id]
    periods_due: uint256 = self._due_periods(stream)
    if periods_due == 0:
        return False

    is_final: bool = periods_due == stream.periods_remaining
    pool: address = stream.pool
    coins: address[N_COINS] = stream.coins

    # This execution's share of what is left. On the last one periods_due equals
    # periods_remaining, so the division returns the remainder exactly and no dust is left
    # behind; short of it, rounding is carried by the periods still to come.
    amounts_to_donate: uint256[N_COINS] = empty(uint256[N_COINS])
    for j: uint256 in range(N_COINS):
        remaining: uint256 = stream.amounts_remaining[j]
        if remaining == 0:
            continue
        amount: uint256 = remaining * periods_due // stream.periods_remaining
        amounts_to_donate[j] = amount
        stream.amounts_remaining[j] = remaining - amount

    stream.periods_remaining -= periods_due
    stream.next_ts += stream.period_length * periods_due

    # Clear storage once the stream is finished.
    if is_final:
        self.streams[stream_id] = empty(DonationStream)
        self._deactivate(stream_id)
    else:
        self.streams[stream_id] = stream

    # Only approve and add liquidity when there is a non-zero donation.
    if amounts_to_donate[0] > 0 or amounts_to_donate[1] > 0:
        balances_before: uint256[N_COINS] = empty(uint256[N_COINS])
        for j: uint256 in range(N_COINS):
            if amounts_to_donate[j] > 0:
                balances_before[j] = staticcall IERC20(coins[j]).balanceOf(self)
        for j: uint256 in range(N_COINS):
            if amounts_to_donate[j] > 0:
                self._approve(coins[j], pool, amounts_to_donate[j])
        extcall DonationPoolTarget(pool).add_liquidity(
            amounts_to_donate,
            0,
            empty(address),
            True,
        )
        for j: uint256 in range(N_COINS):
            if amounts_to_donate[j] > 0:
                # The allowance was exactly this amount, so a pool cannot have taken more.
                # Taking less means a fee-on-transfer coin, which this contract cannot stream.
                balance_after: uint256 = staticcall IERC20(coins[j]).balanceOf(self)
                assert balances_before[j] - balance_after == amounts_to_donate[j], "bad pool pull"
                self._approve(coins[j], pool, 0)

    log StreamExecuted(
        stream_id=stream_id,
        pool=pool,
        periods=periods_due,
        amounts=amounts_to_donate,
    )

    return True


############### EXTERNAL VIEWS ############
@view
@external
def ready_streams() -> DynArray[uint256, N_MAX_VIEW]:
    """
    @notice Return the stream ids that can be executed now. One call, nothing to page.
    @dev Walks at most N_MAX_VIEW of the active streams, from a position that moves with the
         block, so more of them than that are still all reached over successive blocks and no
         stream can hold the front of the queue.
    """
    ready_ids: DynArray[uint256, N_MAX_VIEW] = empty(DynArray[uint256, N_MAX_VIEW])
    count: uint256 = self.active_count
    if count == 0:
        return ready_ids

    start: uint256 = block.number % count
    for i: uint256 in range(min(count, N_MAX_VIEW), bound=N_MAX_VIEW):
        stream_id: uint256 = self.active_stream_ids[(start + i) % count]
        if self._due_periods(self.streams[stream_id]) == 0:
            continue
        ready_ids.append(stream_id)

    return ready_ids


############### EXTERNAL ACTIONS #########
@external
@nonreentrant
def create_stream(
    pool: address,
    amounts: uint256[N_COINS],
    period_length: uint256,
    n_periods: uint256,
) -> uint256:
    """
    @notice Create a donation stream for a pool.
    @dev Not payable: execution carries no bounty, so a donor pre-funds nothing but the tokens.
    """
    assert pool != empty(address), "pool required"
    assert n_periods > 0, "bad n_periods"
    assert period_length >= MIN_PERIOD_LENGTH, "bad period_length"
    assert period_length * n_periods <= MAX_DURATION, "stream too long"
    assert amounts[0] > 0 or amounts[1] > 0, "zero amounts"

    # A stream whose per-period amounts both truncate to zero donates nothing for its whole
    # life while still reporting success, so it would hold a batch slot and never retire.
    assert (
        amounts[0] // n_periods > 0 or amounts[1] // n_periods > 0
    ), "amounts below n_periods"

    # The pool must be one Curve knows about: a caller can otherwise point at a contract
    # they wrote, which is what would make a spam stream free.
    metaregistry: address = staticcall AddressProvider(ADDRESS_PROVIDER).get_address(
        METAREGISTRY_ID
    )
    assert metaregistry != empty(address), "no metaregistry"
    assert staticcall MetaRegistry(metaregistry).is_registered(pool), "pool not registered"

    # Taken from the pool rather than from the caller: amounts are positional, so the pool
    # decides which coin each one is either way.
    coins: address[N_COINS] = [
        staticcall DonationPoolTarget(pool).coins(0),
        staticcall DonationPoolTarget(pool).coins(1),
    ]

    for i: uint256 in range(N_COINS):
        if amounts[i] > 0:
            balance_before: uint256 = staticcall IERC20(coins[i]).balanceOf(self)
            assert extcall IERC20(coins[i]).transferFrom(
                msg.sender, self, amounts[i], default_return_value=True
            ), "transfer failed"
            balance_after: uint256 = staticcall IERC20(coins[i]).balanceOf(self)
            assert balance_after - balance_before == amounts[i], "bad token transfer"

    stream_id: uint256 = self.stream_count
    self.stream_count = stream_id + 1

    self.streams[stream_id] = DonationStream(
        donor=msg.sender,
        pool=pool,
        coins=coins,
        period_length=period_length,
        next_ts=block.timestamp,
        amounts_remaining=amounts,
        periods_remaining=n_periods,
    )
    self._activate(stream_id)

    log StreamCreated(
        stream_id=stream_id,
        donor=msg.sender,
        pool=pool,
        amounts=amounts,
        period_length=period_length,
        n_periods=n_periods,
    )

    return stream_id


@external
@nonreentrant
def cancel_stream(stream_id: uint256):
    """
    @notice Cancel a stream and refund remaining balances.
    """
    stream: DonationStream = self.streams[stream_id]
    assert stream.donor == msg.sender, "donor only"

    pool: address = stream.pool
    coins: address[N_COINS] = stream.coins
    amounts_refund: uint256[N_COINS] = stream.amounts_remaining
    self.streams[stream_id] = empty(DonationStream)
    self._deactivate(stream_id)

    for i: uint256 in range(N_COINS):
        if amounts_refund[i] > 0:
            assert extcall IERC20(coins[i]).transfer(
                msg.sender, amounts_refund[i], default_return_value=True
            ), "refund failed"

    log StreamCancelled(
        stream_id=stream_id,
        donor=msg.sender,
        pool=pool,
        amounts=amounts_refund,
    )


@external
@nonreentrant
def execute(stream_id: uint256) -> bool:
    """
    @notice Execute a single stream id, reverting if its pool does.
    @dev Holds the reentrancy lock for the whole donation, including the pool callback, and
         execute_many calls this same entry point once per stream.
    """
    return self._execute_stream(stream_id)


@external
def execute_many(stream_ids: DynArray[uint256, N_MAX_EXECUTE]) -> DynArray[bool, N_MAX_EXECUTE]:
    """
    @notice Execute a batch of stream ids, each in its own call frame so that one failing
            pool does not revert the rest.
    @dev Vyper has no try/except: calling execute() back through the contract and asking
         raw_call not to revert is how a single stream is allowed to fail. Not nonreentrant
         itself, because execute() takes the lock per stream; a pool calling back in reaches
         only frames that find the lock held and revert.
    @dev Budget EXECUTE_GAS + GAS_RESERVE per stream. A batch given less reverts whole
         rather than executing part of itself, so a caller sizing it with eth_estimateGas
         gets a limit that covers every id.
    @return Per-stream execution results in input order.
    """
    results: DynArray[bool, N_MAX_EXECUTE] = empty(DynArray[bool, N_MAX_EXECUTE])
    for stream_id: uint256 in stream_ids:
        assert msg.gas >= EXECUTE_GAS + GAS_RESERVE, "gas too low for batch"

        success: bool = False
        response: Bytes[32] = b""
        success, response = raw_call(
            self,
            abi_encode(stream_id, method_id=method_id("execute(uint256)")),
            max_outsize=32,
            gas=EXECUTE_GAS,
            revert_on_failure=False,
        )

        if not success:
            # Nothing is recorded against the stream: it stays due and is retried next run,
            # and recovers by itself when its pool does.
            log StreamFailed(stream_id=stream_id)
            results.append(False)
            continue

        results.append(abi_decode(response, bool))

    return results
