# pragma version 0.4.3

from ethereum.ercs import IERC20


interface Streamer:
    def execute(stream_id: uint256) -> bool: nonpayable
    def execute_many(stream_ids: DynArray[uint256, 32]) -> DynArray[bool, 32]: nonpayable
    def cancel_stream(stream_id: uint256): nonpayable


coins: public(immutable(address[2]))

# 0 = execute, 1 = execute_many, 2 = cancel_stream, 3 = behave like a real pool
mode: public(uint256)
target: public(uint256)


@deploy
def __init__(_coins: address[2]):
    coins = _coins
    self.mode = 3


@external
def set_mode(_mode: uint256, _target: uint256):
    self.mode = _mode
    self.target = _target


@external
def add_liquidity(
    amounts: uint256[2],
    min_mint_amount: uint256,
    receiver: address,
    donation: bool,
) -> uint256:
    if self.mode == 0:
        extcall Streamer(msg.sender).execute(self.target)
    elif self.mode == 1:
        extcall Streamer(msg.sender).execute_many([self.target])
    elif self.mode == 2:
        extcall Streamer(msg.sender).cancel_stream(self.target)

    for i: uint256 in range(2):
        if amounts[i] > 0:
            assert extcall IERC20(coins[i]).transferFrom(msg.sender, self, amounts[i])
    return amounts[0] + amounts[1]
