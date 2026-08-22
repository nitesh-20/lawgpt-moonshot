import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.agents.compliance_agent.base_plugin import ComplianceCheckRule, ComplianceCheckResult
from app.agents.compliance_agent.scorer import RiskScorer
from app.agents.compliance_agent.recommendation import RecommendationEngine
from app.agents.compliance_agent.matcher import RegulationMatcher
from app.agents.compliance_agent.analyzer import GapAnalyzer, PolicyMapper
from app.agents.compliance_agent.engine import ComplianceEngine
from app.agents.compliance_agent.compliance_agent import ComplianceAgent

client = TestClient(app)

# Sample texts for testing
SAMPLE_COMPLIANT_TEXT = """
This policy ensures full compliance with privacy rules.
Consent notice: Acme Corp collects user emails to process payment transactions. Users may withdraw consent at any time.
Rights of Data Principal: Users can request to access, correct, erase, or delete their personal data.
Reasonable security practices are used, including encryption, to protect user profiles.
Our designated Grievance Officer details: email grievance@acme.com, name Nodal Officer, contact info is provided.
We maintain ICT system logs for a duration of 180 days and certify electronic records.
Incident reporting: All cyber security breaches are reported to CERT-In within 6 hours.
We localize and store payment system data inside databases located in India.
Zero liability policy: In case of unauthorized transaction, customers have zero liability if reported within 3 days.
Board of directors and board report comply with companies act guidelines. We approve related party transactions.
Structured digital database PIT: UPSI insider trading details are monitored. Standard working hours, minimum wage.
"""

SAMPLE_NON_COMPLIANT_TEXT = """
A completely random policy that lacks privacy disclosures.
No consent notices are published here.
We do not mention user rights, data erasure, or grievances.
Security protocols are undisclosed. No log retention or localization rules.
"""


def test_risk_scorer_calculations():
    scorer = RiskScorer()
    passed = [
        ComplianceCheckResult(
            rule_id="r1", rule_name="Rule 1", passed=True, detail="Pass", severity="Low", section="Sec 1"
        )
    ]
    failed = [
        ComplianceCheckResult(
            rule_id="r2", rule_name="Rule 2", passed=False, detail="Fail", severity="Critical", section="Sec 2"
        )
    ]

    # Calculate score with 1 pass (weight 0.5) and 1 fail (weight 4.0)
    # total weight = 4.5. score = (0.5 / 4.5) * 100 = 11.11%
    # Since failed has critical, risk level should override to Critical
    import asyncio
    res_sync = asyncio.run(scorer.calculate_score(passed, failed))
    
    assert res_sync["compliance_score"] == 11.11
    assert res_sync["risk_level"] == "Critical"
    assert res_sync["passed_count"] == 1
    assert res_sync["failed_count"] == 1


def test_recommendation_engine_mapping():
    engine = RecommendationEngine()
    failed = [
        ComplianceCheckResult(
            rule_id="DPDP_CONSENT_NOTICE",
            rule_name="Consent Notice",
            passed=False,
            detail="Notice missing.",
            severity="Critical",
            section="Section 6"
        )
    ]
    
    import asyncio
    recs = asyncio.run(engine.generate_recommendations(failed))
    
    assert len(recs) == 1
    assert recs[0]["rule_id"] == "DPDP_CONSENT_NOTICE"
    assert "Section 6 of the Digital Personal Data Protection (DPDP) Act, 2023" in recs[0]["legal_reference"]
    assert "Draft and display a clear, plain-language consent notice" in recs[0]["recommended_action"]


@pytest.mark.asyncio
async def test_regulation_matcher_keywords():
    matcher = RegulationMatcher()
    
    # Text mentioning dpdp and rbi should match dpdp and rbi_guidelines
    regs = await matcher.match_regulations("Testing DPDP act rules and RBI circulars.")
    assert "dpdp" in regs
    assert "rbi_guidelines" in regs
    
    # Empty query fallback
    regs_default = await matcher.match_regulations("")
    assert "dpdp" in regs_default
    assert "it_act" in regs_default


@pytest.mark.asyncio
async def test_gap_analyzer_evaluation():
    analyzer = GapAnalyzer()
    
    # Compliant text should pass most checks
    res_compliant = await analyzer.analyze_gaps(SAMPLE_COMPLIANT_TEXT, ["dpdp", "it_act"])
    assert len(res_compliant["passed"]) >= 2
    
    # Non compliant text should fail
    res_non_compliant = await analyzer.analyze_gaps(SAMPLE_NON_COMPLIANT_TEXT, ["dpdp", "it_act"])
    assert len(res_non_compliant["failed"]) >= 2


