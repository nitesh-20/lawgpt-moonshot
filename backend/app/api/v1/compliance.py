import json
from pathlib import Path
from typing import Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.agents.compliance_agent.compliance_agent import ComplianceAgent
from app.database.firestore import get_firestore_client
from app.core.config import settings

router = APIRouter(prefix="/compliance")
compliance_agent = ComplianceAgent()


class ComplianceCheckRequest(BaseModel):
    query: str | None = Field(default=None, description="Compliance query or operational workflow text to audit")
    document_id: str | None = Field(default=None, description="ID of a previously analyzed document")
    file_path: str | None = Field(default=None, description="Local file path to audit")
    regulation_ids: list[str] | None = Field(default=None, description="Optional specific regulation IDs (e.g. ['dpdp', 'sebi_regulations']) to audit against")


class ComplianceReportRequest(BaseModel):
    query: str | None = Field(default=None, description="Compliance query or operational workflow text to audit")
    document_id: str | None = Field(default=None, description="ID of a previously analyzed document")
    file_path: str | None = Field(default=None, description="Local file path to audit")
    regulation_ids: list[str] | None = Field(default=None, description="Optional specific regulation IDs to audit against")
    report_format: str = Field(default="json", description="Export format: json, markdown")


@router.post("/check", status_code=status.HTTP_200_OK)
async def check_compliance(payload: ComplianceCheckRequest) -> dict[str, Any]:
    """
    Evaluates compliance against applicable regulatory plugins based on text input, document ID, or file path.
    """
    if not compliance_agent._initialized:
        await compliance_agent.initialize()

    res = await compliance_agent.execute({
        "query": payload.query,
        "document_id": payload.document_id,
        "file_path": payload.file_path,
        "regulation_ids": payload.regulation_ids
    })

    if res.get("status") == "error":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=res.get("message", "Compliance check failed.")
        )
    return res


@router.post("/report", status_code=status.HTTP_200_OK)
async def generate_compliance_report(payload: ComplianceReportRequest) -> dict[str, Any]:
    """
    Evaluates compliance and compiles a formal compliance audit report in JSON or Markdown.
    """
    if not compliance_agent._initialized:
        await compliance_agent.initialize()

    res = await compliance_agent.execute({
        "query": payload.query,
        "document_id": payload.document_id,
        "file_path": payload.file_path,
        "regulation_ids": payload.regulation_ids
    })

    if res.get("status") == "error":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=res.get("message", "Report generation failed.")
        )

    report_data = res.get("data", {})

    if payload.report_format.lower() == "markdown":
        # Format report as a readable markdown document
        md_lines = [
            f"# REGULATORY COMPLIANCE AUDIT REPORT",
            f"Generated at: {report_data.get('timestamp')}",
            f"\n## EXECUTIVE SUMMARY",
            report_data.get("executive_summary", "N/A"),
            f"\n## AUDIT METRICS",
            f"- **Overall Compliance Score**: {report_data.get('metrics', {}).get('overall_compliance_score')}%",
            f"- **Risk Level**: {report_data.get('metrics', {}).get('risk_level')}",
            f"- **Confidence Score**: {report_data.get('confidence_score')}",
            f"- **Passed Checks**: {report_data.get('metrics', {}).get('passed_checks_count')}",
            f"- **Failed Checks**: {report_data.get('metrics', {}).get('failed_checks_count')}",
            f"\n## APPLICABLE REGULATIONS",
            ", ".join(report_data.get("applicable_regulations", [])).upper(),
            f"\n## ACTIONABLE RECOMMENDATIONS"
        ]
        for rec in report_data.get("recommended_actions", []):
            md_lines.append(f"\n### {rec['id']}: {rec['rule_name']} ({rec['severity']})")
            md_lines.append(f"- **Section**: {rec['regulatory_section']}")
            md_lines.append(f"- **Finding**: {rec['findings']}")
            md_lines.append(f"- **Recommended Action**: {rec['recommended_action']}")
            md_lines.append(f"- **Reference**: {rec['legal_reference']}")

        return {
            "status": "success",
            "format": "markdown",
            "report": "\n".join(md_lines)
        }

    return res


@router.get("/history", status_code=status.HTTP_200_OK)
async def list_compliance_history() -> list[dict[str, Any]]:
    """
    Retrieves the chronological log of compliance audits.
    """
    history = []
    
    # 1. Try Firestore
    client = None
    try:
        client = get_firestore_client()
    except Exception:
        client = None

    if client is not None:
        try:
            docs = client.collection(compliance_agent.collection_name).order_by("timestamp").stream()
            for d in docs:
                data = d.to_dict()
                if data:
                    history.append(data)
            return history
        except Exception:
            pass

    # 2. Local Fallback
    local_path = settings.BASE_DIR / "data" / "compliance_history.json"
    if local_path.exists():
        try:
            with open(local_path, "r") as f:
                history = json.load(f)
        except Exception:
            history = []
            
    return history


@router.get("/statistics", status_code=status.HTTP_200_OK)
async def get_compliance_statistics() -> dict[str, Any]:
    """
    Aggregates metrics and returns compliance health statistics across all conducted audits.
    """
    history = await list_compliance_history()
    if not history:
        return {
            "total_audits_conducted": 0,
            "average_compliance_score": 100.0,
            "risk_level_distribution": {"Critical": 0, "High": 0, "Medium": 0, "Low": 0},
            "top_violated_rules": {},
            "popular_regulations_audited": {}
        }

    total_audits = len(history)
    scores_sum = 0.0
    risk_dist = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    violated_rules = {}
    popular_regs = {}

    for audit in history:
        metrics = audit.get("metrics", {})
        report = audit.get("report", {})

        scores_sum += metrics.get("overall_compliance_score", 100.0)
        
        rlevel = metrics.get("risk_level", "Low")
        risk_dist[rlevel] = risk_dist.get(rlevel, 0) + 1

        for reg in report.get("applicable_regulations", []):
            popular_regs[reg] = popular_regs.get(reg, 0) + 1

        for gap in report.get("compliance_gaps", []):
            rule_name = gap.get("rule_id", "Unknown Rule")
            violated_rules[rule_name] = violated_rules.get(rule_name, 0) + 1

    return {
        "total_audits_conducted": total_audits,
        "average_compliance_score": round(scores_sum / total_audits, 2),
        "risk_level_distribution": risk_dist,
        "top_violated_rules": dict(sorted(violated_rules.items(), key=lambda x: x[1], reverse=True)[:5]),
        "popular_regulations_audited": dict(sorted(popular_regs.items(), key=lambda x: x[1], reverse=True)[:5])
    }
