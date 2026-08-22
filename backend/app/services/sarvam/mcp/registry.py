import asyncio
from loguru import logger
from typing import Any, Dict, List, Optional

class SarvamToolRegistry:
    """Registry to map and dynamically discover Sarvam MCP tool names from list_tools."""
    
    def __init__(self) -> None:
        self.tool_mappings: Dict[str, str] = {}
        
    def populate_from_session_tools(self, tools: List[Any]) -> None:
        """Populates the mapped tool names dynamically by parsing descriptions/names from the MCP server."""
        for tool in tools:
            name = tool.name
            desc = getattr(tool, "description", "").lower()
            name_lower = name.lower()
            
            logger.info(f"Discovered MCP tool: {name} (description: {desc})")
            
            # Map tools dynamically based on substring match in name/description
            if "speech_to_text" in name_lower or "speech-to-text" in name_lower or "stt" in name_lower or ("speech" in desc and "text" in desc and "transcri" in desc):
                if "translate" not in name_lower and "batch" not in name_lower:
                    self.tool_mappings["speech_to_text"] = name
            elif "text_to_speech" in name_lower or "text-to-speech" in name_lower or "tts" in name_lower or ("text" in desc and "speech" in desc and "synth" in desc):
                self.tool_mappings["text_to_speech"] = name
            elif "translate" in name_lower or "translation" in name_lower or "translator" in name_lower:
                if "stt" not in name_lower and "voice" not in name_lower and "dub" not in name_lower:
                    self.tool_mappings["translation"] = name
            elif "transliterate" in name_lower or "transliteration" in name_lower:
                self.tool_mappings["transliteration"] = name
            elif "detect" in name_lower or "identify" in name_lower or "language_id" in name_lower or "language-id" in name_lower or "lang_id" in name_lower:
                self.tool_mappings["language_detection"] = name
            elif "doc" in name_lower or "document" in name_lower or "vision" in name_lower or "ocr" in name_lower:
                if "job_status" not in name_lower:
                    self.tool_mappings["document_intelligence"] = name
            elif "analytics" in name_lower or "entity" in name_lower or "ner" in name_lower or "extract" in name_lower:
                if "vision" not in name_lower:
                    self.tool_mappings["text_analytics"] = name
            elif "llm" in name_lower or "chat" in name_lower or "completion" in name_lower or "generate" in name_lower or "saaras" in name_lower:
                if "voice" not in name_lower:
                    self.tool_mappings["chat"] = name

        # Fallback to standard defaults if any map is missing
        defaults = {
            "speech_to_text": "sarvam_tools_stt_transcribe",
            "text_to_speech": "sarvam_tools_tts_stream",
            "translation": "sarvam_tools_translate",
            "transliteration": "sarvam_tools_transliterate",
            "language_detection": "sarvam_tools_identify_language",
            "document_intelligence": "sarvam_tools_vision_extract",
            "text_analytics": "sarvam_tools_text_analytics",
            "chat": "sarvam_tools_llm_complete"
        }
        for key, val in defaults.items():
            if key not in self.tool_mappings:
                self.tool_mappings[key] = val

        logger.info(f"Populated Sarvam MCP tool mapping: {self.tool_mappings}")

    def get_tool_name(self, key: str) -> str:
        """Retrieves the mapped tool name or returns key as fallback."""
        return self.tool_mappings.get(key, key)
