import io
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.agents.voice_agent.recognizer import SpeechRecognizer
from app.agents.voice_agent.synthesizer import SpeechSynthesizer
from app.agents.voice_agent.detector import LanguageDetector
from app.agents.voice_agent.translation import TranslationService
from app.agents.voice_agent.session import VoiceSessionManager
from app.agents.voice_agent.processor import AudioProcessor
from app.agents.voice_agent.voice_agent import VoiceAgent

client = TestClient(app)

DUMMY_AUDIO = b"RIFF" + b"\x00" * 1000  # valid WAV block header


# -------------------------------------------------------------
# Component Tests
# -------------------------------------------------------------

def test_audio_processor():
    proc = AudioProcessor()
    # Check invalid
    assert proc.validate_audio(b"") is False
    assert proc.validate_audio(b"123") is False

    # Check WAV
    assert proc.validate_audio(DUMMY_AUDIO) is True
    meta = proc.extract_metadata(DUMMY_AUDIO)
    assert meta["format"] == "wav"
    assert meta["duration_sec"] > 0.0


def test_language_detector():
    det = LanguageDetector()
    # Hindi Devanagari text
    assert det.detect_language("नमस्ते, क्या हाल है?") == "hi-IN"
    
    # Marathi Devanagari text
    assert det.detect_language("नमस्कार, काय चालू आहे?") == "mr-IN"

    # Tamil text
    assert det.detect_language("வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?") == "ta-IN"

    # English text
    assert det.detect_language("Hello, how are you?") == "en-IN"


@pytest.mark.asyncio
async def test_speech_recognizer_mock():
    rec = SpeechRecognizer(api_key="your-sarvam-key")
    res = await rec.transcribe(DUMMY_AUDIO, language_code="hi-IN")
    assert "नमस्ते" in res["transcript"]
    assert res["language"] == "hi-IN"


@pytest.mark.asyncio
async def test_speech_synthesizer_mock():
    syn = SpeechSynthesizer(api_key="your-sarvam-key")
    res = await syn.synthesize("Hello", target_language_code="hi-IN")
    assert "audio" in res
    assert res["mocked"] is True


@pytest.mark.asyncio
async def test_translation_service_mock():
    trans = TranslationService(api_key="your-sarvam-key")
    # Indic to English
    res_en = await trans.translate("नमस्ते", source_language_code="hi-IN", target_language_code="en-IN")
    assert "explain" in res_en["translated_text"] or "help" in res_en["translated_text"]

    # English to Indic (Hindi)
    res_hi = await trans.translate("Hello", source_language_code="en-IN", target_language_code="hi-IN")
    assert "दस्तावेज" in res_hi["translated_text"]


@pytest.mark.asyncio
async def test_voice_session_manager():
    mgr = VoiceSessionManager()
    session_id = "test_sess_123"
    
    # Clean previous local file if any
    filepath = mgr.data_dir / f"{session_id}.json"
    if filepath.exists():
        filepath.unlink()

    sess = await mgr.get_or_create_session(session_id, "hi-IN")
    assert sess["session_id"] == session_id
    assert sess["status"] == "active"
    assert sess["language"] == "hi-IN"

    await mgr.add_history(session_id, "user", "Hello speech")
    await mgr.update_status(session_id, "completed")

    sess_updated = await mgr.get_or_create_session(session_id)
    assert sess_updated["status"] == "completed"
    assert len(sess_updated["history"]) == 1
    
    # Cleanup
    if filepath.exists():
        filepath.unlink()


# -------------------------------------------------------------
# REST API Tests
# -------------------------------------------------------------

def test_api_voice_status():
    response = client.get("/api/v1/voice/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "supported_languages" in data["data"]


def test_api_voice_synthesize():
    payload = {
        "text": "Hello client, this is compliance notice.",
        "language_code": "en-IN",
        "speaker": "shubh"
    }
    response = client.post("/api/v1/voice/synthesize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "audio" in data["data"]


def test_api_voice_transcribe():
    file_data = {"file": ("test.wav", io.BytesIO(DUMMY_AUDIO), "audio/wav")}
    response = client.post("/api/v1/voice/transcribe", files=file_data, data={"language_code": "hi-IN"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "transcript" in data["data"]


def test_api_voice_chat():
    file_data = {"file": ("test.wav", io.BytesIO(DUMMY_AUDIO), "audio/wav")}
    form_data = {
        "session_id": "api_chat_sess",
        "language_code": "hi-IN"
    }
    response = client.post("/api/v1/voice/chat", files=file_data, data=form_data)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "response_text" in data["data"]
    assert "response_audio" in data["data"]


def test_api_voice_session_history():
    response = client.get("/api/v1/voice/session/api_chat_sess")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "history" in data["data"]
    
    # Cleanup history file
    import os
    mgr = VoiceSessionManager()
    filepath = mgr.data_dir / "api_chat_sess.json"
    if filepath.exists():
        filepath.unlink()
