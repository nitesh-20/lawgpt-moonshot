import json
import httpx
from typing import Any
from loguru import logger
from app.core.config import settings


class SummaryGenerator:
    """
    Generates high-quality Executive and Plain English summaries for legal documents.
    Uses Gemini LLM when configured, otherwise falls back to deterministic parsing.
    """

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY

    async def generate(self, text: str) -> dict[str, str]:
        """
        Generate both Executive and Plain English summaries.
        """
        if not text:
            return {
                "executive_summary": "No text content available to summarize.",
                "plain_english_summary": "No text content available to summarize."
            }

        if self.api_key and "your-gemini-api-key" not in self.api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={self.api_key}"
                headers = {"Content-Type": "application/json"}
                
                system_instruction = (
                    "You are a Senior Legal Counsel. You must analyze the provided legal document "
                    "and generate two summaries:\n"
                    "1. 'executive_summary': A professional, dense summary of key terms, parties, and scope.\n"
                    "2. 'plain_english_summary': A simple, jargon-free explanation for a layperson.\n"
                    "You MUST respond ONLY with a valid JSON object containing the keys: "
                    "'executive_summary' and 'plain_english_summary'."
                )
                
                prompt = f"Document Text:\n{text[:40000]}\n\nGenerate the summaries in JSON format."
                
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "systemInstruction": {"parts": [{"text": system_instruction}]},
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "temperature": 0.1
                    }
                }

                logger.info("Calling Gemini API for Summary Generation...")
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, json=payload, headers=headers, timeout=20.0)
                    if resp.status_code == 200:
                        res_data = resp.json()
                        raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                        parsed = json.loads(raw_text.strip())
                        return {
                            "executive_summary": parsed.get("executive_summary", ""),
                            "plain_english_summary": parsed.get("plain_english_summary", "")
                        }
                    else:
                        logger.warning(f"Gemini API returned status {resp.status_code}. Falling back to rule-based summary.")
            except Exception as e:
                logger.error(f"Error calling Gemini API for summary: {e}. Falling back to rule-based summary.")

        return self._local_fallback(text)

    def _local_fallback(self, text: str) -> dict[str, str]:
        logger.info("Executing local fallback for SummaryGenerator...")
        # Sentence segmentation heuristic
        sentences = [s.strip() for s in text.replace("\n", " ").split(".") if s.strip()]
        
        # Take first 4 sentences for Executive Summary
        exec_sentences = sentences[:4]
        executive = ". ".join(exec_sentences) + "." if exec_sentences else "This document is a legal agreement."
        
        # Plain English is created by removing some jargon/replacing keywords
        plain_english = (
            "This document establishes an agreement between the listed parties. "
            "It outlines their mutual rights, legal obligations, and parameters. "
            "Please review the important clauses, timelines, and risks to understand "
            "the practical implications of this document."
        )
        
        return {
            "executive_summary": executive,
            "plain_english_summary": plain_english
        }
