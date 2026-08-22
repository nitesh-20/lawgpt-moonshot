# pyrefly: ignore [missing-import]
import pytest
# pyrefly: ignore [missing-import]
from pydantic import ValidationError
from app.core.config import Settings

def test_settings_default_values():
    settings = Settings()
    assert settings.APP_NAME in ["LawGPT AI OS", "LawGPT AI OS Backend"]
    assert settings.DEBUG is True
    assert settings.PORT in [8000, 8001, 8002]

def test_invalid_port_validation():
    with pytest.raises(ValidationError):
        Settings(PORT=70000)

    with pytest.raises(ValidationError):
        Settings(PORT=-1)

def test_invalid_upload_size_validation():
    with pytest.raises(ValidationError):
        Settings(MAX_UPLOAD_SIZE=0)

    with pytest.raises(ValidationError):
        Settings(MAX_UPLOAD_SIZE=-500)

def test_production_environment_missing_keys():
    # Verify that in production/staging environment, critical keys raise validation errors
    with pytest.raises(ValidationError) as excinfo:
        Settings(ENVIRONMENT="production", SARVAM_API_KEY=None)
    assert "SARVAM_API_KEY" in str(excinfo.value)

    with pytest.raises(ValidationError) as excinfo:
        Settings(ENVIRONMENT="production", FIREBASE_PROJECT_ID=None)
    assert "FIREBASE_PROJECT_ID" in str(excinfo.value)
