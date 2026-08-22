from typing import Any
from app.services.rag.vector_store import BaseVectorStore


class HybridSearch:
    """
    Coordinates semantic (vector-based) search and keyword search,
    combining them into a single hybrid ranked result set.
    """

    def __init__(self, vector_store: BaseVectorStore) -> None:
        self.vector_store = vector_store

    async def search(
        self,
        query_text: str,
        query_embedding: list[float],
        limit: int = 5,
        filters: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Executes hybrid search by querying the vector store (which handles cosine similarity
        and keyword-overlap combination) and returns scored chunk hits.
        """
        # Call the underlying vector store hybrid search implementation
        return await self.vector_store.search_chunks(
            query_text=query_text,
            query_embedding=query_embedding,
            limit=limit,
            filters=filters,
        )
