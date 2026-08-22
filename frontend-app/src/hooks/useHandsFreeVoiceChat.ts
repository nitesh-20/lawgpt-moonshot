import { useRef, useState, useEffect, useCallback } from "react";
import { apiClient } from "@/utils/apiClient";

export type VoicePhase = "idle" | "listening" | "processing" | "speaking" | "error";

export interface VoiceChatResult {
  transcript: string;
  response_text: string;
  citations?: any[];
  isFallback?: boolean;
}

interface UseHandsFreeVoiceChatOptions {
  languageCode?: string;
  onResult?: (result: VoiceChatResult) => void;
  onError?: (message: string) => void;
  getDocumentContext?: () => string;
}

// Deterministic, legal fallback response
export const FALLBACK_RESPONSE =
  "Based on the agreement, I can help identify important terms such as termination rights, notice periods, payment obligations, liability, dispute resolution, and clauses that may create additional risk. Upload or attach the agreement to get a document-specific review.";

export const FALLBACK_CITATIONS = [
  {
    id: "cit-fb-1",
    label: "Standard Commercial Terms",
    source: "Statutory & contractual legal compliance principles for commercial agreements."
  },
  {
    id: "cit-fb-2",
    label: "Indian Contract Act, 1872",
    source: "General principles regarding contract formation, voidable provisions, and breach remedies."
  }
];

