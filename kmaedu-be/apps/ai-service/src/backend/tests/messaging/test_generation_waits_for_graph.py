"""``content.generation.requested`` waits (by re-queueing) while the document's GraphRAG index is being built."""

from __future__ import annotations

import json

from helpers import FakePublisher, message_for
from test_generation_inline_processing import (
    KEY,
    QUIZ,
    REQUEST,
    URL,
    WITH_URL,
    Fakes,
    consumer_for,
)

from src.backend.messaging import generation_handler as gh
from src.backend.messaging.graph_wait import max_graph_defers


async def set_index(pool, status: str, sid: str = "st1", attempts: int = 0) -> None:
    await pool.execute(
        'INSERT INTO "GraphIndex" ("userStorageId", "chunkSignature", status, attempts) VALUES ($1, \'sig\', $2, $3)',
        sid, status, attempts,
    )


async def outbox_types(pool) -> list[str]:
    types = [json.loads(r["envelope"])["type"] for r in await pool.fetch("SELECT envelope FROM outbox_events ORDER BY seq")]
    return [t for t in types if t != "ai.generation.progress"]  # progress has its own tests


async def test_a_building_index_defers_the_job_through_the_retry_tier(pool, monkeypatch):
    fakes = Fakes(monkeypatch, chunks=True)
    await set_index(pool, "BUILDING")
    publisher = FakePublisher()
    message = message_for(KEY, REQUEST)
    await consumer_for(pool, publisher).handle_message(message)

    assert message.acked and fakes.generated == []
    assert [p["headers"] for p in publisher.published] == [{"x-retry-count": 0, "x-defer-count": 1}]
    assert await outbox_types(pool) == []


async def test_a_pending_index_defers_too(pool, monkeypatch):
    fakes = Fakes(monkeypatch, chunks=True)
    await set_index(pool, "PENDING")
    publisher = FakePublisher()
    await consumer_for(pool, publisher).handle_message(message_for(KEY, REQUEST))
    assert fakes.generated == [] and len(publisher.published) == 1


async def test_a_ready_permanently_failed_or_missing_index_generates_at_once(pool, monkeypatch):
    from src.graphrag.store import MAX_ATTEMPTS

    for status in ("READY", "FAILED", None):
        await pool.execute('TRUNCATE "GraphIndex", outbox_events, processed_events')
        fakes = Fakes(monkeypatch, chunks=True)
        if status:
            await set_index(pool, status, attempts=MAX_ATTEMPTS if status == "FAILED" else 0)
        publisher = FakePublisher()
        await consumer_for(pool, publisher).handle_message(message_for(KEY, REQUEST))
        assert fakes.generated == ["st1"], status
        assert publisher.published == [] and await outbox_types(pool) == ["ai.generation.completed"]


async def test_once_the_wait_budget_is_spent_the_job_generates_anyway(pool, monkeypatch):
    fakes = Fakes(monkeypatch, chunks=True)
    await set_index(pool, "BUILDING")
    publisher = FakePublisher()
    message = message_for(KEY, REQUEST, headers={"x-defer-count": max_graph_defers()})
    await consumer_for(pool, publisher).handle_message(message)
    assert fakes.generated == ["st1"] and publisher.published == []


def test_the_wait_budget_follows_the_env(monkeypatch):
    monkeypatch.delenv("GRAPHRAG_GENERATION_WAIT_MINUTES", raising=False)
    assert max_graph_defers() == 40  # 20 minutes in 30 s hops
    monkeypatch.setenv("GRAPHRAG_GENERATION_WAIT_MINUTES", "5")
    assert max_graph_defers() == 10
    monkeypatch.setenv("GRAPHRAG_GENERATION_WAIT_MINUTES", "0")
    assert max_graph_defers() == 0  # 0 = never wait


async def test_inline_processing_reports_the_document_even_when_the_job_is_deferred(pool, monkeypatch):
    fakes = Fakes(monkeypatch, chunks=False)
    await set_index(pool, "PENDING")  # what the pipeline queues after storing the chunks
    publisher = FakePublisher()
    await consumer_for(pool, publisher).handle_message(message_for(KEY, WITH_URL))

    assert fakes.processed == [("st1", "application/pdf", URL)] and fakes.generated == []
    assert await outbox_types(pool) == ["ai.document.processed"]  # committed on its own, not rolled back
    assert len(publisher.published) == 1


async def test_inline_processing_reports_the_document_even_when_generation_then_fails_transiently(pool, monkeypatch):
    from src.backend.services.generation_service import generation_service

    Fakes(monkeypatch, chunks=False)

    async def flaky(request):
        raise ConnectionError("model down")

    monkeypatch.setattr(generation_service, "generate_quiz", flaky)
    await consumer_for(pool).handle_message(message_for(KEY, WITH_URL))
    assert await outbox_types(pool) == ["ai.document.processed"]
    assert QUIZ  # the shared fixture stays imported for readers of this module


async def test_a_job_on_its_last_retry_still_defers_instead_of_failing(pool, monkeypatch):
    from src.backend.messaging.topology import MAX_RETRIES

    fakes = Fakes(monkeypatch, chunks=True)
    await set_index(pool, "BUILDING")
    publisher = FakePublisher()
    message = message_for(KEY, REQUEST, headers={"x-retry-count": MAX_RETRIES})
    await consumer_for(pool, publisher).handle_message(message)
    assert fakes.generated == [] and await outbox_types(pool) == []
    assert publisher.published[0]["headers"] == {"x-retry-count": MAX_RETRIES, "x-defer-count": 1}


async def test_a_failed_index_that_will_be_retried_is_waited_for(pool, monkeypatch):
    fakes = Fakes(monkeypatch, chunks=True)
    await set_index(pool, "FAILED", attempts=1)  # in backoff: the worker claims it again shortly
    publisher = FakePublisher()
    await consumer_for(pool, publisher).handle_message(message_for(KEY, REQUEST))
    assert fakes.generated == [] and len(publisher.published) == 1


async def test_the_inline_report_falls_back_to_the_job_transaction_when_its_own_write_fails(pool, monkeypatch):
    from src.backend.messaging import envelope as env
    from src.backend.messaging.delivery import HandlerContext

    Fakes(monkeypatch, chunks=False)

    class BrokenPool:
        def acquire(self):
            raise ConnectionError("pool exhausted")

    async with pool.acquire() as conn:
        async with conn.transaction():
            ctx = HandlerContext(env.build(KEY, WITH_URL, "content"), conn, 0, 0, BrokenPool())
            await gh._inline_processor(ctx, "st1", URL, "application/pdf")()
    assert await outbox_types(pool) == ["ai.document.processed"]  # written with the job's own transaction
