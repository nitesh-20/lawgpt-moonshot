import asyncio
import base64
import io
import re
import time
import wave
from pathlib import Path
from typing import Any, Dict
import httpx
from loguru import logger

from app.agents.base import BaseAgent

# Sub-components imports
from app.agents.voice_agent.recognizer import SpeechRecognizer
from app.agents.voice_agent.synthesizer import SpeechSynthesizer
from app.agents.voice_agent.detector import LanguageDetector
from app.agents.voice_agent.translation import TranslationService
from app.agents.voice_agent.session import VoiceSessionManager
from app.agents.voice_agent.processor import AudioProcessor

from app.services.demo_answers import get_neet_demo_answer
from app.services.sarvam.speech import SpeechToTextManager
from app.services.sarvam.tts import TextToSpeechManager
from app.services.sarvam.translate import TranslationManager
from app.services.sarvam.config import SarvamConfig
from app.core.config import settings
class VoiceAgent(BaseAgent):
    """
    Voice Agent coordinates Speech-to-Text transcription, language translation,
    agent orchestration, and Text-to-Speech synthesis for legal voice actions.
    """
    def __init__(self) -> None:
        self._initialized = False
        self.recognizer = SpeechRecognizer()
        self.synthesizer = SpeechSynthesizer()
        self.detector = LanguageDetector()
        self.translation_service = TranslationService()
        self.session_manager = VoiceSessionManager()
        self.processor = AudioProcessor()
        
        self.history_file = settings.BASE_DIR / "data" / "voice_history.json"
        self.collection_name = "voice_history"

    @property
    def metadata(self) -> dict[str, Any]:
        return {
            "id": "voice_agent",
            "name": "Sarvam Voice Agent",
            "description": "Enables multilingual voice interaction with LawGPT AI OS via Sarvam AI.",
            "supported_intents": ["voice_query", "voice_chat"],
            "priority": 3,
            "health": "healthy" if self._initialized else "uninitialized",
            "version": "1.1.0",
            "capabilities": [
                "Multilingual Speech-to-Text (Saaras v3)",
                "Natural Text-to-Speech (Bulbul v3)",
                "Indic Language Translation (Sarvam Translate)",
                "Fast local Unicode language detection",
                "Concurrent voice session recovery",
                "Observability latency logging"
            ]
        }

    async def initialize(self) -> None:
        logger.info("Initializing Sarvam Voice Agent...")
        self._initialized = True
        logger.info("Sarvam Voice Agent initialized successfully.")

    async def execute(self, task_input: dict[str, Any]) -> dict[str, Any]:
        """
        Coordinates the complete voice query processing flow.
        Supported actions:
        - 'chat': End-to-end voice query pipeline
        - 'transcribe': Raw audio transcription
        - 'synthesize': Raw text to voice synthesis
        """
        if not self._initialized:
            raise RuntimeError("Voice Agent is not initialized.")

        action = task_input.get("action", "chat").lower()
        logger.info(f"Voice Agent executing action '{action}'")

        try:
            if action == "transcribe":
                return await self._handle_transcribe(task_input)
            elif action == "synthesize":
                return await self._handle_synthesize(task_input)
            elif action == "chat":
                return await self._handle_chat(task_input)
            else:
                return {
                    "status": "error",
                    "message": f"Unsupported voice action: '{action}'",
                    "agent": "VoiceAgent",
                    "data": {}
                }
        except Exception as e:
            logger.exception(f"Voice Agent failed during action '{action}'")
            return {
                "status": "error",
                "message": f"Voice action failed: {e}",
                "agent": "VoiceAgent",
                "data": {}
            }

    async def _handle_transcribe(self, task_input: dict[str, Any]) -> dict[str, Any]:
        audio_bytes = task_input.get("audio_bytes", b"")
        filename = task_input.get("filename", "audio.wav")
        lang = task_input.get("language_code", "en-IN")

        if not self.processor.validate_audio(audio_bytes):
            raise ValueError("Invalid or empty audio payload.")

        # Speech to text
        res = await self.recognizer.transcribe(audio_bytes, filename, lang)
        detected_lang = self.detector.detect_language(res["transcript"])
        
        return {
            "transcript": res["transcript"],
            "detected_language": detected_lang,
            "confidence": res["confidence"]
        }

    async def _handle_synthesize(self, task_input: dict[str, Any]) -> dict[str, Any]:
        text = task_input.get("text", "")
        lang = task_input.get("language_code", "en-IN")
        speaker = task_input.get("speaker", "shubh")

        if not text:
            raise ValueError("No text provided for synthesis.")

        res = await self.synthesizer.synthesize(text, lang, speaker)
        return {
            "audio": res["audio"],
            "language": lang
        }

    async def _handle_chat(self, task_input: dict[str, Any]) -> dict[str, Any]:
        audio_bytes = task_input.get("audio_bytes", b"")
        session_id = task_input.get("session_id", "default_voice_session")
        language_code = task_input.get("language_code")
        orchestrator = task_input.get("orchestrator")

        if not audio_bytes:
            raise ValueError("No audio payload was provided for voice chat.")

        filename = task_input.get("filename", "audio.wav")

        # 1. Audio check
        audio_meta = self.processor.extract_metadata(audio_bytes)
        
        # 2. Speech recognition (STT)
        stt_start = time.time()
        
        # Try Sarvam STT first if enabled
        stt_res = None
        if SarvamConfig.is_enabled():
            stt_res = await SpeechToTextManager.transcribe(audio_bytes, filename=filename, language_code=language_code or "hi-IN")
            if stt_res.get("status") == "error":
                stt_res = None
                
        # Fallback to existing logic
        if not stt_res:
            stt_res = await self.recognizer.transcribe(
                audio_bytes=audio_bytes,
                filename=filename,
                language_code=language_code or "en-IN"
            )
            
        stt_latency = round(time.time() - stt_start, 3)

        transcript = stt_res["transcript"]
        
        # 3. Language detection
        detected_lang = language_code or self.detector.detect_language(transcript)

        # 4. Translation to English if needed
        translate_in_latency = 0.0
        query_text_en = transcript
        if not detected_lang.startswith("en"):
            trans_start = time.time()
            trans_res = None
            
            if SarvamConfig.is_enabled():
                trans_res = await TranslationManager.translate(transcript, detected_lang, "en-IN")
                if trans_res.get("status") == "error":
                    trans_res = None
                    
            if not trans_res:
                trans_res = await self.translation_service.translate(
                    text=transcript,
                    source_language_code=detected_lang,
                    target_language_code="en-IN"
                )
                
            query_text_en = trans_res.get("translated_text", transcript)
            translate_in_latency = round(time.time() - trans_start, 3)

        # Update Session history (User message)
        await self.session_manager.get_or_create_session(session_id, detected_lang)
        await self.session_manager.add_history(session_id, "user", transcript)

        # 5. Direct Gemini answer, spoken in a warm human voice.
        # The full multi-agent orchestrator (embedding search + iterative reasoning) takes
        # 20-30s per turn, which kills the hands-free feel — so voice bypasses it and asks
        # Gemini directly in a single call for both content and persona/tone.
        citations = []
        context = []
        llm_start = time.time()
        response_text_en = await self._answer_as_vaani(query_text_en)
        llm_latency = round(time.time() - llm_start, 3)

        # 6. Translate response back to user's native language if needed
        translate_out_latency = 0.0
        response_text_native = response_text_en
        if not detected_lang.startswith("en"):
            trans_start = time.time()
            trans_res = None
            
            if SarvamConfig.is_enabled():
                trans_res = await TranslationManager.translate(response_text_en, "en-IN", detected_lang)
                if trans_res.get("status") == "error":
                    trans_res = None
                    
            if not trans_res:
                trans_res = await self.translation_service.translate(
                    text=response_text_en,
                    source_language_code="en-IN",
                    target_language_code=detected_lang
                )
                
            response_text_native = trans_res.get("translated_text", response_text_en)
            translate_out_latency = round(time.time() - trans_start, 3)

        # 7. Text to Speech Synthesis (TTS)
        # Sarvam's TTS endpoints reject long inputs (~500 chars per call), and the
        # citations block appended by the orchestrator is meant to be read on screen,
        # not read aloud. Rather than truncating a long, in-depth answer mid-sentence,
        # split it into TTS-safe chunks and synthesize them all in parallel, then stitch
        # the resulting clips into one WAV — full answers, without the latency hit of
        # doing it sequentially.
        speech_chunks = self._split_for_tts(response_text_native)

        async def _synthesize_chunk(chunk_text: str) -> str:
            if SarvamConfig.is_enabled():
                tts_res = await TextToSpeechManager.synthesize(chunk_text, speaker="priya", language_code=detected_lang)
                if tts_res.get("status") == "success" and tts_res.get("audio_base64"):
                    return tts_res["audio_base64"]

            tts_res = await self.synthesizer.synthesize(
                text=chunk_text,
                target_language_code=detected_lang
            )
            return tts_res.get("audio", "")

        tts_start = time.time()
        chunk_audios = await asyncio.gather(*(_synthesize_chunk(c) for c in speech_chunks))
        audio_b64 = self._concat_wav_base64(list(chunk_audios))
        tts_latency = round(time.time() - tts_start, 3)

        # Update Session history (Assistant message)
        await self.session_manager.add_history(session_id, "assistant", response_text_native, audio_b64)

        # Observability Metrics
        metrics = {
            "stt_latency_sec": stt_latency,
            "stt_confidence": stt_res.get("confidence", 1.0),
            "translation_input_latency_sec": translate_in_latency,
            "llm_latency_sec": llm_latency,
            "translation_output_latency_sec": translate_out_latency,
            "tts_latency_sec": tts_latency,
            "total_latency_sec": round(stt_latency + translate_in_latency + llm_latency + translate_out_latency + tts_latency, 3),
            "detected_language": detected_lang,
            "audio_duration_sec": audio_meta["duration_sec"]
        }

        result = {
            "transcript": transcript,
            "detected_language": detected_lang,
            "response_text": response_text_native,
            "response_audio": audio_b64,
            "citations": citations,
            "context": context,
            "metrics": metrics
        }

        return result

    async def _answer_as_vaani(self, user_query: str) -> str:
        """
        Single fast Gemini call that both answers the legal question and speaks it in a
        warm, human, senior-counsel voice. Bypasses the slow multi-round research
        pipeline entirely to keep the hands-free voice loop responsive.
        """
        # Shared with the text-chat orchestrator (app/services/demo_answers.py) so a
        # question gets the exact same reliable answer whether typed or spoken.
        demo_answer = get_neet_demo_answer(user_query)
        if demo_answer is not None:
            return demo_answer

        api_key = settings.GEMINI_API_KEY
        if not api_key:
            return "I'm having trouble reaching my legal knowledge base right now. Please try again in a moment."

        system_instruction = (
            "You are Vaani, a warm, courteous, extremely well-educated senior Indian legal "
            "counsel speaking aloud to a client over a voice call.\n"
            "- Sound like a real, thoughtful human professional. Never mention being an AI, "
            "a model, an assistant, or any internal system.\n"
            "- If the user only greets you or makes small talk, greet them back warmly in "
            "one or two sentences and invite them to share their legal question. Do not "
            "answer a legal question that wasn't asked.\n"
            "- If they ask a legal question, answer confidently using your general "
            "knowledge of Indian law (IPC/BNS, evidence law, education/exam law, IT Act, "
            "constitutional law, etc.). Name the specific acts and sections that are "
            "relevant and briefly explain how each one helps their situation. Never say "
            "you lack access to documents or a database — just answer as a knowledgeable "
            "senior counsel would.\n"
            "- Keep it natural for text-to-speech: plain spoken sentences, no markdown, no "
            "bullet points, no headings, no citation brackets like [1]. 4-8 sentences for "
            "a real legal question, 1-3 sentences for a greeting."
        )

        prompt = f"{system_instruction}\n\nUser said: {user_query}\n\nSpoken reply:"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.6,
                # Skip the model's internal "thinking" pass — it was adding 8-10s of
                # latency per turn for no benefit on a short conversational reply.
                "thinkingConfig": {"thinkingBudget": 0}
            }
        }

        # One retry on transient errors (Gemini occasionally returns a momentary 429/503) —
        # a single hiccup shouldn't fall back to the generic "trouble reaching" message.
        for attempt in range(2):
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, json=payload, timeout=20.0)
                    if resp.status_code == 200:
                        data = resp.json()
                        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        if text:
                            return text
                    elif resp.status_code in (429, 503) and attempt == 0:
                        logger.warning(f"Gemini direct-answer call got {resp.status_code}, retrying once...")
                        await asyncio.sleep(1.5)
                        continue
                    else:
                        logger.warning(f"Gemini direct-answer call failed: {resp.status_code} {resp.text}")
            except Exception as e:
                logger.error(f"Error generating direct voice answer via Gemini: {type(e).__name__}: {e}")
                if attempt == 0:
                    await asyncio.sleep(1.0)
                    continue
            break

        return "I'm having a little trouble reaching my legal knowledge base right now — could you please say that again?"

    @staticmethod
    def _split_for_tts(text: str, max_chars: int = 480) -> list[str]:
        """
        Strips the appended citations block, then splits the remaining answer into
        TTS-safe chunks on sentence boundaries (Sarvam rejects inputs over ~500 chars).
        Chunks are synthesized in parallel and stitched back together, so long, in-depth
        answers are still spoken in full instead of being cut off mid-sentence.
        """
        speech_text = text.split("\n\n### ⚖️ Citations", 1)[0].strip()
        if not speech_text:
            return ["I found some results — please check the citations on screen for details."]
        if len(speech_text) <= max_chars:
            return [speech_text]

        sentences = re.split(r"(?<=[.!?])\s+", speech_text)
        chunks: list[str] = []
        current = ""
        for sentence in sentences:
            if len(current) + len(sentence) + 1 <= max_chars:
                current = f"{current} {sentence}".strip()
            else:
                if current:
                    chunks.append(current)
                if len(sentence) > max_chars:
                    # A single sentence longer than the limit — hard-split it.
                    for i in range(0, len(sentence), max_chars):
                        chunks.append(sentence[i:i + max_chars])
                    current = ""
                else:
                    current = sentence
        if current:
            chunks.append(current)
        return chunks

    @staticmethod
    def _concat_wav_base64(audio_b64_clips: list[str]) -> str:
        """Decodes a list of base64 WAV clips (same format) and stitches them into one WAV."""
        clips = []
        for b64_clip in audio_b64_clips:
            if not b64_clip:
                continue
            try:
                raw = base64.b64decode(b64_clip)
                with wave.open(io.BytesIO(raw), "rb") as wf:
                    clips.append((wf.getparams(), wf.readframes(wf.getnframes())))
            except Exception as e:
                logger.warning(f"Skipping unreadable TTS audio chunk: {e}")

        if not clips:
            return ""

        base_params = clips[0][0]
        out_buffer = io.BytesIO()
        with wave.open(out_buffer, "wb") as out:
            out.setnchannels(base_params.nchannels)
            out.setsampwidth(base_params.sampwidth)
            out.setframerate(base_params.framerate)
            for params, frames in clips:
                if (params.nchannels, params.sampwidth, params.framerate) == \
                        (base_params.nchannels, base_params.sampwidth, base_params.framerate):
                    out.writeframes(frames)

        return base64.b64encode(out_buffer.getvalue()).decode("utf-8")

    async def shutdown(self) -> None:
        logger.info("Shutting down Sarvam Voice Agent...")
        self._initialized = False
        logger.info("Sarvam Voice Agent shut down.")

    async def health(self) -> dict[str, Any]:
        return {
            "status": "healthy" if self._initialized else "uninitialized",
            "agent": "VoiceAgent",
            "metadata": self.metadata
        }
