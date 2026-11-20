"""Hard limits on document processing (pages, chunks, DOCX inflation, runtime).

One user upload must not be able to pin the single worker slot or exhaust the
shared embedding / LLM quota. Every limit has an env override; a document that
breaks one is failed with a fixed reason (``DocumentLimitError.reason``) that
retrying cannot fix.
"""

from __future__ import annotations

import asyncio
import logging
import os
import struct
import zipfile
from collections.abc import Awaitable

logger = logging.getLogger(__name__)

DEFAULT_MAX_DOCUMENT_PAGES = 300
DEFAULT_MAX_DOCUMENT_CHUNKS = 5000
DEFAULT_MAX_DOCX_UNCOMPRESSED_BYTES = 20 * 1024 * 1024
DEFAULT_MAX_DOCX_ENTRIES = 5000
# About A3 at 300 DPI (17.4 M px) with margin; A4 / Letter at 400 DPI stay far below it.
DEFAULT_MAX_PDF_PAGE_PIXELS = 40_000_000
DEFAULT_PROCESSING_TIMEOUT_SECONDS = 900

TOO_LARGE = "DOCUMENT_TOO_LARGE"
TIMEOUT = "PROCESSING_TIMEOUT"


class DocumentLimitError(Exception):
    """A document exceeds a processing limit; ``reason`` is the failure code reported."""

    def __init__(self, reason: str, message: str) -> None:
        """Carry the failure ``reason`` and a human-readable ``message``."""
        super().__init__(message)
        self.reason = reason


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return max(1, int(raw))
    except ValueError:
        logger.warning("Invalid %s=%r, using default=%d", name, raw, default)
        return default


def _timeout_seconds() -> float:
    return float(_int_env("DOCUMENT_PROCESSING_TIMEOUT_SECONDS", DEFAULT_PROCESSING_TIMEOUT_SECONDS))


def check_page_count(total_pages: int) -> None:
    """Reject a PDF with more pages than ``MAX_DOCUMENT_PAGES``."""
    limit = _int_env("MAX_DOCUMENT_PAGES", DEFAULT_MAX_DOCUMENT_PAGES)
    if total_pages > limit:
        raise DocumentLimitError(TOO_LARGE, f"PDF has {total_pages} pages, the limit is {limit}")


def check_chunk_count(total_chunks: int) -> None:
    """Reject a document that splits into more chunks than ``MAX_DOCUMENT_CHUNKS``."""
    limit = _int_env("MAX_DOCUMENT_CHUNKS", DEFAULT_MAX_DOCUMENT_CHUNKS)
    if total_chunks > limit:
        raise DocumentLimitError(TOO_LARGE, f"Document splits into {total_chunks} chunks, the limit is {limit}")


_CD_SIGNATURE = b"PK\x01\x02"
_ZIP32_MAX = 0xFFFFFFFF


