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
  ArrowUpRight,
  Mic,
  MicOff,
  AlertCircle,
  VolumeX,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Message, UploadedDocument } from "@/types/chat";
import { apiClient } from "@/utils/apiClient";
import { AnimatePresence, motion } from "framer-motion";
import { AudioPlaybackButton } from "@/components/voice/AudioPlaybackButton";
import { useHandsFreeVoiceChat } from "@/hooks/useHandsFreeVoiceChat";
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

  // Hands-free conversational Voice Assistant
  const handsFreeVoice = useHandsFreeVoiceChat({
    getDocumentContext: () => {
      return documents.length > 0
        ? documents.map(doc => `Document "${doc.name}":\n${doc.content}`).join('\n\n')
        : '';
    },
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
      toast({ title: "Voice Notice", description: msg, variant: "destructive" });
    }
  });

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
              <Mic className="h-4.5 w-4.5 text-emerald-600" />
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
                <button
                  type="button"
                  onClick={handsFreeVoice.start}
                  className="p-5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full transition-all cursor-pointer shadow-xs hover:scale-105 group"
                  title="Click to Speak"
                >
                  <Mic className="h-10 w-10 text-emerald-600 group-hover:scale-110 transition-transform" />
                </button>
                <div className="space-y-2">
                  <h3 className="font-sans font-extrabold text-lg text-slate-900 tracking-tight">Consult Voice Assistant</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-serif">
                    Tap the microphone icon to speak your question, or type below. Attach reference agreements to analyze liability clauses, verify bounds, or draft provisions.
                  </p>
                </div>

                <div className="w-full space-y-2 pt-4">
                  {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setMessage(prompt); }}
                      className="w-full p-3 text-left bg-neutral-50/50 border border-neutral-200 hover:border-emerald-600/40 rounded-xl text-2xs font-semibold text-slate-700 hover:text-emerald-700 transition-all flex justify-between items-center group shadow-3xs cursor-pointer"
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
                          <Bot className="h-4.5 w-4.5 text-emerald-650" />
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
                      <Bot className="h-4.5 w-4.5 text-emerald-650 animate-pulse" />
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
                placeholder="Type or click the microphone to speak..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isStreaming || handsFreeVoice.isActive}
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
                  className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-neutral-100 transition-colors cursor-pointer"
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
                    "h-8 w-8 rounded-lg border border-neutral-200 flex items-center justify-center transition-colors shrink-0 cursor-pointer",
                    handsFreeVoice.isActive
                      ? "bg-red-50 text-red-600 border-red-200"
                      : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 bg-white"
                  )}
                  title={handsFreeVoice.isActive ? "Stop Voice Mode" : "Start Voice Assistant"}
                >
                  <Mic className={cn("h-4 w-4", handsFreeVoice.isActive && "animate-pulse text-red-600")} />
                </button>

                <Button
                  type="submit"
                  size="icon"
                  disabled={!message.trim() || isStreaming || handsFreeVoice.isActive}
                  className="bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg h-8 w-8 flex items-center justify-center shrink-0 cursor-pointer"
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

      {/* ===================================================================== */}
      {/* PROFESSIONAL VOICE ASSISTANT MODAL (MINIMAL, CLEAN LEGAL-TECH UX) */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {handsFreeVoice.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl text-center space-y-6"
            >
              {/* STATE 1: LISTENING */}
              {handsFreeVoice.phase === "listening" && (
                <div className="space-y-5">
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-75" />
                    <div className="relative w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                      <Mic className="h-7 w-7" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 font-sans">Listening…</h3>
                    <p className="text-xs text-slate-500">Speak your question — answering automatically when you stop</p>
                  </div>

                  {/* Live real-time transcript preview */}
                  <div className="min-h-[60px] bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs font-serif text-slate-800 leading-relaxed flex items-center justify-center">
                    {handsFreeVoice.liveTranscript ? (
                      <span>"{handsFreeVoice.liveTranscript}"</span>
                    ) : (
                      <span className="text-slate-400 italic font-sans">Speak your question now...</span>
                    )}
                  </div>

                  <div className="flex justify-center gap-3 pt-2">
                    <Button
                      onClick={handsFreeVoice.exit}
                      variant="outline"
                      className="rounded-xl text-xs h-9 px-5 border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* STATE 2: THINKING */}
              {handsFreeVoice.phase === "thinking" && (
                <div className="space-y-5">
                  <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto">
                    <Loader2 className="h-7 w-7 text-blue-600 animate-spin" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 font-sans">Thinking…</h3>
                    <p className="text-xs text-slate-500">Reviewing legal sources and crafting answer...</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs font-serif text-slate-800">
                    "{handsFreeVoice.liveTranscript}"
                  </div>

                  <div className="flex justify-center pt-2">
                    <Button
                      onClick={handsFreeVoice.exit}
                      variant="outline"
                      className="rounded-xl text-xs h-9 px-4 border-slate-200 text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* STATE 3: SPEAKING */}
              {handsFreeVoice.phase === "speaking" && (
                <div className="space-y-5">
                  <div className="w-16 h-16 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center mx-auto">
                    <Volume2 className="h-7 w-7 text-purple-600 animate-bounce" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 font-sans">Speaking…</h3>
                    <p className="text-xs text-slate-500">Reading legal answer aloud</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs font-serif text-slate-800 max-h-[140px] overflow-y-auto leading-relaxed text-left">
                    {handsFreeVoice.currentAiResponse}
                  </div>

                  <div className="flex justify-center gap-3 pt-2">
                    <Button
                      onClick={handsFreeVoice.start}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 px-5 font-semibold cursor-pointer"
                    >
                      <Mic className="h-3.5 w-3.5 mr-1.5" />
                      Ask Next Question
                    </Button>
                    <Button
                      onClick={handsFreeVoice.exit}
                      variant="outline"
                      className="rounded-xl text-xs h-9 px-4 border-slate-200 text-slate-600 cursor-pointer"
                    >
                      Stop & Close
                    </Button>
                  </div>
                </div>
              )}

              {/* STATE 4: IDLE (READY TO SPEAK / PROMPT) */}
              {handsFreeVoice.phase === "idle" && (
                <div className="space-y-5">
                  <button
                    type="button"
                    onClick={handsFreeVoice.start}
                    className="w-20 h-20 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto cursor-pointer hover:scale-105 transition-all shadow-xs"
                  >
                    <Mic className="h-9 w-9 text-emerald-600" />
                  </button>

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 font-sans">Ready to Listen</h3>
                    <p className="text-xs text-slate-500">{handsFreeVoice.errorMessage || "Tap the microphone to speak your legal question."}</p>
                  </div>

                  <div className="flex justify-center gap-3 pt-2">
                    <Button
                      onClick={handsFreeVoice.start}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 px-5 font-semibold cursor-pointer"
                    >
                      <Mic className="h-3.5 w-3.5 mr-1.5" />
                      Tap to Speak
                    </Button>
                    <Button
                      onClick={handsFreeVoice.exit}
                      variant="outline"
                      className="rounded-xl text-xs h-9 px-4 border-slate-200 text-slate-600 cursor-pointer"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}

              {/* STATE 5: ERROR */}
              {handsFreeVoice.phase === "error" && (
                <div className="space-y-5">
                  <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto">
                    <AlertCircle className="h-7 w-7 text-amber-600" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 font-sans">Voice Notification</h3>
                    <p className="text-xs text-slate-500">{handsFreeVoice.errorMessage || "Please allow microphone permissions or tap below to retry."}</p>
                  </div>

                  <div className="flex justify-center gap-3 pt-2">
                    <Button
                      onClick={handsFreeVoice.start}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-9 px-5 font-semibold cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Try Again
                    </Button>
                    <Button
                      onClick={handsFreeVoice.exit}
                      variant="outline"
                      className="rounded-xl text-xs h-9 px-4 border-slate-200 text-slate-600 cursor-pointer"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Chatbot;
