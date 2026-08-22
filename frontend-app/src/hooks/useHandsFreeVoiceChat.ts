import { useRef, useState, useEffect } from "react";
import { voiceChat, type VoiceChatResult } from "@/services/voice";

export type VoicePhase = "idle" | "listening" | "thinking" | "speaking" | "error";

interface UseHandsFreeVoiceChatOptions {
  /** Language hint for STT/TTS, e.g. "en-IN". Omit to let the backend auto-detect. */
  languageCode?: string;
  /** Milliseconds of silence before a listening turn auto-submits. */
  silenceMs?: number;
  onResult?: (result: VoiceChatResult) => void;
  onError?: (message: string) => void;
}

/**
 * Drives a full-duplex "ChatGPT voice mode" style loop on top of the /voice/chat
 * endpoint: record -> VAD silence auto-stop -> transcribe+answer+synthesize (backend) ->
 * play response -> resume listening, until exit() is called.
 */
export function useHandsFreeVoiceChat(options: UseHandsFreeVoiceChatOptions = {}) {
  const { languageCode, silenceMs = 1500, onResult, onError } = options;

  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const activeRef = useRef(false);
  // Bumped on every start()/exit() so a slow turn from a previous session (e.g. a
  // network call still in flight after the user tapped stop-and-restart) can tell
  // it's stale and bail out instead of playing its audio over a newer, live turn —
  // this was the "multiple AI voices at once" bug.
  const generationRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const sessionIdRef = useRef<string>("");

  function cleanupMic() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
  }

  function stopPlayback() {
    if (audioElRef.current) {
      audioElRef.current.onended = null;
      audioElRef.current.onerror = null;
      audioElRef.current.pause();
      audioElRef.current = null;
    }
  }

  function exit() {
    activeRef.current = false;
    generationRef.current += 1;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanupMic();
    stopPlayback();
    setPhase("idle");
    setErrorMessage("");
  }

  /** True if `gen` is still the live session — false means a stale async callback. */
  function isCurrent(gen: number) {
    return activeRef.current && generationRef.current === gen;
  }

  async function submitTurn(blob: Blob, gen: number) {
    if (!isCurrent(gen)) return;
    setPhase("thinking");
    try {
      const result = await voiceChat(blob, sessionIdRef.current, languageCode);
      if (!isCurrent(gen)) return; // a newer/exited session superseded this one while we waited

      onResult?.(result);

      if (result.response_audio) {
        setPhase("speaking");
        stopPlayback(); // never let two clips play at once
        const audio = new Audio(`data:audio/wav;base64,${result.response_audio}`);
        audioElRef.current = audio;
        audio.onended = () => {
          if (audioElRef.current === audio) audioElRef.current = null;
          if (isCurrent(gen)) listenOnce(gen);
          else if (!activeRef.current) setPhase("idle");
        };
        audio.onerror = () => {
          if (audioElRef.current === audio) audioElRef.current = null;
          if (isCurrent(gen)) listenOnce(gen);
          else if (!activeRef.current) setPhase("idle");
        };
        try {
          await audio.play();
        } catch (playErr) {
          // Browser autoplay policy occasionally blocks play() after a long network
          // wait — the reply text still made it into the chat via onResult above,
          // so just move on to the next turn instead of treating this as fatal.
          console.warn("Voice reply audio could not autoplay:", playErr);
          if (audioElRef.current === audio) audioElRef.current = null;
          if (isCurrent(gen)) listenOnce(gen);
        }
      } else if (isCurrent(gen)) {
        listenOnce(gen);
      }
    } catch (err: any) {
      if (!isCurrent(gen)) return;
      const msg = err?.message || "Voice turn failed";
      setPhase("error");
      setErrorMessage(msg);
      onError?.(msg);
      setTimeout(() => { if (isCurrent(gen)) exit(); }, 2000);
    }
  }

  async function listenOnce(gen: number) {
    if (!isCurrent(gen)) return;
    setPhase("listening");

    let stream: MediaStream;
    try {
      // autoGainControl off: Chrome's default AGC amplifies quiet room noise to a
      // steady target volume, which was keeping the VAD's silence check permanently
      // above threshold and forcing users to hit "tap to stop" manually every time.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false }
      });
    } catch {
      const msg = "Microphone access denied";
      if (isCurrent(gen)) {
        setPhase("error");
        setErrorMessage(msg);
        onError?.(msg);
        setTimeout(() => { if (isCurrent(gen)) exit(); }, 2000);
      }
      return;
    }

    if (!isCurrent(gen)) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close();
      }
      if (!isCurrent(gen)) return;
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      if (blob.size > 0) {
        submitTurn(blob, gen);
      } else {
        listenOnce(gen);
      }
    };

    recorder.start();

    // Web Audio VAD: auto-stop the turn after a period of silence.
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let lastSpeechTime = Date.now();

      const checkSilence = () => {
        if (!isCurrent(gen) || recorder.state !== "recording") return;

        analyser.getByteFrequencyData(buffer);
        const average = buffer.reduce((a, b) => a + b, 0) / buffer.length;

        // Raised from 8: with AGC off, ambient room noise typically sits well under this,
        // while actual speech reliably clears it.
        if (average > 14) {
          lastSpeechTime = Date.now();
        } else if (Date.now() - lastSpeechTime > silenceMs) {
          if (recorder.state === "recording") recorder.stop();
          return;
        }

        requestAnimationFrame(checkSilence);
      };

      setTimeout(() => {
        if (isCurrent(gen) && recorder.state === "recording") checkSilence();
      }, 1000);
    } catch (err) {
      console.error("VAD setup error:", err);
    }
  }

  function start() {
    if (activeRef.current) return;
    activeRef.current = true;
    generationRef.current += 1;
    const gen = generationRef.current;
    sessionIdRef.current = crypto.randomUUID();
    setErrorMessage("");
    listenOnce(gen);
  }

  /** Force the current listening turn to submit immediately instead of waiting for silence. */
  function stopListeningNow() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  /** Interrupt playback (barge-in) and resume listening right away. */
  function interrupt() {
    stopPlayback();
    if (activeRef.current) listenOnce(generationRef.current);
  }

  // Cleanup on unmount only — `exit` is recreated every render, so this must not
  // be in the dependency array or the mic would be torn down on every re-render.
  const exitRef = useRef(exit);
  exitRef.current = exit;
  useEffect(() => {
    return () => exitRef.current();
  }, []);

  return {
    phase,
    errorMessage,
    isActive: phase !== "idle",
    start,
    exit,
    stopListeningNow,
    interrupt,
  };
}
