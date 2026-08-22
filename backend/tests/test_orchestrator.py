import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.agents.orchestrator.intent import IntentClassifier, TaskPlanner
from app.agents.orchestrator.router import AgentRegistry, AgentRouter
from app.agents.orchestrator.memory import MemoryRetriever
from app.agents.orchestrator.context import ContextAssembler
from app.agents.orchestrator.execution import ExecutionManager
from app.agents.orchestrator.synthesizer import ResponseSynthesizer

client = TestClient(app)


@pytest.mark.asyncio
async def test_intent_classification():
    classifier = IntentClassifier()
    intents = await classifier.classify("Help search for CPC sections and draft a reply.")
    assert "legal_research" in intents
    assert "draft_contract" in intents


@pytest.mark.asyncio
async def test_task_planning():
    planner = TaskPlanner()
    intents = {"legal_research": 0.8, "draft_contract": 0.8}
    plan = await planner.create_plan("Query text", intents)
    assert len(plan.tasks) == 2
    # Drafting should depend on research
    draft_task = next(t for t in plan.tasks if t.agent_id == "drafting_agent")
    assert "subtask_legal_research" in draft_task.depends_on
    assert not plan.parallelizable


def test_agent_registry():
    registry = AgentRegistry()
    meta = {
        "id": "compliance_agent",
        "name": "Compliance Agent",
        "supported_intents": ["compliance_check"],
        "priority": 2,
        "health": "healthy"
    }
    registry.register_agent(meta)
    assert registry.get_agent_metadata("compliance_agent") is not None
    assert len(registry.list_agents()) == 1


@pytest.mark.asyncio
async def test_memory_retriever():
    memory = MemoryRetriever(limit=2)
    await memory.add_message("session_1", "user", "Message 1")
    await memory.add_message("session_1", "assistant", "Message 2")
    await memory.add_message("session_1", "user", "Message 3")

    history = await memory.get_short_term_memory("session_1")
    assert len(history) == 2
    assert history[0]["text"] == "Message 2"
    assert history[1]["text"] == "Message 3"


@pytest.mark.asyncio
async def test_execution_manager():
    mgr = ExecutionManager()
    tasks = [
        {"task_id": "t1", "agent_id": "a1", "depends_on": []},
        {"task_id": "t2", "agent_id": "a2", "depends_on": ["t1"]}
    ]
    
    async def dummy_fn():
        return {"msg": "hello"}
        
    execute_map = {
        "a1": dummy_fn,
        "a2": dummy_fn
    }
    
    results = await mgr.execute_plan(tasks, execute_map, run_in_parallel=False)
    assert len(results) == 2
    assert results[0]["status"] == "success"
    assert results[1]["status"] == "success"


@pytest.mark.asyncio
async def test_response_synthesizer_citations():
    synth = ResponseSynthesizer()
    execution_results = [
        {"agent_id": "research_agent", "status": "success", "output": {"message": "Found CPC statute."}}
    ]
    rag_chunks = [
        {"document_id": "cpc_1908", "page": 12, "section": "Section 96", "text": "Appeal contents..."}
    ]
    res = await synth.synthesize("Query text", execution_results, rag_chunks)
    assert "Cpc 1908" in res["response"]
    assert "Section 96" in res["response"]
    assert len(res["citations"]) == 1


def test_orchestrator_api_status():
    response = client.get("/api/v1/orchestrator/status")
    assert response.status_code == 200
    data = response.json()
    assert data["agent"] == "OrchestratorAgent"
    assert data["status"] == "healthy"


def test_orchestrator_api_agents():
    response = client.get("/api/v1/orchestrator/agents")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 6  # 6 child agents registered


def test_orchestrator_api_plan():
    response = client.post("/api/v1/orchestrator/plan", json={"message": "Draft a contract."})
    assert response.status_code == 200
    data = response.json()
    assert "intents_detected" in data
    assert "tasks" in data


def test_orchestrator_api_chat():
    response = client.post("/api/v1/orchestrator/chat", json={"message": "Check compliance and draft a contract."})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "message" in data
    assert "metrics" in data
