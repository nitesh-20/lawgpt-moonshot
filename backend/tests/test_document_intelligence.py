import os
import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.agents.document_agent.summary_generator import SummaryGenerator
from app.agents.document_agent.clause_extractor import ClauseExtractor
from app.agents.document_agent.entity_extractor import EntityExtractor
from app.agents.document_agent.risk_detector import RiskDetector
from app.agents.document_agent.obligation_extractor import ObligationExtractor
from app.agents.document_agent.timeline_extractor import TimelineExtractor
from app.agents.document_agent.comparison_engine import ComparisonEngine
from app.agents.document_agent.analyzer import DocumentAnalyzer

client = TestClient(app)

# Sample document text for testing fallback analysis
SAMPLE_CONTRACT = """
MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into on 25th July 2026 ("Effective Date") by and between:
1. Acme Corp Private Limited, having its registered office at 123 Tech Park, Bangalore, India ("Disclosing Party").
2. John Doe, residing at 456 Palm Avenue, Mumbai, India ("Receiving Party").

The parties agree to the following terms:

1. Confidentiality. The Receiving Party shall keep all information received from the Disclosing Party confidential and shall not disclose it to any third party. This obligation shall continue for 3 years from the date of disclosure.
2. Payment and Fees. The Customer agrees to pay the fees within 30 days of receiving the invoice. If payment is late, a late fee interest of 12% per annum will apply.
3. Termination. Either party may terminate this agreement at any time without cause by giving 30 days written notice to the other party.
4. Liability. The Customer shall have unlimited liability for any breaches of Section 1. Under no circumstances shall either party be liable for indirect damages.
5. Arbitration. Any dispute arising out of this agreement shall be referred to arbitration in Bangalore under the Arbitration and Conciliation Act, 1996, and the Karnataka High Court shall have exclusive jurisdiction.

IN WITNESS WHEREOF, the parties have executed this agreement.

Signed by:
For Acme Corp:
Jane Smith
Authorized Signatory

For John Doe:
John Doe
"""


def test_summary_generator_fallback():
    sg = SummaryGenerator(api_key="your-gemini-api-key") # force local fallback
    res = sg._local_fallback(SAMPLE_CONTRACT)
    assert "executive_summary" in res
    assert "plain_english_summary" in res
    assert "Mutual Non-Disclosure Agreement" in res["executive_summary"]


def test_clause_extractor_fallback():
    ce = ClauseExtractor(api_key="your-gemini-api-key")
    res = ce._local_fallback(SAMPLE_CONTRACT)
    assert len(res["clauses"]) > 0
    # Should identify at least some of the categories we listed in contract
    types = [c["type"] for c in res["clauses"]]
    assert "Confidentiality Clauses" in types or "Obligations" in types
    # Check missing standard clauses
    assert "Indemnity" in res["missing_clauses"] # Since "indemnity" is not in SAMPLE_CONTRACT
    assert "Severability" in res["missing_clauses"]


def test_entity_extractor_fallback():
    ee = EntityExtractor(api_key="your-gemini-api-key")
    res = ee._local_fallback(SAMPLE_CONTRACT)
    assert "Acme Corp Private Limited" in res["companies"]
    assert "John Doe" in res["people"]
    assert " Bangalore" in res["addresses"] or "123 Tech Park, Bangalore, India" in res["addresses"] or len(res["addresses"]) > 0
    assert "Bangalore" in res["courts"] or len(res["courts"]) > 0
    assert "Arbitration and Conciliation Act, 1996" in res["acts"] or "Arbitration and Conciliation Act, 1996" in [a.strip() for a in res["acts"]]


def test_risk_detector_fallback():
    rd = RiskDetector(api_key="your-gemini-api-key")
    res = rd._local_fallback(SAMPLE_CONTRACT)
    assert len(res["risks"]) > 0
    # Should flag Unlimited Liability
    levels = [r["level"] for r in res["risks"]]
    assert "Critical" in levels or "High" in levels
    assert len(res["compliance_flags"]) > 0


def test_obligation_extractor_fallback():
    oe = ObligationExtractor(api_key="your-gemini-api-key")
    res = oe._local_fallback(SAMPLE_CONTRACT)
    assert len(res) > 0
    # Check obligor mapping
    obligors = [o["obligor"] for o in res]
    assert "Customer" in obligors or "Party" in obligors or "Receiving Party" in obligors


def test_timeline_extractor_fallback():
    te = TimelineExtractor(api_key="your-gemini-api-key")
    res = te._local_fallback(SAMPLE_CONTRACT)
    assert len(res) > 0
    assert any("Effective Date" in item["date"] or "25th July 2026" in item["date"] for item in res)


def test_comparison_engine_fallback():
    co = ComparisonEngine(api_key="your-gemini-api-key")
    modified_contract = SAMPLE_CONTRACT.replace(
        'This obligation shall continue for 3 years from the date of disclosure.',
        'This obligation shall continue in perpetuity.'
    ).replace(
        'a late fee interest of 12% per annum will apply.',
        'a late fee interest of 24% per annum will apply.'
    )
    res = co._local_fallback(SAMPLE_CONTRACT, modified_contract)
    assert len(res["modified_clauses"]) > 0 or len(res["inserted_clauses"]) > 0
    assert "perpetuity" in str(res) or "24%" in str(res) or res["comparison_summary"] != "The documents are identical. No differences found."


