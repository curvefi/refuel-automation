import boa
import pytest


@pytest.fixture(autouse=True)
def _fast_mode():
    boa.env.enable_fast_mode()


@pytest.fixture()
def deployer():
    return boa.env.generate_address()


@pytest.fixture()
def donor():
    addr = boa.env.generate_address()
    boa.env.set_balance(addr, 10**21)
    return addr


@pytest.fixture()
def caller():
    addr = boa.env.generate_address()
    boa.env.set_balance(addr, 0)
    return addr


@pytest.fixture()
def tokens(deployer):
    with boa.env.prank(deployer):
        token0 = boa.load("tests/mocks/MockERC20.vy", "Token0", "TK0", 18)
        token1 = boa.load("tests/mocks/MockERC20.vy", "Token1", "TK1", 18)
    return token0, token1


ADDRESS_PROVIDER = "0x5ffe7FB82894076ECB99A30D6A32e969e6e35E98"
METAREGISTRY_ID = 7


@pytest.fixture()
def metaregistry(deployer):
    """Curve's AddressProviderNG stood up at its canonical address, so create_stream's
    pool check runs for real rather than being stubbed out."""
    with boa.env.prank(deployer):
        registry = boa.load("tests/mocks/MockMetaRegistry.vy")
        provider = boa.load("tests/mocks/MockAddressProvider.vy")
    boa.env.set_code(ADDRESS_PROVIDER, boa.env.get_code(provider.address))
    at_canonical = boa.load_partial("tests/mocks/MockAddressProvider.vy").at(ADDRESS_PROVIDER)
    at_canonical.set_address(METAREGISTRY_ID, registry.address)
    return registry


@pytest.fixture()
def mock_pool(deployer, tokens, metaregistry):
    token0, token1 = tokens
    with boa.env.prank(deployer):
        pool = boa.load("tests/mocks/MockPool.vy", [token0.address, token1.address])
    metaregistry.set_registered(pool.address, True)
    return pool


@pytest.fixture()
def donation_streamer(deployer):
    with boa.env.prank(deployer):
        return boa.load("contracts/DonationStreamer.vy")
