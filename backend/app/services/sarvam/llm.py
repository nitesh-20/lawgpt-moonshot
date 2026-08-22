import json
from loguru import logger
from typing import Any, Dict, List
from app.services.sarvam.client import SarvamClient
from app.services.sarvam.config import SarvamConfig

class SarvamLLMManager:
    """Manages Text Generation/Completions using Sarvam LLM APIs."""
    
    @classmethod
    async def generate_content(cls, prompt: str) -> Dict[str, Any]:
        """
        Sends a prompt to the Sarvam LLM and returns the generated text.
        Returns a dict with 'status' and 'content'.
        """
        if not SarvamConfig.is_enabled():
            return {"status": "error", "content": "", "message": "Sarvam LLM is disabled."}
            
        logger.info(f"Sarvam LLM: Generating content for prompt ({len(prompt)} chars)")
        
        # Try Sarvam MCP first
        try:
            from app.services.sarvam.mcp.service import SarvamService
            mcp_service = SarvamService.get_instance()
            content = await mcp_service.chat(prompt)
            if content:
                return {"status": "success", "content": content}
        except Exception as e:
            logger.error(f"Sarvam MCP LLM failure: {e}. Falling back to REST API.")
            
        # Currently assuming a typical chat/completions or custom completions endpoint
        endpoint = "/v1/chat/completions"
        
        # Parse prompt into system and user message roles to enforce constraints cleanly
        system_content = "You are a Senior Legal Research Counsel. Produce a professional legal research report. Return ONLY a raw JSON object."
        user_content = prompt
        if "System Instruction:\n" in prompt:
            parts = prompt.split("System Instruction:\n")
            if len(parts) > 1:
                subparts = parts[1].split("\n\nUser Legal Query:")
                if len(subparts) > 1:
                    system_content = subparts[0].strip()
                    user_content = "User Legal Query:" + subparts[1].strip()
                    
        payload = {
            "model": "sarvam-30b",
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.2,
            "max_tokens": 4000
        }
        
        try:
            response = await SarvamClient.post(endpoint, json_payload=payload)
            logger.info(f"Sarvam LLM raw response: {response}")
            
            if response.get("status") == "error":
                return response
                
            # Parse OpenAI-like response structure
            choices = response.get("choices", [])
            if choices and len(choices) > 0:
                message = choices[0].get("message", {})
                content = message.get("content") or message.get("reasoning_content") or ""
                return {"status": "success", "content": content}
                
            # Fallback if structure is different
            if "text" in response:
                return {"status": "success", "content": response["text"]}
                
            return {"status": "success", "content": str(response)}
            
        except Exception as e:
            logger.error(f"Error in Sarvam LLM generation: {e}")
            return {"status": "error", "content": "", "message": str(e)}
