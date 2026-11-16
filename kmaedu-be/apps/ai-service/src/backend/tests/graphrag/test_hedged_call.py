"""A slow model call gets one duplicate after a while; the first good answer wins (no network)."""

import asyncio

import pytest

from src.graphrag.hedged_call import hedged_call


def factory(*behaviours):
    """Each started call takes the next (delay, result-or-exception); records starts and cancellations."""
    state = {"started": 0, "cancelled": 0}

    def start():
        delay, outcome = behaviours[state["started"]]
        state["started"] += 1

        async def run():
            try:
                await asyncio.sleep(delay)
            except asyncio.CancelledError:
                state["cancelled"] += 1
                raise
            if isinstance(outcome, Exception):
                raise outcome
            return outcome

        return run()

    return start, state


async def test_a_fast_call_is_never_duplicated():
    start, state = factory((0.01, "a"))
    assert await hedged_call(start, hedge_after=0.2, deadline=1) == "a"
    assert state["started"] == 1


async def test_a_slow_call_is_raced_by_a_duplicate_and_the_loser_is_cancelled():
    start, state = factory((5, "slow"), (0.01, "fast"))
    assert await hedged_call(start, hedge_after=0.05, deadline=2) == "fast"
    assert state == {"started": 2, "cancelled": 1}


async def test_when_one_copy_fails_the_other_can_still_answer():
    start, state = factory((0.1, ValueError("bad json")), (0.15, "ok"))
    assert await hedged_call(start, hedge_after=0.05, deadline=2) == "ok"


async def test_when_both_copies_fail_the_last_error_is_raised():
    start, _ = factory((0.1, ValueError("one")), (0.12, ValueError("two")))
    with pytest.raises(ValueError, match="two"):
        await hedged_call(start, hedge_after=0.05, deadline=2)


async def test_an_early_failure_is_raised_at_once_without_a_duplicate():
    start, state = factory((0.01, ValueError("cut")))
    with pytest.raises(ValueError):
        await hedged_call(start, hedge_after=0.5, deadline=2)
    assert state["started"] == 1


async def test_the_deadline_cancels_every_copy():
    start, state = factory((5, "a"), (5, "b"))
    with pytest.raises(TimeoutError):
        await hedged_call(start, hedge_after=0.02, deadline=0.1)
    assert state == {"started": 2, "cancelled": 2}
