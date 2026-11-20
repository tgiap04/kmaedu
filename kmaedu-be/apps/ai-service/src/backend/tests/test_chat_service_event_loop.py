"""``answer_query`` must keep blocking retriever construction off the asyncio event loop."""

import asyncio
from types import SimpleNamespace

from src.backend.services import chat_service
from src.backend.services.chat_service import ChatParams, answer_query


async def test_query_builds_the_in_memory_retriever_off_the_event_loop(monkeypatch):
    seen: dict[str, bool] = {}

    def blocking_builder(context: str):
        try:
            asyncio.get_running_loop()
            seen["on_event_loop"] = True
        except RuntimeError:
            seen["on_event_loop"] = False
        return object(), [context]

    async def retrieve(**_kwargs):
        return SimpleNamespace(combined_context="some context", sources=[])

    class FakeAgent:
        def __init__(self, **_kwargs) -> None:
            pass

        def chat(self, _query: str) -> str:
            return "answer"

    monkeypatch.setattr(chat_service, "create_in_memory_retriever", blocking_builder)
    monkeypatch.setattr(chat_service.graphrag_retrieval, "retrieve_for_chat", retrieve)
    monkeypatch.setattr(chat_service, "SimpleChatAgent", FakeAgent)
    monkeypatch.setattr(chat_service, "resolve_model_id", lambda _m: "m")

    answer, _ = await answer_query(ChatParams(query="q", user_storage_id="doc-1"))

    assert answer == "answer"
    assert seen == {"on_event_loop": False}
