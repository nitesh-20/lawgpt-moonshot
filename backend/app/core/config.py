import os
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Absolute path to the backend project root (backend),
    # used instead of hardcoded developer-machine paths for data/temp storage.
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent

    # General Settings
    APP_NAME: str = Field(default="LawGPT AI OS")
    APP_VERSION: str = Field(default="0.1.0")
    DEBUG: bool = Field(default=True)
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8000)
    ENVIRONMENT: Literal["development", "testing", "staging", "production"] = Field(
        default="development"
    )

    # Storage Settings
    MAX_UPLOAD_SIZE: int = Field(default=10485760)  # 10MB default
    UPLOAD_FOLDER: str = Field(default="uploads")

    # Logging Settings
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="DEBUG"
    )

    # Firebase Settings
    FIREBASE_PROJECT_ID: str | None = Field(default=None)
    GOOGLE_APPLICATION_CREDENTIALS: str | None = Field(default=None)

    # Sarvam AI API Settings
    SARVAM_ENABLED: bool = Field(default=True)
    SARVAM_API_KEY: str | None = Field(default=None)
    SARVAM_BASE_URL: str = Field(default="https://api.sarvam.ai")
    SARVAM_TIMEOUT: float = Field(default=30.0)

    # Gemini API Settings
    GEMINI_API_KEY: str | None = Field(default=None)

    # GCS Settings
    GCS_BUCKET: str | None = Field(default=None)

    @field_validator("PORT")
    @classmethod
    def validate_port(cls, v: int) -> int:
        if not (1 <= v <= 65535):
            raise ValueError("Port must be between 1 and 65535")
        return v

    @field_validator("MAX_UPLOAD_SIZE")
    @classmethod
    def validate_max_upload_size(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Max upload size must be a positive integer")
        return v

    @field_validator("SARVAM_API_KEY")
    @classmethod
    def validate_sarvam_key(cls, v: str | None, info) -> str | None:
        # If environment is staging or production, we require SARVAM_API_KEY
        values = info.data
        env = values.get("ENVIRONMENT", "development")
        if env in ["staging", "production"] and not v:
            raise ValueError(f"SARVAM_API_KEY is required in {env} environment")
        return v

    @field_validator("FIREBASE_PROJECT_ID")
    @classmethod
    def validate_firebase_id(cls, v: str | None, info) -> str | None:
        values = info.data
        env = values.get("ENVIRONMENT", "development")
        if env in ["staging", "production"] and not v:
            raise ValueError(f"FIREBASE_PROJECT_ID is required in {env} environment")
        return v

    @field_validator("GOOGLE_APPLICATION_CREDENTIALS")
    @classmethod
    def validate_google_credentials(cls, v: str | None) -> str | None:
        # Ignore common placeholders
        if v in ["path/to/firebase-service-account.json", "firebase-service-account.json"]:
            v = None
        
        # If no explicit valid path was provided, use fallback logic
        if not v:
            # Safely build path to serviceAccountKey.json at the backend root level
            base_dir = Path(__file__).parent.parent.parent
            fallback_path = base_dir / "serviceAccountKey.json"
            if fallback_path.exists():
                return str(fallback_path)
        return v


settings = Settings()
