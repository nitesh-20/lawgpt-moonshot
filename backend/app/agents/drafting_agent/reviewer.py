import json
import httpx
from typing import Any, Dict, List
from loguru import logger
from app.core.config import settings
from app.agents.document_agent.risk_detector import RiskDetector
from app.agents.compliance_agent.engine import ComplianceEngine


class DocumentReviewer:
    """
    Analyzes legal documents to identify missing clauses, weak wording,
    ambiguous language, risk allocations, and compliance gaps.
    """
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.risk_detector = RiskDetector()
        self.compliance_engine = ComplianceEngine()

    async def review(
        self,
        text: str,
        doc_type: str = "general_contract",
        required_clauses: List[str] | None = None
    ) -> Dict[str, Any]:
        """
        Reviews a legal draft.
        Coordinated check using the document intelligence RiskDetector,
        compliance engine, and optional semantic review from Gemini.
        """
        required = required_clauses or ["confidentiality", "termination", "indemnity", "governing_law"]
        
        # 1. Reuse RiskDetector
        risk_results = await self.risk_detector.detect(text)
        detected_risks = risk_results.get("risks", [])
        
        # 2. Reuse ComplianceEngine
        compliance_results = {}
        try:
            compliance_results = await self.compliance_engine.run_compliance_audit(
                text=text,
                query=f"Validate compliance of this {doc_type} against general corporate regulations."
            )
        except Exception as e:
            logger.warning(f"ComplianceEngine execution skipped or failed: {e}")

        # 3. Check for missing clauses locally
        missing_clauses = []
        lower_text = text.lower()
        for clause in required:
            # simple keyword match fallback
            keywords = [clause, clause.replace("_", " ")]
            if not any(k in lower_text for k in keywords):
                missing_clauses.append(clause.replace("_", " ").title())

        # Combine as local report
        default_report = {
            "missing_clauses": missing_clauses,
            "weak_clauses": [],
            "ambiguous_wording": [],
            "high_risk_language": [r.get("clause", "") for r in detected_risks if r.get("level") in ["Critical", "High"]],
            "conflicting_provisions": [],
            "risks": detected_risks,
            "compliance_gaps": compliance_results.get("gaps", []),
            "compliance_score": compliance_results.get("metrics", {}).get("overall_compliance_score", 100),
            "recommendations": [r.get("recommendation", "") for r in detected_risks]
        }

        # 4. Semantic LLM audit for weak/ambiguous language & conflicts
        if self.api_key and "your-gemini-api-key" not in self.api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={self.api_key}"
                headers = {"Content-Type": "application/json"}

                system_instruction = (
                    "You are an Elite Contract Reviewer. Audit the legal document text and identify:\n"
                    "- 'missing_clauses': Critical provisions that are absent but should be present.\n"
                    "- 'weak_clauses': Clauses that lack protective strength for a party.\n"
                    "- 'ambiguous_wording': Text that is unclear or poorly drafted.\n"
                    "- 'high_risk_language': Uncapped liabilities, unlimited indemnities, or unfavorable conditions.\n"
                    "- 'conflicting_provisions': Sections that contradict each other.\n"
                    "- 'recommendations': Specific language changes or revisions to resolve these items.\n"
                    "You MUST respond ONLY with a valid JSON object matching these exact keys."
                )

                prompt = (
                    f"Document Type: {doc_type}\n"
                    f"Required Clauses Checklist: {required}\n\n"
                    f"Document Text:\n{text[:20000]}\n\n"
                    "Identify issues and suggest fixes in JSON format."
                )

                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "systemInstruction": {"parts": [{"text": system_instruction}]},
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "temperature": 0.1
                    }
                }

                logger.info(f"Calling Gemini API for semantic contract review of {doc_type}...")
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, json=payload, headers=headers, timeout=25.0)
                    if resp.status_code == 200:
                        parsed = json.loads(resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip())
                        logger.info("Successfully received Gemini semantic review.")
                        
                        # Merge local detector results with LLM insights
                        return {
                            "missing_clauses": list(set(parsed.get("missing_clauses", []) + default_report["missing_clauses"])),
                            "weak_clauses": parsed.get("weak_clauses", []),
                            "ambiguous_wording": parsed.get("ambiguous_wording", []),
                            "high_risk_language": list(set(parsed.get("high_risk_language", []) + default_report["high_risk_language"])),
                            "conflicting_provisions": parsed.get("conflicting_provisions", []),
                            "risks": detected_risks,
                            "compliance_gaps": default_report["compliance_gaps"],
                            "compliance_score": default_report["compliance_score"],
                            "recommendations": list(set(parsed.get("recommendations", []) + default_report["recommendations"]))
                        }
            except Exception as e:
                logger.error(f"Error calling Gemini API for semantic review: {e}. Returning detector findings.")

        return default_report