def check_docx_archive(path: str) -> None:
    """Reject a DOCX with too many entries or too much declared data (zip bomb).

    Reads the central directory itself instead of ``zipfile.ZipFile`` (which
    builds a ``ZipInfo`` for every entry up front): the walk stops at the first
    entry past ``MAX_DOCX_ENTRIES`` or once the declared uncompressed sizes pass
    ``MAX_DOCX_UNCOMPRESSED_BYTES``, so its cost and memory stay bounded however
    many entries the file claims. The entry count in the end record is not
    trusted. ``zipfile`` never inflates an entry past its declared size, so the
    declared sizes bound what ``python-docx`` can read. Zip64 archives are
    rejected (no DOCX needs one under these limits); a file that is not a
    readable zip is left for the DOCX parser to reject.

    Blocking file I/O: call it through ``asyncio.to_thread`` from async code.
    """
    max_bytes = _int_env("MAX_DOCX_UNCOMPRESSED_BYTES", DEFAULT_MAX_DOCX_UNCOMPRESSED_BYTES)
    max_entries = _int_env("MAX_DOCX_ENTRIES", DEFAULT_MAX_DOCX_ENTRIES)
    with open(path, "rb") as fh:
        # Locate the end record exactly as ``zipfile`` (and so ``python-docx``) does: a check that finds a
        # different record than the parser can be steered to a harmless directory.
        try:
            endrec = zipfile._EndRecData(fh)  # noqa: SLF001 - the parser's own locator, by design
        except OSError:
            endrec = None
        if not endrec:
            return  # not a zip: the DOCX parser rejects it
        if endrec[zipfile._ECD_SIGNATURE] != zipfile.stringEndArchive:  # noqa: SLF001
            raise DocumentLimitError(TOO_LARGE, "DOCX uses zip64, which is not accepted")
        cd_size = endrec[zipfile._ECD_SIZE]  # noqa: SLF001
        cd_offset = endrec[zipfile._ECD_OFFSET]  # noqa: SLF001
        if cd_size == _ZIP32_MAX or cd_offset == _ZIP32_MAX:
            raise DocumentLimitError(TOO_LARGE, "DOCX uses zip64, which is not accepted")
        cd_start = endrec[zipfile._ECD_LOCATION] - cd_size  # noqa: SLF001 - where ``zipfile`` reads it
        if cd_start < 0:
            return
        fh.seek(cd_start)
        entries = 0
        declared = 0
        consumed = 0
        while consumed < cd_size:
            header = fh.read(46)
            if len(header) < 46 or header[:4] != _CD_SIGNATURE:
                return  # damaged directory: the DOCX parser reports it
            file_size_declared, name_len, extra_len, comment_len = struct.unpack_from("<24xLHHH", header)
            entries += 1
            if entries > max_entries:
                raise DocumentLimitError(TOO_LARGE, f"DOCX has more than {max_entries} entries")
            declared += file_size_declared
            if file_size_declared == _ZIP32_MAX or declared > max_bytes:
                raise DocumentLimitError(TOO_LARGE, f"DOCX inflates past {max_bytes} bytes")
            skip = name_len + extra_len + comment_len
            consumed += 46 + skip
            fh.seek(skip, os.SEEK_CUR)


def check_pdf_page_sizes(pdf_reader, dpi: int) -> None:
    """Reject a PDF with a page that would rasterise past ``MAX_PDF_PAGE_PIXELS`` at ``dpi``.

    A PDF page can be hundreds of inches wide: poppler allocates the whole bitmap
    (width x height x 3 bytes) before returning, and nothing can interrupt it. The
    larger of MediaBox and CropBox is used, scaled by ``/UserUnit``; rotation does
    not change the area. Run it after :func:`check_page_count` so the loop is
    bounded by the page limit.
    """
    budget = _int_env("MAX_PDF_PAGE_PIXELS", DEFAULT_MAX_PDF_PAGE_PIXELS)
    for number, page in enumerate(pdf_reader.pages, start=1):
        try:
            area_pt = max(_box_area(page.mediabox), _box_area(page.cropbox))
            unit = float(page.get("/UserUnit", 1.0))
        except Exception as exc:  # unreadable geometry: poppler could still render it
            raise DocumentLimitError(TOO_LARGE, f"PDF page {number} has unreadable dimensions") from exc
        if not unit > 0:
            unit = 1.0
        pixels = area_pt * unit * unit * (dpi / 72) ** 2
        if not pixels <= budget:  # also rejects NaN
            raise DocumentLimitError(
                TOO_LARGE, f"PDF page {number} would render to {pixels:.0f} pixels, the limit is {budget}"
            )


def _box_area(box) -> float:
    return abs(float(box.width)) * abs(float(box.height))


async def run_with_deadline[T](work: Awaitable[T]) -> T:
    """Await ``work``, failing with :class:`DocumentLimitError` after ``DOCUMENT_PROCESSING_TIMEOUT_SECONDS``.

    Only the deadline is translated: a ``TimeoutError`` raised by ``work`` itself
    (a socket, say) propagates unchanged. Worker threads started with
    ``asyncio.to_thread`` cannot be killed; they run on until their own bounded
    work (page and chunk limits) ends, but the consumer slot is freed at once.
    """
    seconds = _timeout_seconds()
    try:
        async with asyncio.timeout(seconds) as scope:
            return await work
    except TimeoutError as exc:
        if scope.expired():
            raise DocumentLimitError(TIMEOUT, f"Processing exceeded {seconds:g} seconds") from exc
        raise
