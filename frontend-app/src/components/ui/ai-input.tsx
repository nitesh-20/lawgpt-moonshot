import React from "react"
import { cx } from "class-variance-authority"
import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { AILoader } from "@/components/ui/ai-loader"
import { cn } from "@/lib/utils"

interface OrbProps {
  dimension?: string
  className?: string
  tones?: {
    base?: string
    accent1?: string
    accent2?: string
    accent3?: string
  }
  spinDuration?: number
}

const ColorOrb: React.FC<OrbProps> = ({
  dimension = "192px",
  className,
  tones,
  spinDuration = 20,
}) => {
  const fallbackTones = {
    base: "oklch(95% 0.02 264.695)",
    accent1: "oklch(75% 0.15 350)",
    accent2: "oklch(80% 0.12 200)",
    accent3: "oklch(78% 0.14 280)",
  }

  const palette = { ...fallbackTones, ...tones }

  const dimValue = parseInt(dimension.replace("px", ""), 10)

  const blurStrength =
    dimValue < 50 ? Math.max(dimValue * 0.008, 1) : Math.max(dimValue * 0.015, 4)

  const contrastStrength =
    dimValue < 50 ? Math.max(dimValue * 0.004, 1.2) : Math.max(dimValue * 0.008, 1.5)

  const pixelDot = dimValue < 50 ? Math.max(dimValue * 0.004, 0.05) : Math.max(dimValue * 0.008, 0.1)

  const shadowRange = dimValue < 50 ? Math.max(dimValue * 0.004, 0.5) : Math.max(dimValue * 0.008, 2)

  const maskRadius =
    dimValue < 30 ? "0%" : dimValue < 50 ? "5%" : dimValue < 100 ? "15%" : "25%"

  const adjustedContrast =
    dimValue < 30 ? 1.1 : dimValue < 50 ? Math.max(contrastStrength * 1.2, 1.3) : contrastStrength

  return (
    <div
      className={cn("color-orb", className)}
      style={{
        width: dimension,
        height: dimension,
        "--base": palette.base,
        "--accent1": palette.accent1,
        "--accent2": palette.accent2,
        "--accent3": palette.accent3,
        "--spin-duration": `${spinDuration}s`,
        "--blur": `${blurStrength}px`,
        "--contrast": adjustedContrast,
        "--dot": `${pixelDot}px`,
        "--shadow": `${shadowRange}px`,
        "--mask": maskRadius,
      } as React.CSSProperties}
    >
      <style>{`
        @property --angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .color-orb {
          display: grid;
          grid-template-areas: "stack";
          overflow: hidden;
          border-radius: 50%;
          position: relative;
          transform: scale(1.1);
        }

        .color-orb::before,
        .color-orb::after {
          content: "";
          display: block;
          grid-area: stack;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          transform: translateZ(0);
        }

        .color-orb::before {
          background:
            conic-gradient(
              from calc(var(--angle) * 2) at 25% 70%,
              var(--accent3),
              transparent 20% 80%,
              var(--accent3)
            ),
            conic-gradient(
              from calc(var(--angle) * 2) at 45% 75%,
              var(--accent2),
              transparent 30% 60%,
              var(--accent2)
            ),
            conic-gradient(
              from calc(var(--angle) * -3) at 80% 20%,
              var(--accent1),
              transparent 40% 60%,
              var(--accent1)
            ),
            conic-gradient(
              from calc(var(--angle) * 2) at 15% 5%,
              var(--accent2),
              transparent 10% 90%,
              var(--accent2)
            ),
            conic-gradient(
              from calc(var(--angle) * 1) at 20% 80%,
              var(--accent1),
              transparent 10% 90%,
              var(--accent1)
            ),
            conic-gradient(
              from calc(var(--angle) * -2) at 85% 10%,
              var(--accent3),
              transparent 20% 80%,
              var(--accent3)
            );
          box-shadow: inset var(--base) 0 0 var(--shadow) calc(var(--shadow) * 0.2);
          filter: blur(var(--blur)) contrast(var(--contrast));
          animation: color-orb-spin var(--spin-duration) linear infinite;
        }

        .color-orb::after {
          background-image: radial-gradient(
            circle at center,
            var(--base) var(--dot),
            transparent var(--dot)
          );
          background-size: calc(var(--dot) * 2) calc(var(--dot) * 2);
          backdrop-filter: blur(calc(var(--blur) * 2)) contrast(calc(var(--contrast) * 2));
          mix-blend-mode: overlay;
        }

        @keyframes color-orb-spin {
          to {
            --angle: 360deg;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .color-orb::before {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}

const SPEED_FACTOR = 1

interface ContextShape {
  showForm: boolean
  triggerOpen: () => void
  triggerClose: () => void
}

const FormContext = React.createContext({} as ContextShape)
const useFormContext = () => React.useContext(FormContext)

export function MorphPanel() {
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  const [showForm, setShowForm] = React.useState(false)

  const triggerClose = React.useCallback(() => {
    setShowForm(false)
  }, [])

  const triggerOpen = React.useCallback(() => {
    setShowForm(true)
  }, [])

  React.useEffect(() => {
    function clickOutsideHandler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node) && showForm) {
        triggerClose()
      }
    }
    document.addEventListener("mousedown", clickOutsideHandler)
    return () => document.removeEventListener("mousedown", clickOutsideHandler)
  }, [showForm, triggerClose])

  // Continuous background wake-word listener (Hey Vaani / वाणी / বাণী)
  React.useEffect(() => {
    if (showForm) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    // Set to Hindi (hi-IN) to capture Indian accents and phonetic matches in English/Hindi/Bengali
    recognition.lang = "hi-IN";

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const text = event.results[i][0].transcript.toLowerCase();
        console.log("Wake word candidate transcript:", text);
        
        // Multi-lingual phonetic variants of 'Hey Vaani' / 'Hi Vaani' / 'Vaani' / 'Vani'
        const matchesWakeWord = 
          text.includes("vaani") || 
          text.includes("vani") || 
          text.includes("वानी") || 
          text.includes("वाणी") || 
          text.includes("বানি") || 
          text.includes("বাণী") ||
          text.includes("बनी") ||
          text.includes("बानी") ||
          text.includes("वनी");

        if (matchesWakeWord) {
          console.log("Wake word MATCHED: Triggering voice assistant...");
          triggerOpen();
          recognition.stop();
          break;
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === "not-allowed") {
        console.warn("Microphone permission denied for wake word detection.");
        return;
      }
      // Restart on non-fatal errors
      try { recognition.start(); } catch {}
    };

    recognition.onend = () => {
      // Re-initialize listener to keep it running
      if (!showForm) {
        try { recognition.start(); } catch {}
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition for wake word:", err);
    }

    return () => {
      try {
        recognition.onend = null;
        recognition.stop();
      } catch {}
    };
  }, [showForm, triggerOpen])

  const ctx = React.useMemo(
    () => ({ showForm, triggerOpen, triggerClose }),
    [showForm, triggerOpen, triggerClose]
  )

  return (
    <div className="relative flex items-center" style={{ height: 44 }}>
      <motion.div
        ref={wrapperRef}
        data-panel
        className={cx(
          "bg-background absolute top-1/2 right-0 z-10 flex flex-col items-center overflow-hidden border shadow-xl"
        )}
        initial={false}
        style={{ transformOrigin: "top right" }}
        animate={{
          width: showForm ? FORM_WIDTH : "auto",
          height: showForm ? FORM_HEIGHT : 44,
          y: showForm ? 8 : "-50%",
          borderRadius: showForm ? 14 : 20,
        }}
        transition={{
          type: "spring",
          stiffness: 550 / SPEED_FACTOR,
          damping: 45,
          mass: 0.7,
          delay: showForm ? 0 : 0.08,
        }}
      >
        <FormContext.Provider value={ctx}>
          <DockBar />
          <VoicePanel />
        </FormContext.Provider>
      </motion.div>
    </div>
  )
}

function DockBar() {
  const { showForm, triggerOpen } = useFormContext()
  return (
    <footer className="mt-auto flex h-[44px] items-center justify-center whitespace-nowrap select-none">
      <div className="flex items-center justify-center gap-2 px-3 max-sm:h-10 max-sm:px-2">
        <div className="flex w-fit items-center gap-2">
          <AnimatePresence mode="wait">
            {showForm ? (
              <motion.div
                key="blank"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                className="h-5 w-5"
              />
            ) : (
              <motion.div
                key="orb"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ColorOrb dimension="24px" tones={{ base: "oklch(22.64% 0 0)" }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!showForm && (
          <Button
            type="button"
            className="flex h-fit flex-1 justify-end rounded-full px-2 !py-0.5"
            variant="ghost"
            onClick={triggerOpen}
          >
            <span className="truncate">Ask AI</span>
          </Button>
        )}
      </div>
    </footer>
  )
}

const FORM_WIDTH = 360
const FORM_HEIGHT = 200

type VoicePhase = "listening" | "processing" | "speaking" | "error"

const PHASE_LABEL: Record<VoicePhase, string> = {
  listening: "Listening",
  processing: "Thinking",
  speaking: "Speaking",
  error: "Error",
}

function VoicePanel() {
  const { showForm, triggerClose } = useFormContext()
  const [phase, setPhase] = React.useState<VoicePhase>("listening")
  const [errorMessage, setErrorMessage] = React.useState("")

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const streamRef = React.useRef<MediaStream | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const sessionIdRef = React.useRef(crypto.randomUUID())

  const cleanupMic = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    mediaRecorderRef.current = null
  }, [])

  const stopPlayback = React.useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }, [])

  const handleClose = React.useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    cleanupMic()
    stopPlayback()
    triggerClose()
  }, [cleanupMic, stopPlayback, triggerClose])

  const runVoiceTurn = React.useCallback(async (audioBlob: Blob) => {
    setPhase("processing")
    try {
      const { voiceChat } = await import("@/services/voice")
      const result = await voiceChat(audioBlob, sessionIdRef.current)

      if (result.transcript) {
        window.dispatchEvent(
          new CustomEvent("voice-search-trigger", {
            detail: {
              query: result.transcript,
              direct_answer: result.response_text,
              response_audio: result.response_audio,
              citations: result.citations || []
            }
          })
        );
      }

      if (result.response_audio) {
        setPhase("speaking")
        const audio = new Audio(`data:audio/wav;base64,${result.response_audio}`)
        audioRef.current = audio
        audio.onended = () => {
          audioRef.current = null
          triggerClose()
        }
        audio.onerror = () => {
          audioRef.current = null
          triggerClose()
        }
        await audio.play()
      } else {
        triggerClose()
      }
    } catch (err: any) {
      setPhase("error")
      setErrorMessage(err?.message || "Voice chat failed")
      setTimeout(() => triggerClose(), 2000)
    }
  }, [triggerClose])

  const stopListening = React.useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
    }
  }, [])

  // Start recording as soon as the panel opens.
  React.useEffect(() => {
    if (!showForm) return

    let cancelled = false
    setPhase("listening")
    setErrorMessage("")

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        const recorder = new MediaRecorder(stream)
        chunksRef.current = []

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data)
        }
        recorder.onstop = () => {
          const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
          cleanupMic()
          if (audioBlob.size > 0) {
            runVoiceTurn(audioBlob)
          } else {
            triggerClose()
          }
        }

        mediaRecorderRef.current = recorder
        recorder.start()

        // Web Audio Voice Activity / Silence Auto-Stop
        let audioContext: AudioContext | null = null;
        let analyser: AnalyserNode | null = null;
        let source: MediaStreamAudioSourceNode | null = null;

        try {
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 512;
          source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          let lastSpeechTime = Date.now();

          const checkSilence = () => {
            if (cancelled || !recorder || recorder.state !== "recording") {
              if (audioContext && audioContext.state !== "closed") {
                audioContext.close();
              }
              return;
            }

            analyser!.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;

            if (average > 8) {
              lastSpeechTime = Date.now();
            } else {
              // If user stops talking for 1.8 seconds, automatically submit
              if (Date.now() - lastSpeechTime > 1800) {
                console.log("Auto-stopping recording due to silence...");
                if (recorder.state === "recording") {
                  recorder.stop();
                }
                if (audioContext && audioContext.state !== "closed") {
                  audioContext.close();
                }
                return;
              }
            }

            requestAnimationFrame(checkSilence);
          };

          // Start checking after 1 second delay
          setTimeout(() => {
            if (!cancelled && recorder.state === "recording") {
              checkSilence();
            }
          }, 1000);

        } catch (audioErr) {
          console.error("VAD setup error:", audioErr);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPhase("error")
          setErrorMessage("Microphone access denied")
          setTimeout(() => triggerClose(), 2000)
        }
      })

    return () => {
      cancelled = true
      // Covers the outside-click / navigate-away case where showForm flips to
      // false without going through handleClose's own recorder teardown.
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.onstop = null
        mediaRecorderRef.current.stop()
      }
      cleanupMic()
      stopPlayback()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm])

  React.useEffect(() => {
    if (!showForm) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose()
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [showForm, handleClose])

  return (
    <div
      className="absolute bottom-0"
      style={{ width: FORM_WIDTH, height: FORM_HEIGHT, pointerEvents: showForm ? "all" : "none" }}
    >
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 550 / SPEED_FACTOR, damping: 45, mass: 0.7 }}
            className="flex h-full flex-col items-center justify-center gap-2 p-1"
          >
            <AILoader size={110} text={PHASE_LABEL[phase]} fullScreen={false} />
            {phase === "error" ? (
              <span className="text-destructive text-2xs uppercase tracking-wider font-mono select-none">
                {errorMessage}
              </span>
            ) : (
              <button
                type="button"
                onClick={phase === "listening" ? stopListening : handleClose}
                className="text-muted-foreground hover:text-foreground text-2xs uppercase tracking-wider font-mono select-none"
              >
                {phase === "listening" ? "Tap to stop" : "Tap to cancel"}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MorphPanel
