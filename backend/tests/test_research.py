import os
import json
import pytest
from pathlib import Path
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.agents.research_agent.expander import QueryExpander
from app.agents.research_agent.ranking import RankingEngine
from app.agents.research_agent.citations import CitationEngine
from app.agents.research_agent.formatter import ResultFormatter
from app.api.v1.research import research_agent

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_teardown_history():
    # Patch history file to keep test history isolated
    test_history = Path(__file__).resolve().parent.parent / "data" / "test_research_history.json"
    original_file = research_agent.history_file
    research_agent.history_file = test_history
    if test_history.exists():
        try:
            test_history.unlink()
        except Exception:
            pass
    yield
    if test_history.exists():
        try:
            test_history.unlink()
        except Exception:
            pass
    research_agent.history_file = original_file


def test_query_expander():
    expander = QueryExpander()
    res = expander.expand("Search section 302 of IPC and check Article 21 of Constitution")
    assert "Indian Penal Code" in res["expanded_query"]
    assert "Constitution of India" in res["expanded_query"]
    assert "Indian Penal Code" in res["detected_acts"]
    assert "Constitution of India" in res["detected_acts"]
    assert "302" in res["detected_sections"]
    assert "21" in res["detected_articles"]


def test_ranking_engine_and_deduplication():
    engine = RankingEngine()
    chunks = [
        {
            "chunk_id": "c1",
            "document_id": "ipc_1860",
            "text": "Punishment for murder under Section 302 of the Indian Penal Code.",
            "category": "central act",
            "act_type": "act",
            "jurisdiction": "Supreme Court",
            "score": 0.6,
        },
        # Duplicate text/id
        {
            "chunk_id": "c1",
            "document_id": "ipc_1860",
            "text": "Punishment for murder under Section 302 of the Indian Penal Code.",
            "category": "central act",
            "act_type": "act",
            "jurisdiction": "Supreme Court",
            "score": 0.6,
        },
        {
            "chunk_id": "c2",
            "document_id": "arbitrary_doc",
            "text": "General explanation of rules without act references.",
            "category": "rules",
            "act_type": "rules",
            "jurisdiction": "Bombay High Court",
            "score": 0.4,
        },
    ]

    detected_info = {
        "detected_acts": ["Indian Penal Code"],
        "detected_sections": ["302"],
        "detected_articles": [],
    }

    ranked = engine.rank(chunks, "IPC Section 302 Supreme Court query", detected_info)

    # Deduplication test
    assert len(ranked) == 2

    # Score checks
    top_hit = ranked[0]
    assert top_hit["chunk_id"] == "c1"
    # Should get authority boost (+0.10 for act), jurisdiction boost (+0.15), and relevance boost (+0.20 for act & section)
    assert top_hit["score"] > 0.6


def test_citation_engine():
    engine = CitationEngine()
    ranked = [
        {
            "chunk_id": "c1",
            "document_id": "indian_penal_code",
            "section": "302",
            "page": 45,
            "source_path": "ipc.pdf",
            "score": 0.85,
        }
    ]
    citations = engine.generate_citations(ranked)
    assert len(citations) == 1
    assert citations[0]["document_name"] == "Indian Penal Code"
    assert citations[0]["section"] == "302"
    assert citations[0]["page_number"] == 45
    assert citations[0]["source_path"] == "ipc.pdf"
    assert citations[0]["confidence_score"] > 0.85


def test_result_formatter():
    formatter = ResultFormatter()
    reasoner_out = {
        "summary": "Summary text",
        "detailed_explanation": "Explanation text",
        "applicable_law": "IPC",
        "relevant_sections": ["Sec 302"],
        "related_acts": ["Indian Penal Code"],
        "references": ["Ref 1"],
        "confidence_score": 0.9,
    }
    citations = [{"citation": "C1"}]
    formatted = formatter.format(reasoner_out, citations)

    assert formatted["summary"] == "Summary text"
    assert formatted["detailed_explanation"] == "Explanation text"
    assert formatted["applicable_law"] == "IPC"
    assert formatted["relevant_sections"] == ["Sec 302"]
    assert formatted["related_acts"] == ["Indian Penal Code"]
    assert formatted["references"] == ["Ref 1"]
    assert formatted["confidence_score"] == 0.9
    assert formatted["citations"] == citations


def test_endpoints_query_history_statistics():
    # Mock retrieval to return candidate chunk
    original_retrieve = research_agent.retriever.retrieve
    research_agent.retriever.retrieve = AsyncMock(
        return_value=[
            {
                "chunk_id": "mock_chunk_1",
                "document_id": "indian_penal_code",
                "text": "Punishment for murder under Section 302 of the Indian Penal Code.",
                "category": "central act",
                "act_type": "act",
                "jurisdiction": "Supreme Court",
                "score": 0.8,
                "page": 10,
                "section": "302",
                "source_path": "ipc.pdf",
                "created_at": "2026-07-25T00:00:00Z",
            }
        ]
    )

    try:
        # 1. Post a query
        query_payload = {
            "query": "IPC section 302 punishment",
            "session_id": "test_session",
            "filters": {"jurisdiction": "Supreme Court"},
        }
        response = client.post("/api/v1/research/query", json=query_payload)
        assert response.status_code == 200
        res_data = response.json()
        assert res_data["status"] == "success"
        assert "direct_answer" in res_data["data"] or "results" in res_data["data"]

        # 2. Check history
        response = client.get("/api/v1/research/history")
        assert response.status_code == 200
        history = response.json()
        assert len(history) == 1
        assert history[0]["query"] == "IPC section 302 punishment"

        # 3. Check statistics
        response = client.get("/api/v1/research/statistics")
        assert response.status_code == 200
        stats = response.json()
        assert stats["total_queries"] == 1
        assert stats["average_confidence"] > 0
        assert stats["average_execution_time_sec"] >= 0
    finally:
        # Restore original method
        research_agent.retriever.retrieve = original_retrieve
