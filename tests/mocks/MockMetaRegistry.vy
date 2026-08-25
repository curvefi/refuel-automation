# pragma version 0.4.3

registered: public(HashMap[address, bool])


@external
def set_registered(pool: address, is_reg: bool):
    self.registered[pool] = is_reg


@view
@external
def is_registered(pool: address) -> bool:
    return self.registered[pool]