@pytest.mark.asyncio
async def test_document_analyzer_integration():
    analyzer = DocumentAnalyzer()
    doc_id = f"test_doc_id_{int(os.getpid())}"
    
    # Run analysis
    results = await analyzer.analyze_document("sample_contract.txt", SAMPLE_CONTRACT.encode("utf-8"), document_id=doc_id)
    assert results["executive_summary"] != ""
    assert len(results["key_findings"]) > 0
    assert results["confidence_score"] in [0.75, 0.95]
    
    # Retrieve status
    status_rec = await analyzer.get_analysis_status(doc_id)
    assert status_rec is not None
    assert status_rec["status"] == "completed"
    assert status_rec["results"]["executive_summary"] == results["executive_summary"]

    # Clean up local analysis store record
    if analyzer.analysis_store_path.exists():
        try:
            with open(analyzer.analysis_store_path, "r") as f:
                data = json.load(f)
            if doc_id in data:
                del data[doc_id]
                with open(analyzer.analysis_store_path, "w") as f:
                    json.dump(data, f, indent=2)
        except Exception:
            pass


def test_api_endpoints_analyze_compare_summarize_status():
    doc_id = f"api_test_doc_{int(os.getpid())}"
    
    # 1. Test POST /api/v1/document/analyze upload
    response = client.post(
        "/api/v1/document/analyze",
        files={"file": ("agreement.txt", SAMPLE_CONTRACT.encode("utf-8"))},
        data={"document_id": doc_id}
    )
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["status"] == "success"
    assert res_json["document_id"] == doc_id
    assert "results" in res_json
    
    # 2. Test GET /api/v1/document/status
    response = client.get(f"/api/v1/document/status?document_id={doc_id}")
    assert response.status_code == 200
    status_json = response.json()
    assert status_json["status"] == "completed"
    assert status_json["document_id"] == doc_id
    
    # 3. Test POST /api/v1/document/summarize
    response = client.post(
        "/api/v1/document/summarize",
        data={"document_id": doc_id, "summary_type": "plain_english"}
    )
    assert response.status_code == 200
    sum_json = response.json()
    assert sum_json["status"] == "success"
    assert sum_json["summary_type"] == "plain_english"
    assert sum_json["summary"] != ""

    # 4. Test POST /api/v1/document/compare
    modified_text = SAMPLE_CONTRACT.replace("Bangalore", "Mumbai")
    response = client.post(
        "/api/v1/document/compare",
        files={
            "file1": ("agreement.txt", SAMPLE_CONTRACT.encode("utf-8")),
            "file2": ("agreement_modified.txt", modified_text.encode("utf-8"))
        }
    )
    assert response.status_code == 200
    comp_json = response.json()
    assert comp_json["status"] == "success"
    assert "results" in comp_json

    # Clean up local analysis store record
    store_path = Path(__file__).resolve().parent.parent / "data" / "local_analysis_store.json"
    if store_path.exists():
        try:
            with open(store_path, "r") as f:
                data = json.load(f)
            if doc_id in data:
                del data[doc_id]
                with open(store_path, "w") as f:
                    json.dump(data, f, indent=2)
        except Exception:
            pass


def test_api_endpoints_missing_filenames():
    from unittest.mock import patch
    from starlette.datastructures import UploadFile as StarletteUploadFile

    doc_id = f"api_test_doc_nofilename_{int(os.getpid())}"

    original_init = StarletteUploadFile.__init__
    def patched_init(self, *args, **kwargs):
        original_init(self, *args, **kwargs)
        self.filename = None

    with patch("starlette.datastructures.UploadFile.__init__", patched_init):
        # 1. Test POST /api/v1/document/analyze upload with filename=None
        response = client.post(
            "/api/v1/document/analyze",
            files={"file": ("agreement.txt", SAMPLE_CONTRACT.encode("utf-8"), "text/plain")},
            data={"document_id": doc_id}
        )
        assert response.status_code == 200
        res_json = response.json()
        assert res_json["status"] == "success"
        assert res_json["document_id"] == doc_id
        assert "results" in res_json
        
        # 2. Test POST /api/v1/document/compare with filename=None
        modified_text = SAMPLE_CONTRACT.replace("Bangalore", "Mumbai")
        response = client.post(
            "/api/v1/document/compare",
            files={
                "file1": ("agreement.txt", SAMPLE_CONTRACT.encode("utf-8"), "text/plain"),
                "file2": ("agreement_modified.txt", modified_text.encode("utf-8"), "text/plain")
            }
        )
        assert response.status_code == 200
        comp_json = response.json()
        assert comp_json["status"] == "success"
        assert "results" in comp_json

    # Clean up local analysis store record
    store_path = Path(__file__).resolve().parent.parent / "data" / "local_analysis_store.json"
    if store_path.exists():
        try:
            with open(store_path, "r") as f:
                data = json.load(f)
            if doc_id in data:
                del data[doc_id]
                with open(store_path, "w") as f:
                    json.dump(data, f, indent=2)
        except Exception:
            pass


