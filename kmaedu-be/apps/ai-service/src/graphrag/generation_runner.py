"""Quiz/flashcard generation driven by the GraphRAG index.

A READY index with communities is planned into concept slots (:mod:`generation_planner`),
each call asks about different concepts, and the answers are mapped back to their slots,
stripped of repeats and topped up once for the slots that stayed empty. Without a usable
index the chunks are split into plain batches instead (``retrieval_mode='vector_fallback'``);
those answers are deduplicated by question similarity and topped up once from the other
half of the document.
The internal ``concept`` field never leaves this module.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

import asyncpg

from src import db
from src.backend.messaging import progress
from src.backend.services.ocr_service import DocumentChunk, ocr_service

from . import reads
from .dedupe import Deduper
from .embeddings import Embedder
from .embeddings import default_embedder as gemini_embedder
from .generation_fallback import fallback_batches
from .generation_mapping import assign_slots
from .generation_planner import plan_slots
from .generation_prompt import batch_chunk, strip_internal
from .generation_slots import SlotBatch, pack

logger = logging.getLogger(__name__)

# chunk, item count, call index, call count -> items. Injected by the service (its batch runners).
RunBatch = Callable[[DocumentChunk, int, int, int], Awaitable[list[dict[str, Any]]]]
# task dicts as ``ContentGenerationService._run_generation_tasks`` takes them -> its result dicts.
RunTasks = Callable[[list[dict[str, Any]]], Awaitable[list[dict[str, Any]]]]

KEYWORD_TOP_K = 20  # narrow mode without a graph: chunks kept around the keyword


@dataclass
class Outcome:
    """Result of one quiz/flashcard generation (``results`` carry per-call errors for the caller)."""

    items: list[dict[str, Any]] = field(default_factory=list)
    results: list[dict[str, Any]] = field(default_factory=list)
    retrieval_mode: str = "graphrag"
    no_content: bool = False


def _embedders() -> tuple[Embedder | None, Embedder | None]:
    try:
        return gemini_embedder("retrieval_query"), gemini_embedder("retrieval_document")
    except Exception as exc:  # the index and the model still work without embeddings
        logger.warning("[GRAPHRAG_GEN] embedding client unavailable (%s); no keyword search and concept-only dedupe", exc)
        return None, None


async def _run(tasks: list[dict[str, Any]], run_tasks: RunTasks) -> list[dict[str, Any]]:
    return await run_tasks(tasks) if tasks else []


async def _slot_round(
    batches: list[SlotBatch], first_index: int, kind: str, storage_id: str, run_batch: RunBatch, run_tasks: RunTasks,
    embedder: Embedder | None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Run one call per batch; return ``(items with concept = slot key, results)`` in batch order."""
    count = first_index + len(batches)
    tasks = [
        {
            "chunk_index": first_index + n,
            "batch_index": 0,
            "runner": lambda b=batch, i=first_index + n: run_batch(batch_chunk(b, kind, storage_id, i), len(b.slots), i, count),
        }
        for n, batch in enumerate(batches)
    ]
    # only the first round counts as "generating"; a top-up runs under "reviewing"
    results = await _run(tasks if first_index else await progress.track_calls(tasks), run_tasks)
    items: list[dict[str, Any]] = []
    for result in results:
        batch = batches[result["chunk_index"] - first_index]
        await assign_slots(result["items"], batch.slots, embedder)
        items.extend(result["items"])
    return items, results


async def _graph_generation(
    batches: list[SlotBatch], *, kind: str, storage_id: str, total: int, max_items: int, run_batch: RunBatch,
    run_tasks: RunTasks, embedder: Embedder | None,
) -> Outcome:
    deduper = Deduper(embedder)
    raw, results = await _slot_round(batches, 0, kind, storage_id, run_batch, run_tasks, embedder)
    await progress.report(progress.REVIEWING)
    kept, dropped = await deduper.add(raw)
    kept = kept[:total]
    topup = 0
    if raw and len(kept) < total:
        filled = {i["concept"] for i in kept if i.get("concept")}
        empty = [s for b in batches for s in b.slots if s.key not in filled][: total - len(kept)]
        topup = len(empty)
        more_raw, more_results = await _slot_round(pack(empty, max_items), len(batches), kind, storage_id, run_batch, run_tasks, embedder)
        more, more_dropped = await deduper.add(more_raw)
        kept = (kept + more)[:total]
        dropped += more_dropped
        results += more_results
    logger.info(
        "[GRAPHRAG_GEN] kind=%s slots=%d communities=%d dropped_dupes=%d topup=%d items=%d",
        kind, sum(len(b.slots) for b in batches), len({s.community_id for b in batches for s in b.slots}), dropped, topup, len(kept),
    )
    return Outcome(strip_internal(kept), results, "graphrag")


