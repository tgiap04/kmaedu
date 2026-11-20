"""The gRPC Query path builds an in-memory FAISS + BM25 retriever, so both libraries must be declared deps."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
REQUIRED = ("faiss-cpu", "rank-bm25")


def _declared(text: str, name: str) -> bool:
    return re.search(rf"^\s*\"?{re.escape(name)}\b", text, re.M) is not None


def test_requirements_txt_declares_retriever_libraries():
    """The Docker image installs only requirements.txt, so a missing line is an ImportError at Query time."""
    text = (ROOT / "requirements.txt").read_text(encoding="utf-8")
    assert [name for name in REQUIRED if not _declared(text, name)] == []


def test_pyproject_declares_retriever_libraries():
    text = (ROOT / "pyproject.toml").read_text(encoding="utf-8")
    assert [name for name in REQUIRED if not _declared(text, name)] == []


def test_in_memory_faiss_store_builds_and_searches():
    """create_in_memory_retriever -> FAISS.from_texts must import faiss and return the nearest chunk."""
    from langchain_community.embeddings import DeterministicFakeEmbedding
    from langchain_community.vectorstores import FAISS

    chunks = ["alpha chunk", "beta chunk", "gamma chunk"]
    store = FAISS.from_texts(chunks, DeterministicFakeEmbedding(size=16))
    assert store.similarity_search("beta chunk", k=1)[0].page_content == "beta chunk"
