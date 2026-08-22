from typing import Any

from loguru import logger

from app.core.config import settings


class GeminiService:
    """
    Service wrapper for Google Gemini LLM API calls.
    Used for complex reasoning, drafting validation, and general planning tasks.
    """

    def __init__(self) -> None:
        self.api_key = settings.GEMINI_API_KEY

    async def generate_response(
        self, prompt: str, system_instruction: str = ""
    ) -> dict[str, Any]:
        """
        Skeleton for generating response with Gemini.
        """
        logger.info(
            f"Gemini response generation requested with prompt length: {len(prompt)}"
        )
        return {
            "status": "not_implemented",
            "content": "Gemini skeleton placeholder content",
            "usage": {},
        }
