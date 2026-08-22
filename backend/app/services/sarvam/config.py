from app.core.config import settings
from loguru import logger

class SarvamConfig:
    _enabled: bool = settings.SARVAM_ENABLED
    _api_key: str | None = settings.SARVAM_API_KEY
    _base_url: str = settings.SARVAM_BASE_URL
    _timeout: float = settings.SARVAM_TIMEOUT

    @classmethod
    def is_enabled(cls) -> bool:
        """Returns True if Sarvam is enabled and has a valid API key configuration."""
        if not cls._enabled:
            return False
        
        # Do not allow fake/placeholder keys
        if not cls._api_key or cls._api_key.strip() == "" or "your-sarvam" in cls._api_key.lower():
            return False
            
        return True

    @classmethod
    def get_api_key(cls) -> str | None:
        return cls._api_key

    @classmethod
    def get_base_url(cls) -> str:
        return cls._base_url

    @classmethod
    def get_timeout(cls) -> float:
        return cls._timeout

    @classmethod
    def disable(cls, reason: str = "") -> None:
        """Gracefully disable Sarvam integration at runtime (e.g., quota exhausted)."""
        if cls._enabled:
            cls._enabled = False
            logger.warning(f"Sarvam AI integration has been gracefully disabled. Reason: {reason}")
