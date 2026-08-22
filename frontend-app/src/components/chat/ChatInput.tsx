import { useState, useRef } from "react";
import { Mic, Paperclip, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  handleSend: (e: React.FormEvent) => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVoiceSubmit?: (audioBlob: Blob) => void;
  disabled?: boolean;
}

const ChatInput = ({
  message,
  setMessage,
  handleSend,
  handleFileUpload,
  onVoiceSubmit,
  disabled
}: ChatInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/wav" });
        if (onVoiceSubmit) {
          onVoiceSubmit(audioBlob);
        }
        
        // Clean up tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      recorder.start();
      setIsRecording(true);
      toast({ title: "Listening…", description: "Speak clearly. Click the red button to send." });
    } catch (err) {
      console.error("Microphone access failed:", err);
      toast({
        title: "Microphone Access Failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <form onSubmit={handleSend} className="p-3 md:p-4 border-t border-border bg-card">
      <div className="flex items-end gap-2">
        <Button type="button" variant="outline" size="icon" className="shrink-0" asChild>
          <label className="cursor-pointer" aria-label="Upload document">
            <Paperclip className="h-4 w-4" />
            <input
              type="file"
              accept=".txt,.doc,.docx,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              multiple
            />
          </label>
        </Button>

        <Button
          type="button"
          variant={isRecording ? "destructive" : "outline"}
          size="icon"
          className={`shrink-0 ${isRecording ? "animate-pulse" : ""}`}
          onClick={handleVoiceToggle}
          aria-label={isRecording ? "Stop recording" : "Start voice input"}
        >
          {isRecording ? (
            <Square className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask about case law, a clause, or a compliance question…"
          className="min-h-[44px] max-h-40 resize-none"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />

        <Button type="submit" size="icon" className="shrink-0" disabled={!message.trim() || disabled}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

export default ChatInput;
