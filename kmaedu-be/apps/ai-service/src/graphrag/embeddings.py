"""Embeddings for entities and community reports through an injectable ``Embedder``."""

from __future__ import annotations

import asyncio
import math
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import replace

from .types import GraphEntityRow

# texts -> one vector per text (same order). Injected so tests never reach a model.
Embedder = Callable[[list[str]], Awaitable[list[list[float]]]]

BATCH_SIZE = 100  # = the Gemini batchEmbedContents limit


def default_embedder(task_type: str = "retrieval_document") -> Embedder:
    """Return the configured Gemini embedding model for ``task_type`` ("retrieval_document" / "retrieval_query").

    A batch goes out as one ``batchEmbedContents`` request (up to 100 texts) instead of one request
    per text, with the client's retry and backoff on rate limits and transient errors.
    """
    from src.llm.gemini_embeddings import GeminiEmbeddings

    client = GeminiEmbeddings()

    async def embed(texts: list[str]) -> list[list[float]]:
        return await client.create_embeddings_many(list(texts), task_type)

    return embed


def entity_text(entity: GraphEntityRow) -> str:
    """Return what is embedded for an entity: ``name: description``."""
    return f"{entity.name}: {entity.description}" if entity.description else entity.name


def _check(vectors: list[list[float]], expected: int) -> None:
    if len(vectors) != expected:
        raise ValueError(f"embedder returned {len(vectors)} vectors for {expected} texts")
    dims = {len(v) for v in vectors}
    if len(dims) > 1 or 0 in dims:
        raise ValueError(f"embedder returned vectors of unusable size(s) {sorted(dims)}")
    if not all(math.isfinite(x) for v in vectors for x in v):
        raise ValueError("embedder returned a non-finite value")


async def embed_texts(embedder: Embedder, texts: Sequence[str], concurrency: int = 1) -> list[list[float]]:
    """Embed ``texts`` in batches of :data:`BATCH_SIZE` (bounded concurrency); the result is validated."""
    semaphore = asyncio.Semaphore(max(1, concurrency))

    async def one(batch: list[str]) -> list[list[float]]:
        async with semaphore:
            return await embedder(batch)

    batches = [list(texts[i : i + BATCH_SIZE]) for i in range(0, len(texts), BATCH_SIZE)]
    vectors = [v for part in await asyncio.gather(*(one(b) for b in batches)) for v in part]
    _check(vectors, len(texts))
    return vectors


async def embed_entities(entities: Sequence[GraphEntityRow], embedder: Embedder, concurrency: int) -> list[GraphEntityRow]:
    """Fill ``embedding`` on every row that has none; rows that already carry a vector are kept."""
    missing = [i for i, e in enumerate(entities) if e.embedding is None]
    vectors = await embed_texts(embedder, [entity_text(entities[i]) for i in missing], concurrency)
    rows = list(entities)
    for index, vector in zip(missing, vectors, strict=True):
        rows[index] = replace(rows[index], embedding=vector)
    return rows
