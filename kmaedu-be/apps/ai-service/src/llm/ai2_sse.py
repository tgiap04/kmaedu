"""Read an OpenAI-style chat completion that came back as a server-sent event stream.

AI2 is called with ``stream: true``: the router sits behind Cloudflare, which answers 524 when
no byte arrives within ~100 s, and a reasoning model can take longer than that before its first
token. Streaming keeps bytes flowing; the body is still read whole and folded here.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Ai2Completion:
    """The parts of a completion the caller uses."""

    content: str = ""
    finish_reason: str | None = None
    usage: dict[str, Any] = field(default_factory=dict)
    saw_choice: bool = False


def _text_of(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):  # some routers send content parts
        return "".join(item.get("text", "") if isinstance(item, dict) else str(item) for item in value)
    return ""


def is_event_stream(content_type: str | None, body: str) -> bool:
    """Tell an SSE body from a plain JSON one (a router may ignore ``stream``)."""
    return "text/event-stream" in (content_type or "") or body.lstrip().startswith("data:")


def parse_event_stream(body: str) -> Ai2Completion:
    """Fold ``data: {...}`` events into one completion; malformed events are skipped."""
    out = Ai2Completion()
    parts: list[str] = []
    for line in body.splitlines():
        line = line.strip()
        if not line.startswith("data:"):
            continue
        data = line[5:].strip()
        if not data or data == "[DONE]":
            continue
        try:
            event = json.loads(data)
        except ValueError:
            continue
        if not isinstance(event, dict):
            continue
        if isinstance(event.get("usage"), dict):
            out.usage = event["usage"]
        for choice in event.get("choices") or []:
            if not isinstance(choice, dict):
                continue
            out.saw_choice = True
            delta = choice.get("delta") or choice.get("message") or {}
            if isinstance(delta, dict):
                parts.append(_text_of(delta.get("content")))
            out.finish_reason = choice.get("finish_reason") or out.finish_reason
    out.content = "".join(parts)
    return out
