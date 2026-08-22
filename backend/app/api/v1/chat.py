from fastapi import APIRouter, HTTPException, status

from pydantic import BaseModel, Field
from app.api.v1.orchestrator import orchestrator

router = APIRouter()

class ChatPayload(BaseModel):
    message: str
    session_id: str = "default"

@router.post("/chat", status_code=status.HTTP_200_OK)
async def chat_endpoint(payload: ChatPayload):
    """
    Unified chat interaction endpoint routed via orchestrator.
    """
    if not orchestrator._initialized:
        await orchestrator.initialize()
        
    try:
        res = await orchestrator.execute({
            "message": payload.message,
            "session_id": payload.session_id
        })
        
        # frontend chat.ts expects { response: "..." }
        return {
            "response": res.get("data", {}).get("answer", "I could not generate an answer.") if isinstance(res.get("data"), dict) else str(res.get("data", "Error processing request."))
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat execution failed: {e}"
        )
