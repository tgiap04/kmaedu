"""AI-03: pages, chunks, DOCX inflation and runtime are bounded; a breach is a fixed failure reason."""

import asyncio
import io
import zipfile

import pytest
from pypdf import PdfWriter

from src.backend.messaging import document_handlers as dh
from src.backend.services import document_limits as limits
from src.backend.services.document_limits import DocumentLimitError
from src.backend.services.ocr_service import FileInfo, ocr_service
from src.backend.services.pdf_ocr_service import pdf_ocr_service


def docx_like(inflated_bytes: int) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("word/document.xml", b"0" * inflated_bytes)
    return buffer.getvalue()


def blank_pdf(pages: int) -> bytes:
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=72, height=72)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def test_pdf_over_the_page_limit_is_rejected_before_any_ocr(monkeypatch):
    monkeypatch.setenv("MAX_DOCUMENT_PAGES", "3")
    with pytest.raises(DocumentLimitError) as caught:
        pdf_ocr_service.process_pdf_with_chunks(blank_pdf(4))
    assert caught.value.reason == "DOCUMENT_TOO_LARGE"


def test_pdf_at_the_page_limit_is_split(monkeypatch):
    monkeypatch.setenv("MAX_DOCUMENT_PAGES", "4")
    assert len(pdf_ocr_service.split_pdf_to_chunks(blank_pdf(4))) == 1


def test_docx_zip_bomb_is_rejected_by_declared_uncompressed_size(tmp_path, monkeypatch):
    monkeypatch.setenv("MAX_DOCX_UNCOMPRESSED_BYTES", str(1024 * 1024))
    bomb = tmp_path / "bomb.docx"
    bomb.write_bytes(docx_like(3 * 1024 * 1024))
    assert bomb.stat().st_size < 100 * 1024  # tiny on disk, huge once inflated
    with pytest.raises(DocumentLimitError) as caught:
        limits.check_docx_archive(str(bomb))
    assert caught.value.reason == "DOCUMENT_TOO_LARGE"


def test_docx_within_the_limit_and_non_zip_files_pass_the_archive_check(tmp_path, monkeypatch):
    monkeypatch.setenv("MAX_DOCX_UNCOMPRESSED_BYTES", str(1024 * 1024))
    ok = tmp_path / "ok.docx"
    ok.write_bytes(docx_like(1000))
    limits.check_docx_archive(str(ok))
    broken = tmp_path / "broken.docx"
    broken.write_bytes(b"not a zip")
    limits.check_docx_archive(str(broken))  # left to the DOCX parser to reject


