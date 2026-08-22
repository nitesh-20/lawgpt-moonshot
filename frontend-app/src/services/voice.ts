import { apiClient } from "@/utils/apiClient";

export interface VoiceStatus {
  health: any;
  supported_languages: string[];
  tts_engine: string;
  stt_engine: string;
}

export interface VoiceSession {
  session_id: string;
  turns: any[];
}

export async function getVoiceStatus(): Promise<VoiceStatus> {
  const res = await apiClient.get("/voice/status");
  if (res && res.status === "success" && res.data) {
    return res.data;
  }
  throw new Error("Failed to fetch voice engine status");
}

export async function transcribeAudio(file: File, languageCode: string = "en-IN"): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("language_code", languageCode);
  const res = await apiClient.postMultipart("/voice/transcribe", formData);
  if (res && res.status === "success" && res.data) {
    return res.data.transcript || "";
  }
  throw new Error("Failed to transcribe audio");
}

export async function synthesizeText(text: string, languageCode: string = "en-IN", speaker: string = "shubh"): Promise<string> {
  const res = await apiClient.post("/voice/synthesize", {
    text,
    language_code: languageCode,
    speaker
  });
  if (res && res.status === "success" && res.data) {
    return res.data.audio_base64 || res.data.audio || "";
  }
  throw new Error("Failed to synthesize text");
}

export async function translateText(text: string, targetLanguageCode: string): Promise<string> {
  const res = await apiClient.post("/voice/translate", {
    text,
    language_code: targetLanguageCode,
    speaker: "shubh"
  });
  if (res && res.status === "success") {
    return res.data?.translated_text || res.translated_text || "";
  }
  throw new Error("Failed to translate text");
}

export interface VoiceChatResult {
  transcript: string;
  detected_language: string;
  response_text: string;
  response_audio: string;
  citations: any[];
  context: any[];
  metrics: Record<string, any>;
}

/**
 * Full voice-conversation turn: uploads recorded audio, transcribes it (Sarvam Saaras v3,
 * with local fallback), routes the query through the orchestrator, translates back to the
 * spoken language if needed, and returns synthesized speech (Sarvam Bulbul v3) for playback.
 */
export async function voiceChat(
  audioBlob: Blob,
  sessionId: string = "default_voice_session",
  languageCode?: string
): Promise<VoiceChatResult> {
  const formData = new FormData();
  formData.append("file", audioBlob, "voice-query.webm");
  formData.append("session_id", sessionId);
  if (languageCode) {
    formData.append("language_code", languageCode);
  }
  const res = await apiClient.postMultipart("/voice/chat", formData);
  if (res && res.status === "success" && res.data) {
    return res.data as VoiceChatResult;
  }
  throw new Error("Failed to complete voice chat turn");
}

export async function getVoiceSessionHistory(sessionId: string): Promise<VoiceSession> {
  const res = await apiClient.get(`/voice/session/${sessionId}`);
  if (res && res.status === "success" && res.data) {
    return res.data;
  }
  throw new Error("Failed to fetch voice session history");
}
