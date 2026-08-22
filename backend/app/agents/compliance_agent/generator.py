from datetime import datetime, timezone
from typing import Any
import re

from app.agents.compliance_agent.base_plugin import ComplianceCheckResult


class ComplianceReportGenerator:
    """
    Assembles audit components (checks, risk metrics, mapping, recommendations)
    into a standardized, corporate-ready compliance audit report.
    """
    async def compile_report(
        self,
        matched_regulation_ids: list[str],
        passed_checks: list[ComplianceCheckResult],
        failed_checks: list[ComplianceCheckResult],
        score_results: dict[str, Any],
        recommendations: list[dict[str, Any]],
        policy_alignments: list[dict[str, Any]],
        document_info: dict[str, Any] | None = None,
        clause_findings: list[dict[str, Any]] | None = None,
        category_scores: list[dict[str, Any]] | None = None,
        strengths: list[dict[str, Any]] | None = None,
        missing_clauses: list[dict[str, Any]] | None = None
    ) -> dict[str, Any]:
        """
        Compiles the compliance report into the required structure.
        """
        score = score_results.get("compliance_score", 100.0)
        risk_level = score_results.get("risk_level", "Low")
        confidence = score_results.get("confidence_score", 0.95)

        # Generate a dynamic Executive Summary based on the audit numbers
        regulations_str = ", ".join(matched_regulation_ids).upper()
        if risk_level in ["Critical", "High"]:
            exec_summary = (
                f"The compliance audit identified significant regulatory and contractual vulnerabilities "
                f"concerning {regulations_str}. The evaluation shows an overall compliance score of {score}% "
                f"with a {risk_level.upper()} Risk Level. Immediate review is recommended to address "
                f"{len(failed_checks)} failed regulatory checks, eliminate one-sided liability exposures, and ensure statutory alignment."
            )
        else:
            exec_summary = (
                f"The compliance audit indicates strong legal and regulatory alignment with {regulations_str} guidelines. "
                f"The evaluation shows a compliance score of {score}% with a {risk_level.upper()} Risk Level. "
                f"Minor considerations ({len(failed_checks)}) should be reviewed during standard contract renewal cycles."
            )

        # Build the Risk Matrix structure (failed checks mapped with severity)
        risk_matrix = []
        for check in failed_checks:
            risk_matrix.append({
                "rule_id": check.rule_id,
                "rule_name": check.rule_name,
                "severity": check.severity,
                "section": check.section,
                "consequence": f"Non-compliance with {check.section} exposes the organization to penalties and regulatory scrutiny.",
                "remediation_priority": "Immediate" if check.severity.lower() == "critical" else "High" if check.severity.lower() == "high" else "Medium"
            })

        # Compile legal references
        legal_references = []
        seen_refs = set()
        for rec in recommendations:
            ref = rec.get("legal_reference", "")
            if ref and ref not in seen_refs:
                legal_references.append({
                    "regulation": rec.get("rule_name", "Statutory Rule"),
                    "section": rec.get("regulatory_section", "General"),
                    "citation": ref
                })
                seen_refs.add(ref)

        # Default category scores if none provided
        if not category_scores:
            penalty = len(failed_checks) * 12
            category_scores = [
                {"category": "Contractual Risk", "score": max(20, min(100, int(score))), "status": "Low" if score > 75 else "Medium" if score > 50 else "High"},
                {"category": "Regulatory Compliance", "score": max(15, min(100, int(score - 5))), "status": "Low" if score > 80 else "Medium" if score > 55 else "Critical"},
                {"category": "Financial & Liability", "score": max(30, min(100, int(score + 5))), "status": "Low" if score > 70 else "Medium"},
                {"category": "Data Privacy (DPDP)", "score": 90 if "dpdp" not in matched_regulation_ids or not failed_checks else 35, "status": "Compliant" if "dpdp" not in matched_regulation_ids or not failed_checks else "Critical"},
                {"category": "Operational Feasibility", "score": max(40, min(100, int(score + 10))), "status": "Low" if score > 60 else "Medium"}
            ]

        # Return the final report payload
        report = {
            "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
            "executive_summary": exec_summary,
            "applicable_regulations": matched_regulation_ids,
            "document_info": document_info or {
                "document_type": "Commercial Agreement",
                "confidence": 0.92,
                "detected_parties": ["Party A", "Party B"],
                "jurisdiction": "India (Central)",
                "governing_law": "Indian Laws"
            },
            "metrics": {
                "overall_compliance_score": score,
                "risk_level": risk_level,
                "confidence_score": confidence,
                "passed_checks_count": len(passed_checks),
                "failed_checks_count": len(failed_checks),
                "total_checks_evaluated": len(passed_checks) + len(failed_checks)
            },
            "category_scores": category_scores,
            "strengths": strengths or [
                {"title": "Clear Governing Law", "description": "Explicitly designates jurisdiction and applicable statutory laws.", "severity": "Low Risk"},
                {"title": "Defined Contractual Scope", "description": "Clearly outlines performance obligations and baseline deliverables.", "severity": "Low Risk"}
            ],
            "missing_clauses": missing_clauses or [],
            "clause_findings": clause_findings or [],
            "passed_checks": [
                {
                    "rule_id": c.rule_id,
                    "rule_name": c.rule_name,
                    "section": c.section,
                    "severity": c.severity,
                    "findings": c.detail
                } for c in passed_checks
            ],
            "failed_checks": [
                {
                    "rule_id": c.rule_id,
                    "rule_name": c.rule_name,
                    "section": c.section,
                    "severity": c.severity,
                    "findings": c.detail
                } for c in failed_checks
            ],
            "risk_matrix": risk_matrix,
            "compliance_gaps": [
                {
                    "rule_id": c.rule_id,
                    "gap_description": c.detail,
                    "section": c.section,
                    "severity": c.severity
                } for c in failed_checks
            ],
            "recommended_actions": recommendations,
            "legal_references": legal_references,
            "policy_alignments": policy_alignments,
            "confidence_score": confidence
        }

        return report
