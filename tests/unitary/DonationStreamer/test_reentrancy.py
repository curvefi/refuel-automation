"""A pool is called mid-execution with the streamer's own approvals in place, so every way
back in has to fail. execute() holds the lock for the whole donation, and execute_many() takes
no lock of its own, so a batch reached through a callback finds every frame locked out."""

import boa
import pytest


EXECUTE = 0
EXECUTE_MANY = 1
CANCEL = 2
HEALTHY = 3


def _mint_and_approve(token, owner, spender, amount):
    token.mint(owner, amount)
    with boa.env.prank(owner):
        token.approve(spender, amount)


@pytest.fixture()
def reentrant_pool(deployer, tokens, metaregistry):
    token0, token1 = tokens
    with boa.env.prank(deployer):
        pool = boa.load("tests/mocks/MockReentrantPool.vy", [token0.address, token1.address])
    metaregistry.set_registered(pool.address, True)
    return pool


@pytest.fixture()
def stream_id(donation_streamer, reentrant_pool, tokens, donor):
    amounts = [1_000, 2_000]
    for token, amount in zip(tokens, amounts):
        _mint_and_approve(token, donor, donation_streamer.address, amount)
    with boa.env.prank(donor):
        return donation_streamer.create_stream(
            reentrant_pool.address,
            amounts,
            3600,
            2,
        )


@pytest.mark.parametrize("mode", [EXECUTE, CANCEL])
def test_a_pool_cannot_reenter_a_locked_entry_point(
    donation_streamer, reentrant_pool, tokens, caller, stream_id, mode
):
    reentrant_pool.set_mode(mode, stream_id)

    with boa.env.prank(caller), boa.reverts():
        donation_streamer.execute(stream_id)

    assert donation_streamer.streams(stream_id)[6] == 2
    assert tokens[0].balanceOf(reentrant_pool.address) == 0


def test_a_pool_reentering_execute_many_executes_nothing(
    donation_streamer, reentrant_pool, tokens, caller, stream_id
):
    """execute_many takes no lock, so the callback reaches it - and finds every stream in it
    locked out, which is what keeps a period from being paid twice."""
    reentrant_pool.set_mode(EXECUTE_MANY, stream_id)

    with boa.env.prank(caller):
        assert donation_streamer.execute(stream_id) is True

    # Read the logs before anything else calls the contract, or get_logs sees that call.
    failed = [log for log in donation_streamer.get_logs() if type(log).__name__ == "StreamFailed"]
    assert [log.stream_id for log in failed] == [stream_id]
    # One period, not two: the nested batch could not execute the stream a second time.
    assert donation_streamer.streams(stream_id)[6] == 1
    assert tokens[0].balanceOf(reentrant_pool.address) == 500


@pytest.mark.parametrize("mode", [EXECUTE, EXECUTE_MANY, CANCEL])
def test_a_pool_that_reenters_during_execute_many_fails_alone(
    donation_streamer, reentrant_pool, mock_pool, tokens, donor, caller, stream_id, mode
):
    healthy_amounts = [500, 500]
    for token, amount in zip(tokens, healthy_amounts):
        _mint_and_approve(token, donor, donation_streamer.address, amount)
    with boa.env.prank(donor):
        healthy = donation_streamer.create_stream(
            mock_pool.address,
            healthy_amounts,
            3600,
            2,
        )
    reentrant_pool.set_mode(mode, stream_id)

    with boa.env.prank(caller):
        results = donation_streamer.execute_many([stream_id, healthy])

    assert list(results) == [False, True]
    assert donation_streamer.streams(stream_id)[6] == 2


def test_the_pool_is_fine_when_it_does_not_reenter(
    donation_streamer, reentrant_pool, tokens, caller, stream_id
):
    with boa.env.prank(caller):
        assert donation_streamer.execute(stream_id) is True

    assert tokens[0].balanceOf(reentrant_pool.address) == 500
