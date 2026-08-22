from typing import Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.agents.orchestrator.orchestrator import OrchestratorAgent

router = APIRouter(prefix="/orchestrator")
orchestrator = OrchestratorAgent()


class ChatRequest(BaseModel):
    message: str = Field(..., examples=["Audit FEMA compliance and write a draft contract reply."])
    session_id: str = Field(default="default_session", examples=["session_abc"])


class PlanRequest(BaseModel):
    message: str = Field(..., examples=["Draft a custom contract reply."])


@router.post("/chat")
async def orchestrator_chat(payload: ChatRequest) -> dict[str, Any]:
    """
    Execute autonomous chat loop. Classifies user query, triggers subtasks, and merges responses with citations.
    """
    if not orchestrator._initialized:
        await orchestrator.initialize()

    try:
        res = await orchestrator.execute({
            "message": payload.message,
            "session_id": payload.session_id
        })
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Orchestration execution failed: {e}"
        )


@router.post("/plan")
async def orchestrator_plan(payload: PlanRequest) -> dict[str, Any]:
    """
    Formulate execution graph plan for a user query.
    """
    if not orchestrator._initialized:
        await orchestrator.initialize()

    intents = await orchestrator.intent_classifier.classify(payload.message)
    plan = await orchestrator.planner.create_plan(payload.message, intents)

    return {
        "intents_detected": intents,
        "tasks": [
            {
                "task_id": t.task_id,
                "agent_id": t.agent_id,
                "depends_on": t.depends_on
            }
            for t in plan.tasks
        ],
        "parallelizable": plan.parallelizable
    }


@router.get("/status")
async def get_status() -> dict[str, Any]:
    """
    Get the status and sub-agent connection states of the central Orchestrator.
    """
    if not orchestrator._initialized:
        await orchestrator.initialize()
    return await orchestrator.health()


@router.get("/agents")
async def list_agents() -> list[dict[str, Any]]:
    """
    Retrieve information on registered child agents and metadata properties.
    """
    if not orchestrator._initialized:
        await orchestrator.initialize()
    return orchestrator.registry.list_agents()


@router.get("/metrics")
async def get_metrics() -> list[dict[str, Any]]:
    """
    Retrieve performance duration runtimes and execution statistics.
    """
    return orchestrator.execution_manager.metrics
