import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.agents.drafting_agent.templates import TemplateManager
from app.agents.drafting_agent.clauses import ClauseLibrary
from app.agents.drafting_agent.selector import ClauseSelector
from app.agents.drafting_agent.generator import DraftGenerator
from app.agents.drafting_agent.reviewer import DocumentReviewer
from app.agents.drafting_agent.redline import RedlineEngine
from app.agents.drafting_agent.version import VersionManager
from app.agents.drafting_agent.quality import QualityChecker
from app.agents.drafting_agent.drafting_agent import DraftingAgent

client = TestClient(app)


# -------------------------------------------------------------
# Component Unit Tests
# -------------------------------------------------------------

def test_template_manager():
    manager = TemplateManager()
    templates = manager.list_templates()
    assert len(templates) >= 14
    
    # Check details of specific template
    nda = manager.get_template("nda")
    assert nda is not None
    assert nda["name"] == "Non-Disclosure Agreement (NDA)"
    assert "effective_date" in nda["required_variables"]
    assert "confidentiality" in nda["recommended_clauses"]


def test_clause_library():
    library = ClauseLibrary()
    clauses = library.list_clauses()
    assert len(clauses) >= 13
    
    # Verify clause fetching
    conf = library.get_clause("confidentiality", "strict")
    assert "absolute strictest confidence" in conf["text"]
    assert "The receiving party must keep secrets" in conf["explanation"]


def test_clause_selector():
    selector = ClauseSelector()
    recommended = ["confidentiality", "termination"]
    custom = {"confidentiality": "strict", "indemnity": "standard"}
    
    selected = selector.select_clauses(recommended, custom)
    assert "confidentiality" in selected
    assert "termination" in selected
    assert "indemnity" in selected
    
    assert "absolute strictest confidence" in selected["confidentiality"]["text"]
    assert "Either party may terminate" in selected["termination"]["text"]  # fell back to standard


@pytest.mark.asyncio
async def test_draft_generator_fallback():
    generator = DraftGenerator(api_key="your-gemini-api-key")  # Trigger fallback
    template = {
        "name": "Test Contract",
        "boilerplate": "This is a {{title}} made on {{date}}.\nClause: {{confidentiality}}"
    }
    variables = {"title": "NDA Agreement", "date": "2026-07-25"}
    selected_clauses = {
        "confidentiality": {"text": "Keep it secret.", "explanation": "Secret explanation."}
    }
    
    report = await generator.generate(template, variables, selected_clauses)
    assert report["confidence_score"] == 0.8
    assert "NDA Agreement" in report["generated_draft"]
    assert "Keep it secret." in report["generated_draft"]


@pytest.mark.asyncio
async def test_document_reviewer_fallback():
    reviewer = DocumentReviewer(api_key="your-gemini-api-key")
    text = "This is a test contract text mentioning liabilities."
    
    report = await reviewer.review(text, "general_contract", ["confidentiality", "termination"])
    assert "Confidentiality" in report["missing_clauses"]
    assert "Termination" in report["missing_clauses"]


@pytest.mark.asyncio
async def test_redline_engine():
    redline = RedlineEngine()
    orig = "This is the original paragraph.\n\nThis is the second clause."
    rev = "This is the modified paragraph.\n\nThis is the second clause.\n\nThis is a new clause."
    
    res = await redline.generate_redline(orig, rev)
    assert "insertions" in res
    assert "deletions" in res
    assert "modifications" in res


def test_quality_checker():
    checker = QualityChecker()
    # Has unresolved placeholders
    text1 = "This is a draft with {{placeholder}} and [insert_date] and ____."
    res1 = checker.check_quality(text1)
    assert res1["is_placeholder_resolved"] is False
    assert len(res1["unresolved_placeholders"]) == 3
    assert res1["confidence_score"] < 0.9

    # Resolved and structured
    text2 = "# LEGAL CONTRACT\n\n## 1. HEAD\nThis is standard text.\n\n## 2. SIGNATURES\nSigned and sealed."
    res2 = checker.check_quality(text2)
    assert res2["is_placeholder_resolved"] is True
    assert res2["confidence_score"] == 1.0


# -------------------------------------------------------------
# API Endpoint Tests
# -------------------------------------------------------------

def test_api_list_templates():
    response = client.get("/api/v1/drafting/templates")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "templates" in data["data"]
    assert len(data["data"]["templates"]) >= 14


def test_api_generate_draft():
    payload = {
        "doc_type": "nda",
        "variables": {
            "effective_date": "2026-07-25",
            "disclosing_party": "Acme Corp",
            "receiving_party": "Wayne Enterprises",
            "purpose": "Partnership discussions"
        },
        "custom_clauses": {
            "confidentiality": "strict",
            "termination": "mutual"
        },
        "user_instructions": "Make the tone formal."
    }
    response = client.post("/api/v1/drafting/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "generated_draft" in data["data"]
    assert "Acme Corp" in data["data"]["generated_draft"]
    assert "Wayne Enterprises" in data["data"]["generated_draft"]
    assert "absolute strictest confidence" in data["data"]["generated_draft"]


def test_api_review_draft():
    payload = {
        "text": "This Agreement has no secrets and does not mention governing law.",
        "doc_type": "nda"
    }
    response = client.post("/api/v1/drafting/review", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "review_analysis" in data["data"]
    assert "quality_checks" in data["data"]


def test_api_redline_draft():
    payload = {
        "original_text": "This is a mutual non-disclosure agreement between parties.",
        "revised_text": "This is a strict unilateral non-disclosure agreement between corporate parties."
    }
    response = client.post("/api/v1/drafting/redline", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "insertions" in data["data"]
    assert "deletions" in data["data"]


def test_api_improve_draft():
    payload = {
        "text": "The provider shall perform services for client in a timely manner.",
        "instructions": "Simplify this clause.",
        "doc_type": "service_agreement"
    }
    response = client.post("/api/v1/drafting/improve", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "generated_draft" in data["data"]
