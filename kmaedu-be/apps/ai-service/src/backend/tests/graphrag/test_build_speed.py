"""Fewer and cheaper model calls per index build: batched embeddings, LLM summaries only for long
descriptions, reports only for the level-0 communities."""

import pytest

from src.graphrag import community_reports, descriptions, embeddings
from src.graphrag.types import (
    GraphCommunityRow,
    GraphData,
    GraphEntityRow,
    GraphragSettings,
)


def test_default_concurrency_matches_what_the_router_serves_at_once(monkeypatch):
    monkeypatch.delenv("GRAPHRAG_CONCURRENCY", raising=False)
    assert GraphragSettings.from_env().concurrency == 24


async def test_default_embedder_sends_a_whole_batch_in_one_request(monkeypatch):
    import src.llm.gemini_embeddings as gemini

    calls = []

    class FakeClient:
        async def create_embeddings_many(self, texts, task_type="retrieval_document"):
            calls.append((list(texts), task_type))
            return [[float(len(t))] for t in texts]

    monkeypatch.setattr(gemini, "GeminiEmbeddings", FakeClient)
    texts = [f"text {i}" for i in range(30)]
    vectors = await embeddings.default_embedder()(texts)
    assert vectors == [[float(len(t))] for t in texts]
    assert calls == [(texts, "retrieval_document")]


def entity(desc: str) -> GraphEntityRow:
    return GraphEntityRow("e1", "LVM", "lvm", "concept", desc, desc.count(descriptions.SEPARATOR) + 1)


async def test_several_short_descriptions_are_kept_joined_without_a_model_call():
    called = []

    async def llm(prompt, max_tokens):
        called.append(prompt)
        return "summary"

    short = descriptions.SEPARATOR.join(["Quản lý ổ đĩa logic", "Gom nhiều ổ vật lý", "Đổi kích thước khi chạy"])
    rows, summarised, failed = await descriptions.summarize_descriptions([entity(short)], llm, 4, 64)
    assert (summarised, failed, called) == (0, 0, [])
    assert rows[0].description == short


async def test_a_long_merged_description_is_still_summarised():
    async def llm(prompt, max_tokens):
        return "Gộp ổ đĩa vật lý thành ổ logic co giãn được."

    long = descriptions.SEPARATOR.join(["x" * 300, "y" * 300, "z" * 300])
    rows, summarised, _ = await descriptions.summarize_descriptions([entity(long)], llm, 4, 64)
    assert summarised == 1 and rows[0].description.startswith("Gộp")


async def test_only_level_zero_communities_get_a_report(fake_embedder):
    prompts = []

    async def llm(prompt, max_tokens):
        prompts.append(prompt)
        return '{"title": "T", "summary": "S", "findings": [], "rating": 5}'

    ents = [GraphEntityRow(f"e{i}", f"N{i}", f"n{i}", "concept", "d", 1, degree=1, rank=1.0) for i in range(4)]
    comms = [
        GraphCommunityRow("c0", 0, 0, None, ["e0", "e1", "e2", "e3"], 4),
        GraphCommunityRow("c1", 1, 0, "c0", ["e0", "e1"], 2),
        GraphCommunityRow("c2", 1, 1, "c0", ["e2", "e3"], 2),
    ]
    rows, reported, unreported = await community_reports.write_reports(
        GraphData(ents, [], [], comms), {}, llm, fake_embedder, 4, 64
    )
    assert len(prompts) == 1 and reported == 1 and unreported == 0
    by_id = {r.id: r for r in rows}
    assert by_id["c0"].summary == "S"
    assert by_id["c1"].summary == "" and by_id["c1"].title  # a fallback title, no report call


@pytest.fixture(name="fake_embedder")
def embedder_fixture():
    async def embed(texts):
        return [[1.0, float(len(t))] for t in texts]

    return embed


def test_graph_calls_ask_for_low_reasoning_unless_turned_off(monkeypatch):
    # Faye-AI at default effort spent ~7-8k tokens reasoning and left no JSON on most chunks.
    monkeypatch.delenv("GRAPHRAG_REASONING_EFFORT", raising=False)
    assert GraphragSettings.from_env().reasoning_effort == "low"
    monkeypatch.setenv("GRAPHRAG_REASONING_EFFORT", "medium")
    assert GraphragSettings.from_env().reasoning_effort == "medium"
    monkeypatch.setenv("GRAPHRAG_REASONING_EFFORT", "none")
    assert GraphragSettings.from_env().reasoning_effort is None


async def test_default_llm_passes_the_reasoning_effort_and_strict_truncation(monkeypatch):
    from src.graphrag import indexer
    from src.llm.model_manager import model_manager

    seen = {}

    async def fake_generate(prompt, model, **kwargs):
        seen.update(kwargs, model=model)
        return "{}"

    monkeypatch.setattr(model_manager, "generate_content_with_model", fake_generate)
    llm = indexer.default_llm(GraphragSettings(llm_model="Faye-AI", reasoning_effort="low"))
    assert await llm("p", 512) == "{}"
    assert seen == {"model": "Faye-AI", "max_tokens": 512, "raise_on_truncation": True, "reasoning_effort": "low"}


def test_each_graph_call_has_a_total_deadline(monkeypatch):
    monkeypatch.delenv("GRAPHRAG_CALL_TIMEOUT_SECONDS", raising=False)
    assert GraphragSettings.from_env().call_timeout_seconds == 240
    monkeypatch.setenv("GRAPHRAG_CALL_TIMEOUT_SECONDS", "90")
    assert GraphragSettings.from_env().call_timeout_seconds == 90


async def test_a_stream_that_never_ends_is_cut_at_the_deadline(monkeypatch):
    # A streamed answer that keeps trickling bytes never hits httpx's per-read timeout and held whole builds.
    import asyncio

    from src.graphrag import indexer
    from src.llm.model_manager import model_manager

    async def endless(prompt, model, **kwargs):
        await asyncio.sleep(30)

    monkeypatch.setattr(model_manager, "generate_content_with_model", endless)
    llm = indexer.default_llm(GraphragSettings(call_timeout_seconds=0.05))
    with pytest.raises(TimeoutError):
        await llm("p", 64)


def test_default_max_tokens_leaves_room_when_the_router_ignores_low_effort(monkeypatch):
    monkeypatch.delenv("GRAPHRAG_MAX_TOKENS", raising=False)
    assert GraphragSettings.from_env().max_tokens == 16384


def test_slow_graph_calls_are_hedged_after_90_seconds_by_default(monkeypatch):
    monkeypatch.delenv("GRAPHRAG_HEDGE_AFTER_SECONDS", raising=False)
    assert GraphragSettings.from_env().hedge_after_seconds == 90
    monkeypatch.setenv("GRAPHRAG_HEDGE_AFTER_SECONDS", "45")
    assert GraphragSettings.from_env().hedge_after_seconds == 45


async def test_default_llm_races_a_duplicate_of_a_slow_call(monkeypatch):
    import asyncio

    from src.graphrag import indexer
    from src.llm.model_manager import model_manager

    calls = []

    async def generate(prompt, model, **kwargs):
        calls.append(prompt)
        await asyncio.sleep(5 if len(calls) == 1 else 0.01)
        return f"answer {len(calls)}"

    monkeypatch.setattr(model_manager, "generate_content_with_model", generate)
    llm = indexer.default_llm(GraphragSettings(hedge_after_seconds=0.05, call_timeout_seconds=2))
    assert await llm("p", 64) == "answer 2" and calls == ["p", "p"]
