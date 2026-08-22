from loguru import logger


class TTSService:
    """
    Handles translation of text transcripts to speech audio streams.
    """

    def __init__(self) -> None:
        pass

    async def generate_speech(self, text: str, language: str = "en") -> bytes:
        """
        Skeleton method returning voice audio bytes.
        """
        logger.info(f"Generating TTS audio output for language '{language}'")
        return b""
