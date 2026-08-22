import httpx
from typing import Any, Dict
from loguru import logger
from app.core.config import settings


class SpeechRecognizer:
    """
    Interfaces with Sarvam AI's speech-to-text (STT) services to transcribe audio files.
    """
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.SARVAM_API_KEY
        self.base_url = settings.SARVAM_BASE_URL

    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "audio.wav",
        language_code: str = "en-IN",
        model: str = "saaras:v3"
    ) -> Dict[str, Any]:
        """
        Transcribes the provided audio bytes.
        """
        if not self.api_key or "your-sarvam-key" in self.api_key or not audio_bytes:
            logger.warning("Sarvam API key not set or audio empty. Falling back to mock transcription.")
            return self._mock_transcribe(language_code)

        try:
            url = f"{self.base_url}/speech-to-text"
            headers = {
                "api-subscription-key": self.api_key
            }
            mime_type = "audio/wav"
            if filename.endswith(".webm"):
                mime_type = "audio/webm"
            elif filename.endswith(".mp3"):
                mime_type = "audio/mpeg"
                
            files = {
                "file": (filename, audio_bytes, mime_type)
            }
            data = {
                "model": model,
                "language_code": language_code
            }

            logger.info(f"Sending STT request to Sarvam for language {language_code}...")
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, headers=headers, files=files, data=data, timeout=30.0)
                if resp.status_code == 200:
                    result = resp.json()
                    logger.info("Successfully received transcript from Sarvam.")
                    return {
                        "transcript": result.get("transcript", ""),
                        "confidence": float(result.get("confidence", 0.95)),
                        "language": language_code,
                        "raw_response": result
                    }
                else:
                    logger.error(f"Sarvam STT failed with status {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Error calling Sarvam STT: {e}")

        # Fallback in case of failure
        return self._mock_transcribe(language_code)

    def _mock_transcribe(self, language_code: str) -> Dict[str, Any]:
        """
        Generates mock transcription text for testing/fallback.
        """
        # Mock responses based on expected language codes
        lang = language_code.split("-")[0].lower()
        transcripts = {
            "hi": "नमस्ते, क्या आप मुझे सेबी के नियमों के बारे में बता सकते हैं?",
            "ta": "வணக்கம், சேவை ஒப்பந்தத்தை எவ்வாறு வரைவது என்று சொல்லுங்கள்.",
            "te": "నమస్కారం, దయచేసి ఈ ఒప్పందాన్ని సమీక్షించండి.",
            "kn": "ನಮಸ್ಕಾರ, ಈ ಗುತ್ತಿಗೆ ಒಪ್ಪಂದವನ್ನು ಪರಿಶೀಲಿಸಿ.",
            "ml": "നമസ്കാരം, ദയവായി ഈ കരാർ വിശദീകരിക്കുക.",
            "mr": "नमस्कार, कृपया या कराराचे नियम स्पष्ट करा.",
            "gu": "નમસ્કાર, આ કરાર અંગે માહિતી આપો.",
            "pa": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਇਸ ਦਸਤਾਵੇਜ਼ ਬਾਰੇ ਦੱਸੋ.",
            "bn": "নমস্কার, এই চুক্তির নিয়মগুলো বলুন।",
            "en": "Hello, can you explain the termination clause in this NDA agreement?"
        }
        
        text = transcripts.get(lang, "Hello, can you help me with legal research?")
        return {
            "transcript": text,
            "confidence": 0.85,
            "language": language_code,
            "mocked": True
        }