async def test_prepare_documents_rejects_a_docx_zip_bomb_before_parsing(tmp_path, monkeypatch):
    monkeypatch.setenv("MAX_DOCX_UNCOMPRESSED_BYTES", str(1024 * 1024))
    path = tmp_path / "bomb.docx"
    data = docx_like(3 * 1024 * 1024)
    path.write_bytes(data)
    info = FileInfo(
        id="s1", filename="bomb.docx", url="https://x/bomb.docx",
        mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    with pytest.raises(DocumentLimitError):
        await ocr_service.prepare_documents_to_store("s1", info, file_bytes=data, temp_path=str(path))


async def test_prepare_documents_rejects_more_chunks_than_the_limit(tmp_path, monkeypatch):
    monkeypatch.setenv("MAX_DOCUMENT_CHUNKS", "3")
    path = tmp_path / "long.txt"
    text = "\n\n".join(f"paragraph {i} " + "word " * 300 for i in range(20))
    path.write_text(text)
    info = FileInfo(id="s1", filename="long.txt", url="https://x/long.txt", mimetype="text/plain")
    with pytest.raises(DocumentLimitError) as caught:
        await ocr_service.prepare_documents_to_store("s1", info, file_bytes=text.encode(), temp_path=str(path))
    assert caught.value.reason == "DOCUMENT_TOO_LARGE"


def test_limit_errors_are_permanent_failures_with_their_own_reason():
    assert dh.failure_reason(DocumentLimitError("DOCUMENT_TOO_LARGE", "x")) == "DOCUMENT_TOO_LARGE"
    assert dh.failure_reason(DocumentLimitError("PROCESSING_TIMEOUT", "x")) == "PROCESSING_TIMEOUT"


async def test_processing_that_outlives_the_deadline_fails_with_a_timeout_reason(monkeypatch):
    monkeypatch.setenv("DOCUMENT_PROCESSING_TIMEOUT_SECONDS", "1")

    async def slow(*_args):
        await asyncio.sleep(30)

    monkeypatch.setattr(dh, "_process_document", slow)
    monkeypatch.setattr(limits, "_timeout_seconds", lambda: 0.05)
    with pytest.raises(DocumentLimitError) as caught:
        await dh._process("s1", "a.pdf", "application/pdf", "https://x/a.pdf")
    assert caught.value.reason == "PROCESSING_TIMEOUT"


async def test_a_timeout_raised_inside_processing_is_not_mistaken_for_the_deadline(monkeypatch):
    async def inner_timeout(*_args):
        raise TimeoutError("socket")

    monkeypatch.setattr(dh, "_process_document", inner_timeout)
    with pytest.raises(TimeoutError):
        await dh._process("s1", "a.pdf", "application/pdf", "https://x/a.pdf")


# --- F-07: DOCX archive check is bounded in entries and size, and runs off the event loop ---


def docx_with_entries(count: int) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_STORED) as archive:
        for i in range(count):
            archive.writestr(f"f{i}", b"x")
    return buffer.getvalue()


def test_docx_with_too_many_entries_is_rejected(tmp_path, monkeypatch):
    monkeypatch.setenv("MAX_DOCX_ENTRIES", "5")
    path = tmp_path / "many.docx"
    path.write_bytes(docx_with_entries(6))
    with pytest.raises(DocumentLimitError) as caught:
        limits.check_docx_archive(str(path))
    assert caught.value.reason == "DOCUMENT_TOO_LARGE"


def test_docx_entry_count_defaults_to_5000(tmp_path, monkeypatch):
    monkeypatch.delenv("MAX_DOCX_ENTRIES", raising=False)
    path = tmp_path / "many.docx"
    path.write_bytes(docx_with_entries(5001))
    with pytest.raises(DocumentLimitError):
        limits.check_docx_archive(str(path))
    path.write_bytes(docx_with_entries(5000))
    limits.check_docx_archive(str(path))


def test_docx_that_lies_about_its_entry_count_is_still_rejected(tmp_path, monkeypatch):
    monkeypatch.setenv("MAX_DOCX_ENTRIES", "5")
    data = bytearray(docx_with_entries(50))
    eocd = data.rfind(b"PK\x05\x06")
    data[eocd + 8 : eocd + 12] = (1).to_bytes(2, "little") * 2  # claim a single entry
    path = tmp_path / "liar.docx"
    path.write_bytes(bytes(data))
    with pytest.raises(DocumentLimitError):
        limits.check_docx_archive(str(path))


def test_docx_declared_size_limit_defaults_to_20_mb(tmp_path, monkeypatch):
    monkeypatch.delenv("MAX_DOCX_UNCOMPRESSED_BYTES", raising=False)
    path = tmp_path / "big.docx"
    path.write_bytes(docx_like(25 * 1024 * 1024))
    with pytest.raises(DocumentLimitError) as caught:
        limits.check_docx_archive(str(path))
    assert caught.value.reason == "DOCUMENT_TOO_LARGE"
    path.write_bytes(docx_like(15 * 1024 * 1024))
    limits.check_docx_archive(str(path))


def test_docx_with_a_truncated_central_directory_is_left_to_the_parser(tmp_path):
    data = docx_with_entries(3)
    path = tmp_path / "cut.docx"
    path.write_bytes(data[:30] + data[-22:])
    limits.check_docx_archive(str(path))


