import time
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from loguru import logger

from app.agents.base import BaseAgent
from app.services.rag.rag import RAGService
from app.agents.research_agent.expander import QueryExpander
from app.agents.research_agent.retriever import LegalRetriever
from app.agents.research_agent.ranking import RankingEngine
from app.agents.research_agent.citations import CitationEngine
from app.agents.research_agent.reasoner import LegalReasoner
from app.agents.research_agent.formatter import ResultFormatter
from app.core.config import settings


class ResearchAgent(BaseAgent):
    """
    Research Agent executes indic legal query tasks, fetches case laws,
    regulations, acts, and formats citations.
    """

    def __init__(self) -> None:
        self._initialized = False
        self.rag_service = RAGService()
        self.expander = QueryExpander()
        self.retriever = LegalRetriever(self.rag_service)
        self.ranking_engine = RankingEngine()
        self.citation_engine = CitationEngine()
        self.reasoner = LegalReasoner()
        self.formatter = ResultFormatter()
        self.history_file = settings.BASE_DIR / "data" / "research_history.json"

    @property
    def metadata(self) -> dict[str, Any]:
        return {
            "id": "research_agent",
            "name": "Research Agent",
            "description": "Executes indic legal query tasks, fetches case laws, regulations, acts, and formats citations.",
            "supported_intents": ["legal_research"],
            "priority": 5,
            "health": "healthy" if self._initialized else "uninitialized",
            "version": "1.0.0",
            "capabilities": ["Bare act lookups", "Landmark case searches", "Statute citation structuring"],
        }

    async def initialize(self) -> None:
        logger.info("Initializing Research Agent...")
        self._initialized = True
        logger.info("Research Agent initialized.")

    async def execute(self, task_input: dict[str, Any]) -> dict[str, Any]:
        logger.info(f"Research Agent executing search. Input: {task_input}")
        if not self._initialized:
            raise RuntimeError("Research Agent is not initialized.")

        query = task_input.get("query", task_input.get("message", ""))
        session_id = task_input.get("session_id", "default_session")
        filters = task_input.get("filters")

        if not query:
            return {
                "status": "error",
                "message": "Query string is empty.",
                "agent": "ResearchAgent",
                "data": {},
            }

        start_time = time.time()

        # 1. Expand query terms
        expanded_info = self.expander.expand(query)
        expanded_query = expanded_info["expanded_query"]

        # 2. Retrieve matched context chunks
        retrieved_chunks = await self.retriever.retrieve(
            query=expanded_query, limit=10, filters=filters
        )

        # 3. Rank chunks by authority, recency, relevance
        ranked_chunks = self.ranking_engine.rank(
            chunks=retrieved_chunks, query=query, detected_info=expanded_info
        )

        # 4. Extract citations
        citations = self.citation_engine.generate_citations(ranked_chunks)

        # 5. Execute legal reasoning
        reasoning_result = await self.reasoner.reason(
            query=query, ranked_chunks=ranked_chunks, citations=citations
        )

        print("\n=== STEP 4: FORMATTER INPUT ===")
        print(json.dumps(reasoning_result, indent=2))

        # 6. Format Result
        formatted = self.formatter.format(reasoning_result, citations)

        print("\n=== STEP 5: FINAL API JSON ===")
        print(json.dumps(formatted, indent=2))

        end_time = time.time()
        duration = round(end_time - start_time, 3)

        output_data = {
            "status": "success",
            "message": formatted.get("executive_summary", ""),
            "agent": "ResearchAgent",
            "data": formatted,
            "metrics": {
                "execution_time_sec": duration,
                "confidence_score": formatted.get("confidence_score", 0.0),
                "chunks_retrieved": len(retrieved_chunks),
                "citations_count": len(citations),
            },
        }

        # 7. Write history log
        self._write_history(query, session_id, output_data)

        return output_data

    def _write_history(self, query: str, session_id: str, output_data: dict[str, Any]) -> None:
        try:
            self.history_file.parent.mkdir(parents=True, exist_ok=True)
            history = []
            if self.history_file.exists():
                try:
                    with open(self.history_file, "r") as f:
                        history = json.load(f)
                except Exception:
                    history = []

            # Clean and normalize query to deduplicate
            query_clean = query.strip()
            norm_query = query_clean.lower()

            # Filter out any duplicate of this query
            filtered_history = [
                item for item in history
                if item.get("query", "").strip().lower() != norm_query
            ]

            new_entry = {
                "timestamp": datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z",
                "session_id": session_id,
                "query": query_clean,
                "result": output_data.get("data", {}),
                "metrics": output_data.get("metrics", {}),
            }

            # Insert newest at index 0 and slice to max 15
            filtered_history.insert(0, new_entry)
            history_capped = filtered_history[:15]

            with open(self.history_file, "w") as f:
                json.dump(history_capped, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to write research agent history: {e}")

    async def shutdown(self) -> None:
        logger.info("Shutting down Research Agent...")
        self._initialized = False
        logger.info("Research Agent shut down.")

    async def health(self) -> dict[str, Any]:
        return {
            "status": "healthy" if self._initialized else "uninitialized",
            "agent": "ResearchAgent",
            "metadata": self.metadata,
        }
