# pragma version 0.4.3

from ethereum.ercs import IERC20


coins: public(immutable(address[2]))

# 0 = revert, 1 = consume all gas given, 2 = behave like a real pool
mode: public(uint256)


@deploy
def __init__(_coins: address[2], _mode: uint256):
    coins = _coins
    self.mode = _mode


@external
def set_mode(_mode: uint256):
    self.mode = _mode


@external
def add_liquidity(
    amounts: uint256[2],
    min_mint_amount: uint256,
    receiver: address,
    donation: bool,
) -> uint256:
    if self.mode == 0:
        raise "bad pool"

    if self.mode == 1:
        # Burn rather than revert, so the gas bound has to isolate it, not the flag.
        total: uint256 = 0
        for i: uint256 in range(2**32):
            total += i
            if total > max_value(uint256) // 2:
                break
        return total

    for i: uint256 in range(2):
        if amounts[i] > 0:
            assert extcall IERC20(coins[i]).transferFrom(msg.sender, self, amounts[i])
    return amounts[0] + amounts[1]