@pytest.mark.asyncio
async def test_policy_mapper():
    mapper = PolicyMapper()
    passed = [
        ComplianceCheckResult(
            rule_id="r1", rule_name="Rule 1", passed=True, detail="Details", severity="Low", section="Sec 1", citations=["Test Citation"]
        )
    ]
    failed = [
        ComplianceCheckResult(
            rule_id="r2", rule_name="Rule 2", passed=False, detail="Gap details", severity="High", section="Sec 2"
        )
    ]
    
    alignments = await mapper.map_policy_alignment("test", passed, failed)
    assert len(alignments) == 2
    assert alignments[0]["status"] == "Aligned"
    assert alignments[0]["policy_provision_snippet"] == "Test Citation"
    assert alignments[1]["status"] == "Misaligned / Gap"


@pytest.mark.asyncio
async def test_compliance_engine_execution():
    engine = ComplianceEngine()
    
    # Mock vector store retrieve context to return empty to verify deterministic evaluation
    engine.rag_service.retrieve_context = AsyncMock(return_value=[])
    
    report = await engine.run_compliance_audit(text=SAMPLE_COMPLIANT_TEXT, regulation_ids=["dpdp", "cert_in"])
    
    assert "overall_compliance_score" in report["metrics"]
    assert "dpdp" in report["applicable_regulations"]
    assert "cert_in" in report["applicable_regulations"]
    assert len(report["passed_checks"]) > 0


def test_api_compliance_check_endpoint():
    # Post query check
    response = client.post(
        "/api/v1/compliance/check",
        json={
            "query": "Verify DPDP compliance requirements.",
            "regulation_ids": ["dpdp"]
        }
    )
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["status"] == "success"
    assert "data" in res_json
    assert "overall_compliance_score" in res_json["metrics"]


def test_api_compliance_report_json():
    response = client.post(
        "/api/v1/compliance/report",
        json={
            "query": SAMPLE_NON_COMPLIANT_TEXT,
            "regulation_ids": ["dpdp"],
            "report_format": "json"
        }
    )
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["status"] == "success"
    assert "failed_checks" in res_json["data"]
    assert res_json["metrics"]["risk_level"] in ["High", "Critical"]


def test_api_compliance_report_markdown():
    response = client.post(
        "/api/v1/compliance/report",
        json={
            "query": SAMPLE_NON_COMPLIANT_TEXT,
            "regulation_ids": ["dpdp"],
            "report_format": "markdown"
        }
    )
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["status"] == "success"
    assert res_json["format"] == "markdown"
    assert "# REGULATORY COMPLIANCE AUDIT REPORT" in res_json["report"]


def test_api_compliance_history_and_statistics():
    # 1. Clear or write some history locally to check endpoint integrity
    agent = ComplianceAgent()
    import asyncio
    asyncio.run(agent.initialize())
    
    audit_data = {
        "status": "success",
        "message": "Summary check",
        "agent": "ComplianceAgent",
        "data": {
            "timestamp": "2026-07-25T15:00:00Z",
            "executive_summary": "Test Executive summary",
            "applicable_regulations": ["dpdp"],
            "metrics": {
                "overall_compliance_score": 85.0,
                "risk_level": "Medium",
                "confidence_score": 0.95,
                "passed_checks_count": 3,
                "failed_checks_count": 1
            },
            "passed_checks": [],
            "failed_checks": [],
            "risk_matrix": [],
            "compliance_gaps": [{"rule_id": "DPDP_CHILD_CONSENT", "gap_description": "Minor gap", "section": "Sec 9", "severity": "High"}],
            "recommended_actions": [],
            "legal_references": [],
            "policy_alignments": []
        },
        "metrics": {
            "execution_time_sec": 0.1,
            "overall_compliance_score": 85.0,
            "risk_level": "Medium",
            "passed_checks_count": 3,
            "failed_checks_count": 1
        }
    }
    asyncio.run(agent._save_history(audit_data))
    
    # 2. Query history API
    resp_history = client.get("/api/v1/compliance/history")
    assert resp_history.status_code == 200
    history_list = resp_history.json()
    assert len(history_list) >= 1
    
    # 3. Query statistics API
    resp_stats = client.get("/api/v1/compliance/statistics")
    assert resp_stats.status_code == 200
    stats = resp_stats.json()
    assert stats["total_audits_conducted"] >= 1
    assert stats["average_compliance_score"] >= 0
    assert "dpdp" in stats["popular_regulations_audited"]
    assert "DPDP_CHILD_CONSENT" in stats["top_violated_rules"]


def test_orchestrator_compliance_integration():
    # Verify orchestrator loads compliance agent metadata and intents
    response = client.get("/api/v1/orchestrator/agents")
    assert response.status_code == 200
    agents = response.json()
    
    compliance_meta = next((a for a in agents if a["id"] == "compliance_agent"), None)
    assert compliance_meta is not None
    assert compliance_meta["version"] == "1.1.0"
    assert "compliance_check" in compliance_meta["supported_intents"]
    assert "DPDP Act privacy audit" in compliance_meta["capabilities"]

