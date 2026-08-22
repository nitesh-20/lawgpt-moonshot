from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class AgentMetadata(BaseModel):
    id: str = Field(..., examples=["orchestrator"])
    name: str = Field(..., examples=["Orchestrator Agent"])
    description: str = Field(
        ..., examples=["Central coordinator managing multi-agent tasks"]
    )
    role: str = Field(..., examples=["Coordinator"])


class AgentsListResponse(BaseModel):
    agents: list[AgentMetadata]


@router.get("/agents", response_model=AgentsListResponse)
async def get_agents():
    agents = [
        {
            "id": "orchestrator",
            "name": "Orchestrator Agent",
            "description": "Central workflow orchestrator that parses user intent and coordinates specialized legal sub-agents.",
            "role": "Central Manager",
        },
        {
            "id": "document_agent",
            "name": "Document Agent",
            "description": "Processes legal document files (PDFs, docs), extracts text, outlines structure, and parses tables.",
            "role": "Document Parser",
        },
        {
            "id": "research_agent",
            "name": "Research Agent",
            "description": "Executes indic legal query tasks, fetches case laws, regulations, acts, and formats citations.",
            "role": "Legal Researcher",
        },
        {
            "id": "risk_agent",
            "name": "Risk Agent",
            "description": "Analyzes agreements, contracts, and briefs to point out hidden exposures and unfavorable terms.",
            "role": "Risk Evaluator",
        },
        {
            "id": "compliance_agent",
            "name": "Compliance Agent",
            "description": "Audits operational procedures against acts (like SEBI, FEMA, labor codes) and compliance calendars.",
            "role": "Compliance Officer",
        },
        {
            "id": "drafting_agent",
            "name": "Drafting Agent",
            "description": "Drafts customized legal documents, replies, clauses, and template updates.",
            "role": "Document Drafter",
        },
        {
            "id": "voice_agent",
            "name": "Voice Agent",
            "description": "Coordinates speech-to-text input transcription and Indic translation TTS synthesis voice outputs.",
            "role": "Voice Coordinator",
        },
        {
            "id": "memory_agent",
            "name": "Memory Agent",
            "description": "Manages conversation context summaries, session state storage, and short/long-term memory indexes.",
            "role": "Memory Manager",
        },
    ]
    return {"agents": agents}
