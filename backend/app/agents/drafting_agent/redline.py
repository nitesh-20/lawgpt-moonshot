from typing import Any, Dict
from loguru import logger
from app.agents.document_agent.comparison_engine import ComparisonEngine


class RedlineEngine:
    """
    Compares original and revised drafts, highlighting insertions, deletions,
    and modified clauses while explaining shifts in legal risk.
    Reuses ComparisonEngine from Document Agent.
    """
    def __init__(self) -> None:
        self.engine = ComparisonEngine()

    async def generate_redline(self, original_text: str, revised_text: str) -> Dict[str, Any]:
        """
        Compare the original and revised text to produce a redline comparison.
        """
        logger.info("Generating redline comparison...")
        result = await self.engine.compare(original_text, revised_text)
        
        # Structure the output for Drafting Agent
        return {
            "summary": result.get("comparison_summary", "No differences identified."),
            "insertions": result.get("inserted_clauses", []),
            "deletions": result.get("deleted_clauses", []),
            "modifications": result.get("modified_clauses", []),
            "legal_impact": result.get("legal_impact", "No legal risk shifts detected."),
            "risk_changes": result.get("risk_changes", "No risk shifts identified.")
        }
