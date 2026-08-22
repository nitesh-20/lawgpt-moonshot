from datetime import datetime, timezone
from typing import Any

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
        policy_alignments: list[dict[str, Any]]
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
                f"The compliance audit identified significant regulatory vulnerabilities "
                f"concerning {regulations_str}. The evaluation shows a compliance score of {score}% "
                f"with a {risk_level.upper()} Risk Level. Immediate action is required to resolve "
                f"{len(failed_checks)} failed checks and mitigate severe legal/financial exposure."
            )
        else:
            exec_summary = (
                f"The compliance audit indicates overall strong alignment with {regulations_str} guidelines. "
                f"The evaluation shows a compliance score of {score}% with a {risk_level.upper()} Risk Level. "
                f"A few minor gaps ({len(failed_checks)}) have been identified and should be addressed to achieve full compliance."
            )

        # Build the Risk Matrix structure (failed checks mapped with severity)
        risk_matrix = []
        for check in failed_checks:
            risk_matrix.append({
                "rule_id": check.rule_id,
                "rule_name": check.rule_name,
                "severity": check.severity,
                "section": check.section,
                "consequence": f"Non-compliance with {check.section} exposes the organization to penalties and regulatory queries.",
                "remediation_priority": "Immediate" if check.severity.lower() == "critical" else "High" if check.severity.lower() == "high" else "Medium"
            })

        # Compile legal references
        legal_references = []
        seen_refs = set()
        for rec in recommendations:
            ref = rec["legal_reference"]
            if ref not in seen_refs:
                legal_references.append({
                    "regulation": rec["rule_name"],
                    "section": rec["regulatory_section"],
                    "citation": ref
                })
                seen_refs.add(ref)

        # Return the final report payload matching the specified output format
        report = {
            "timestamp": datetime.now(timezone.utc).isoformat() + "Z",
            "executive_summary": exec_summary,
            "applicable_regulations": matched_regulation_ids,
            "metrics": {
                "overall_compliance_score": score,
                "risk_level": risk_level,
                "confidence_score": confidence,
                "passed_checks_count": len(passed_checks),
                "failed_checks_count": len(failed_checks)
            },
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
