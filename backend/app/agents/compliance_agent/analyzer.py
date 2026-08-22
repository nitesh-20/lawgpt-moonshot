from typing import Any

from loguru import logger

from app.agents.compliance_agent.base_plugin import ComplianceCheckResult
from app.agents.compliance_agent.plugins import BUILTIN_PLUGINS


class GapAnalyzer:
    """
    Evaluates compliance gaps by auditing document text against matched regulatory plugins.
    Identifies missing clauses, disclosures, consent issues, or security safeguards.
    """
    async def analyze_gaps(
        self, text: str, matched_regulation_ids: list[str], context: dict[str, Any] | None = None
    ) -> dict[str, list[ComplianceCheckResult]]:
        """
        Executes audit rules for each matched regulation and divides results into passed and failed checks.
        """
        passed_checks = []
        failed_checks = []

        # Find matching plugins
        active_plugins = [p for p in BUILTIN_PLUGINS if p.regulation_id in matched_regulation_ids]
        logger.info(f"GapAnalyzer executing {len(active_plugins)} active plugins...")

        for plugin in active_plugins:
            try:
                logger.info(f"Running compliance evaluation for plugin: {plugin.regulation_name}")
                results = await plugin.evaluate(text, context)
                for res in results:
                    if res.passed:
                        passed_checks.append(res)
                    else:
                        failed_checks.append(res)
            except Exception as e:  # noqa: BLE001
                logger.error(f"Error running plugin {plugin.regulation_id} evaluation: {e}")
                # Fallback: mark all plugin rules as failed with error details
                for rule in plugin.rules:
                    failed_checks.append(ComplianceCheckResult(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        passed=False,
                        detail=f"Audit execution failed due to internal error: {e}",
                        severity=rule.severity,
                        section=rule.section,
                        citations=[]
                    ))

        return {
            "passed": passed_checks,
            "failed": failed_checks
        }


class PolicyMapper:
    """
    Maps company policies, operational procedures, or contracts to the specific section/clauses
    of the applicable regulations to measure alignment and relevance.
    """
    async def map_policy_alignment(
        self, text: str, passed_checks: list[ComplianceCheckResult], failed_checks: list[ComplianceCheckResult]
    ) -> list[dict[str, Any]]:
        """
        Builds a map of policy provisions to regulatory sections, highlighting alignment states.
        """
        alignment_map = []

        # Process passed checks (aligned policies)
        for check in passed_checks:
            citation_text = check.citations[0] if check.citations else "Document contains standard provisions matching this rule."
            alignment_map.append({
                "regulation_section": check.section,
                "rule_name": check.rule_name,
                "policy_provision_snippet": citation_text,
                "status": "Aligned",
                "alignment_percentage": 100.0,
                "notes": f"Proper compliance verified: {check.detail}"
            })

        # Process failed checks (gaps / misaligned policies)
        for check in failed_checks:
            alignment_map.append({
                "regulation_section": check.section,
                "rule_name": check.rule_name,
                "policy_provision_snippet": "N/A (Provision Missing or Inadequate)",
                "status": "Misaligned / Gap",
                "alignment_percentage": 0.0,
                "notes": f"Compliance gap identified: {check.detail}"
            })

        return alignment_map
