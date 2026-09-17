# pragma version 0.4.3

# Stands in for Curve's AddressProviderNG at its canonical address.

addresses: public(HashMap[uint256, address])


@external
def set_address(id: uint256, addr: address):
    self.addresses[id] = addr


@view
@external
def get_address(id: uint256) -> address:
    return self.addresses[id]
