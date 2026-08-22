import re


class LanguageDetector:
    """
    Identifies the language code of input text (English or Indic languages).
    Uses character Unicode block mapping for fast local detection.
    """
    def __init__(self) -> None:
        # Map unicode blocks to language codes
        self._blocks = {
            "hi-IN": re.compile(r"[\u0900-\u097F]"),  # Devanagari (Hindi/Marathi)
            "bn-IN": re.compile(r"[\u0980-\u09FF]"),  # Bengali
            "pa-IN": re.compile(r"[\u0A00-\u0A7F]"),  # Gurmukhi (Punjabi)
            "gu-IN": re.compile(r"[\u0A80-\u0AFF]"),  # Gujarati
            "ta-IN": re.compile(r"[\u0B80-\u0BFF]"),  # Tamil
            "te-IN": re.compile(r"[\u0C00-\u0C7F]"),  # Telugu
            "kn-IN": re.compile(r"[\u0C80-\u0CFF]"),  # Kannada
            "ml-IN": re.compile(r"[\u0D00-\u0D7F]")   # Malayalam
        }

    def detect_language(self, text: str) -> str:
        """
        Detects language from text input. Defaults to English ('en-IN').
        """
        if not text:
            return "en-IN"

        # Check each block
        for lang_code, pattern in self._blocks.items():
            if pattern.search(text):
                # Distinguish Marathi vs Hindi in Devanagari if possible
                if lang_code == "hi-IN":
                    marathi_markers = ["आहे", "करून", "झाले", "कराराचे", "यांच्या"]
                    if any(marker in text for marker in marathi_markers):
                        return "mr-IN"
                return lang_code

        return "en-IN"
