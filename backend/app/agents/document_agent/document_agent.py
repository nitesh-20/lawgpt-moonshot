from typing import Any
from loguru import logger
from app.agents.base import BaseAgent
from app.agents.document_agent.analyzer import DocumentAnalyzer


class DocumentIntelligenceAgent(BaseAgent):
    """
    Document Intelligence Agent parses, indexes, audits, and compares legal documents.
    Integrates with standard orchestrator intent mappings and handles RAG search queries.
    """

    def __init__(self) -> None:
        self._initialized = False
        self.analyzer = None

    @property
    def metadata(self) -> dict[str, Any]:
        return {
            "id": "document_agent",
            "name": "Document Intelligence Agent",
            "description": "Performs deep parsing, compliance audits, clause extraction, timeline mapping, and comparison on legal documents.",
            "supported_intents": ["document_analysis", "summarization", "risk_assessment"],
            "priority": 3,
            "health": "healthy" if self._initialized else "uninitialized",
            "version": "1.1.0",
            "capabilities": [
                "PDF/DOCX/TXT layout parsing",
                "Automated clause extraction (Termination, Indemnity, etc.)",
                "Legal entity extraction (Money, Acts, Parties, Signatories)",
                "Document comparison & legal impact audits",
                "Risk classification & mitigation recommendations",
                "Timeline & deadline compiling"
            ]
        }

    async def initialize(self) -> None:
        logger.info("Initializing Document Intelligence Agent...")
        self.analyzer = DocumentAnalyzer()
        self._initialized = True
        logger.info("Document Intelligence Agent initialized successfully.")

    async def execute(self, task_input: dict[str, Any]) -> dict[str, Any]:
        logger.info("Document Intelligence Agent executing task...")
        if not self._initialized:
            raise RuntimeError("Document Intelligence Agent is not initialized.")

        query = task_input.get("query", "")
        document_id = task_input.get("document_id")
        file_path = task_input.get("file_path")
        
        # Check if this is an explicit analyze request
        if document_id or file_path:
            try:
                # If we have a file path, read it
                if file_path:
                    import os
                    if os.path.exists(file_path):
                        with open(file_path, "rb") as f:
                            file_bytes = f.read()
                        file_name = os.path.basename(file_path)
                        results = await self.analyzer.analyze_document(file_name, file_bytes, document_id=document_id, file_path=file_path)
                        return {
                            "status": "success",
                            "message": f"Document '{file_name}' analyzed successfully. Ingested {results['analysis_metrics']['chunks_generated']} chunks.",
                            "agent": "DocumentIntelligenceAgent",
                            "data": results
                        }
                    else:
                        raise FileNotFoundError(f"File not found: {file_path}")
                elif document_id:
                    # Retrieve status
                    status_record = await self.analyzer.get_analysis_status(document_id)
                    if status_record:
                        return {
                            "status": "success",
                            "message": f"Status for document '{document_id}' is '{status_record.get('status')}'",
                            "agent": "DocumentIntelligenceAgent",
                            "data": status_record
                        }
                    else:
                        return {
                            "status": "error",
                            "message": f"Document '{document_id}' has not been analyzed yet.",
                            "agent": "DocumentIntelligenceAgent"
                        }
            except Exception as e:
                logger.error(f"Execution failed: {e}")
                return {
                    "status": "error",
                    "message": f"Document analysis execution failed: {e}",
                    "agent": "DocumentIntelligenceAgent"
                }

        # Otherwise, check if the query is a general summarization / risk request
        if "summarize" in query.lower() or "summary" in query.lower():
            return {
                "status": "success",
                "message": "I can summarize any uploaded PDF, DOCX, or TXT document. Please upload a file to the '/api/v1/document/analyze' endpoint first.",
                "agent": "DocumentIntelligenceAgent",
                "data": {}
            }
        
        return {
            "status": "success",
            "message": "Document Intelligence Agent is active. Submit documents via HTTP POST to /api/v1/document/analyze to extract clauses, risks, timelines, and entities.",
            "agent": "DocumentIntelligenceAgent",
            "data": {},
        }

    async def shutdown(self) -> None:
        logger.info("Shutting down Document Intelligence Agent...")
        self._initialized = False
        logger.info("Document Intelligence Agent shut down.")

    async def health(self) -> dict[str, Any]:
        return {
            "status": "healthy" if self._initialized else "uninitialized",
            "agent": "DocumentIntelligenceAgent",
            "metadata": self.metadata
        }


# Maintain backward compatibility alias for import statements
DocumentAgent = DocumentIntelligenceAgent
