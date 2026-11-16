"""Bounded wait of a generation job for its document's GraphRAG index.

The job is not held in the handler (that would keep the delivery's transaction open and
block the PREFETCH=1 queue): it raises ``DeferEventError`` and the consumer sends it back
through the 30 s retry tier, until the index is usable or the budget is spent.
"""

from __future__ import annotations

import logging
import math
import os

from . import progress
from .delivery import HandlerContext
from .errors import DeferEventError
from .topology import RETRY_DELAY_MS

logger = logging.getLogger(__name__)

DEFAULT_GRAPH_WAIT_MINUTES = 20  # well inside content's 60 min job watchdog and the FE's 60 min poll


def max_graph_defers() -> int:
    """How many 30 s deferrals a job may spend waiting for its graph (0 = never wait)."""
    raw = os.environ.get("GRAPHRAG_GENERATION_WAIT_MINUTES", "").strip()
    try:
        minutes = float(raw) if raw else DEFAULT_GRAPH_WAIT_MINUTES
    except ValueError:
        minutes = DEFAULT_GRAPH_WAIT_MINUTES
    return max(0, math.ceil(minutes * 60_000 / RETRY_DELAY_MS))


async def wait_for_graph(ctx: HandlerContext, storage_id: str) -> None:
    """Defer the job while its GraphRAG index is still being built (bounded)."""
    from src.graphrag import reads

    status = await reads.index_building(ctx.conn, storage_id)
    if status is None:
        return
    limit = max_graph_defers()
    if ctx.defer_count >= limit:
        logger.info("[GRAPHRAG_GEN] wait for %s spent (%d deferrals, status=%s); generating now", storage_id, limit, status)
        return
    logger.info("[GRAPHRAG_GEN] waiting for the graph of %s status=%s defer=%d/%d", storage_id, status, ctx.defer_count + 1, limit)
    await progress.report(progress.WAITING_GRAPH, waited=ctx.defer_count + 1, maxWaits=limit)
    raise DeferEventError("GRAPH_BUILDING")
