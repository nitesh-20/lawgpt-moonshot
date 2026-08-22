import { useEffect, useRef } from "react";
import { FileText, Scale, X } from "lucide-react";
import { Message, UploadedDocument } from "@/types/chat";
import WelcomeMessage from "./WelcomeMessage";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

interface ChatContainerProps {
  messages: Message[];
  documents: UploadedDocument[];
  onRemoveDocument: (id: string) => void;
  message: string;
  setMessage: (message: string) => void;
  handleSend: (e: React.FormEvent) => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVoiceSubmit?: (audioBlob: Blob) => void;
  onSelectPrompt: (prompt: string) => void;
  onRegenerate: () => void;
  isStreaming: boolean;
}

const ChatContainer = ({
  messages,
  documents,
  onRemoveDocument,
  message,
  setMessage,
  handleSend,
  handleFileUpload,
  onVoiceSubmit,
  onSelectPrompt,
  onRegenerate,
  isStreaming,
}: ChatContainerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastBotIndex = [...messages].reverse().findIndex((m) => m.sender === "bot");
  const lastBotId = lastBotIndex === -1 ? null : messages[messages.length - 1 - lastBotIndex].id;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="rounded-lg border border-border bg-card shadow-card flex flex-col h-[560px] md:h-[680px]">
      {documents.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border overflow-x-auto">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 pl-2.5 pr-1.5 py-1 shrink-0"
            >
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="font-mono text-[11px] text-ink">{doc.name}</span>
              <button
                type="button"
                onClick={() => onRemoveDocument(doc.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`Remove ${doc.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-5">
        {messages.length === 0 ? (
          <WelcomeMessage onSelectPrompt={onSelectPrompt} />
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onRegenerate={msg.id === lastBotId ? onRegenerate : undefined}
            />
          ))
        )}

        {isStreaming && messages[messages.length - 1]?.sender === "user" && (
          <div className="flex items-start gap-3 fade-in">
            <div className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center shrink-0">
              <Scale className="h-4 w-4 text-primary" strokeWidth={1.75} />
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
            </div>
          </div>
        )}
      </div>

      <ChatInput
        message={message}
        setMessage={setMessage}
        handleSend={handleSend}
        handleFileUpload={handleFileUpload}
        onVoiceSubmit={onVoiceSubmit}
        disabled={isStreaming}
      />
    </div>
  );
};

export default ChatContainer;
