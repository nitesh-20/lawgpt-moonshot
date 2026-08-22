import httpx
from typing import Any, Dict
from loguru import logger
from app.core.config import settings


class TranslationService:
    """
    Interfaces with Sarvam AI's translate API to translate text between English and Indic languages.
    """
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.SARVAM_API_KEY
        self.base_url = settings.SARVAM_BASE_URL

    async def translate(
        self,
        text: str,
        source_language_code: str = "auto",
        target_language_code: str = "en-IN"
    ) -> Dict[str, Any]:
        """
        Translates text to the target language.
        """
        if source_language_code == target_language_code or not text:
            return {"translated_text": text, "source": source_language_code, "target": target_language_code}

        if not self.api_key or "your-sarvam-key" in self.api_key:
            logger.warning("Sarvam API key not configured. Returning mock translation.")
            return self._mock_translate(text, source_language_code, target_language_code)

        try:
            url = f"{self.base_url}/translate"
            headers = {
                "api-subscription-key": self.api_key,
                "Content-Type": "application/json"
            }
            payload = {
                "input": text,
                "source_language_code": source_language_code,
                "target_language_code": target_language_code
            }

            logger.info(f"Sending translate request from {source_language_code} to {target_language_code}...")
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, headers=headers, json=payload, timeout=20.0)
                if resp.status_code == 200:
                    result = resp.json()
                    logger.info("Successfully received translation from Sarvam.")
                    return {
                        "translated_text": result.get("translated_text", ""),
                        "source": source_language_code,
                        "target": target_language_code,
                        "raw_response": result
                    }
                else:
                    logger.error(f"Sarvam translation failed with status {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Error calling Sarvam translation: {e}")

        return self._mock_translate(text, source_language_code, target_language_code)

    def _mock_translate(self, text: str, source: str, target: str) -> Dict[str, Any]:
        """
        Mock translations for fallback.
        """
        # If we translate from auto/Indic to English
        if target.startswith("en"):
            # If the source is clearly an Indic language, provide English mock queries
            mock_text = (
                "Can you review this NDA contract and explain the termination clause?"
                if any(x in text for x in ["अनुबंध", "ஒப்பந்தம்", "కలదు", "ಕರಾರು", "കരാർ", "करार", "કરાર", "ਦਸਤਾਵੇਜ਼", "চুক্তি"])
                else "Hello, can you help me check compliance?"
            )
            return {
                "translated_text": mock_text,
                "source": source,
                "target": target,
                "mocked": True
            }
        else:
            # Translating from English to Indic language
            lang = target.split("-")[0].lower()
            translations = {
                "hi": "यह एक कानूनी दस्तावेज है। नियम और शर्तें निम्नानुसार हैं।",
                "ta": "இது ஒரு சட்டப்பூர்வ ஆவணமாகும். விதிமுறைகள் மற்றும் நிபந்தனைகள் பின்வருமாறு.",
                "te": "ఇది చట్టపరమైన పత్రం. నియమ నిబంధనలు క్రింది విధంగా ఉన్నాయి.",
                "kn": "ಇದು ಕಾನೂನು ದಾಖಲೆಯಾಗಿದೆ. ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳು ಈ ಕೆಳಗಿನಂತಿವೆ.",
                "ml": "ഇതൊരു നിയമപരമായ രേഖയാണ്. നിബന്ധനകളും വ്യവസ്ഥകളും താഴെ പറയുന്നവയാണ്.",
                "mr": "हा एक कायदेशीर दस्तऐवज आहे. अटी व शर्ती खालीलप्रमाणे आहेत.",
                "gu": "આ એક કાનૂની દસ્તાવેજ છે. નિયમો અને શરતો નીચે મુજબ છે.",
                "pa": "ਇਹ ਇੱਕ ਕਾਨੂੰਨੀ ਦਸਤਾਵੇਜ਼ ਹੈ। ਨਿਯਮ ਅਤੇ ਸ਼ਰਤਾਂ ਹੇਠ ਲਿਖੇ ਅਨੁਸਾਰ ਹਨ।",
                "bn": "এটি একটি আইনি দলিল। শর্তাবলী নিম্নরূপ।",
            }
            res_text = translations.get(lang, f"[Translated to {target}]: {text}")
            return {
                "translated_text": res_text,
                "source": source,
                "target": target,
                "mocked": True
            }
        
