import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, X, Globe, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { transcribeAudio } from "@/services/voice";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceButtonProps {
  onTranscribe: (text: string) => void;
  placeholder?: string;
  className?: string;
  showLanguageSelect?: boolean;
}

const SUPPORTED_LANGUAGES = [
  { code: "en-IN", label: "English (IN)" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "bn-IN", label: "Bengali" }
];

export const VoiceButton = ({ 
  onTranscribe, 
  placeholder = "Speak now...", 
  className = "",
  showLanguageSelect = true
}: VoiceButtonProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingLanguage, setRecordingLanguage] = useState("en-IN");
  const [timer, setTimer] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { toast } = useToast();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setTimer(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        stream.getTracks().forEach((track) => track.stop());
        await handleUpload(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      toast({
        title: "Microphone Access Denied",
        description: "Please check mic permissions in your browser settings.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null; // ignore callback
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimer(0);
      toast({ title: "Recording Cancelled" });
    }
  };

  const handleUpload = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    toast({ title: "Processing Voice", description: "Synthesizing transcription..." });
    try {
      const text = await transcribeAudio(audioBlob, recordingLanguage);
      if (text) {
        onTranscribe(text);
        toast({ title: "Transcription Success" });
      } else {
        toast({ title: "Transcribe Warning", description: "No words detected in audio.", variant: "destructive" });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Transcription Failed", description: "Could not transcribe audio.", variant: "destructive" });
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Language select indicator */}
      {!isRecording && showLanguageSelect && (
        <div className="relative inline-flex items-center gap-1">
          <select
            value={recordingLanguage}
            onChange={(e) => setRecordingLanguage(e.target.value)}
            className="input-premium py-1 pl-6 pr-2 text-3xs font-mono bg-white appearance-none cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
          <Globe className="absolute left-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-neutral-400 pointer-events-none" />
        </div>
      )}

      {/* Main Recording modal panel or button */}
      <AnimatePresence>
        {isRecording ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 p-1.5 px-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs font-mono"
          >
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>{formatTimer(timer)}</span>
            </div>

            {/* Simulated live waveform */}
            <div className="flex gap-0.5 items-center h-4 px-2">
              {[0.6, 1.2, 0.4, 1.5, 0.8, 1.1, 0.5].map((scale, i) => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [1, 2.5 * scale, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                  className="w-0.5 h-2 bg-red-500 rounded"
                />
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={stopRecording}
              className="h-6 w-6 text-red-600 hover:bg-red-100 rounded"
              title="Stop and transcribe"
            >
              <MicOff size={13} />
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={cancelRecording}
              className="h-6 w-6 text-neutral-500 hover:bg-neutral-100 rounded"
              title="Cancel recording"
            >
              <X size={13} />
            </Button>
          </motion.div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={startRecording}
            disabled={isTranscribing}
            className="h-8 w-8 text-neutral-500 hover:text-primary hover:bg-neutral-50 rounded shrink-0 border border-border"
          >
            {isTranscribing ? (
              <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Mic size={14} />
            )}
          </Button>
        )}
      </AnimatePresence>
    </div>
  );
};
