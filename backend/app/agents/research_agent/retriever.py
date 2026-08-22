from typing import Any
from app.services.rag.rag import RAGService
from app.agents.research_agent.search import HybridSearch
from app.services.embeddings.embeddings import EmbeddingService


class LegalRetriever:
    """
    Handles retrieval of Top-K chunks from the indexed legal knowledge base,
    delegating to HybridSearch and applying metadata filters.
    """

    def __init__(self, rag_service: RAGService) -> None:
        self.rag_service = rag_service
        self.embedding_service = EmbeddingService()
        self.hybrid_search = HybridSearch(rag_service.vector_store)

    async def retrieve(
        self, query: str, limit: int = 5, filters: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """
        Retrieves Top-K context chunks matching query, applying placeholder filtering and metadata filters.
        """
        # Generate query embedding
        query_embedding = await self.embedding_service.get_embedding(query)

        # Execute search
        hits = await self.hybrid_search.search(
            query_text=query,
            query_embedding=query_embedding,
            limit=limit * 2,  # Fetch slightly more to account for placeholder filtration
            filters=filters,
        )

        # Exclude placeholder documents
        active_hits = [
            hit
            for hit in hits
            if not self.rag_service.is_placeholder_document(hit.get("document_id", ""))
        ]

        return active_hits[:limit]
