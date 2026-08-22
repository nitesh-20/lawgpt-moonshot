import re
import unicodedata
from pathlib import Path
from typing import Any

import fitz  # type: ignore[import-untyped]  # PyMuPDF
import pdfplumber
from loguru import logger
from pypdf import PdfReader


# --- OCR Provider Abstraction ---
class BaseOCRProvider:
    """
    Interface for pluggable OCR engines.
    """
    async def perform_ocr(self, image_bytes: bytes) -> str:
        raise NotImplementedError


class SarvamOCRProvider(BaseOCRProvider):
    """
    OCR provider using Sarvam Document Intelligence.
    """
    async def perform_ocr(self, image_bytes: bytes) -> str:
        if not image_bytes:
            logger.warning("Sarvam OCR called with no image bytes — skipping.")
            return ""
        try:
            from app.services.sarvam.document import DocumentIntelligenceManager
            # DocumentIntelligenceManager exposes `extract_document`, not `parse` — this
            # call previously always raised AttributeError and silently produced
            # "[OCR Error]" text for every scanned page, regardless of image quality.
            res = await DocumentIntelligenceManager.extract_document(
                file_bytes=image_bytes,
                filename="scanned_page.png"
            )
            if res.get("status") == "success":
                return res.get("content", "")
            else:
                logger.warning(f"Sarvam OCR failed: {res.get('message')}")
                return "[OCR Failed]"
        except Exception as e:
            logger.error(f"Error in Sarvam OCR: {e}")
            return "[OCR Error]"


class OCRService:
    """
    Detects scanned image-only pages and triggers the configured OCR provider.
    """
    def __init__(self, provider: BaseOCRProvider = None) -> None:
        self.provider = provider or SarvamOCRProvider()

    async def ocr_page(self, image_bytes: bytes) -> str:
        return await self.provider.perform_ocr(image_bytes)


# --- Text Cleaner ---
class TextCleaner:
    """
    Cleans extracted document text, removing layout headers/footers, duplicate
    line artifacts, duplicate spacing, while preserving legal structure/indentation.
    """
    @staticmethod
    def clean(text: str) -> str:
        if not text:
            return ""

        # Normalize unicode to NFKC standard
        text = unicodedata.normalize("NFKC", text)

        lines = text.splitlines()
        cleaned_lines = []
        seen_lines = set()

        for line in lines:
            stripped = line.strip()
            if not stripped:
                cleaned_lines.append("")
                continue

            # Filter headers, footers, page number signatures
            # e.g., standalone digits, "Page X", "Page X of Y", or section header duplications
            if re.match(r'^(page\s+\d+(\s+of\s+\d+)?|\d+)$', stripped, re.IGNORECASE):
                continue

            # Remove duplicate non-empty layout noise
            if len(stripped) > 5:
                if stripped in seen_lines:
                    continue
                seen_lines.add(stripped)

            # Standardize spacing, but keep layout indents
            normalized_spacing = re.sub(r'[ \t]+', ' ', line)
            cleaned_lines.append(normalized_spacing)

        # Re-join and eliminate duplicate trailing spacing lines
        text_joined = "\n".join(cleaned_lines)
        text_joined = re.sub(r'\n{3,}', '\n\n', text_joined)
        return text_joined.strip()


# --- Main PDF Parsing Service ---
class PDFService:
    """
    Handles PDF layout reads, text extraction, fallback hierarchies, and basic structure detection.
    """
    def __init__(self, ocr_service: OCRService = None) -> None:
        self.ocr_service = ocr_service or OCRService()

    async def extract_text(self, file_path: str) -> str:
        res = await self.parse_pdf(file_path)
        return res.get("text", "")

    async def parse_pdf(self, file_path: str, run_ocr: bool = True) -> dict[str, Any]:
        """
        Parses a PDF using a fallback hierarchy (PyMuPDF -> pdfplumber -> PyPDF).
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        text = ""
        pages = []
        title = path.stem.replace("_", " ").title()
        page_count = 0

        # 1. Attempt PyMuPDF (fitz)
        try:
            doc = fitz.open(file_path)
            page_count = len(doc)
            title = doc.metadata.get("title", "") or title
            for page_num, page in enumerate(doc, 1):
                page_text = page.get_text() or ""
                
                # Scanned page detection
                if run_ocr and len(page_text.strip()) < 50:
                    logger.warning(f"Scanned page detected on page {page_num} of {file_path}. Running OCR fallback.")
                    # Rasterize the actual page to a PNG for OCR — this previously sent
                    # an empty placeholder buffer instead of the real page image, so OCR
                    # could never succeed regardless of the scan's quality.
                    pixmap = page.get_pixmap(dpi=200)
                    image_bytes = pixmap.tobytes("png")
                    ocr_text = await self.ocr_service.ocr_page(image_bytes)
                    page_text += "\n" + ocr_text

                pages.append({
                    "page_number": page_num,
                    "text": page_text
                })
                text += page_text + "\n"
            doc.close()
            logger.info(f"Successfully parsed {file_path} using PyMuPDF (fitz). Pages: {page_count}")
            return self._build_response(text, title, page_count, pages)
        except Exception as e:
            logger.warning(f"PyMuPDF failed on {file_path}: {e}. Retrying with pdfplumber fallback.")

        # 2. Fallback to pdfplumber
        try:
            with pdfplumber.open(file_path) as pdf:
                page_count = len(pdf.pages)
                for page_num, page in enumerate(pdf.pages, 1):
                    page_text = page.extract_text() or ""
                    pages.append({
                        "page_number": page_num,
                        "text": page_text
                    })
                    text += page_text + "\n"
            logger.info(f"Successfully parsed {file_path} using pdfplumber fallback. Pages: {page_count}")
            return self._build_response(text, title, page_count, pages)
        except Exception as e:
            logger.warning(f"pdfplumber failed on {file_path}: {e}. Retrying with PyPDF fallback.")

        # 3. Fallback to PyPDF
        try:
            reader = PdfReader(file_path)
            page_count = len(reader.pages)
            title = reader.metadata.title or title
            for page_num, page in enumerate(reader.pages, 1):
                page_text = page.extract_text() or ""
                pages.append({
                    "page_number": page_num,
                    "text": page_text
                })
                text += page_text + "\n"
            logger.info(f"Successfully parsed {file_path} using PyPDF fallback. Pages: {page_count}")
            return self._build_response(text, title, page_count, pages)
        except Exception as e:
            logger.error(f"All PDF parsing engines failed for: {file_path}")
            raise RuntimeError(f"Failed to parse PDF document {file_path}: {e}")

    def _build_response(self, text: str, title: str, page_count: int, pages: list[dict[str, Any]]) -> dict[str, Any]:
        cleaned_text = TextCleaner.clean(text)
        
        # Heading detection heuristic
        headings = []
        for line in text.splitlines():
            stripped = line.strip()
            if re.match(r'^(Section|Article|Chapter|Schedule|Act)\b', stripped, re.IGNORECASE):
                headings.append(stripped)

        return {
            "text": cleaned_text,
            "title": title,
            "page_count": page_count,
            "pages": pages,
            "headings": list(set(headings))[:50],
            "tables": []
        }
