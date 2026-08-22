import base64
import httpx
from typing import Any, Dict
from loguru import logger
from app.core.config import settings


class SpeechSynthesizer:
    """
    Interfaces with Sarvam AI's text-to-speech (TTS) services to synthesize text into base64-encoded audio.
    """
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.SARVAM_API_KEY
        self.base_url = settings.SARVAM_BASE_URL

    async def synthesize(
        self,
        text: str,
        target_language_code: str = "en-IN",
        speaker: str = "shubh"
    ) -> Dict[str, Any]:
        """
        Synthesizes text to spoken audio.
        """
        if not self.api_key or "your-sarvam-key" in self.api_key or not text:
            logger.warning("Sarvam API key not set or empty text. Returning mock base64 audio.")
            return self._mock_synthesize()

        try:
            url = f"{self.base_url}/text-to-speech"
            headers = {
                "api-subscription-key": self.api_key,
                "Content-Type": "application/json"
            }
            payload = {
                "text": text,
                "target_language_code": target_language_code,
                "speaker": speaker
            }

            logger.info(f"Sending TTS request to Sarvam for language {target_language_code}...")
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, headers=headers, json=payload, timeout=20.0)
                if resp.status_code == 200:
                    result = resp.json()
                    logger.info("Successfully received synthesized audio from Sarvam.")
                    return {
                        "audio": result.get("audio", ""),
                        "language": target_language_code,
                        "raw_response": result
                    }
                else:
                    logger.error(f"Sarvam TTS failed with status {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Error calling Sarvam TTS: {e}")

        return self._mock_synthesize()

    def _mock_synthesize(self) -> Dict[str, Any]:
        """
        Generates mock base64-encoded audio data for testing.
        """
        # A tiny silent 1-second WAV file encoded in base64
        tiny_silent_wav_b64 = (
            "UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="
        )
        return {
            "audio": tiny_silent_wav_b64,
            "mocked": True
        }
