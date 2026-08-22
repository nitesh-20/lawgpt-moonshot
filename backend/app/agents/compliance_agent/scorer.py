from typing import Any, ClassVar

from loguru import logger

from app.agents.compliance_agent.base_plugin import ComplianceCheckResult
from app.core.config import settings


class RiskScorer:
    """
    Computes overall compliance scores (0-100), maps risk levels (Critical, High, Medium, Low)
    based on weights and overrides, and generates confidence metrics.
    """
    SEVERITY_WEIGHTS: ClassVar[dict[str, float]] = {
        "critical": 4.0,
        "high": 2.0,
        "medium": 1.0,
        "low": 0.5
    }

    async def calculate_score(
        self, passed_checks: list[ComplianceCheckResult], failed_checks: list[ComplianceCheckResult]
    ) -> dict[str, Any]:
        """
        Calculates compliance rating, risk levels, and confidence scores.
        """
        total_checks = len(passed_checks) + len(failed_checks)
        if total_checks == 0:
            return {
                "compliance_score": 100.0,
                "risk_level": "Low",
                "confidence_score": 1.0,
                "summary": "No active regulatory checks were conducted."
            }

        # Calculate weighted score
        passed_weight = sum(self.SEVERITY_WEIGHTS.get(c.severity.lower(), 1.0) for c in passed_checks)
        failed_weight = sum(self.SEVERITY_WEIGHTS.get(c.severity.lower(), 1.0) for c in failed_checks)
        total_weight = passed_weight + failed_weight

        compliance_score = round((passed_weight / total_weight) * 100.0, 2)

        # Determine risk level with overrides
        failed_severities = {c.severity.lower() for c in failed_checks}
        
        if "critical" in failed_severities:
            risk_level = "Critical"
        elif "high" in failed_severities:
            risk_level = "High"
        else:
            # Score-based fallback
            if compliance_score >= 90.0:
                risk_level = "Low"
            elif compliance_score >= 70.0:
                risk_level = "Medium"
            elif compliance_score >= 50.0:
                risk_level = "High"
            else:
                risk_level = "Critical"

        # Determine confidence score based on LLM availability
        api_key = settings.GEMINI_API_KEY or ""
        if api_key and "your-gemini-api-key" not in api_key.lower():
            confidence_score = 0.95
        else:
            confidence_score = 0.75  # Rule-based fallback carries slightly lower confidence

        logger.info(f"Compliance Scoring complete: Score={compliance_score}%, Risk={risk_level}, Confidence={confidence_score}")

        return {
            "compliance_score": compliance_score,
            "risk_level": risk_level,
            "confidence_score": confidence_score,
            "passed_count": len(passed_checks),
            "failed_count": len(failed_checks),
            "total_count": total_checks
        }
