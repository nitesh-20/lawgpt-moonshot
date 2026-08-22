import json
from typing import Any, Dict, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.api.v1.orchestrator import orchestrator
from app.agents.voice_agent.voice_agent import VoiceAgent

router = APIRouter()


async def get_voice_agent() -> VoiceAgent:
    if not orchestrator._initialized:
        await orchestrator.initialize()
    agent = orchestrator.sub_agents.get("voice_agent")
    if agent is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Voice agent not found in orchestrator registry."
        )
    if not agent._initialized:
        await agent.initialize()
    return agent


# -------------------------------------------------------------
# Request Schemas
# -------------------------------------------------------------

class VoiceSynthesizeRequest(BaseModel):
    text: str = Field(..., description="Text content to convert into spoken speech.")
    language_code: str = Field("en-IN", description="Language of text (e.g. hi-IN, ta-IN, en-IN).")
    speaker: str = Field("shubh", description="Name of voice speaker model (e.g. shubh).")


# -------------------------------------------------------------
# Route Handlers
# -------------------------------------------------------------

@router.post("/chat", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def chat_voice(
    file: UploadFile = File(...),
    session_id: str = Form("default_voice_session"),
    language_code: Optional[str] = Form(None)
):
    """
    Primary voice chat interface. Uploads user spoken audio, transcribes it, 
    routes through LawGPT orchestrator, translates results back, and synthesizes speech.
    """
    if not orchestrator._initialized:
        await orchestrator.initialize()
    voice_agent = await get_voice_agent()
    try:
        audio_bytes = await file.read()
        task_input = {
            "action": "chat",
            "audio_bytes": audio_bytes,
            "filename": file.filename,
            "session_id": session_id,
            "language_code": language_code,
            "orchestrator": orchestrator
        }
        
        res = await voice_agent.execute(task_input)
        if res.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=res.get("message", "Error executing voice chat."),
            )
        return {"status": "success", "data": res}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error processing voice chat: {e}"
        )


@router.post("/transcribe", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def transcribe_voice(
    file: UploadFile = File(...),
    language_code: str = Form("en-IN")
):
    """
    Speech-to-text API. Uploads audio file and returns transcribed text statement.
    """
    voice_agent = await get_voice_agent()
    try:
        audio_bytes = await file.read()
        task_input = {
            "action": "transcribe",
            "audio_bytes": audio_bytes,
            "filename": file.filename,
            "language_code": language_code
        }
        res = await voice_agent.execute(task_input)
        if res.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=res.get("message", "Error transcribing audio."),
            )
        return {"status": "success", "data": res}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error executing transcription: {e}"
        )


@router.post("/synthesize", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def synthesize_voice(payload: VoiceSynthesizeRequest):
    """
    Text-to-speech API. Converts string statement to base64 audio response.
    """
    voice_agent = await get_voice_agent()
    try:
        task_input = {
            "action": "synthesize",
            "text": payload.text,
            "language_code": payload.language_code,
            "speaker": payload.speaker
        }
        res = await voice_agent.execute(task_input)
        if res.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=res.get("message", "Error synthesizing text."),
            )
        return {"status": "success", "data": res}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error executing synthesis: {e}"
        )


@router.post("/translate", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def translate_text_endpoint(payload: VoiceSynthesizeRequest):
    """
    Translation API. Translates string statement to target language.
    Note: Reusing VoiceSynthesizeRequest for convenience (text, language_code).
    """
    try:
        from app.services.sarvam.translate import TranslationManager
        from app.services.sarvam.config import SarvamConfig
        
        target_lang = payload.language_code
        text = payload.text
        
        if not SarvamConfig.is_enabled():
            return {"status": "success", "translated_text": text, "message": "Sarvam disabled."}
            
        res = await TranslationManager.translate(text, "en-IN", target_lang)
        if res.get("status") == "error":
            raise HTTPException(status_code=400, detail="Translation failed")
            
        return {"status": "success", "data": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{session_id}", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def get_session_history(session_id: str):
    """
    Fetches details of a voice chat session, including logs and turns.
    """
    voice_agent = await get_voice_agent()
    try:
        session = await voice_agent.session_manager.get_or_create_session(session_id)
        return {"status": "success", "data": session}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch session history: {e}"
        )


@router.get("/status", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def get_status():
    """
    Checks operational health and configurations of voice systems.
    """
    voice_agent = await get_voice_agent()
    try:
        health_info = await voice_agent.health()
        return {
            "status": "success",
            "data": {
                "health": health_info,
                "supported_languages": [
                    "en-IN (English)", "hi-IN (Hindi)", "ta-IN (Tamil)", 
                    "te-IN (Telugu)", "kn-IN (Kannada)", "ml-IN (Malayalam)", 
                    "mr-IN (Marathi)", "gu-IN (Gujarati)", "pa-IN (Punjabi)", 
                    "bn-IN (Bengali)"
                ],
                "tts_engine": "Bulbul v3",
                "stt_engine": "Saaras v3"
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve health status: {e}"
        )
