from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.agents.drafting_agent.drafting_agent import DraftingAgent

router = APIRouter()
agent_instance = DraftingAgent()


async def get_agent() -> DraftingAgent:
    if not agent_instance._initialized:
        await agent_instance.initialize()
    return agent_instance


# -------------------------------------------------------------
# Request Schemas
# -------------------------------------------------------------

class DraftGenerateRequest(BaseModel):
    doc_type: str = Field(..., description="Document type to generate (e.g., nda, lease_agreement, service_agreement).")
    variables: Dict[str, Any] = Field(default_factory=dict, description="Values for the placeholders in the template.")
    custom_clauses: Dict[str, str] = Field(default_factory=dict, description="Override variations for specific clauses (e.g. {'confidentiality': 'strict'}).")
    user_instructions: str = Field(default="", description="Optional additional instructions to guide contract customization.")
    document_id: Optional[str] = Field(None, description="Optional unique identifier for version history tracking.")


class DraftReviewRequest(BaseModel):
    text: str = Field(..., description="The full legal draft text to review.")
    doc_type: str = Field(default="general_contract", description="The type of contract (e.g. nda, service_agreement) to check against.")


class DraftRedlineRequest(BaseModel):
    original_text: str = Field(..., description="The original document text.")
    revised_text: str = Field(..., description="The modified or updated document text.")


class DraftImproveRequest(BaseModel):
    text: str = Field(..., description="The document or clause text to improve.")
    instructions: str = Field(default="Rewrite to make it client-friendly and clear.", description="Custom rewrite/improvement prompts.")
    doc_type: str = Field(default="general_contract", description="Document type context.")


# -------------------------------------------------------------
# Route Handlers
# -------------------------------------------------------------

@router.post("/generate", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def generate_draft(payload: DraftGenerateRequest):
    """
    Generates a new legal document draft using templates, clauses, variables, and optional custom instructions.
    """
    agent = await get_agent()
    try:
        task_input = {
            "action": "generate",
            "doc_type": payload.doc_type,
            "variables": payload.variables,
            "custom_clauses": payload.custom_clauses,
            "user_instructions": payload.user_instructions,
            "document_id": payload.document_id or f"draft_{int(status.HTTP_200_OK)}"
        }
        res = await agent.execute(task_input)
        if res.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=res.get("message", "Error generating draft contract."),
            )
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error executing draft generation: {e}",
        )


@router.post("/review", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def review_draft(payload: DraftReviewRequest):
    """
    Reviews a legal draft, identifying missing clauses, high-risk wording, quality issues, and compliance gaps.
    """
    agent = await get_agent()
    try:
        task_input = {
            "action": "review",
            "text": payload.text,
            "doc_type": payload.doc_type
        }
        res = await agent.execute(task_input)
        if res.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=res.get("message", "Error reviewing legal draft."),
            )
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error executing draft review: {e}",
        )


@router.post("/redline", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def redline_draft(payload: DraftRedlineRequest):
    """
    Compares original and revised drafts, generating redline modifications, diff highlights, and risk impact summaries.
    """
    agent = await get_agent()
    try:
        task_input = {
            "action": "redline",
            "original_text": payload.original_text,
            "revised_text": payload.revised_text
        }
        res = await agent.execute(task_input)
        if res.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=res.get("message", "Error executing redline comparison."),
            )
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error executing redline comparison: {e}",
        )


@router.post("/improve", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def improve_draft(payload: DraftImproveRequest):
    """
    Improves, simplifies, or rewrites a document or individual clauses according to custom instructions.
    """
    agent = await get_agent()
    try:
        task_input = {
            "action": "improve",
            "text": payload.text,
            "instructions": payload.instructions,
            "doc_type": payload.doc_type
        }
        res = await agent.execute(task_input)
        if res.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=res.get("message", "Error executing draft improvement."),
            )
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error executing draft improvement: {e}",
        )


@router.get("/templates", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def list_templates():
    """
    Retrieves metadata of all pre-configured legal document templates in the workspace.
    """
    agent = await get_agent()
    try:
        res = await agent.execute({"action": "templates"})
        if res.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=res.get("message", "Error listing templates."),
            )
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error listing templates: {e}",
        )
