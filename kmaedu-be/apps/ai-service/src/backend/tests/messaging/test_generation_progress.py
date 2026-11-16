"""``ai.generation.progress``: best-effort stage reports, committed even when the job's transaction rolls back."""

from __future__ import annotations

import json

from helpers import FakePublisher, message_for
from test_generation_inline_processing import (
    KEY,
    REQUEST,
    WITH_URL,
    Fakes,
    consumer_for,
)

from src.backend.messaging import progress


async def events(pool, type_=None) -> list[dict]:
    rows = await pool.fetch("SELECT envelope FROM outbox_events ORDER BY seq")
    out = [json.loads(r["envelope"]) for r in rows]
    return [e for e in out if type_ is None or e["type"] == type_]


async def test_report_without_a_reporter_is_a_no_op():
    await progress.report(progress.PLANNING)  # nothing set: must not raise


async def test_a_failing_reporter_never_breaks_the_caller():
    async def broken(stage, extra):
        raise ConnectionError("db down")

    token = progress.current.set(broken)
    try:
        await progress.report(progress.GENERATING, done=1, total=2)
    finally:
        progress.current.reset(token)


async def test_the_outbox_reporter_writes_a_progress_event_with_the_job_and_stage(pool):
    send = progress.outbox_reporter(pool, "job1", "corr1")
    await send(progress.GENERATING, {"done": 1, "total": 3, "ignored": None})
    (event,) = await events(pool)
    assert event["type"] == "ai.generation.progress" and event["source"] == "ai" and event["correlationId"] == "corr1"
    data = event["data"]
    assert (data["jobId"], data["stage"], data["done"], data["total"]) == ("job1", "generating", 1, 3)
    assert isinstance(data["at"], int) and "ignored" not in data


async def test_inline_processing_reports_its_stage_first(pool, monkeypatch):
    Fakes(monkeypatch, chunks=False)
    await consumer_for(pool).handle_message(message_for(KEY, WITH_URL))
    stages = [e["data"]["stage"] for e in await events(pool, "ai.generation.progress")]
    assert stages[0] == "processing_document"


async def test_a_deferred_job_reports_waiting_for_the_graph_even_though_its_transaction_rolls_back(pool, monkeypatch):
    Fakes(monkeypatch, chunks=True)
    await pool.execute('INSERT INTO "GraphIndex" ("userStorageId", "chunkSignature", status) VALUES (\'st1\', \'sig\', \'BUILDING\')')
    await consumer_for(pool, FakePublisher()).handle_message(message_for(KEY, REQUEST, headers={"x-defer-count": 2}))
    (event,) = await events(pool, "ai.generation.progress")
    assert event["data"]["stage"] == "waiting_graph" and event["data"]["jobId"] == "job1"
    assert event["data"]["waited"] == 3 and event["data"]["maxWaits"] > 3


async def test_a_reporter_that_hangs_is_cut_off_so_the_job_keeps_going(monkeypatch):
    import asyncio
    import time

    monkeypatch.setattr(progress, "REPORT_TIMEOUT_SECONDS", 0.05)

    async def stuck(stage, extra):
        await asyncio.sleep(10)  # a pool that never hands out a connection

    token = progress.current.set(stuck)
    try:
        started = time.monotonic()
        await progress.report(progress.PLANNING)
        assert time.monotonic() - started < 1
    finally:
        progress.current.reset(token)
