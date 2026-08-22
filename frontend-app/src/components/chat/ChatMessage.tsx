import { useState, useRef, useEffect } from "react";
import { Copy, RotateCcw, Scale, User, Volume2, Pause, Square, Download, Loader2, Languages } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@/types/chat";
import CitationCard from "./CitationCard";
import { apiClient } from "@/utils/apiClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatMessageProps {
  message: Message;
  onRegenerate?: () => void;
}

const SUPPORTED_LANGUAGES = [
  { code: "hi-IN", label: "Hindi" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "kn-IN", label: "Kannada" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "mr-IN", label: "Marathi" },
  { code: "gu-IN", label: "Gujarati" },
  { code: "pa-IN", label: "Punjabi" },
  { code: "bn-IN", label: "Bengali" }
];

const ChatMessage = ({ message, onRegenerate }: ChatMessageProps) => {
  const { toast } = useToast();
  const isBot = message.sender === "bot";

  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const displayContent = translatedText || message.content;

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent);
    toast({ title: "Copied", description: "Message copied to clipboard." });
  };

  const handleTranslate = async (langCode: string, langLabel: string) => {
    if (isTranslating) return;
    setIsTranslating(true);
    try {
      const response = await apiClient.post("/voice/translate", {
        text: message.content,
        language_code: langCode,
        speaker: "shubh"
      });
      if (response?.status === "success" && response.data?.translated_text) {
        setTranslatedText(response.data.translated_text);
        toast({ title: "Translated", description: `Translated to ${langLabel}.` });
      } else {
        throw new Error("Translation failed.");
      }
    } catch (e: any) {
      toast({ title: "Translation Error", description: e.message || "Failed to translate.", variant: "destructive" });
    } finally {
      setIsTranslating(false);
    }
  };

  const handlePlayPause = async () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    if (isSynthesizing) return;
    setIsSynthesizing(true);
    
    try {
      const response = await apiClient.post("/voice/synthesize", {
        text: displayContent,
        language_code: translatedText ? "hi-IN" : "en-IN", // Default mapping
        speaker: "shubh"
      });

      if (response?.status === "success" && response.data?.audio_base64) {
        const audioSrc = `data:audio/wav;base64,${response.data.audio_base64}`;
        setAudioUrl(audioSrc);
        
        const audio = new Audio(audioSrc);
        audioRef.current = audio;
        
        audio.onended = () => setIsPlaying(false);
        audio.onpause = () => setIsPlaying(false);
        audio.onplay = () => setIsPlaying(true);
        
        audio.play();
        setIsPlaying(true);
      } else {
        throw new Error("Failed to synthesize audio.");
      }
    } catch (e: any) {
      toast({ title: "Audio Error", description: e.message || "Could not generate speech.", variant: "destructive" });
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      const a = document.createElement("a");
      a.href = audioUrl;
      a.download = `sarvam_audio_${Date.now()}.wav`;
      a.click();
    }
  };

  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"} fade-in`}>
      <div className={`flex items-start max-w-[85%] md:max-w-[75%] gap-3 ${isBot ? "" : "flex-row-reverse"}`}>
        <div className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center shrink-0">
          {isBot ? (
            <Scale className="h-4 w-4 text-primary" strokeWidth={1.75} />
          ) : (
            <User className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
          )}
        </div>

        <div className="min-w-0">
          <div
            className={`rounded-lg px-4 py-3 ${
              isBot
                ? "bg-card border border-border text-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
              {displayContent}
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-current align-text-bottom ml-0.5 animate-pulse" />
              )}
            </p>
          </div>

          {isBot && message.citations && message.citations.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
              {message.citations.map((citation) => (
                <CitationCard key={citation.id} citation={citation} />
              ))}
            </div>
          )}

          <div className={`flex items-center gap-3 mt-1.5 ${isBot ? "" : "justify-end"}`}>
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {isBot && !message.isStreaming && (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors relative" title="Translate">
                      {isTranslating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <DropdownMenuItem key={lang.code} onClick={() => handleTranslate(lang.code, lang.label)}>
                        {lang.label}
                      </DropdownMenuItem>
                    ))}
                    {translatedText && (
                      <DropdownMenuItem onClick={() => setTranslatedText(null)}>
                        Revert to English
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-1.5 ml-2 border-l border-border pl-2">
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    disabled={isSynthesizing}
                    className="text-primary hover:text-primary/80 transition-colors"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isSynthesizing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>
                  
                  {audioUrl && (
                    <>
                      <button
                        type="button"
                        onClick={handleStop}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Stop"
                      >
                        <Square className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Download Audio"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {onRegenerate && (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    className="text-muted-foreground hover:text-foreground transition-colors ml-auto"
                    title="Regenerate"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
