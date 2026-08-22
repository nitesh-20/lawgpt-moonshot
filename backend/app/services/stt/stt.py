from typing import Any

from loguru import logger


class STTService:
    """
    Handles translation of speech audio streams/files to text transcripts.
    """

    def __init__(self) -> None:
        pass

    async def transcribe_audio(
        self, audio_data: bytes, file_format: str = "wav"
    ) -> dict[str, Any]:
        """
        Skeleton method returning transcript values.
        """
        logger.info("Transcribing audio payload...")
        return {"transcript": "", "language": "en", "confidence": 0.0}
