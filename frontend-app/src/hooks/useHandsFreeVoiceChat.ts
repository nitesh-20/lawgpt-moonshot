import { useRef, useState, useEffect, useCallback } from "react";
import { apiClient } from "@/utils/apiClient";

export type VoicePhase = "idle" | "listening" | "thinking" | "speaking" | "error";

export interface VoiceChatResult {
  transcript: string;
  response_text: string;
  citations?: any[];
}

interface UseHandsFreeVoiceChatOptions {
  languageCode?: string;
  enableTTS?: boolean;
  onResult?: (result: VoiceChatResult) => void;
  onError?: (message: string) => void;
  getDocumentContext?: () => string;
}

// Window typing for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useHandsFreeVoiceChat(options: UseHandsFreeVoiceChatOptions = {}) {
  const { languageCode = "en-IN", enableTTS = true, onResult, onError, getDocumentContext } = options;

  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [currentAiResponse, setCurrentAiResponse] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  // Synchronization refs
  const activeRef = useRef(false);
  const isProcessingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sessionIdRef = useRef<string>("voice_session_" + Date.now());
  const transcriptBufferRef = useRef<string>("");

  // Timers
  const listeningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Clear all active timers
  const clearAllTimers = useCallback(() => {
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
      listeningTimeoutRef.current = null;
    }
    if (silenceDebounceRef.current) {
      clearTimeout(silenceDebounceRef.current);
      silenceDebounceRef.current = null;
    }
  }, []);

  // Stop active speech synthesis cleanly
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

  // Exit Voice Mode completely
  const exit = useCallback(() => {
    activeRef.current = false;
    isProcessingRef.current = false;
    clearAllTimers();
    stopRecognition();
    stopPlayback();
    setPhase("idle");
    setIsOpen(false);
    setLiveTranscript("");
    setErrorMessage("");
    setCurrentAiResponse("");
  }, [clearAllTimers, stopPlayback, stopRecognition]);

  // Execute REAL backend AI request
  const submitRealTranscript = useCallback(async (transcriptText: string) => {
    const trimmed = transcriptText.trim();
    if (!trimmed) {
      setPhase("error");
      setErrorMessage("Didn't catch that. Please try again.");
      return;
    }

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    clearAllTimers();
    stopRecognition();

    setPhase("thinking");
    setLiveTranscript(trimmed);

    try {
      const docContext = getDocumentContext ? getDocumentContext() : "";
      const fullMessage = trimmed + (docContext ? `\n\nContext:\n${docContext}` : "");

      const response = await apiClient.post("/orchestrator/chat", {
        message: fullMessage,
        session_id: sessionIdRef.current
      });

      if (!activeRef.current) {
        isProcessingRef.current = false;
        return;
      }

      if (response && response.status === "success") {
        const botReply = response.response || response.message || "I have analyzed your request.";
        const citations = response.citations || [];

        setCurrentAiResponse(botReply);

        // 1. Immediately render into conversation history
        onResult?.({
          transcript: trimmed,
          response_text: botReply,
          citations
        });

        // 2. Play TTS if enabled
        if (enableTTS && typeof window !== "undefined" && "speechSynthesis" in window) {
          try {
            stopPlayback();
            setPhase("speaking");

            const cleanSpeakText = botReply
              .replace(/[*_#`~\[\]\(\)]/g, " ")
              .replace(/\n+/g, ". ")
              .trim();

            const utterance = new SpeechSynthesisUtterance(cleanSpeakText);
            utterance.lang = languageCode || "en-IN";
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            currentUtteranceRef.current = utterance;

            utterance.onend = () => {
              if (currentUtteranceRef.current === utterance) {
                currentUtteranceRef.current = null;
              }
              isProcessingRef.current = false;
              if (activeRef.current) {
                setPhase("idle");
              }
            };

            utterance.onerror = () => {
              if (currentUtteranceRef.current === utterance) {
                currentUtteranceRef.current = null;
              }
              isProcessingRef.current = false;
              if (activeRef.current) {
                setPhase("idle");
              }
            };

            window.speechSynthesis.speak(utterance);
          } catch (ttsErr) {
            console.warn("TTS playback notice:", ttsErr);
            isProcessingRef.current = false;
            setPhase("idle");
          }
        } else {
          isProcessingRef.current = false;
          setPhase("idle");
        }
      } else {
        throw new Error(response?.message || "AI backend returned error status");
      }
    } catch (err: any) {
      console.error("Voice AI execution error:", err);
      isProcessingRef.current = false;
      if (activeRef.current) {
        setPhase("error");
        const msg = err?.message || "Sorry, I couldn't get an answer right now. Please try again.";
        setErrorMessage(msg);
        onError?.(msg);
      }
    }
  }, [clearAllTimers, enableTTS, getDocumentContext, languageCode, onError, onResult, stopPlayback, stopRecognition]);

  // Start voice listening session
  const start = useCallback(() => {
    stopPlayback();
    stopRecognition();
    clearAllTimers();

    activeRef.current = true;
    isProcessingRef.current = false;
    transcriptBufferRef.current = "";

    setIsOpen(true);
    setLiveTranscript("");
    setErrorMessage("");
    setCurrentAiResponse("");
    setPhase("listening");

    // 1. Strict 12-second timeout: If no speech occurs, cancel without fake answer
    listeningTimeoutRef.current = setTimeout(() => {
      if (activeRef.current && !isProcessingRef.current) {
        stopRecognition();
        if (!transcriptBufferRef.current.trim()) {
          setPhase("error");
          setErrorMessage("Didn't catch that. Please try again.");
        } else {
          submitRealTranscript(transcriptBufferRef.current.trim());
        }
      }
    }, 12000);

    // 2. SpeechRecognition Engine
    const SpeechRecognitionClass = typeof window !== "undefined"
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (!SpeechRecognitionClass) {
      setPhase("error");
      setErrorMessage("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = languageCode || "en-IN";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (!activeRef.current || isProcessingRef.current) {
          try { recognition.abort(); } catch (e) {}
          return;
        }
        setPhase("listening");
      };

      recognition.onresult = (event: any) => {
        if (!activeRef.current || isProcessingRef.current) return;
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
          transcriptBufferRef.current = currentText;
          setLiveTranscript(currentText);

          // If final transcript is received, submit real question immediately
          if (final.trim()) {
            submitRealTranscript(final.trim());
            return;
          }

          // Debounce 900ms pause after words are spoken
          if (silenceDebounceRef.current) clearTimeout(silenceDebounceRef.current);
          silenceDebounceRef.current = setTimeout(() => {
            if (activeRef.current && !isProcessingRef.current && transcriptBufferRef.current.trim()) {
              submitRealTranscript(transcriptBufferRef.current.trim());
            }
          }, 900);
        }
      };

      recognition.onspeechend = () => {
        if (silenceDebounceRef.current) clearTimeout(silenceDebounceRef.current);
        const captured = transcriptBufferRef.current.trim();
        if (captured && !isProcessingRef.current) {
          submitRealTranscript(captured);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event.error);
        if (event.error === "not-allowed") {
          setPhase("error");
          setErrorMessage("Microphone permission was denied. Please allow microphone access in your browser.");
        } else if (event.error === "no-speech") {
          if (!transcriptBufferRef.current.trim()) {
            setPhase("error");
            setErrorMessage("Didn't catch that. Please try again.");
          }
        } else if (event.error !== "aborted") {
          if (!transcriptBufferRef.current.trim()) {
            setPhase("error");
            setErrorMessage("Speech capture error. Tap Try Again to speak.");
          }
        }
      };

      recognition.onend = () => {
        if (activeRef.current && !isProcessingRef.current) {
          const captured = transcriptBufferRef.current.trim();
          if (captured) {
            submitRealTranscript(captured);
          } else {
            setPhase("error");
            setErrorMessage("Didn't catch that. Please try again.");
          }
        }
      };

      recognition.start();
    } catch (err: any) {
      console.warn("Speech recognition initialization error:", err);
      setPhase("error");
      setErrorMessage("Could not initialize microphone. Please check permissions.");
    }
  }, [clearAllTimers, languageCode, stopPlayback, stopRecognition, submitRealTranscript]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      isProcessingRef.current = false;
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
