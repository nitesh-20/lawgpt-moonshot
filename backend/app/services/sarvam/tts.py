from typing import Any, Dict
import hashlib
from loguru import logger
from app.services.sarvam.client import SarvamClient
from app.services.sarvam.config import SarvamConfig

class TextToSpeechManager:
    """Manages Text-to-Speech synthesis using Sarvam's TTS API with simple caching."""
    
    _cache: Dict[str, str] = {}
    
    @classmethod
    def _generate_cache_key(cls, text: str, speaker: str, language: str) -> str:
        content = f"{text}|{speaker}|{language}".encode('utf-8')
        return hashlib.md5(content).hexdigest()

    @classmethod
    async def synthesize(cls, text: str, speaker: str = "shubh", language_code: str = "hi-IN") -> Dict[str, Any]:
        """
        Synthesizes text to speech.
        Caches repeated outputs to save API credits.
        """
        if not SarvamConfig.is_enabled():
            return {"status": "error", "audio_base64": "", "message": "Sarvam TTS is disabled."}
            
        cache_key = cls._generate_cache_key(text, speaker, language_code)
        if cache_key in cls._cache:
            logger.info("Sarvam TTS: Serving from cache.")
            return {
                "status": "success",
                "audio_base64": cls._cache[cache_key],
                "cached": True
            }
            
        logger.info(f"Sarvam TTS: Synthesizing {len(text)} chars ({language_code} - {speaker})")

        # The MCP tool path was measured at 13-18s per call (vs. ~2-3s hitting Sarvam's
        # REST endpoint directly) and was also found to intermittently return non-audio
        # payloads (file paths/status text) that got misread as base64 audio. Going
        # straight to REST is both faster and more reliable — skip MCP for TTS entirely.

        # Sarvam text-to-speech endpoint
        endpoint = "/text-to-speech"
        
        payload = {
            "inputs": [text],
            "target_language_code": language_code,
            "speaker": speaker,
            "pace": 1.0,
            "speech_sample_rate": 16000,
            "enable_preprocessing": True,
            "model": "bulbul:v3"
        }
        
        response = await SarvamClient.post(endpoint, json_payload=payload)
        
        if response.get("status") == "error":
            return response
            
        # Parse Sarvam TTS response (usually returns audios array of base64 strings)
        audios = response.get("audios", [])
        audio_base64 = audios[0] if audios else ""
        
        if audio_base64:
            cls._cache[cache_key] = audio_base64
            
        return {
            "status": "success",
            "audio_base64": audio_base64,
            "cached": False,
            "raw_response": response
        }
