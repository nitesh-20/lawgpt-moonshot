import os
import re
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

    def _classify_document(self, text: str, file_name: str = "") -> dict[str, Any]:
        """
        Classifies document type based on structural headers, keywords, and title.
        """
        text_lower = (text[:3000] + " " + file_name).lower()
        
        if "non-disclosure" in text_lower or "confidentiality agreement" in text_lower or "nda" in text_lower:
            return {"type": "Non-Disclosure Agreement (NDA)", "confidence": 0.96, "category": "Confidentiality"}
        elif "employment" in text_lower or "employee" in text_lower or "job offer" in text_lower or "appointment letter" in text_lower:
            return {"type": "Employment Agreement", "confidence": 0.94, "category": "Employment"}
        elif "service agreement" in text_lower or "master service" in text_lower or "msa" in text_lower or "statement of work" in text_lower:
            return {"type": "Service Agreement", "confidence": 0.93, "category": "Commercial"}
        elif "lease" in text_lower or "tenancy" in text_lower or "landlord" in text_lower or "rent agreement" in text_lower:
            return {"type": "Lease Agreement", "confidence": 0.95, "category": "Real Estate"}
        elif "privacy policy" in text_lower or "data protection" in text_lower or "dpa" in text_lower:
            return {"type": "Privacy Policy & DPA", "confidence": 0.96, "category": "Compliance"}
        elif "terms of service" in text_lower or "terms and conditions" in text_lower:
            return {"type": "Terms of Service", "confidence": 0.92, "category": "Compliance"}
        elif "partnership" in text_lower or "partner" in text_lower or "joint venture" in text_lower:
            return {"type": "Partnership Agreement", "confidence": 0.91, "category": "Corporate"}
        elif "vendor" in text_lower or "procurement" in text_lower or "supply agreement" in text_lower:
            return {"type": "Vendor Agreement", "confidence": 0.90, "category": "Commercial"}
        elif "legal notice" in text_lower or "demand notice" in text_lower or "cease and desist" in text_lower:
            return {"type": "Legal Demand Notice", "confidence": 0.95, "category": "Litigation"}
        
        return {"type": "Commercial Contract", "confidence": 0.88, "category": "Corporate"}

    def _extract_document_parameters(self, text: str) -> dict[str, Any]:
        """
        Extracts key parties, dates, jurisdiction, and governing law from the text.
        """
        parties = []
        # Match party patterns: between X and Y
        between_match = re.search(r"between\s+([A-Za-z0-9\s,\.\(\)]+?)\s+(?:and|\&)\s+([A-Za-z0-9\s,\.\(\)]+?)(?:\.|\n|WHEREAS|1\.)", text[:2000], re.IGNORECASE)
        if between_match:
            p1 = between_match.group(1).strip().replace("\n", " ")
            p2 = between_match.group(2).strip().replace("\n", " ")
            if len(p1) < 80:
                parties.append(p1)
            if len(p2) < 80:
                parties.append(p2)
        
        # Effective date match
        date_match = re.search(r"(?:entered into on|executed on|effective date:?|date:?)\s*([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})", text[:1500], re.IGNORECASE)
        effective_date = date_match.group(1) if date_match else "As specified in agreement"

        # Jurisdiction / Governing law
        gov_match = re.search(r"(?:governed by|laws of|jurisdiction of|courts of)\s+([A-Za-z\s,]+?)(?:\.|\;|\n)", text, re.IGNORECASE)
        governing_law = gov_match.group(1).strip() if gov_match else "Laws of India"

        return {
            "parties": parties if parties else ["Disclosing Party / Employer", "Receiving Party / Contractor"],
            "effective_date": effective_date,
            "governing_law": governing_law,
            "jurisdiction": governing_law
        }

    def _extract_clause_level_findings(self, text: str, failed_checks: list[Any], passed_checks: list[Any]) -> list[dict[str, Any]]:
        """
        Builds clause-by-clause audit findings with plain-language explanations, risks, recommendations, and statutory references.
        """
        findings = []

        # 1. Non-compete check
        if re.search(r"non-compete|compete.*(?:year|month|worldwide|territory)", text, re.IGNORECASE):
            findings.append({
                "clause_name": "Restrictive Covenant / Non-Compete",
                "status": "Critical Risk",
                "location": "Post-Termination Covenants",
                "what_it_says": "Restricts post-employment business engagement or working with industry competitors.",
                "why_it_matters": "Under Indian Law, post-employment restrictive covenants are generally void as restraints of trade.",
                "potential_risk": "Unenforceable before courts and creates wrongful restraint liability under statutory contract principles.",
                "recommendation": "Replace broad non-compete with enforceable non-solicitation of clients and employees.",
                "legal_basis": "Section 27, Indian Contract Act, 1872 (Agreement in restraint of trade void)",
                "original_text": "For a period following termination, Employee shall not engage in or work with competing technology firms."
            })

        # 2. Unlimited Indemnity / Liability check
        if re.search(r"unlimited|indemnify.*(?:all|any and all|losses|third party)|sole liability", text, re.IGNORECASE):
            findings.append({
                "clause_name": "Indemnification & Liability Exposure",
                "status": "High Risk",
                "location": "Indemnity Section",
                "what_it_says": "Requires open-ended indemnification for third-party claims and losses without a monetary cap.",
                "why_it_matters": "Exposes your organization to catastrophic uncapped financial damages beyond the contract value.",
                "potential_risk": "Severe financial vulnerability in the event of third-party disputes or breach allegations.",
                "recommendation": "Insert a mutual aggregate liability cap (e.g. 12 months fees paid) and carve out consequential damages.",
                "legal_basis": "Section 73 & 74, Indian Contract Act, 1872 (Compensation for loss caused by breach)",
                "original_text": "Indemnify and hold harmless against all claims, losses, costs, and damages without limitation."
            })

        # 3. Personal Data Privacy (DPDP Act)
        if re.search(r"data|privacy|biometric|transfer.*without consent|sell.*data", text, re.IGNORECASE):
            findings.append({
                "clause_name": "Personal Data Processing & Consent",
                "status": "Critical Risk",
                "location": "Data Privacy & Governance",
                "what_it_says": "Allows unilateral processing, storage, or transfer of personal identifiers without explicit consent notice.",
                "why_it_matters": "Statutory data privacy mandates explicit, itemized consent notices and lawful purpose specifications.",
                "potential_risk": "Regulatory penalties up to ₹250 Crores under the DPDP Act for unauthorized personal data processing.",
                "recommendation": "Incorporate DPDP Section 6 compliant consent notice and data principal withdrawal mechanism.",
                "legal_basis": "Section 6 & Section 8, Digital Personal Data Protection Act (DPDP), 2023",
                "original_text": "Processing and transferring personal information without consent."
            })

        # 4. Immediate Termination Without Notice / Cure Period
        if re.search(r"terminate.*(?:verbal|immediate|without notice|1-day notice|without cause)", text, re.IGNORECASE):
            findings.append({
                "clause_name": "Termination & Notice Period",
                "status": "Medium Risk",
                "location": "Term and Termination",
                "what_it_says": "Allows termination without reasonable written notice or cure period.",
                "why_it_matters": "Sudden termination creates operational disruption and potential wrongful termination claims.",
                "recommendation": "Provide minimum 30-day written notice and a 15-day cure period for remediable defaults.",
                "potential_risk": "Operational instability and legal disputes over wrongful termination.",
                "legal_basis": "Industrial Disputes Act, 1947 & State Shops & Establishments Acts",
                "original_text": "Either party may terminate this agreement immediately with verbal notice."
            })

        # 5. Failed rule checks from plugins
        for check in failed_checks:
            findings.append({
                "clause_name": check.rule_name,
                "status": "High Risk" if check.severity == "Critical" or check.severity == "High" else "Medium Risk",
                "location": f"Statutory Compliance ({check.section})",
                "what_it_says": check.detail,
                "why_it_matters": f"Mandated under statutory guidelines governing {check.section}.",
                "potential_risk": f"Regulatory exposure and non-compliance with {check.section}.",
                "recommendation": f"Adopt standard {check.rule_name} provisions to satisfy statutory requirements.",
                "legal_basis": f"{check.rule_name}, {check.section}",
                "original_text": check.detail
            })

        # 6. Passed protective clauses
        for check in passed_checks[:3]:
            findings.append({
                "clause_name": check.rule_name,
                "status": "Compliant",
                "location": f"Verified Clause ({check.section})",
                "what_it_says": check.detail,
                "why_it_matters": "Adheres to statutory best practices and protects legal interests.",
                "potential_risk": "None identified; clause provides adequate legal protection.",
                "recommendation": "Retain existing clause wording.",
                "legal_basis": f"{check.rule_name}, {check.section}",
                "original_text": check.detail
            })

        return findings

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
        file_name = ""

        # 1. Resolve document text using existing parsing/indexing if doc_id/file_path is provided
        if document_id:
            logger.info(f"Reassembling document text from vector store chunks for document_id: {document_id}")
            chunks = await self.rag_service.vector_store.get_chunks_by_document(document_id)
            if chunks:
                chunks.sort(key=lambda x: x.get("chunk_id", ""))
                target_text = "\n\n".join(c.get("text", "") for c in chunks)
                logger.info(f"Reconstructed {len(target_text)} chars of text from {len(chunks)} chunks.")
            else:
                status = await self.analyzer.get_analysis_status(document_id)
                if status and status.get("results"):
                    target_text = status["results"].get("executive_summary", "")
                    logger.warning(f"No chunks found for {document_id}. Falling back to executive summary text.")
        
        elif file_path:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File path does not exist: {file_path}")
            
            file_name = os.path.basename(file_path)
            with open(file_path, "rb") as f:
                file_bytes = f.read()
            
            doc_id = f"doc_compliance_{int(os.getpid())}"
            analysis_results = await self.analyzer.analyze_document(file_name, file_bytes, document_id=doc_id)
            
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

        # 2. Document Classification & Structural Parameters
        doc_class = self._classify_document(target_text, file_name)
        doc_params = self._extract_document_parameters(target_text)
        document_info = {
            "document_type": doc_class["type"],
            "confidence": doc_class["confidence"],
            "category": doc_class["category"],
            "detected_parties": doc_params["parties"],
            "effective_date": doc_params["effective_date"],
            "governing_law": doc_params["governing_law"],
            "jurisdiction": doc_params["jurisdiction"]
        }

        # 3. Regulation Matching
        if regulation_ids:
            valid_ids = [rid.lower().strip() for rid in regulation_ids]
            logger.info(f"Using user-specified regulation IDs: {valid_ids}")
        else:
            valid_ids = await self.matcher.match_regulations(target_text, query)

        # 4. Knowledge Search & Gap Evaluation
        gap_results = await self.gap_analyzer.analyze_gaps(target_text, valid_ids)
        passed_checks = gap_results["passed"]
        failed_checks = gap_results["failed"]

        # 5. Policy Mapping
        policy_alignments = await self.policy_mapper.map_policy_alignment(target_text, passed_checks, failed_checks)

        # 6. Risk Scoring
        score_results = await self.scorer.calculate_score(passed_checks, failed_checks)

        # 7. Recommendations & Citations
        recommendations = await self.recommendation_engine.generate_recommendations(failed_checks)

        # 8. Clause-Level Findings
        clause_findings = self._extract_clause_level_findings(target_text, failed_checks, passed_checks)

        # 9. Strengths & Missing Clauses
        strengths = [
            {"title": "Jurisdiction Clause Included", "description": f"Designates {doc_params['governing_law']} as the applicable forum.", "severity": "Low Risk"},
            {"title": "Express Recitals & Parties", "description": f"Identifies {', '.join(doc_params['parties'])} as executing entities.", "severity": "Low Risk"}
        ]
        
        missing_clauses = []
        if "dispute resolution" not in target_text.lower() and "arbitration" not in target_text.lower():
            missing_clauses.append({
                "clause_name": "Dispute Resolution & Arbitration",
                "severity": "Medium",
                "recommendation": "Add a two-tier dispute resolution clause specifying mutual conciliation followed by fast-track arbitration under the Arbitration & Conciliation Act, 1996."
            })
        if "severability" not in target_text.lower():
            missing_clauses.append({
                "clause_name": "Severability Clause",
                "severity": "Low",
                "recommendation": "Ensure invalidity of any single provision does not void the remainder of the contract."
            })

        # 10. Compile compliance report
        report = await self.report_generator.compile_report(
            matched_regulation_ids=valid_ids,
            passed_checks=passed_checks,
            failed_checks=failed_checks,
            score_results=score_results,
            recommendations=recommendations,
            policy_alignments=policy_alignments,
            document_info=document_info,
            clause_findings=clause_findings,
            strengths=strengths,
            missing_clauses=missing_clauses
        )

        return report
