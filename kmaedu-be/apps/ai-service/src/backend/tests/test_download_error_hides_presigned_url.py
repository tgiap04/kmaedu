"""AI-05: a failed download must not carry the presigned URL (signature in the query) in its error text."""

import importlib

import httpx
import pytest

from src.backend.messaging import document_handlers as dh
from src.backend.services.ocr_service import ocr_service

# ``src.backend.services.ocr_service`` is shadowed by the singleton in the package namespace.
ocr_module = importlib.import_module("src.backend.services.ocr_service")

REAL_CLIENT = httpx.AsyncClient
URL = "https://files.example/a/b.pdf?X-Amz-Signature=SECRETSIG&X-Amz-Credential=KEY"


@pytest.fixture
def http_status(monkeypatch):
    def serve(status: int) -> None:
        transport = httpx.MockTransport(lambda request: httpx.Response(status, request=request))
        monkeypatch.setattr(ocr_module, "_validate_download_url", lambda _url: "203.0.113.5")
        monkeypatch.setattr(ocr_module.httpx, "AsyncClient", lambda **kw: REAL_CLIENT(transport=transport, **kw))

    return serve


@pytest.mark.parametrize("status", [403, 404, 500])
async def test_http_status_error_text_has_no_query_string(http_status, status):
    http_status(status)
    with pytest.raises(httpx.HTTPStatusError) as caught:
        await ocr_service.download_file_from_r2(URL)
    text = str(caught.value)
    assert "SECRETSIG" not in text and "X-Amz" not in text and "?" not in text
    assert str(status) in text


async def test_failure_classification_still_follows_the_status(http_status):
    http_status(404)
    with pytest.raises(httpx.HTTPStatusError) as gone:
        await ocr_service.download_file_from_r2(URL)
    assert dh.failure_reason(gone.value) == "DOWNLOAD_FAILED"
    http_status(500)
    with pytest.raises(httpx.HTTPStatusError) as down:
        await ocr_service.download_file_from_r2(URL)
    assert dh.failure_reason(down.value) is None  # transient: retried
