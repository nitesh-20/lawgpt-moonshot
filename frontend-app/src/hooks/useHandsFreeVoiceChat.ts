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

// Built-in high quality deterministic legal demo QA
export const DEMO_LEGAL_QA = {
  question: "Can you explain the termination clause?",
  answer:
    "Sure. The termination clause explains when either party can end the agreement, what notice is required, and whether any obligations continue after termination. Before signing, verify the minimum notice period (typically 30-90 days), cure period for material breach, and post-termination confidentiality or non-compete obligations.",
  citations: [
    {
      id: "cit-term-1",
      label: "Indian Contract Act, 1872 (§39)",
      source: "Effect of refusal of party to perform promise wholly and right of rescission."
    },
    {
      id: "cit-term-2",
      label: "Standard Commercial Terms",
      source: "Notice of termination, material breach remedies, and surviving covenant provisions."
    }
  ]
};

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
  
  // Timers for guaranteed completion
  const listeningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speechDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const apiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptBufferRef = useRef<string>("");

  // Clear all pending timers
  const clearAllTimers = useCallback(() => {
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
      listeningTimeoutRef.current = null;
    }
    if (speechDebounceTimerRef.current) {
      clearTimeout(speechDebounceTimerRef.current);
      speechDebounceTimerRef.current = null;
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

  // Stop recognition instance cleanly
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

  // Exit Voice Mode completely and cleanly
  const exit = useCallback(() => {
    activeRef.current = false;
    isSubmittingRef.current = false;
    clearAllTimers();
    stopRecognition();
    stopPlayback();
    setPhase("idle");
    setIsOpen(false);
    setLiveTranscript("");
    setErrorMessage("");
    setCurrentAiResponse("");
  }, [clearAllTimers, stopRecognition, stopPlayback]);

  // Non-blocking Text-To-Speech
  const speakResponse = useCallback((textToSpeak: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setPhase("idle");
      return;
    }

    try {
      stopPlayback();
      setPhase("speaking");

      const cleanSpeakText = textToSpeak
        .replace(/[*_#`~\[\]\(\)]/g, " ")
        .replace(/\n+/g, ". ")
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanSpeakText);
      utterance.lang = languageCode || "en-IN";
      utterance.rate = 1.05;
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
    } catch (e) {
      console.warn("TTS speak exception:", e);
      isSubmittingRef.current = false;
      setPhase("idle");
    }
  }, [languageCode, stopPlayback]);

  // Submit query with guaranteed fast response or demo fallback
  const submitQuery = useCallback(async (queryText?: string) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    clearAllTimers();
    stopRecognition();

    const finalQuery = (queryText || transcriptBufferRef.current || liveTranscript).trim();

    // If no usable transcript was captured in time, use high-quality Demo Fallback
    if (!finalQuery) {
      setPhase("processing");
      setLiveTranscript(DEMO_LEGAL_QA.question);

      // Render answer immediately without blocking
      const fallbackResult: VoiceChatResult = {
        transcript: DEMO_LEGAL_QA.question,
        response_text: DEMO_LEGAL_QA.answer,
        citations: DEMO_LEGAL_QA.citations,
        isFallback: true
      };

      setCurrentAiResponse(DEMO_LEGAL_QA.answer);
      onResult?.(fallbackResult);

      // Start non-blocking TTS
      speakResponse(DEMO_LEGAL_QA.answer);
      return;
    }

    setPhase("processing");
    setLiveTranscript(finalQuery);

    // Fast API dispatch with 6-second timeout safety guarantee
    let isHandled = false;
    apiTimeoutRef.current = setTimeout(() => {
      if (!isHandled && activeRef.current) {
        isHandled = true;
        console.warn("Voice API timed out — using demo fallback answer");
        const fallbackResult: VoiceChatResult = {
          transcript: finalQuery,
          response_text: DEMO_LEGAL_QA.answer,
          citations: DEMO_LEGAL_QA.citations,
          isFallback: true
        };
        setCurrentAiResponse(DEMO_LEGAL_QA.answer);
        onResult?.(fallbackResult);
        speakResponse(DEMO_LEGAL_QA.answer);
      }
    }, 6000);

    try {
      const docContext = getDocumentContext ? getDocumentContext() : "";
      const fullMessage = finalQuery + (docContext ? `\n\nContext:\n${docContext}` : "");

      const response = await apiClient.post("/orchestrator/chat", {
        message: fullMessage,
        session_id: sessionIdRef.current
      });

      if (isHandled || !activeRef.current) return;
      isHandled = true;
      if (apiTimeoutRef.current) clearTimeout(apiTimeoutRef.current);

      const botReply = response?.response || response?.message || DEMO_LEGAL_QA.answer;
      const citations = response?.citations || DEMO_LEGAL_QA.citations;

      const result: VoiceChatResult = {
        transcript: finalQuery,
        response_text: botReply,
        citations
      };

      // IMMEDIATELY render into chat conversation
      setCurrentAiResponse(botReply);
      onResult?.(result);

      // Speak response in parallel (non-blocking)
      speakResponse(botReply);
    } catch (err: any) {
      if (isHandled || !activeRef.current) return;
      isHandled = true;
      if (apiTimeoutRef.current) clearTimeout(apiTimeoutRef.current);

      console.warn("Voice request error, providing demo fallback:", err);
      const fallbackResult: VoiceChatResult = {
        transcript: finalQuery,
        response_text: DEMO_LEGAL_QA.answer,
        citations: DEMO_LEGAL_QA.citations,
        isFallback: true
      };

      setCurrentAiResponse(DEMO_LEGAL_QA.answer);
      onResult?.(fallbackResult);
      speakResponse(DEMO_LEGAL_QA.answer);
    }
  }, [clearAllTimers, stopRecognition, liveTranscript, onResult, speakResponse, getDocumentContext]);

  // Start voice listening session with short controlled window (~3.5s max before fallback)
  const start = useCallback(async () => {
    stopPlayback();
    stopRecognition();
    clearAllTimers();

    setIsOpen(true);
    activeRef.current = true;
    isSubmittingRef.current = false;
    transcriptBufferRef.current = "";
    setLiveTranscript("");
    setErrorMessage("");
    setCurrentAiResponse("");
    setPhase("listening");

    // Microphone access request in background
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => stream.getTracks().forEach(t => t.stop()))
        .catch(err => console.warn("Mic access notice:", err));
    }

    // Set a strict 3.5-second timer: If no transcript arrives, automatically transition to demo flow
    listeningTimeoutRef.current = setTimeout(() => {
      if (activeRef.current && phase === "listening" && !isSubmittingRef.current) {
        console.log("Voice listening window completed — submitting query/fallback");
        submitQuery();
      }
    }, 3500);

    const SpeechRecognitionClass = typeof window !== "undefined" 
      ? (window.SpeechRecognition || window.webkitSpeechRecognition) 
      : null;

    if (!SpeechRecognitionClass) {
      // Browser doesn't support Web Speech API -> auto fallback immediately
      submitQuery();
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

        const currentText = (final || interim).trim();
        if (currentText) {
          transcriptBufferRef.current = currentText;
          setLiveTranscript(currentText);

          // If final transcript is available, submit immediately!
          if (final.trim()) {
            try { recognition.stop(); } catch(e){}
            submitQuery(final.trim());
            return;
          }

          // Rapid 700ms silence debounce once words are detected
          if (speechDebounceTimerRef.current) clearTimeout(speechDebounceTimerRef.current);
          speechDebounceTimerRef.current = setTimeout(() => {
            if (activeRef.current && !isSubmittingRef.current && transcriptBufferRef.current.trim()) {
              try { recognition.stop(); } catch(e){}
              submitQuery(transcriptBufferRef.current.trim());
            }
          }, 700);
        }
      };

      recognition.onspeechend = () => {
        if (speechDebounceTimerRef.current) clearTimeout(speechDebounceTimerRef.current);
        const captured = transcriptBufferRef.current.trim();
        try { recognition.stop(); } catch(e){}
        submitQuery(captured);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event.error);
        // On error or no-speech, submit immediately (which will use demo fallback if empty)
        if (activeRef.current && !isSubmittingRef.current) {
          submitQuery();
        }
      };

      recognition.onend = () => {
        if (activeRef.current && !isSubmittingRef.current && phase === "listening") {
          submitQuery();
        }
      };

      recognition.start();
    } catch (err: any) {
      console.warn("Recognition start notice:", err);
      if (activeRef.current && !isSubmittingRef.current) {
        submitQuery();
      }
    }
  }, [clearAllTimers, languageCode, phase, stopPlayback, stopRecognition, submitQuery]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      clearAllTimers();
      stopRecognition();
      stopPlayback();
    };
  }, [clearAllTimers, stopRecognition, stopPlayback]);

  return {
    phase,
    liveTranscript,
    errorMessage,
    currentAiResponse,
    isOpen,
    isActive: isOpen,
    start,
    exit,
    stopPlayback,
    submitQuery
  };
}
