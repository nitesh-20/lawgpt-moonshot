from typing import Any


class ContextAssembler:
    """
    Unified context compiler merging memory, local RAG chunks, metadata parameters,
    queries, and step execution trace logs.
    """
    async def assemble_context(
        self,
        query: str,
        memory: list[dict[str, str]],
        rag_chunks: list[dict[str, Any]],
        execution_history: list[dict[str, Any]],
        session_metadata: dict[str, Any] = None
    ) -> dict[str, Any]:
        return {
            "query": query,
            "conversation_history": memory,
            "retrieved_legal_chunks": [
                {
                    "chunk_id": chunk.get("chunk_id"),
                    "document_id": chunk.get("document_id"),
                    "text": chunk.get("text"),
                    "page": chunk.get("page"),
                    "section": chunk.get("section"),
                    "category": chunk.get("category"),
                    "act_type": chunk.get("act_type"),
                    "jurisdiction": chunk.get("jurisdiction")
                }
                for chunk in rag_chunks
            ],
            "execution_history": execution_history,
            "session_metadata": session_metadata or {}
        }
