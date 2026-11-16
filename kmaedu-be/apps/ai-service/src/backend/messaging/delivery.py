"""Delivery / handler types shared by the consumer and the event handlers."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any, Protocol

import asyncpg

from . import envelope as env
from .topology import MAX_RETRIES


class Delivery(Protocol):
    """The slice of ``aio_pika.IncomingMessage`` the consumer uses."""

    routing_key: str | None
    body: bytes
    headers: dict[str, Any] | None
    message_id: str | None
    content_type: str | None

    async def ack(self) -> None:
        """Acknowledge the delivery."""
        ...

    async def nack(self, requeue: bool = ...) -> None:
        """Reject the delivery."""
        ...


@dataclass(frozen=True)
class HandlerContext:
    """Everything a handler needs; ``conn`` is inside the dedupe transaction."""

    envelope: env.Envelope
    conn: asyncpg.Connection
    retry_count: int
    defer_count: int = 0  # how many times this delivery was deferred (``DeferEventError``)
    pool: asyncpg.Pool | None = None  # for writes that must commit even if the handler rolls back

    @property
    def is_last_attempt(self) -> bool:
        """True when a failure now dead-letters instead of retrying."""
        return self.retry_count >= MAX_RETRIES


Handler = Callable[[HandlerContext], Awaitable[None]]


def header_int(message: Delivery, name: str) -> int:
    """Read a non-negative integer header (``x-retry-count``, ``x-defer-count``); anything else counts as 0."""
    raw = (message.headers or {}).get(name, 0)
    try:
        return max(0, int(raw))
    except (TypeError, ValueError):
        return 0
