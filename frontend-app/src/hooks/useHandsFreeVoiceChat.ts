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
  const { languageCode = "en-IN", onResult, onError, getDocumentContext } = options;

  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [currentAiResponse, setCurrentAiResponse] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  const activeRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sessionIdRef = useRef<string>("voice_session_" + Date.now());
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptBufferRef = useRef<string>("");

  // Stop active speech synthesis
  const stopPlayback = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.onend = null;
      currentUtteranceRef.current.onerror = null;
      currentUtteranceRef.current = null;
    }
  }, []);

  // Stop recognition instance
  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore abort errors
      }
      recognitionRef.current = null;
    }
  }, []);

  // Exit Voice Mode completely
  const exit = useCallback(() => {
    activeRef.current = false;
    isSubmittingRef.current = false;
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    stopRecognition();
    stopPlayback();
    setPhase("idle");
    setIsOpen(false);
    setLiveTranscript("");
    setErrorMessage("");
    setCurrentAiResponse("");
  }, [stopRecognition, stopPlayback]);

  // Execute AI chat query and then TTS
  const submitQuery = useCallback(async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) {
      setErrorMessage("No speech detected. Tap Speak to try again.");
      setPhase("idle");
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setPhase("thinking");
    setLiveTranscript(trimmed);

    // Timeout safety
    if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
    fallbackTimeoutRef.current = setTimeout(() => {
      if (activeRef.current && isSubmittingRef.current) {
        isSubmittingRef.current = false;
        setPhase("idle");
        setErrorMessage("Request took too long. Please try asking again.");
      }
    }, 25000);

    try {
      const docContext = getDocumentContext ? getDocumentContext() : "";
      const fullMessage = trimmed + (docContext ? `\n\nContext:\n${docContext}` : "");

      const response = await apiClient.post("/orchestrator/chat", {
        message: fullMessage,
        session_id: sessionIdRef.current
      });

      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }

      if (!activeRef.current) {
        isSubmittingRef.current = false;
        return;
      }

      const botReply = response?.response || response?.message || "I have processed your legal query.";
      const citations = response?.citations || [];

      // Add to chat messages
      onResult?.({
        transcript: trimmed,
        response_text: botReply,
        citations
      });

      setCurrentAiResponse(botReply);

      // TTS: Speak AI response aloud
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
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
          isSubmittingRef.current = false;
          if (activeRef.current) {
            setPhase("idle");
          }
        };

        utterance.onerror = (e) => {
          console.warn("Speech synthesis notice:", e);
          if (currentUtteranceRef.current === utterance) {
            currentUtteranceRef.current = null;
          }
          isSubmittingRef.current = false;
          if (activeRef.current) {
            setPhase("idle");
          }
        };

        window.speechSynthesis.speak(utterance);
      } else {
        isSubmittingRef.current = false;
        setPhase("idle");
      }
    } catch (err: any) {
      console.error("Voice chat error:", err);
      isSubmittingRef.current = false;
      if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);

      if (activeRef.current) {
        setPhase("error");
        const msg = err?.message || "Failed to get AI answer. Please try again.";
        setErrorMessage(msg);
        onError?.(msg);
      }
    }
  }, [getDocumentContext, languageCode, onResult, onError, stopPlayback]);

  // Start listening session
  const start = useCallback(async () => {
    stopPlayback();
    stopRecognition();

    setIsOpen(true);
    activeRef.current = true;
    isSubmittingRef.current = false;
    transcriptBufferRef.current = "";
    setLiveTranscript("");
    setErrorMessage("");
    setCurrentAiResponse("");
    setPhase("listening");

    // Request microphone permission if needed
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release media stream tracks since SpeechRecognition manages its own stream
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (permErr) {
      console.warn("Mic permission check notice:", permErr);
    }

    const SpeechRecognitionClass = typeof window !== "undefined" 
      ? (window.SpeechRecognition || window.webkitSpeechRecognition) 
      : null;

    if (!SpeechRecognitionClass) {
      setPhase("error");
      setErrorMessage("Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or Safari.");
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
        if (!activeRef.current) {
          try { recognition.abort(); } catch(e){}
          return;
        }
        setPhase("listening");
        setErrorMessage("");
      };

      recognition.onresult = (event: any) => {
        if (!activeRef.current) return;
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

        const currentText = final || interim;
        transcriptBufferRef.current = currentText;
        setLiveTranscript(currentText);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition event notice:", event.error);
        if (event.error === "no-speech") {
          // If no speech detected in this round, keep modal open
          setErrorMessage("No speech detected. Tap 'Speak Again' when ready.");
          setPhase("idle");
        } else if (event.error === "not-allowed") {
          setPhase("error");
          setErrorMessage("Microphone access is blocked. Please allow microphone permissions in your browser URL bar.");
        } else if (event.error !== "aborted") {
          setPhase("error");
          setErrorMessage("Microphone encountered an issue. Tap 'Speak Again' to retry.");
        }
      };

      recognition.onend = () => {
        const capturedText = transcriptBufferRef.current.trim();
        if (capturedText && activeRef.current && !isSubmittingRef.current) {
          submitQuery(capturedText);
        } else if (activeRef.current && !isSubmittingRef.current && phase === "listening") {
          setPhase("idle");
        }
      };

      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setPhase("error");
      setErrorMessage("Could not initialize microphone. Please check permissions.");
    }
  }, [languageCode, stopPlayback, stopRecognition, submitQuery, phase]);

  // Stop listening manually and submit whatever was spoken
  const stopListeningNow = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    const captured = transcriptBufferRef.current.trim() || liveTranscript.trim();
    if (captured && !isSubmittingRef.current) {
      submitQuery(captured);
    } else {
      setPhase("idle");
    }
  }, [liveTranscript, submitQuery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      stopRecognition();
      stopPlayback();
      if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
    };
  }, [stopRecognition, stopPlayback]);

  return {
    phase,
    liveTranscript,
    errorMessage,
    currentAiResponse,
    isOpen,
    isActive: isOpen,
    start,
    exit,
    stopListeningNow,
    stopPlayback,
    submitQuery
  };
}