async def keyword_chunks(storage_id: str, keyword: str) -> list[DocumentChunk]:
    """Chunks nearest to ``keyword`` by vector search (narrow mode without a graph)."""
    from src.rag.vector_store_pg import get_pg_vector_store

    return await get_pg_vector_store().search_similar([storage_id], keyword, top_k=KEYWORD_TOP_K)


async def _plain_round(
    chunks: list[DocumentChunk], total: int, first_index: int, max_items: int, run_batch: RunBatch, run_tasks: RunTasks
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """One call per plain batch of ``chunks``; returns ``(items without internal fields, results)``."""
    calls = fallback_batches(chunks, total, max_items)
    count = first_index + len(calls)
    tasks = [
        {"chunk_index": first_index + n, "batch_index": 0, "runner": lambda c=chunk, s=size, i=first_index + n: run_batch(c, s, i, count)}
        for n, (chunk, size) in enumerate(calls)
    ]
    # only the first round counts as "generating"; a top-up runs under "reviewing"
    results = await _run(tasks if first_index else await progress.track_calls(tasks), run_tasks)
    # Without slots a model-made ``concept`` means nothing: drop it so only question similarity dedupes.
    return strip_internal([item for result in results for item in result["items"]]), results


async def _fallback_generation(
    storage_id: str, total: int, kind: str, max_items: int, run_batch: RunBatch, run_tasks: RunTasks, keyword: str | None,
    embedder: Embedder | None = None,
) -> Outcome:
    chunks = await ocr_service.get_document_chunks(storage_id)
    if not chunks:
        return Outcome(no_content=True, retrieval_mode="vector_fallback")
    if keyword:
        matched = await keyword_chunks(storage_id, keyword)
        if matched:
            chunks = matched
        else:
            logger.info("[GRAPHRAG_GEN] keyword %r matched no chunk of %s; using the whole document", keyword, storage_id)
    deduper = Deduper(embedder)
    raw, results = await _plain_round(chunks, total, 0, max_items, run_batch, run_tasks)
    await progress.report(progress.REVIEWING)
    kept, dropped = await deduper.add(raw)
    kept = kept[:total]
    topup = 0
    if raw and len(kept) < total:
        topup = total - len(kept)
        half = len(chunks) // 2
        # The other half first, so the top-up is not asked about the same pages again.
        more_raw, more_results = await _plain_round(chunks[half:] + chunks[:half], topup, len(results), max_items, run_batch, run_tasks)
        more, more_dropped = await deduper.add(more_raw)
        kept = (kept + more)[:total]
        dropped += more_dropped
        results += more_results
    logger.info(
        "[GRAPHRAG_GEN] kind=%s mode=vector_fallback chunks=%d dropped_dupes=%d topup=%d items=%d",
        kind, len(chunks), dropped, topup, len(kept),
    )
    return Outcome(kept, results, "vector_fallback")


async def run_generation(
    *, kind: str, storage_id: str, total: int, keyword: str | None, narrow: bool, run_batch: RunBatch,
    run_tasks: RunTasks, max_items: int, pool: asyncpg.Pool | None = None,
) -> Outcome:
    """Generate ``total`` items of ``kind`` ("quiz" or "flashcard") for one document."""
    pool = pool or await db.get_pool()
    await progress.report(progress.PLANNING)
    query_embedder, doc_embedder = _embedders()
    batches: list[SlotBatch] = []
    if await reads.index_status(pool, storage_id) == "READY":
        try:
            batches = await plan_slots(pool, storage_id, total, keyword=keyword, narrow=narrow, embedder=query_embedder, max_batch=max_items)
        except Exception:  # a planning problem must not fail the job: the plain path still works
            logger.exception("[GRAPHRAG_GEN] slot planning failed for %s; using plain batches", storage_id)
    if not batches:
        return await _fallback_generation(
            storage_id, total, kind, max_items, run_batch, run_tasks, keyword.strip() if narrow and keyword else None,
            embedder=doc_embedder,
        )
    return await _graph_generation(
        batches, kind=kind, storage_id=storage_id, total=total, max_items=max_items, run_batch=run_batch,
        run_tasks=run_tasks, embedder=doc_embedder,
    )
