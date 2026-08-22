import os
import json
import math
from pathlib import Path
from typing import Any
from loguru import logger
from app.database.firestore import get_firestore_client
from app.core.config import settings


class BaseVectorStore:
    """
    Abstract interface for pluggable vector store engines.
    """
    async def insert_chunk(self, chunk_data: dict[str, Any]) -> None:
        raise NotImplementedError

    async def get_chunks_by_document(self, doc_id: str) -> list[dict[str, Any]]:
        raise NotImplementedError

    async def delete_chunks_by_document(self, doc_id: str) -> None:
        raise NotImplementedError

    async def search_chunks(
        self,
        query_text: str,
        query_embedding: list[float],
        limit: int = 5,
        filters: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        raise NotImplementedError


class FirestoreVectorStore(BaseVectorStore):
    """
    Stores vector chunks and metadata in Google Cloud Firestore,
    falling back to local storage if Firestore connection is not initialized.
    """
    def __init__(self) -> None:
        self.collection_name = "knowledge_chunks"
        self.local_fallback = settings.BASE_DIR / "data" / "local_vector_store.json"

    def _get_client(self):
        try:
            return get_firestore_client()
        except Exception:
            return None

    async def insert_chunk(self, chunk_data: dict[str, Any]) -> None:
        client = self._get_client()
        chunk_id = chunk_data["chunk_id"]

        if client is not None:
            logger.info(f"Indexing chunk {chunk_id} to Firestore collection: {self.collection_name}")
            try:
                doc_ref = client.collection(self.collection_name).document(chunk_id)
                doc_ref.set(chunk_data)
                return
            except Exception as e:
                logger.warning(f"Firestore write failed: {e}. Falling back to local storage.")

        # Local JSON Fallback
        self._write_local_chunk(chunk_data)

    def _write_local_chunk(self, chunk_data: dict[str, Any]) -> None:
        logger.info(f"Indexing chunk {chunk_data['chunk_id']} to Local JSON Fallback Vector Store.")
        try:
            data = []
            if self.local_fallback.exists():
                with open(self.local_fallback, "r") as f:
                    data = json.load(f)
            data = [item for item in data if item["chunk_id"] != chunk_data["chunk_id"]]
            data.append(chunk_data)
            with open(self.local_fallback, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to write to local vector store fallback: {e}")

    async def get_chunks_by_document(self, doc_id: str) -> list[dict[str, Any]]:
        client = self._get_client()
        if client is not None:
            try:
                docs = client.collection(self.collection_name).where("document_id", "==", doc_id).stream()
                chunks: list[dict[str, Any]] = []
                for d in docs:
                    doc_data = d.to_dict()
                    if doc_data is not None:
                        chunks.append(doc_data)
                return chunks
            except Exception as e:
                logger.warning(f"Firestore query failed: {e}. Checking local storage.")

        # Local JSON Fallback
        if self.local_fallback.exists():
            with open(self.local_fallback, "r") as f:
                data = json.load(f)
            return [item for item in data if item.get("document_id") == doc_id]
        return []

    async def delete_chunks_by_document(self, doc_id: str) -> None:
        client = self._get_client()
        if client is not None:
            try:
                docs = client.collection(self.collection_name).where("document_id", "==", doc_id).stream()
                for d in docs:
                    d.reference.delete()
                logger.info(f"Deleted Firestore chunks for document: {doc_id}")
                return
            except Exception as e:
                logger.warning(f"Firestore delete failed: {e}. Falling back to local.")

        # Local JSON Fallback
        if self.local_fallback.exists():
            with open(self.local_fallback, "r") as f:
                data = json.load(f)
            data = [item for item in data if item.get("document_id") != doc_id]
            with open(self.local_fallback, "w") as f:
                json.dump(data, f, indent=2)

    async def search_chunks(
        self,
        query_text: str,
        query_embedding: list[float],
        limit: int = 5,
        filters: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        logger.info(f"Searching chunks for query: '{query_text}' with filters: {filters}")
        client = self._get_client()
        candidates: list[dict[str, Any]] = []

        if client is not None:
            try:
                ref = client.collection(self.collection_name)
                if filters and "document_id" in filters:
                    docs = ref.where("document_id", "==", filters["document_id"]).stream()
                else:
                    docs = ref.stream()
                for d in docs:
                    data = d.to_dict()
                    if data is not None:
                        candidates.append(data)
            except Exception as e:
                logger.warning(f"Firestore search fetch failed: {e}. Falling back to local storage.")
                client = None

        if client is None:
            if self.local_fallback.exists():
                try:
                    with open(self.local_fallback, "r") as f:
                        candidates = json.load(f)
                except Exception as e:
                    logger.error(f"Failed to read local fallback vector store: {e}")
                    candidates = []

        # Perform filtering in Python
        filtered_candidates = []
        for c in candidates:
            keep = True
            if filters:
                for k, v in filters.items():
                    if c.get(k) != v:
                        keep = False
                        break
            if keep:
                filtered_candidates.append(c)

        # Compute scores (hybrid: semantic cosine similarity + keyword overlap)
        scored_candidates = []
        query_words = set(query_text.lower().split()) if query_text else set()

        for c in filtered_candidates:
            # 1. Semantic score
            emb = c.get("embedding")
            semantic_score = 0.0
            if emb and query_embedding:
                dot_product = sum(a * b for a, b in zip(query_embedding, emb))
                norm1 = math.sqrt(sum(a * a for a in query_embedding))
                norm2 = math.sqrt(sum(b * b for b in emb))
                if norm1 > 0.0 and norm2 > 0.0:
                    semantic_score = dot_product / (norm1 * norm2)

            # 2. Keyword score
            text = c.get("text", "").lower()
            keyword_score = 0.0
            if query_words:
                stop_words = {"what", "are", "the", "rules", "for", "is", "a", "an", "of", "and", "in", "to", "how", "why"}
                meaningful_query_words = query_words - stop_words
                if meaningful_query_words:
                    text_words = set(text.split())
                    overlap = len(meaningful_query_words.intersection(text_words))
                    keyword_score = overlap / len(meaningful_query_words)
                else:
                    keyword_score = 0.0

            # Hybrid score
            if all(v == 0.0 for v in query_embedding) or not emb or all(v == 0.0 for v in emb):
                score = keyword_score
            else:
                score = 0.6 * semantic_score + 0.4 * keyword_score

            # Entity & Section Penalty: If query contains entities or sections and chunk contains none of them, apply penalty
            import re
            query_lower = query_text.lower()
            text_lower = text.lower()
            
            entities_to_check = ["dpdp", "sebi", "rbi", "gst", "it act", "companies act"]
            query_entities = [e for e in entities_to_check if e in query_lower]
            query_sections = re.findall(r"\b(?:section|sec)\s*(\d+\w*)", query_lower)
            
            # If the query specifies entities/sections and the chunk contains none of them, apply heavy penalty (0.2x multiplier)
            if query_entities or query_sections:
                has_entity_match = any(e in text_lower for e in query_entities) if query_entities else False
                has_section_match = any(s in text_lower for s in query_sections) if query_sections else False
                if not (has_entity_match or has_section_match):
                    score = score * 0.2

            c_with_score = dict(c)
            c_with_score["score"] = round(score, 3)
            scored_candidates.append(c_with_score)

        scored_candidates.sort(key=lambda x: x.get("score", 0.0), reverse=True)
        return scored_candidates[:limit]


class FAISSVectorStore(BaseVectorStore):
    """
    FAISS vector store provider stub.
    """
    async def insert_chunk(self, chunk_data: dict[str, Any]) -> None:
        logger.info(f"FAISS: Inserted chunk {chunk_data['chunk_id']}")

    async def get_chunks_by_document(self, doc_id: str) -> list[dict[str, Any]]:
        return []

    async def delete_chunks_by_document(self, doc_id: str) -> None:
        logger.info(f"FAISS: Deleted chunks for {doc_id}")

    async def search_chunks(
        self,
        query_text: str,
        query_embedding: list[float],
        limit: int = 5,
        filters: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        return []


class ChromaVectorStore(BaseVectorStore):
    """
    Chroma DB vector store provider stub.
    """
    async def insert_chunk(self, chunk_data: dict[str, Any]) -> None:
        logger.info(f"Chroma: Inserted chunk {chunk_data['chunk_id']}")

    async def get_chunks_by_document(self, doc_id: str) -> list[dict[str, Any]]:
        return []

    async def delete_chunks_by_document(self, doc_id: str) -> None:
        logger.info(f"Chroma: Deleted chunks for {doc_id}")

    async def search_chunks(
        self,
        query_text: str,
        query_embedding: list[float],
        limit: int = 5,
        filters: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        return []


class PineconeVectorStore(BaseVectorStore):
    """
    Pinecone DB vector store provider stub.
    """
    async def insert_chunk(self, chunk_data: dict[str, Any]) -> None:
        logger.info(f"Pinecone: Inserted chunk {chunk_data['chunk_id']}")

    async def get_chunks_by_document(self, doc_id: str) -> list[dict[str, Any]]:
        return []

    async def delete_chunks_by_document(self, doc_id: str) -> None:
        logger.info(f"Pinecone: Deleted chunks for {doc_id}")

    async def search_chunks(
        self,
        query_text: str,
        query_embedding: list[float],
        limit: int = 5,
        filters: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        return []


class WeaviateVectorStore(BaseVectorStore):
    """
    Weaviate DB vector store provider stub.
    """
    async def insert_chunk(self, chunk_data: dict[str, Any]) -> None:
        logger.info(f"Weaviate: Inserted chunk {chunk_data['chunk_id']}")

    async def get_chunks_by_document(self, doc_id: str) -> list[dict[str, Any]]:
        return []

    async def delete_chunks_by_document(self, doc_id: str) -> None:
        logger.info(f"Weaviate: Deleted chunks for {doc_id}")

    async def search_chunks(
        self,
        query_text: str,
        query_embedding: list[float],
        limit: int = 5,
        filters: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        return []


def get_vector_store(provider_name: str | None = None) -> BaseVectorStore:
    provider = provider_name or os.getenv("VECTOR_STORE_PROVIDER") or "firestore"
    name = provider.lower()
    if name == "firestore":
        return FirestoreVectorStore()
    elif name == "faiss":
        return FAISSVectorStore()
    elif name == "chroma":
        return ChromaVectorStore()
    elif name == "pinecone":
        return PineconeVectorStore()
    elif name == "weaviate":
        return WeaviateVectorStore()
    else:
        logger.warning(f"Unknown vector store provider: {name}. Defaulting to Firestore.")
        return FirestoreVectorStore()
