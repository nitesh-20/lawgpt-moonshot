import asyncio
import time
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any
from loguru import logger

from app.services.pdf.pdf import PDFService
from app.services.pdf.validator import ValidationService, ManifestLoader, MetadataLoader
from app.services.rag.chunker import ChunkingService
from app.services.embeddings.embeddings import EmbeddingService
from app.services.rag.vector_store import get_vector_store
from app.core.config import settings


class KnowledgeIndexer:
    """
    Orchestrates the end-to-end ingestion pipeline:
    Manifest -> Validator -> Parser -> Cleaner -> Chunker -> Embedder -> Vector Store.
    """
    def __init__(self) -> None:
        self.pdf_service = PDFService()
        self.validation_service = ValidationService()
        self.chunker = ChunkingService()
        self.embedding_service = EmbeddingService()
        self.vector_store = get_vector_store()
        self.status_file = settings.BASE_DIR / "data" / "indexing_status.json"
        self._init_status()

    def _init_status(self) -> None:
        if not self.status_file.exists():
            status: dict[str, Any] = {
                "status": "idle",
                "documents_processed": 0,
                "chunks_generated": 0,
                "embeddings_generated": 0,
                "start_time": None,
                "end_time": None,
                "processing_time_sec": 0.0,
                "failures": [],
                "warnings": []
            }
            self._save_status(status)

    def _get_status(self) -> dict[str, Any]:
        try:
            if self.status_file.exists():
                with open(self.status_file, "r") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error reading status file: {e}")
        return {}

    def _save_status(self, status: dict[str, Any]) -> None:
        try:
            with open(self.status_file, "w") as f:
                json.dump(status, f, indent=2)
        except Exception as e:
            logger.error(f"Error writing status file: {e}")

    async def get_indexing_status(self) -> dict[str, Any]:
        return self._get_status()

    async def trigger_ingestion(self, reindex_all: bool = False) -> dict[str, Any]:
        current_status = self._get_status()
        if current_status.get("status") == "processing":
            return {"status": "already_running", "message": "Ingestion pipeline is already running in background."}

        # Start background task
        asyncio.create_task(self._run_ingestion_pipeline(reindex_all))
        return {"status": "accepted", "message": "Ingestion pipeline triggered successfully in background."}

    async def _run_ingestion_pipeline(self, reindex_all: bool) -> None:
        start_time = time.time()
        status: dict[str, Any] = {
            "status": "processing",
            "documents_processed": 0,
            "chunks_generated": 0,
            "embeddings_generated": 0,
            "start_time": datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z",
            "end_time": None,
            "processing_time_sec": 0.0,
            "failures": [],
            "warnings": []
        }
        self._save_status(status)

        try:
            manifest = ManifestLoader.load()
            active_items = [item for item in manifest if item.get("status") == "active"]

            # Clear vector store if full reindex requested
            if reindex_all:
                for item in active_items:
                    await self.vector_store.delete_chunks_by_document(item["id"])
                logger.info("Cleared previous indexes for reindexing.")

            for item in active_items:
                doc_id = item["id"]
                logger.info(f"Ingestion Pipeline processing: {doc_id}")

                # 1. Validation check
                val_res = await self.validation_service.validate_document(doc_id)
                if not val_res["valid"]:
                    reason = val_res["reason"]
                    logger.warning(f"Validation failed for {doc_id}: {reason}")
                    status["failures"].append({"document_id": doc_id, "reason": reason})
                    self._save_status(status)
                    continue

                abs_path = val_res["absolute_path"]
                meta_item = val_res["metadata_item"]

                # 2. PDF Parsing & Layout extraction
                try:
                    parse_res = await self.pdf_service.parse_pdf(str(abs_path))
                except Exception as e:
                    reason = f"PDF Parsing failed: {e}"
                    logger.error(reason)
                    status["failures"].append({"document_id": doc_id, "reason": reason})
                    self._save_status(status)
                    continue

                text = parse_res["text"]
                pages = parse_res["pages"]

                # 3. Semantic Chunking
                try:
                    chunks = await self.chunker.chunk_document(text)
                except Exception as e:
                    reason = f"Semantic chunking failed: {e}"
                    logger.error(reason)
                    status["failures"].append({"document_id": doc_id, "reason": reason})
                    self._save_status(status)
                    continue

                if not chunks:
                    logger.warning(f"No text chunks generated for document: {doc_id}")
                    status["warnings"].append({"document_id": doc_id, "reason": "No text chunks generated."})
                    status["documents_processed"] += 1
                    self._save_status(status)
                    continue

                # 4. Generate Embeddings
                try:
                    embeddings = await self.embedding_service.get_embeddings(chunks)
                except Exception as e:
                    reason = f"Embedding generation failed: {e}"
                    logger.error(reason)
                    status["failures"].append({"document_id": doc_id, "reason": reason})
                    self._save_status(status)
                    continue

                # 5. Insert Chunks into Vector store
                inserted_chunks = 0
                for idx, chunk in enumerate(chunks):
                    emb = embeddings[idx]
                    chunk_id = f"{doc_id}_chunk_{idx}"

                    # Associate page numbers (heuristics)
                    page_num = 1
                    for pg in pages:
                        if chunk[:50] in pg["text"]:
                            page_num = pg["page_number"]
                            break

                    chunk_record = {
                        "document_id": doc_id,
                        "chunk_id": chunk_id,
                        "text": chunk,
                        "embedding": emb,
                        "page": page_num,
                        "section": parse_res["headings"][0] if parse_res["headings"] else None,
                        "category": meta_item["category"],
                        "keywords": meta_item["keywords"],
                        "act_type": meta_item["act_type"],
                        "jurisdiction": meta_item["jurisdiction"],
                        "language": meta_item["language"],
                        "source_path": meta_item["relative_path"],
                        "checksum": meta_item["checksum"],
                        "created_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
                    }

                    try:
                        await self.vector_store.insert_chunk(chunk_record)
                        inserted_chunks += 1
                    except Exception as e:
                        logger.error(f"Failed to insert chunk {chunk_id}: {e}")
                        status["warnings"].append({"document_id": doc_id, "reason": f"Failed to save chunk {idx}: {e}"})

                status["documents_processed"] += 1
                status["chunks_generated"] += inserted_chunks
                status["embeddings_generated"] += inserted_chunks
                self._save_status(status)

            # Mark pipeline complete
            end_time = time.time()
            status["status"] = "completed"
            status["end_time"] = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
            status["processing_time_sec"] = round(end_time - start_time, 2)
            self._save_status(status)
            logger.info("Ingestion Pipeline execution complete.")

        except Exception as e:
            end_time = time.time()
            status["status"] = "failed"
            status["end_time"] = datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z"
            status["processing_time_sec"] = round(end_time - start_time, 2)
            status["failures"].append({"document_id": "GLOBAL_PIPELINE", "reason": str(e)})
            self._save_status(status)
            logger.error(f"Global Ingestion Pipeline failure: {e}")
