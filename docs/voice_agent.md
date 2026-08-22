# Sarvam Voice Agent Documentation

The **Voice Agent** provides a multilingual, out-of-the-box voice interface for the LawGPT AI OS. Powered by **Sarvam AI**, it supports audio transcription, language translation, context orchestration, and voice synthesis, enabling users to interact with LawGPT using spoken queries in 10 different Indian languages and English.

---

## 1. Architecture

The Voice Agent is structured as a collection of sub-components under `backend/app/agents/voice_agent/`:

```
          [User Spoken Audio]
                   │
                   ▼
          [SpeechRecognizer]  ──(Saaras v3 STT)──> [Native Text]
                   │                                     │
                   │                                     ▼
                   │                             [LanguageDetector] 
                   │                                     │
                   ▼                                     ▼
           [TranslationService] ◄──(Sarvam Translate)────┘
                   │
            (English Text)
                   │
                   ▼
          [OrchestratorAgent] ──(Routes requests to specific Agents)
                   │
           (English Response)
                   │
                   ▼
           [TranslationService] ──(Translates to user's native language)
                   │
                   ▼
          [SpeechSynthesizer] ──(Bulbul v3 TTS)──> [Base64 Audio Response]
```

---

## 2. Multilingual Voice Flow

For Indic language queries, the voice agent executes a double translation cycle to reuse the English reasoning capability of LawGPT:

1. **Speech-to-Text**: User uploads raw speech. `SpeechRecognizer` utilizes Sarvam's Saaras v3 model to transcribe the speech into native text.
2. **Language Detection**: `LanguageDetector` checks character block mapping to instantly discover which Indic script is in use, bypassing network lag.
3. **Preamble Translation**: `TranslationService` translates the native text query into standard English.
4. **Orchestrator Run**: The English query is processed by the central `OrchestratorAgent` (fetching RAG chunks, compliance regulations, legal citations, and drafting files).
5. **Response Translation**: The generated English response is translated back into the user's native language.
6. **Voice Synthesis**: The native response is sent to the `SpeechSynthesizer` (Bulbul v3 model) to produce base64-encoded spoken audio.

---

## 3. Session Lifecycle & Concurrent Manager

Voice conversations are managed by the `VoiceSessionManager` (`session.py`):
- **Recovery**: Active sessions are cached in-memory and synced to Firestore (with local JSON fallback). If a connection drops, the session state is recovered using its `session_id`.
- **Interrupts**: The manager keeps track of timestamps to detect mid-conversation interruptions, supporting context pausing and continuation.
- **Context Preservation**: Text transcripts and audio keys are appended to the session history log at each turn.

---

## 4. API Endpoints Reference

All endpoints are hosted under `/api/v1/voice/`:

### `POST /api/v1/voice/chat`
Submit voice audio for end-to-end processing.
- **Form Data**:
  - `file`: Audio file (`.wav` or `.mp3`)
  - `session_id`: Unique identifier (default: `"default_voice_session"`)
  - `language_code`: Explicit language override (optional)
- **Response**:
  - `transcript`: Decoded text.
  - `detected_language`: E.g. `"hi-IN"`.
  - `response_text`: Translated result text.
  - `response_audio`: Base64 audio string.
  - `metrics`: STT, translation, LLM, and TTS latency values.

### `POST /api/v1/voice/transcribe`
Convert voice audio into text.
- **Form Data**:
  - `file`: Audio file
  - `language_code`: Source language code
- **Response**: `{"transcript": "...", "detected_language": "...", "confidence": 0.95}`

### `POST /api/v1/voice/synthesize`
Convert text statement into base64 speech.
- **JSON Payload**: `{"text": "...", "language_code": "hi-IN", "speaker": "shubh"}`
- **Response**: `{"audio": "<base64_string>", "language": "hi-IN"}`

### `GET /api/v1/voice/session/{session_id}`
Retrieve a voice session's logs, active status, and history.

### `GET /api/v1/voice/status`
Retrieves engine diagnostics, list of supported languages, and operational health.

---

## 5. Extension Guide: Adding New Languages

To add support for a new language (e.g. Sanskrit `sa-IN` or Odia `or-IN`):
1. **API Support**: Verify that Sarvam AI supports the target language in their Saaras and Bulbul models.
2. **Local Detection**: Open `detector.py` and register the language code along with its regex pattern mapping for Unicode blocks:
   ```python
   "or-IN": re.compile(r"[\u0B00-\u0B7F]")  # Odia Unicode Block
   ```
3. **Register Code**: Add the new language code in `voice.py`'s `/status` endpoint listing under `supported_languages`.
4. **Mock Fallback**: Add mock translations in `translation.py` and `recognizer.py` inside the fallback mappings to support tests.
