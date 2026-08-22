from typing import Any, Dict
from loguru import logger
from app.services.sarvam.client import SarvamClient
from app.services.sarvam.config import SarvamConfig

class SpeechToTextManager:
    """Manages audio transcription using Sarvam's Speech-to-Text API."""
    
    @classmethod
    async def transcribe(cls, audio_bytes: bytes, filename: str = "audio.wav", language_code: str = "hi-IN") -> Dict[str, Any]:
        """
        Transcribes audio to text.
        Falls back gracefully if Sarvam is disabled or fails.
        """
        if not SarvamConfig.is_enabled():
            return {"status": "error", "transcript": "", "message": "Sarvam STT is disabled."}
            
        logger.info(f"Sarvam STT: Transcribing {filename} ({language_code})")
        
        # Try Sarvam MCP first
        try:
            from app.services.sarvam.mcp.service import SarvamService
            mcp_service = SarvamService.get_instance()
            transcript = await mcp_service.transcribe(audio_bytes, filename, language_code)
            if transcript:
                return {
                    "status": "success",
                    "transcript": transcript,
                    "language_code": language_code
                }
        except Exception as e:
            logger.error(f"Sarvam MCP STT failure: {e}. Falling back to REST API.")
        
        # Sarvam speech-to-text-translate endpoint
        endpoint = "/speech-to-text-translate"
        
        mime_type = "audio/wav"
        if filename.endswith(".webm"):
            mime_type = "audio/webm"
        elif filename.endswith(".mp3"):
            mime_type = "audio/mpeg"
            
        files = {
            "file": (filename, audio_bytes, mime_type)
        }
        
        data = {
            "model": "saaras:v2.5",
            "prompt": "" # Optional hint
        }
        
        response = await SarvamClient.post(endpoint, data=data, files=files)
        
        if response.get("status") == "error":
            return response
            
        # Parse Sarvam STT response (usually contains transcript in English or original language)
        transcript = response.get("transcript", "")
        
        return {
            "status": "success",
            "transcript": transcript,
            "language_code": language_code,
            "raw_response": response
        }
