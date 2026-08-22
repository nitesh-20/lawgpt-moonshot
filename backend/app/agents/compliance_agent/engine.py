import os
from typing import Any

from loguru import logger

from app.agents.compliance_agent.analyzer import GapAnalyzer, PolicyMapper
from app.agents.compliance_agent.generator import ComplianceReportGenerator
from app.agents.compliance_agent.matcher import RegulationMatcher
from app.agents.compliance_agent.recommendation import RecommendationEngine
from app.agents.compliance_agent.scorer import RiskScorer
from app.agents.document_agent.analyzer import DocumentAnalyzer
from app.services.rag.rag import RAGService


class ComplianceEngine:
    """
    Main compliance orchestration engine. Reuses existing parsing/indexing services,
    coordinates matching, evaluations, risk calculations, and reports.
    """
    def __init__(self, rag_service: RAGService | None = None) -> None:
        self.rag_service = rag_service or RAGService()
        self.analyzer = DocumentAnalyzer()
        self.matcher = RegulationMatcher(self.rag_service)
        self.gap_analyzer = GapAnalyzer()
        self.policy_mapper = PolicyMapper()
        self.scorer = RiskScorer()
        self.recommendation_engine = RecommendationEngine()
        self.report_generator = ComplianceReportGenerator()

    async def run_compliance_audit(
        self,
        text: str = "",
        query: str = "",
        document_id: str | None = None,
        file_path: str | None = None,
        regulation_ids: list[str] | None = None
    ) -> dict[str, Any]:
        """
        Executes the linear compliance audit flow.
        """
        logger.info(f"Starting compliance audit. document_id={document_id}, file_path={file_path}, regulation_ids={regulation_ids}")

        target_text = text or ""

        # 1. Resolve document text using existing parsing/indexing if doc_id/file_path is provided
        if document_id:
            logger.info(f"Reassembling document text from vector store chunks for document_id: {document_id}")
            chunks = await self.rag_service.vector_store.get_chunks_by_document(document_id)
            if chunks:
                # Sort chunks by chunk_id to keep original sequence order
                chunks.sort(key=lambda x: x.get("chunk_id", ""))
                target_text = "\n\n".join(c.get("text", "") for c in chunks)
                logger.info(f"Reconstructed {len(target_text)} chars of text from {len(chunks)} chunks.")
            else:
                # Try getting local analysis data
                status = await self.analyzer.get_analysis_status(document_id)
                if status and status.get("results"):
                    target_text = status["results"].get("executive_summary", "")
                    logger.warning(f"No chunks found for {document_id}. Falling back to executive summary text.")
        
        elif file_path:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File path does not exist: {file_path}")
            
            logger.info(f"Auditing file from path: {file_path}. Processing via DocumentAnalyzer to reuse parsing logic.")
            # Read file bytes
            with open(file_path, "rb") as f:  # noqa: ASYNC230
                file_bytes = f.read()
            file_name = os.path.basename(file_path)
            
            # Analyze document (which parses, chunks, and indexes it)
            doc_id = f"doc_compliance_{int(os.getpid())}"
            analysis_results = await self.analyzer.analyze_document(file_name, file_bytes, document_id=doc_id)
            
            # Reconstruct text from recently indexed chunks
            chunks = await self.rag_service.vector_store.get_chunks_by_document(doc_id)
            if chunks:
                chunks.sort(key=lambda x: x.get("chunk_id", ""))
                target_text = "\n\n".join(c.get("text", "") for c in chunks)
            else:
                target_text = analysis_results.get("executive_summary", "")

        # Fallback to query if text is still empty
        if not target_text.strip():
            target_text = query

        if not target_text.strip():
            raise ValueError("No input text or document was provided for compliance evaluation.")

        # 2. Regulation Matching
        if regulation_ids:
            # Validate input regulation IDs
            valid_ids = [rid.lower().strip() for rid in regulation_ids]
            logger.info(f"Using user-specified regulation IDs: {valid_ids}")
        else:
            # Auto-detect applicable regulations
            valid_ids = await self.matcher.match_regulations(target_text, query)

        # 3. Knowledge Search & Gap Evaluation
        gap_results = await self.gap_analyzer.analyze_gaps(target_text, valid_ids)
        passed_checks = gap_results["passed"]
        failed_checks = gap_results["failed"]

        # 4. Policy Mapping
        policy_alignments = await self.policy_mapper.map_policy_alignment(target_text, passed_checks, failed_checks)

        # 5. Risk Scoring
        score_results = await self.scorer.calculate_score(passed_checks, failed_checks)

        # 6. Recommendations & Citations
        recommendations = await self.recommendation_engine.generate_recommendations(failed_checks)

        # 7. Compile compliance report
        report = await self.report_generator.compile_report(
            matched_regulation_ids=valid_ids,
            passed_checks=passed_checks,
            failed_checks=failed_checks,
            score_results=score_results,
            recommendations=recommendations,
            policy_alignments=policy_alignments
        )

        return report
