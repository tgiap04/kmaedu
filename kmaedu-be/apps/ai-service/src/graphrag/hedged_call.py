"""Hedged model calls: a call still running after ``hedge_after`` seconds gets one duplicate.

A build waits for its slowest call, and the AI2 router now and then sits on a request for minutes
(one community report took ~190 s, then failed, then ~200 s more). Racing a second copy only for
those slow calls cuts that tail for little extra load: the first good answer wins, the other copy
is cancelled, and both failing raises the last error so the caller's retry still applies.
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable


async def _race[T](start: Callable[[], Awaitable[T]], hedge_after: float) -> T:
    tasks = [asyncio.ensure_future(start())]
    try:
        done, _ = await asyncio.wait(tasks, timeout=hedge_after)
        if done:
            return tasks[0].result()  # answered (or failed) before the hedge: no duplicate
        tasks.append(asyncio.ensure_future(start()))
        pending = set(tasks)
        error: BaseException | None = None
        while pending:
            done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
            for task in sorted(done, key=tasks.index):
                if task.exception() is None:
                    return task.result()
                error = task.exception()
        assert error is not None
        raise error
    finally:
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


async def hedged_call[T](start: Callable[[], Awaitable[T]], hedge_after: float, deadline: float) -> T:
    """Return the first successful result of ``start()`` (at most two copies) within ``deadline`` seconds."""
    return await asyncio.wait_for(_race(start, hedge_after), timeout=deadline)
