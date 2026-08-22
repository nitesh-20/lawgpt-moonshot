import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Paperclip,
  Sparkles,
  Loader2,
  X,
  BookOpen,
  Download,
  Trash2,
  Volume2,
  FileText,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Message, UploadedDocument } from "@/types/chat";
import { apiClient } from "@/utils/apiClient";
import { AnimatePresence, motion } from "framer-motion";
import { AudioPlaybackButton } from "@/components/voice/AudioPlaybackButton";
import { useHandsFreeVoiceChat } from "@/hooks/useHandsFreeVoiceChat";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

const Chatbot = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Hands-free conversational Voice AI: record -> transcribe+answer+synthesize -> speak -> listen again.
  const handsFreeVoice = useHandsFreeVoiceChat({
    onResult: (result) => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), content: result.transcript || "", sender: "user", timestamp: new Date() },
        {
          id: crypto.randomUUID(),
          content: result.response_text,
          sender: "bot",
          timestamp: new Date(),
          citations: (result.citations || []).map((cit: any, idx: number) => ({
            id: cit.citation_id || `cit-${idx}`,
            label: cit.document_name || cit.document_id || "Citation",
            source: cit.text || "Authority source reference"
          }))
        }
      ]);
    },
    onError: (msg) => {
      toast({ title: "Voice Assistant Error", description: msg, variant: "destructive" });
    }
  });

  const VOICE_PHASE_LABEL: Record<string, string> = {
    listening: "Listening",
    thinking: "Thinking",
    speaking: "Speaking",
    error: "Error"
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setDocuments((prev) => [
          ...prev,
          { id: crypto.randomUUID(), name: file.name, content, uploadDate: new Date() },
        ]);
        toast({ title: "Document Attached", description: `"${file.name}" added to session context.` });
      };
      reader.readAsText(file);
    });

    event.target.value = "";
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const runStream = async (userMessage: string) => {
    setIsStreaming(true);
    const botId = crypto.randomUUID();

    const documentContext = documents.length > 0
      ? documents.map(doc => `Document "${doc.name}":\n${doc.content}`).join('\n\n')
      : '';

    try {
      const response = await apiClient.post("/orchestrator/chat", {
        message: userMessage + (documentContext ? `\n\nContext:\n${documentContext}` : ""),
        session_id: "default_session"
      });

      if (response && response.status === "success") {
        const citations = (response.citations || []).map((cit: any, idx: number) => ({
          id: cit.citation_id || `cit-${idx}`,
          label: cit.document_name || cit.document_id || "Citation",
          source: cit.text || "Authority source reference"
        }));

        const botReply = response.response || response.message || "Request processed successfully.";

        setMessages((prev) => [
          ...prev,
          {
            id: botId,
            content: botReply,
            sender: "bot",
            timestamp: new Date(),
            citations
          }
        ]);
      } else {
        throw new Error("Local backend returned error status");
      }
    } catch (error) {
      console.error("FastAPI Orchestrator Chat failed:", error);
      toast({
        title: "Error",
        description: "Failed to generate a response. Please verify FastAPI backend connections.",
        variant: "destructive"
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isStreaming) return;

    const userMessage = message;
    setMessage("");
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), content: userMessage, sender: "user", timestamp: new Date() },
    ]);

    await runStream(userMessage);
  };

  const handleClearHistory = () => {
    setMessages([]);
    toast({ title: "History Cleared", description: "All message logs removed." });
  };

  const handleExportHistory = () => {
    if (messages.length === 0) return;
    const historyString = messages.map(m => `[${m.timestamp?.toLocaleTimeString()}] ${m.sender === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`).join("\n\n");
    const blob = new Blob([historyString], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "conversation_history.txt");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "History Exported", description: "Downloaded conversation_history.txt" });
  };

  const SUGGESTED_PROMPTS = [
    "What are the main liability issues in an NDA?",
    "Summarize Section 420 of the IPC.",
    "Draft a standard termination clause for service agreements."
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 h-[calc(100vh-140px)] flex flex-col">

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-100 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Mic className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-sans">Voice Assistant</h1>
          </div>
          <p className="text-xs text-neutral-500 font-mono uppercase tracking-wider">
            Consult our autonomous legal orchestrator using voice or text
          </p>
        </div>

        {messages.length > 0 && (
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider">
            <Button onClick={handleExportHistory} variant="outline" className="h-8 border-neutral-200">
              <Download className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
              Export
            </Button>
            <Button onClick={handleClearHistory} variant="outline" className="h-8 border-neutral-200 text-red-650 hover:bg-red-50 hover:border-red-200">
              <Trash2 className="mr-1.5 h-3.5 w-3.5 text-red-400" />
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Main Grid: Chat Thread on left, Context panel on right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_320px] gap-8 flex-1 min-h-0 items-stretch">

        {/* LEFT PANEL: Chat thread container */}
        <div className="flex flex-col bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden min-h-0 relative">

          {/* Messages Scroll viewport */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center space-y-6 max-w-md mx-auto">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-full">
                  <Mic className="h-10 w-10 text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-sans font-extrabold text-lg text-slate-900 tracking-tight">Consult Voice Assistant</h3>
                  <p className="text-xs text-slate-450 leading-relaxed font-serif">
                    Start a conversation using voice commands. Attach reference agreements or ask questions to analyze liability clauses, verify section bounds, or draft clauses.
                  </p>
                </div>

                <div className="w-full space-y-2 pt-4">
                  {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setMessage(prompt); }}
                      className="w-full p-3 text-left bg-neutral-50/50 border border-neutral-200 hover:border-emerald-600/40 rounded-xl text-2xs font-semibold text-slate-700 hover:text-emerald-700 transition-all flex justify-between items-center group shadow-3xs"
                    >
                      <span>{prompt}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => {
                  const isBot = msg.sender === "bot";
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-4 ${isBot ? "justify-start" : "justify-end"}`}
                    >
                      {isBot && (
                        <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                          <Mic className="h-4.5 w-4.5 text-emerald-650" />
                        </div>
                      )}

                      <div className="space-y-2 max-w-[80%]">
                        <div className={`p-4 rounded-2xl text-xs leading-relaxed font-serif border ${isBot
                            ? "bg-white border-neutral-200 text-slate-800"
                            : "bg-[#050505] border-neutral-900 text-white"
                          }`}>
                          <p className="whitespace-pre-line">{msg.content}</p>
                        </div>

                        {/* Citation lists for bot answers */}
                        {isBot && msg.citations && msg.citations.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1.5 font-sans">
                            {msg.citations.map((c: any) => (
                              <Badge
                                key={c.id}
                                variant="outline"
                                className="bg-neutral-50 text-slate-600 border-neutral-200 hover:bg-neutral-100 text-[9px] font-semibold py-0.5 rounded cursor-help"
                                title={c.source}
                              >
                                📄 {c.label}
                              </Badge>
                            ))}

                            <div className="inline-flex items-center gap-1.5 text-[9px] font-mono bg-neutral-100 text-slate-500 border border-neutral-200 px-2 py-0.5 rounded">
                              <Volume2 className="h-3 w-3 text-slate-400 shrink-0" />
                              <AudioPlaybackButton text={msg.content} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Streaming/typing indicators */}
                {isStreaming && (
                  <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                      <Mic className="h-4.5 w-4.5 text-emerald-650 animate-pulse" />
                    </div>
                    <div className="p-4 bg-white border border-neutral-200 rounded-2xl flex items-center gap-1.5 shadow-3xs">
                      <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                      <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Form Command Bar inputs */}
          <div className="p-4 border-t border-neutral-150 bg-neutral-50/50 shrink-0">
            <form onSubmit={handleSend} className="relative">
              <textarea
                placeholder="Message Voice Assistant..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isStreaming}
                rows={1}
                className="w-full bg-white border border-neutral-200 focus:border-emerald-600 focus:outline-none pl-11 pr-24 py-3 text-xs text-slate-900 placeholder:text-neutral-400 rounded-xl resize-none leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />

              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-neutral-100 transition-colors"
                  title="Attach Files"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                  multiple
                  accept=".txt,.pdf,.docx"
                />
              </div>

              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handsFreeVoice.isActive ? handsFreeVoice.exit : handsFreeVoice.start}
                  className={cn(
                    "h-7 w-7 rounded-lg border border-neutral-200 flex items-center justify-center transition-colors shrink-0",
                    "text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                  )}
                  title={handsFreeVoice.isActive ? "Stop Voice Mode" : "Start Voice Mode"}
                >
                  {handsFreeVoice.isActive ? (
                    <MicOff className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                  ) : (
                    <Mic className="h-3.5 w-3.5" />
                  )}
                </button>

                <Button
                  type="submit"
                  size="icon"
                  disabled={!message.trim() || isStreaming}
                  className="bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg h-7 w-7 flex items-center justify-center shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: Context files inventory list */}
        <aside className="space-y-6">
          <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-3xs space-y-4">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Attached Context Documents</span>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <div key={doc.id} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex justify-between items-center text-xs shadow-3xs font-sans group">
                    <span className="font-semibold text-slate-700 truncate max-w-[180px]">📄 {doc.name}</span>
                    <button
                      onClick={() => handleRemoveDocument(doc.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-3xs border border-dashed border-neutral-200 bg-neutral-50/50 rounded-xl">
                  No reference files attached. Use the paperclip icon in command bar to embed files.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-3xs space-y-3 font-sans">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">System Briefing Instructions</span>
            <ul className="text-[11px] text-slate-500 space-y-2 list-disc pl-4 font-serif leading-relaxed">
              <li>Attached TXT/PDF files will be mapped into prompt window context.</li>
              <li>Toggle text-to-speech audio flags to parse answers out loud.</li>
              <li>Press escape or use ⌘K shortcut command to launch general command console.</li>
            </ul>
          </div>
        </aside>

      </div>

      {/* HANDS-FREE VOICE AI OVERLAY */}
      {handsFreeVoice.isActive && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
          <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center">
            <Mic className={cn("h-10 w-10 text-emerald-400", handsFreeVoice.phase !== "idle" && "animate-pulse")} />
          </div>
          <span className="text-white/90 text-sm font-mono uppercase tracking-widest">
            {VOICE_PHASE_LABEL[handsFreeVoice.phase] || "Listening"}
          </span>
          {handsFreeVoice.phase === "error" ? (
            <span className="text-red-400 text-xs uppercase tracking-wider font-mono">
              {handsFreeVoice.errorMessage}
            </span>
          ) : (
            <button
              type="button"
              onClick={handsFreeVoice.phase === "listening" ? handsFreeVoice.stopListeningNow : handsFreeVoice.exit}
              className="text-white/60 hover:text-white text-xs uppercase tracking-wider font-mono"
            >
              {handsFreeVoice.phase === "listening" ? "Tap to stop" : "Exit Voice Mode"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Chatbot;
