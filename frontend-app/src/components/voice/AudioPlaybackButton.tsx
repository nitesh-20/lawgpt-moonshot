import { useState, useRef } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { synthesizeText } from "@/services/voice";
import { useToast } from "@/hooks/use-toast";

interface AudioPlaybackButtonProps {
  text: string;
  className?: string;
}

export const AudioPlaybackButton = ({ text, className = "" }: AudioPlaybackButtonProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [cachedAudioBase64, setCachedAudioBase64] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const getLanguageCodeForText = (t: string) => {
    const devanagariRegex = /[\u0900-\u097F]/;
    const bengaliRegex = /[\u0980-\u09FF]/;
    if (devanagariRegex.test(t)) return "hi-IN";
    if (bengaliRegex.test(t)) return "bn-IN";
    return "en-IN"; // Default English
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    if (cachedAudioBase64) {
      playAudio(cachedAudioBase64);
      return;
    }

    if (!text.trim()) {
      toast({ title: "Speech Synthesizer", description: "No text provided to read.", variant: "destructive" });
      return;
    }

    setIsSynthesizing(true);
    try {
      const base64Data = await synthesizeText(text, detectedLang, "priya");
      if (base64Data) {
        setCachedAudioBase64(base64Data);
        playAudio(base64Data);
      } else {
        toast({ title: "Synthesis Failed", description: "Empty audio payload from Sarvam.", variant: "destructive" });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Synthesis Failed", description: "Failed to convert text to speech.", variant: "destructive" });
    } finally {
      setIsSynthesizing(false);
    }
  };

  const playAudio = (base64Data: string) => {
    try {
      const audioUrl = `data:audio/wav;base64,${base64Data}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsPlaying(false);
        audioRef.current = null;
        toast({ title: "Playback Error", description: "Could not play synthesized audio.", variant: "destructive" });
      };

      audio.play();
    } catch (err) {
      console.error(err);
      setIsPlaying(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleTogglePlay}
      disabled={isSynthesizing}
      className={`h-7 w-7 rounded-full text-neutral-500 hover:text-primary hover:bg-neutral-50 shrink-0 border border-border/40 ${className}`}
      title={isPlaying ? "Mute Speech" : "Read Aloud"}
    >
      {isSynthesizing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
      ) : isPlaying ? (
        <VolumeX className="h-3.5 w-3.5 text-primary animate-pulse" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );
};
