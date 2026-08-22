import base64
import time
from loguru import logger
from typing import Any, Dict, List, Optional
from app.services.sarvam.mcp.manager import SarvamMCPManager
from app.services.sarvam.mcp.registry import SarvamToolRegistry

class SarvamService:
    """Service to execute business workflows using the Sarvam MCP manager and registry."""
    _instance: Optional["SarvamService"] = None

    def __init__(self) -> None:
        self.manager = SarvamMCPManager.get_instance()
        self.registry = SarvamToolRegistry()
        self._registry_populated = False

    @classmethod
    def get_instance(cls) -> "SarvamService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def _ensure_registry(self) -> None:
        """Helper to verify tool names are populated from the active session."""
        if not self._registry_populated:
            await self.manager.connect()
            if self.manager.session:
                try:
                    tools_result = await self.manager.session.list_tools()
                    self.registry.populate_from_session_tools(tools_result.tools)
                    self._registry_populated = True
                except Exception as e:
                    logger.error(f"Failed to list and register MCP tools: {e}")

    async def chat(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        """Exposes Sarvam LLM completions tool (sarvam_tools_llm_complete)."""
        await self._ensure_registry()
        tool_name = self.registry.get_tool_name("chat")
        
        # Format OpenAI-style messages array
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        args = {
            "messages": messages,
            "model": "sarvam-30b"
        }
            
        result = await self.manager.call_mcp_tool(tool_name, args)
        if result and hasattr(result, "content") and result.content:
            try:
                import json
                parsed = json.loads(result.content[0].text)
                # Check for nested message completions
                choices = parsed.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content")
                return parsed.get("content") or result.content[0].text
            except Exception:
                return result.content[0].text
        return None

    async def transcribe(self, audio_bytes: bytes, filename: str, language_code: str = "en-IN") -> Optional[str]:
        """Converts microphone/speech audio using stt_transcribe tool."""
        await self._ensure_registry()
        tool_name = self.registry.get_tool_name("speech_to_text")
        
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        # Map parameters to sarvam_tools_stt_transcribe schema
        args = {
            "audio_base64": audio_b64,
            "filename": filename,
            "language_code": language_code if language_code != "en-IN" else "en-IN",
            "mode": "transcribe"
        }
        
        result = await self.manager.call_mcp_tool(tool_name, args)
        if result and hasattr(result, "content") and result.content:
            try:
                import json
                parsed = json.loads(result.content[0].text)
                return parsed.get("transcript") or parsed.get("text") or result.content[0].text
            except Exception:
                return result.content[0].text
        return None

    async def synthesize(self, text: str, voice: str = "priya", language_code: str = "en-IN") -> Optional[bytes]:
        """Generates natural speech using tts_stream tool."""
        await self._ensure_registry()
        tool_name = self.registry.get_tool_name("text_to_speech")
        
        # Map parameters to sarvam_tools_tts_stream schema
        # Voice is mapped to speaker
        args = {
            "text": text,
            "target_language_code": language_code,
            "speaker": voice if voice else "priya",
            "model": "bulbul:v3"
        }
        
        result = await self.manager.call_mcp_tool(tool_name, args)
        if result and hasattr(result, "content") and result.content:
            raw_text = result.content[0].text
            audio_b64 = None
            try:
                import json
                parsed = json.loads(raw_text)
                audio_b64 = parsed.get("audio_base64")
            except Exception:
                pass

            # Only trust an explicit audio_base64 field. The tool can also reply with a
            # file path or plain-text status message (e.g. when it writes audio to disk
            # instead of inlining it) — blindly base64-decoding that garbage previously
            # produced unplayable audio that then poisoned the TTS cache.
            if not audio_b64:
                logger.warning("Sarvam MCP TTS: no audio_base64 in tool response, skipping.")
                return None

            try:
                decoded = base64.b64decode(audio_b64, validate=True)
            except Exception:
                logger.warning("Sarvam MCP TTS: audio_base64 field was not valid base64, skipping.")
                return None

            # Sanity check it's actually audio before trusting it (and, upstream, caching it).
            known_headers = (b"RIFF", b"OggS", b"ID3\x00", b"fLaC")
            looks_like_audio = len(decoded) >= 200 and (decoded[:4] in known_headers or decoded[:2] == b"\xff\xfb")
            if not looks_like_audio:
                logger.warning(f"Sarvam MCP TTS: decoded payload does not look like audio ({len(decoded)} bytes), skipping.")
                return None

            return decoded
        return None

    async def extract_document(self, file_bytes: bytes, filename: str) -> Optional[Dict[str, Any]]:
        """Parses PDFs/images using vision_extract tool."""
        await self._ensure_registry()
        tool_name = self.registry.get_tool_name("document_intelligence")
        
        file_b64 = base64.b64encode(file_bytes).decode("utf-8")
        args = {
            "document_base64": file_b64,
            "filename": filename,
            "output_format": "md"
        }
        
        result = await self.manager.call_mcp_tool(tool_name, args)
        if result and hasattr(result, "content") and result.content:
            try:
                import json
                return json.loads(result.content[0].text)
            except Exception:
                return {"text": result.content[0].text}
        return None

    async def translate(self, text: str, source_lang: str, target_lang: str) -> Optional[str]:
        """Translates text using translate tool."""
        await self._ensure_registry()
        tool_name = self.registry.get_tool_name("translation")
        
        # Translate source / target codes to BCP-47
        src_code = source_lang if "-" in source_lang else f"{source_lang}-IN"
        tgt_code = target_lang if "-" in target_lang else f"{target_lang}-IN"
        if src_code == "en-IN":
            src_code = "en-IN"
            
        args = {
            "input": text,
            "source_language_code": src_code,
            "target_language_code": tgt_code
        }
        
        result = await self.manager.call_mcp_tool(tool_name, args)
        if result and hasattr(result, "content") and result.content:
            try:
                import json
                parsed = json.loads(result.content[0].text)
                return parsed.get("translated_text") or result.content[0].text
            except Exception:
                return result.content[0].text
        return None

    async def detect_language(self, text: str) -> Optional[str]:
        """Automatically detects language from user text using identify_language tool."""
        await self._ensure_registry()
        tool_name = self.registry.get_tool_name("language_detection")
        
        args = {"input": text}
        result = await self.manager.call_mcp_tool(tool_name, args)
        if result and hasattr(result, "content") and result.content:
            try:
                import json
                parsed = json.loads(result.content[0].text)
                return parsed.get("language_code") or result.content[0].text
            except Exception:
                return result.content[0].text
        return None

    async def transliterate(self, text: str, source_lang: str = "hi-IN", target_lang: str = "en-IN") -> Optional[str]:
        """Transliterates text using transliterate tool."""
        await self._ensure_registry()
        tool_name = self.registry.get_tool_name("transliteration")
        
        src_code = source_lang if "-" in source_lang else f"{source_lang}-IN"
        tgt_code = target_lang if "-" in target_lang else f"{target_lang}-IN"
        
        args = {
            "input": text,
            "source_language_code": src_code,
            "target_language_code": tgt_code
        }
        
        result = await self.manager.call_mcp_tool(tool_name, args)
        if result and hasattr(result, "content") and result.content:
            try:
                import json
                parsed = json.loads(result.content[0].text)
                return parsed.get("transliterated_text") or result.content[0].text
            except Exception:
                return result.content[0].text
        return None

    async def analyze_text(self, text: str) -> Optional[Dict[str, Any]]:
        """Performs entity analysis using text_analytics tool."""
        await self._ensure_registry()
        tool_name = self.registry.get_tool_name("text_analytics")
        
        # Query specific entities
        questions = [
            {"id": "q1", "text": "Extract all court names mentioned.", "type": "short answer"},
            {"id": "q2", "text": "Extract all act names and section numbers.", "type": "short answer"},
            {"id": "q3", "text": "Extract all dates, organization names, and person names.", "type": "short answer"}
        ]
        
        args = {
            "text": text,
            "questions": questions
        }
        result = await self.manager.call_mcp_tool(tool_name, args)
        if result and hasattr(result, "content") and result.content:
            try:
                import json
                return json.loads(result.content[0].text)
            except Exception:
                return {"entities": []}
        return None

