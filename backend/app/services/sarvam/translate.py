from typing import Any, Dict
import hashlib
from loguru import logger
from app.services.sarvam.client import SarvamClient
from app.services.sarvam.config import SarvamConfig

class TranslationManager:
    """Manages Translation using Sarvam API with simple caching."""
    
    _cache: Dict[str, str] = {}
    
    @classmethod
    def _generate_cache_key(cls, text: str, source: str, target: str) -> str:
        content = f"{text}|{source}|{target}".encode('utf-8')
        return hashlib.md5(content).hexdigest()

    @classmethod
    async def translate(cls, text: str, source_language: str, target_language: str) -> Dict[str, Any]:
        """
        Translates text from source to target language.
        Caches repeated outputs to save API credits.
        """
        if not SarvamConfig.is_enabled():
            return {"status": "error", "translated_text": text, "message": "Sarvam Translation is disabled."}
            
        # Avoid unnecessary API calls
        if source_language == target_language or not text.strip():
            return {"status": "success", "translated_text": text, "cached": True}
            
        cache_key = cls._generate_cache_key(text, source_language, target_language)
        if cache_key in cls._cache:
            logger.info("Sarvam Translate: Serving from cache.")
            return {
                "status": "success",
                "translated_text": cls._cache[cache_key],
                "cached": True
            }
            
        logger.info(f"Sarvam Translate: Translating {len(text)} chars ({source_language} -> {target_language})")
        
        # Try Sarvam MCP first
        try:
            from app.services.sarvam.mcp.service import SarvamService
            mcp_service = SarvamService.get_instance()
            translated = await mcp_service.translate(text, source_language, target_language)
            if translated:
                cls._cache[cache_key] = translated
                return {
                    "status": "success",
                    "translated_text": translated,
                    "cached": False
                }
        except Exception as e:
            logger.error(f"Sarvam MCP Translation failure: {e}. Falling back to REST API.")
            
        # Sarvam translate endpoint
        endpoint = "/translate"
        
        payload = {
            "input": text,
            "source_language_code": source_language,
            "target_language_code": target_language,
            "speaker_gender": "Male",
            "mode": "formal",
            "model": "mayura:v1",
            "enable_preprocessing": True
        }
        
        response = await SarvamClient.post(endpoint, json_payload=payload)
        
        if response.get("status") == "error":
            return response
            
        # Parse Sarvam Translate response
        translated_text = response.get("translated_text", text)
        
        if translated_text and translated_text != text:
            cls._cache[cache_key] = translated_text
            
        return {
            "status": "success",
            "translated_text": translated_text,
            "cached": False,
            "raw_response": response
        }
