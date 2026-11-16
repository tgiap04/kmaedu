"""Stage reports of one generation job: ``ai.generation.progress {jobId, stage, at, ...}``.

The handler sets a reporter for the job in :data:`current`; code below it (OCR, the graph
wait, the generation runner) calls :func:`report` without knowing the job. Each report is
written to the outbox in a transaction of its own, so it is published within the relay's
poll even while the job's own transaction is still open, and survives that transaction
rolling back (a deferral). Reporting is best-effort: a failure is logged, never raised.
"""

from __future__ import annotations

import asyncio
import contextvars
import logging
import time
from collections.abc import Awaitable, Callable
from typing import Any

import asyncpg

from . import outbox

logger = logging.getLogger(__name__)

PROCESSING_DOCUMENT = "processing_document"
WAITING_GRAPH = "waiting_graph"
PLANNING = "planning"
GENERATING = "generating"
REVIEWING = "reviewing"

REPORT_TIMEOUT_SECONDS = 3.0  # a report that cannot get a connection by then is dropped, the job goes on

# (stage, extra fields) -> None
Reporter = Callable[[str, dict[str, Any]], Awaitable[None]]

current: contextvars.ContextVar[Reporter | None] = contextvars.ContextVar("generation_progress", default=None)


async def report(stage: str, **extra: Any) -> None:
    """Report ``stage`` for the job in the current context; a no-op outside a job."""
    reporter = current.get()
    if reporter is None:
        return
    try:
        await asyncio.wait_for(reporter(stage, extra), REPORT_TIMEOUT_SECONDS)
    except Exception as exc:  # progress is cosmetic (a timeout included): never fail or stall the job over it
        logger.warning("[GENERATION_PROGRESS] stage=%s not reported: %s", stage, exc)


def outbox_reporter(pool: asyncpg.Pool, job_id: str, correlation_id: str | None) -> Reporter:
    """Return a reporter that writes ``ai.generation.progress`` rows for ``job_id``."""

    async def send(stage: str, extra: dict[str, Any]) -> None:
        # `at` orders reports at content-service: a late or replayed one never overwrites a newer one.
        data = {"jobId": job_id, "stage": stage, "at": int(time.time() * 1000)}
        data.update({key: value for key, value in extra.items() if value is not None})
        async with pool.acquire() as conn, conn.transaction():
            await outbox.add(conn, "ai.generation.progress", data, correlation_id)

    return send


async def track_calls(tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Report ``generating 0/total`` and wrap the task runners so each finished call reports ``done/total``."""
    total = len(tasks)
    if not total:
        return tasks
    await report(GENERATING, done=0, total=total)
    state = {"done": 0}

    def wrap(inner: Callable[[], Awaitable[Any]]) -> Callable[[], Awaitable[Any]]:
        async def runner() -> Any:
            try:
                return await inner()
            finally:
                state["done"] += 1
                await report(GENERATING, done=state["done"], total=total)

        return runner

    return [{**task, "runner": wrap(task["runner"])} for task in tasks]