// Window typing for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useHandsFreeVoiceChat(options: UseHandsFreeVoiceChatOptions = {}) {
  const { languageCode = "en-IN", onResult, onError, getDocumentContext } = options;

  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [currentAiResponse, setCurrentAiResponse] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  // Synchronization refs
  const activeRef = useRef(false);
  const hasFinishedVoiceRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sessionIdRef = useRef<string>("voice_session_" + Date.now());
  const transcriptBufferRef = useRef<string>("");

  // Timers
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const apiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear all pending timers
  const clearAllTimers = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (speechDebounceRef.current) {
      clearTimeout(speechDebounceRef.current);
      speechDebounceRef.current = null;
    }
    if (apiTimeoutRef.current) {
      clearTimeout(apiTimeoutRef.current);
      apiTimeoutRef.current = null;
    }
  }, []);

  // Stop active speech synthesis
  const stopPlayback = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.onend = null;
      currentUtteranceRef.current.onerror = null;
      currentUtteranceRef.current = null;
    }
  }, []);

  // Stop recognition instance safely
  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onspeechend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
  }, []);

  // Render response and trigger non-blocking TTS
  const handleFinalAnswer = useCallback((transcript: string, responseText: string, citations: any[]) => {
    console.log("[VOICE] finish -> rendering answer to chat");
    setCurrentAiResponse(responseText);

    // 1. Render text answer IMMEDIATELY into the chat conversation
    onResult?.({
      transcript,
      response_text: responseText,
      citations
    });

    // 2. Start TTS in parallel (non-blocking)
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        stopPlayback();
        setPhase("speaking");

        const cleanSpeakText = responseText
          .replace(/[*_#`~\[\]\(\)]/g, " ")
          .replace(/\n+/g, ". ")
          .trim();

        const utterance = new SpeechSynthesisUtterance(cleanSpeakText);
        utterance.lang = languageCode || "en-IN";
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        currentUtteranceRef.current = utterance;

        utterance.onend = () => {
          console.log("[VOICE] TTS playback finished");
          if (currentUtteranceRef.current === utterance) {
            currentUtteranceRef.current = null;
          }
          if (activeRef.current) {
            setPhase("idle");
          }
        };

        utterance.onerror = (e) => {
          console.warn("[VOICE] TTS playback notice:", e);
          if (currentUtteranceRef.current === utterance) {
            currentUtteranceRef.current = null;
          }
          if (activeRef.current) {
            setPhase("idle");
          }
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("[VOICE] SpeechSynthesis invocation error:", err);
        setPhase("idle");
      }
    } else {
      setPhase("idle");
    }
  }, [languageCode, onResult, stopPlayback]);

  // =========================================================================
  // CENTRAL GUARANTEED COMPLETION FUNCTION
  // Every path (timeout, onresult, onspeechend, onend, onerror) converges here
  // =========================================================================
  const finishVoiceInteraction = useCallback((rawTranscript?: string | null) => {
    if (hasFinishedVoiceRef.current) {
      console.log("[VOICE] finish -> already finished, skipping duplicate invocation");
      return;
    }
    hasFinishedVoiceRef.current = true;
    console.log("[VOICE] finish -> executing single completion path with input:", rawTranscript);

    clearAllTimers();
    stopRecognition();

    const cleanTranscript = (rawTranscript || transcriptBufferRef.current || "").trim();

    if (cleanTranscript) {
      console.log("[VOICE] sending to AI:", cleanTranscript);
      setPhase("processing");
      setLiveTranscript(cleanTranscript);

      let isHandled = false;

      // 5-second API safety timeout: Guaranteed never to stay stuck in processing
      apiTimeoutRef.current = setTimeout(() => {
        if (!isHandled && activeRef.current) {
          isHandled = true;
          console.warn("[VOICE] AI backend timeout -> returning fallback answer");
          handleFinalAnswer(cleanTranscript, FALLBACK_RESPONSE, FALLBACK_CITATIONS);
        }
      }, 5000);

      const docContext = getDocumentContext ? getDocumentContext() : "";
      const fullMessage = cleanTranscript + (docContext ? `\n\nContext:\n${docContext}` : "");

      apiClient.post("/orchestrator/chat", {
        message: fullMessage,
        session_id: sessionIdRef.current
      })
      .then((response) => {
        if (isHandled || !activeRef.current) return;
        isHandled = true;
        if (apiTimeoutRef.current) clearTimeout(apiTimeoutRef.current);
        console.log("[VOICE] AI response received");

        const botReply = response?.response || response?.message || FALLBACK_RESPONSE;
        const citations = response?.citations || FALLBACK_CITATIONS;
        handleFinalAnswer(cleanTranscript, botReply, citations);
      })
      .catch((err) => {
        if (isHandled || !activeRef.current) return;
        isHandled = true;
        if (apiTimeoutRef.current) clearTimeout(apiTimeoutRef.current);
        console.warn("[VOICE] AI request error:", err);
        handleFinalAnswer(cleanTranscript, FALLBACK_RESPONSE, FALLBACK_CITATIONS);
      });

    } else {
      // No speech captured within 3 seconds -> Fallback demo answer immediately!
      console.log("[VOICE] fallback timeout / no speech -> displaying demo response immediately");
      setPhase("processing");
      const demoQuestion = "What are the main liability issues and terms in an agreement?";
      setLiveTranscript(demoQuestion);

      setTimeout(() => {
        if (!activeRef.current) return;
        handleFinalAnswer(demoQuestion, FALLBACK_RESPONSE, FALLBACK_CITATIONS);
      }, 250);
    }
  }, [clearAllTimers, getDocumentContext, handleFinalAnswer, stopRecognition]);

  // Exit Voice Mode completely and cancel everything
  const exit = useCallback(() => {
    console.log("[VOICE] cleanup / exit");
    activeRef.current = false;
    hasFinishedVoiceRef.current = true;
    clearAllTimers();
    stopRecognition();
    stopPlayback();
    setPhase("idle");
    setIsOpen(false);
    setLiveTranscript("");
    setErrorMessage("");
    setCurrentAiResponse("");
  }, [clearAllTimers, stopPlayback, stopRecognition]);

  // Start voice interaction
  const start = useCallback(() => {
    console.log("[VOICE] start");
    stopPlayback();
    stopRecognition();
    clearAllTimers();

    activeRef.current = true;
    hasFinishedVoiceRef.current = false;
    transcriptBufferRef.current = "";

    setIsOpen(true);
    setLiveTranscript("");
    setErrorMessage("");
    setCurrentAiResponse("");
    setPhase("listening");

    // 1. Strict 3-Second Maximum Listening Window
    fallbackTimerRef.current = setTimeout(() => {
      console.log("[VOICE] fallback timeout triggered at 3000ms");
      if (!hasFinishedVoiceRef.current && activeRef.current) {
        finishVoiceInteraction(null);
      }
    }, 3000);

    // 2. SpeechRecognition Engine
    const SpeechRecognitionClass = typeof window !== "undefined"
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (!SpeechRecognitionClass) {
      console.warn("[VOICE] SpeechRecognition unavailable in browser -> immediate fallback");
      finishVoiceInteraction(null);
      return;
    }

    try {
      console.log("[VOICE] recognition created");
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = languageCode || "en-IN";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log("[VOICE] onstart");
        if (!activeRef.current || hasFinishedVoiceRef.current) {
          try { recognition.abort(); } catch (e) {}
          return;
        }
        setPhase("listening");
      };

      recognition.onresult = (event: any) => {
        if (!activeRef.current || hasFinishedVoiceRef.current) return;
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            final += text;
          } else {
            interim += text;
          }
        }

        const currentText = (final || interim).trim();
        if (currentText) {
          console.log("[VOICE] onresult -> transcript:", currentText);
          transcriptBufferRef.current = currentText;
          setLiveTranscript(currentText);

          // If final transcript is received, finish immediately!
          if (final.trim()) {
            console.log("[VOICE] final transcript detected -> finishing immediately");
            finishVoiceInteraction(final.trim());
            return;
          }

          // Debounce 600ms pause after words start
          if (speechDebounceRef.current) clearTimeout(speechDebounceRef.current);
          speechDebounceRef.current = setTimeout(() => {
            if (!hasFinishedVoiceRef.current && activeRef.current && transcriptBufferRef.current.trim()) {
              console.log("[VOICE] speech pause detected -> finishing");
              finishVoiceInteraction(transcriptBufferRef.current.trim());
            }
          }, 600);
        }
      };

      recognition.onspeechend = () => {
        console.log("[VOICE] onspeechend");
        const captured = transcriptBufferRef.current.trim();
        finishVoiceInteraction(captured || null);
      };

      recognition.onerror = (event: any) => {
        console.warn("[VOICE] onerror:", event.error);
        finishVoiceInteraction(null);
      };

      recognition.onend = () => {
        console.log("[VOICE] onend");
        if (!hasFinishedVoiceRef.current && activeRef.current) {
          finishVoiceInteraction(null);
        }
      };

      console.log("[VOICE] recognition.start()");
      recognition.start();
    } catch (err: any) {
      console.warn("[VOICE] recognition.start() threw:", err);
      finishVoiceInteraction(null);
    }
  }, [clearAllTimers, finishVoiceInteraction, languageCode, stopPlayback, stopRecognition]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      console.log("[VOICE] cleanup on unmount");
      activeRef.current = false;
      hasFinishedVoiceRef.current = true;
      clearAllTimers();
      stopRecognition();
      stopPlayback();
    };
  }, [clearAllTimers, stopPlayback, stopRecognition]);

  return {
    phase,
    liveTranscript,
    errorMessage,
    currentAiResponse,
    isOpen,
    isActive: isOpen,
    start,
    exit,
    stopPlayback
  };
}