async def test_docx_archive_check_does_not_run_on_the_event_loop_thread(tmp_path, monkeypatch):
    import threading

    seen = {}

    def spy(_path):
        seen["thread"] = threading.current_thread()

    monkeypatch.setattr(limits, "check_docx_archive", spy)
    path = tmp_path / "ok.docx"
    data = docx_like(1000)
    path.write_bytes(data)
    info = FileInfo(
        id="s1", filename="ok.docx", url="https://x/ok.docx",
        mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    try:
        await ocr_service.prepare_documents_to_store("s1", info, file_bytes=data, temp_path=str(path))
    except Exception:  # parsing the fake docx is irrelevant here
        pass
    assert seen["thread"] is not threading.main_thread()


# --- F-08: PDF page dimensions are bounded before any rasterisation ---

A4 = (595, 842)
LETTER = (612, 792)
A3 = (842, 1191)


def sized_pdf(*sizes, userunit=None, cropbox=None, rotate=0) -> bytes:
    from pypdf.generic import FloatObject, NameObject, RectangleObject

    writer = PdfWriter()
    for width, height in sizes:
        page = writer.add_blank_page(width=width, height=height)
        if userunit:
            page[NameObject("/UserUnit")] = FloatObject(userunit)
        if cropbox:
            page.cropbox = RectangleObject(cropbox)
        if rotate:
            page.rotate(rotate)
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


@pytest.mark.parametrize("size", [A4, LETTER, A3])
def test_normal_page_sizes_pass_at_the_default_dpi(size, monkeypatch):
    monkeypatch.delenv("MAX_PDF_PAGE_PIXELS", raising=False)
    assert len(pdf_ocr_service.split_pdf_to_chunks(sized_pdf(size))) == 1


def test_a_huge_mediabox_is_rejected_before_rendering(monkeypatch):
    monkeypatch.delenv("MAX_PDF_PAGE_PIXELS", raising=False)
    with pytest.raises(DocumentLimitError) as caught:
        pdf_ocr_service.split_pdf_to_chunks(sized_pdf((14400, 14400)))
    assert caught.value.reason == "DOCUMENT_TOO_LARGE"


def test_one_huge_page_among_normal_ones_is_rejected(monkeypatch):
    with pytest.raises(DocumentLimitError):
        pdf_ocr_service.split_pdf_to_chunks(sized_pdf(A4, A4, (14400, 14400), A4))


def test_a_huge_userunit_is_rejected(monkeypatch):
    with pytest.raises(DocumentLimitError):
        pdf_ocr_service.split_pdf_to_chunks(sized_pdf(A4, userunit=100))


def test_page_rotation_does_not_change_the_verdict():
    assert len(pdf_ocr_service.split_pdf_to_chunks(sized_pdf(A3, rotate=90))) == 1
    with pytest.raises(DocumentLimitError):
        pdf_ocr_service.split_pdf_to_chunks(sized_pdf((14400, 14400), rotate=90))


def test_the_pixel_budget_is_configurable(monkeypatch):
    monkeypatch.setenv("MAX_PDF_PAGE_PIXELS", "1000000")
    with pytest.raises(DocumentLimitError):
        pdf_ocr_service.split_pdf_to_chunks(sized_pdf(A4))


def test_the_budget_counts_pixels_at_the_render_dpi(monkeypatch):
    monkeypatch.setenv("MAX_PDF_PAGE_PIXELS", "10000000")
    monkeypatch.setattr(pdf_ocr_service, "DPI", 72)
    assert len(pdf_ocr_service.split_pdf_to_chunks(sized_pdf(A3))) == 1
    monkeypatch.setattr(pdf_ocr_service, "DPI", 300)
    with pytest.raises(DocumentLimitError):
        pdf_ocr_service.split_pdf_to_chunks(sized_pdf(A3))


def test_page_count_limit_is_checked_before_page_sizes(monkeypatch):
    monkeypatch.setenv("MAX_DOCUMENT_PAGES", "2")
    with pytest.raises(DocumentLimitError) as caught:
        pdf_ocr_service.split_pdf_to_chunks(sized_pdf(A4, A4, A4))
    assert "pages" in str(caught.value)


def test_a_limit_error_is_not_swallowed_by_the_chunk_loop(monkeypatch):
    with pytest.raises(DocumentLimitError):
        pdf_ocr_service.process_pdf_with_chunks(sized_pdf((14400, 14400)))


def test_ocr_pdf_refuses_to_rasterise_a_huge_page(monkeypatch):
    import src.backend.services.pdf_ocr_service as module

    def must_not_render(*_a, **_k):
        raise AssertionError("poppler was called on a huge page")

    monkeypatch.delenv("OCR_SERVICE_URL", raising=False)
    monkeypatch.setattr(module, "convert_from_bytes", must_not_render)
    with pytest.raises(DocumentLimitError):
        pdf_ocr_service.ocr_pdf(sized_pdf((14400, 14400)))


def test_docx_bomb_with_a_fake_end_marker_inside_the_end_record_is_still_rejected(tmp_path, monkeypatch):
    """The marker written into end-record fields ``zipfile`` ignores must not hide the real directory."""
    monkeypatch.setenv("MAX_DOCX_UNCOMPRESSED_BYTES", str(1024 * 1024))
    data = bytearray(docx_like(3 * 1024 * 1024))
    data[-14:-10] = b"PK\x05\x06"  # entry-count fields of the real end record
    bomb = tmp_path / "smuggled.docx"
    bomb.write_bytes(bytes(data))
    with zipfile.ZipFile(bomb) as archive:  # still a valid zip for the DOCX parser
        assert archive.getinfo("word/document.xml").file_size == 3 * 1024 * 1024
    with pytest.raises(DocumentLimitError) as caught:
        limits.check_docx_archive(str(bomb))
    assert caught.value.reason == "DOCUMENT_TOO_LARGE"


def test_docx_with_a_zip64_end_record_is_rejected(tmp_path, monkeypatch):
    monkeypatch.setattr(zipfile, "ZIP64_LIMIT", 0)  # makes zipfile write the zip64 end record + locator
    archive_bytes = docx_like(1000)
    monkeypatch.undo()
    path = tmp_path / "zip64.docx"
    path.write_bytes(archive_bytes)
    assert b"PK\x06\x07" in archive_bytes
    with pytest.raises(DocumentLimitError) as caught:
        limits.check_docx_archive(str(path))
    assert caught.value.reason == "DOCUMENT_TOO_LARGE"


def test_ocr_pdf_renders_one_page_at_a_time(monkeypatch):
    """A chunk's pages are never all held as bitmaps at once: each render asks poppler for a single page."""
    import sys
    import types

    from PIL import Image

    import src.backend.services.pdf_ocr_service as module

    calls = []

    def render(_pdf, **kwargs):
        calls.append((kwargs.get("first_page"), kwargs.get("last_page")))
        return [Image.new("RGB", (4, 4), "white") for _ in range(min(kwargs["last_page"], 6) - kwargs["first_page"] + 1)]

    fake_cv2 = types.SimpleNamespace(COLOR_RGB2BGR=0, COLOR_BGR2RGB=1, cvtColor=lambda img, _code: img)
    monkeypatch.setitem(sys.modules, "cv2", fake_cv2)
    monkeypatch.delenv("OCR_SERVICE_URL", raising=False)
    monkeypatch.setattr(module, "convert_from_bytes", render)
    monkeypatch.setattr(module.pytesseract, "image_to_string", lambda *_a, **_k: "text")

    assert pdf_ocr_service.ocr_pdf(sized_pdf(*([A4] * 6)), use_preprocessing=False) == "\n".join(["text"] * 6)
    assert sorted(calls) == [(i, i) for i in range(1, 7)]
