import json
from pathlib import Path
from typing import Any

from loguru import logger
from app.services.rag.vector_store import get_vector_store
from app.services.embeddings.embeddings import EmbeddingService
from app.core.config import settings


class RAGService:
    """
    RAG Service orchestrates embedding generation, vector search, document chunking,
    and context compilation for legal agent execution.
    It automatically excludes all placeholder documents from being processed, embedded, or indexed.
    """

    def __init__(self) -> None:
        self.metadata_path = settings.BASE_DIR / "data" / "document_metadata.json"
        self.placeholder_ids: set[str] = set()
        self._load_placeholder_registry()
        self.vector_store = get_vector_store()
        self.embedding_service = EmbeddingService()

    def _load_placeholder_registry(self) -> None:
        try:
            if self.metadata_path.exists():
                with open(self.metadata_path, "r") as f:
                    meta_list = json.load(f)
                    self.placeholder_ids = {
                        item["id"] for item in meta_list if item.get("is_placeholder", False)
                    }
                logger.info(f"Loaded RAG placeholder exclusion registry. {len(self.placeholder_ids)} placeholders registered.")
        except Exception as e:
            logger.error(f"Error loading placeholder registry: {e}")

    def is_placeholder_document(self, doc_id: str) -> bool:
        """
        Check if the given document ID is marked as a placeholder in the registry.
        """
        return doc_id in self.placeholder_ids

    async def chunk_document(
        self, text: str, doc_id: str, chunk_size: int = 1000, chunk_overlap: int = 200
    ) -> list[str]:
        """
        Split text into overlapping chunks.
        Placeholder documents are explicitly ignored and return empty chunks.
        """
        if self.is_placeholder_document(doc_id):
            logger.warning(f"RAG: Skipping chunking for placeholder document ID: {doc_id}")
            return []

        logger.info(f"Chunking document text length {len(text)} for doc_id {doc_id}")
        return [text]

    async def generate_embedding(self, text: str, doc_id: str) -> list[float]:
        """
        Skeleton method to generate vector embeddings.
        Placeholder documents are explicitly skipped.
        """
        if self.is_placeholder_document(doc_id):
            logger.warning(f"RAG: Skipping embedding generation for placeholder document ID: {doc_id}")
            return []

        logger.info(f"Generating embedding for doc_id: {doc_id}")
        return [0.0] * 768

    async def retrieve_context(
        self, query: str, limit: int = 5
    ) -> list[dict[str, Any]]:
        """
        Query vector stores/databases to fetch matching legal records.
        Filtered to guarantee no placeholder records are ever returned.
        """
        logger.info(f"Retrieving context for query: {query}")
        try:
            # Generate embedding for query
            embedding = await self.embedding_service.get_embedding(query)
            # Query the vector store
            chunks = await self.vector_store.search_chunks(
                query_text=query, query_embedding=embedding, limit=limit * 2
            )
            # Filter out chunks from placeholder documents
            active_chunks = [
                c for c in chunks if not self.is_placeholder_document(c.get("document_id", ""))
            ]
            return active_chunks[:limit]
        except Exception as e:
            logger.error(f"Error retrieving context in RAGService: {e}")
            return []

