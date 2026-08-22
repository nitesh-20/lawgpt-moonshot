import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileText, Users, Scale, Sparkles, Languages, Loader2, Download, AlertTriangle, Pin, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDocumentDetail, summarizeDocument } from "@/services/documentIntelligence";
import type { DocClause, DocumentDetail } from "@/types/documentIntelligence";
import { apiClient } from "@/utils/apiClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AudioPlaybackButton } from "@/components/voice/AudioPlaybackButton";

const RISK_STYLE: Record<DocClause["risk"], string> = {
  high: "bg-red-50 border-l-2 border-red-500 text-neutral-900 hover:bg-red-100/50",
  medium: "bg-amber-50 border-l-2 border-amber-500 text-neutral-900 hover:bg-amber-100/50",
  low: "border-l-2 border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50",
};

const DocumentIntelligence = () => {
  const { id } = useParams();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [selectedClauseId, setSelectedClauseId] = useState<string>("");
  const [translatedClauseText, setTranslatedClauseText] = useState<string | null>(null);
  const [translatedClauseNote, setTranslatedClauseNote] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [translatedSummaryText, setTranslatedSummaryText] = useState<string | null>(null);
  const [isTranslatingSummary, setIsTranslatingSummary] = useState(false);
  const { toast } = useToast();

  const fetchDocDetail = () => {
    if (!id) return;
    getDocumentDetail(id).then((d) => {
      setDoc(d);
      setSelectedClauseId(d.clauses[0]?.id ?? "");
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchDocDetail();
  }, [id]);

  const selectedClause = doc?.clauses.find((c) => c.id === selectedClauseId);

  const SUPPORTED_LANGUAGES = [
    { code: "hi-IN", label: "Hindi" },
    { code: "ta-IN", label: "Tamil" },
    { code: "te-IN", label: "Telugu" },
    { code: "bn-IN", label: "Bengali" }
  ];

  const handleTranslateClause = async (langCode: string) => {
    if (!selectedClause || isTranslating) return;
    setIsTranslating(true);
    try {
      const resText = await apiClient.post("/voice/translate", {
        text: selectedClause.text,
        language_code: langCode,
        speaker: "shubh"
      });
      const resNote = await apiClient.post("/voice/translate", {
        text: selectedClause.note,
        language_code: langCode,
        speaker: "shubh"
      });
      
      if (resText.status === "success") {
        setTranslatedClauseText(resText.data.translated_text || resText.translated_text);
      }
      if (resNote.status === "success") {
        setTranslatedClauseNote(resNote.data.translated_text || resNote.translated_text);
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to translate clause.", variant: "destructive" });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslateSummary = async (langCode: string) => {
    if (!doc?.summary || isTranslatingSummary) return;
    setIsTranslatingSummary(true);
    try {
      const res = await apiClient.post("/voice/translate", {
        text: doc.summary,
        language_code: langCode,
        speaker: "shubh"
      });
      if (res.status === "success") {
        setTranslatedSummaryText(res.data.translated_text || res.translated_text);
        toast({ title: "Summary Translated" });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to translate summary.", variant: "destructive" });
    } finally {
      setIsTranslatingSummary(false);
    }
  };

  const handleClauseClick = (id: string) => {
    setSelectedClauseId(id);
    setTranslatedClauseText(null);
    setTranslatedClauseNote(null);
  };

  const handleReSummarize = async () => {
    if (!id) return;
    setIsSummarizing(true);
    try {
      const summaryText = await summarizeDocument(id);
      if (doc) {
        setDoc({ ...doc, summary: summaryText });
      }
      toast({ title: "Summary Updated", description: "Document summarized successfully." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to summarize document.", variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDownloadAnalysis = () => {
    if (!doc) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(doc, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `analysis_${id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-2xs font-mono tracking-widest text-neutral-500 uppercase">Analyzing contract clauses</div>
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 md:px-6">
      {/* Back button */}
      <div>
        <Link
          to="/documents"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Documents
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
              <FileText className="h-4.5 w-4.5 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">{doc.title}</h1>
          </div>
          <p className="text-xs text-neutral-500 font-mono uppercase tracking-wider">{doc.type} · Document ID {id}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleDownloadAnalysis} className="btn-secondary flex items-center gap-1.5 h-8 text-2xs">
            <Download size={13} />
            Download Analysis JSON
          </Button>
          <Button onClick={handleReSummarize} disabled={isSummarizing} className="btn-primary flex items-center gap-1.5 h-8 text-2xs">
            {isSummarizing ? <Loader2 className="h-3 w-3 animate-spin mr-1 text-white" /> : null}
            Trigger Re-Summary
          </Button>
        </div>
      </div>

      {/* Completeness Check — shown for draft/FIR-style documents reviewed for missing fields */}
      {doc.completenessScore !== null && (
        <div className="glass-card p-6 space-y-5 border-l-4 border-amber-400">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold uppercase tracking-wide text-neutral-800">Missing Information</span>
              </div>
              <ul className="space-y-1.5">
                {doc.missingInformation.map((item, i) => (
                  <li key={i} className="text-xs text-neutral-700 flex items-start gap-2">
                    <span className="text-amber-500">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Pin className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wide text-neutral-800">Suggestions</span>
              </div>
              <ul className="space-y-1.5">
                {doc.suggestions.map((item, i) => (
                  <li key={i} className="text-xs text-neutral-700 flex items-start gap-2">
                    <span className="text-primary">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wide text-neutral-800">AI Verdict</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-neutral-600">
                Completeness Score: <span className="font-bold text-neutral-900">{doc.completenessScore}%</span>
              </span>
              <Badge variant="outline" className="text-[9px] font-mono uppercase bg-amber-50 text-amber-700 border-amber-200">
                {doc.completenessStatus}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Split Pane View */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 items-start">
        {/* Left Side: Document Clause Highlights */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-neutral-50">
            <span className="text-[10px] font-mono text-neutral-500 uppercase">Clause Viewer</span>
            <Badge variant="outline" className="text-[9px] font-mono bg-emerald-50 text-emerald-600 border-emerald-200">Reviewed</Badge>
          </div>
          <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
            {doc.clauses.map((clause) => (
              <button
                key={clause.id}
                type="button"
                onClick={() => handleClauseClick(clause.id)}
                className={`block w-full text-left rounded p-3 transition-all duration-200 ${RISK_STYLE[clause.risk]} ${selectedClauseId === clause.id ? "ring-1 ring-primary" : ""}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-mono uppercase text-primary font-semibold">{clause.label}</span>
                  {clause.risk !== 'low' && (
                    <span className={`text-[8px] font-mono uppercase px-1 bg-white border rounded text-inherit`}>{clause.risk} risk</span>
                  )}
                </div>
                <p className="text-xs leading-relaxed mt-1.5">{clause.text}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: AI summary & Deep Analysis tabs */}
        <div className="space-y-6">
          {selectedClause && (
            <div className="glass-card p-5 bg-primary/[0.02]">
              <div className="flex items-center gap-2 mb-3.5 border-b border-border pb-2.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-mono uppercase text-neutral-800 font-semibold">{selectedClause.label} Analysis</span>
                
                <div className="ml-auto flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-neutral-500 hover:text-neutral-900 transition-colors" title="Translate Clause">
                        {isTranslating ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Languages className="h-3.5 w-3.5" />}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border border-border text-neutral-900">
                      {SUPPORTED_LANGUAGES.map(lang => (
                        <DropdownMenuItem key={lang.code} className="focus:bg-neutral-50 text-xs cursor-pointer" onClick={() => handleTranslateClause(lang.code)}>
                          {lang.label}
                        </DropdownMenuItem>
                      ))}
                      {(translatedClauseText || translatedClauseNote) && (
                        <DropdownMenuItem className="focus:bg-neutral-50 text-xs cursor-pointer text-primary" onClick={() => {
                          setTranslatedClauseText(null);
                          setTranslatedClauseNote(null);
                        }}>
                          Revert to English
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-neutral-700">
                {translatedClauseNote || selectedClause.note}
              </p>
              
              {translatedClauseText && (
                <div className="mt-4 pt-4 border-t border-border">
                  <span className="text-[9px] font-mono uppercase text-primary">Translated Excerpt:</span>
                  <p className="text-xs text-neutral-800 leading-relaxed mt-1.5 p-3 rounded bg-neutral-50 border border-border font-medium">
                    {translatedClauseText}
                  </p>
                </div>
              )}
            </div>
          )}

          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="w-full bg-neutral-50 border border-border p-1 h-9">
              <TabsTrigger value="summary" className="w-full text-2xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Summary</TabsTrigger>
              <TabsTrigger value="entities" className="w-full text-2xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Entities</TabsTrigger>
              <TabsTrigger value="laws" className="w-full text-2xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Laws & Citations</TabsTrigger>
              <TabsTrigger value="risk" className="w-full text-2xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Risk Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="glass-card p-5 mt-3 space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-[10px] font-mono text-neutral-400 uppercase">AI Generated Summary</span>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-neutral-500 hover:text-neutral-900 transition-colors" title="Translate Summary">
                        {isTranslatingSummary ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Languages className="h-3.5 w-3.5" />}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border border-border text-neutral-900">
                      {SUPPORTED_LANGUAGES.map(lang => (
                        <DropdownMenuItem key={lang.code} className="focus:bg-neutral-50 text-xs cursor-pointer" onClick={() => handleTranslateSummary(lang.code)}>
                          {lang.label}
                        </DropdownMenuItem>
                      ))}
                      {translatedSummaryText && (
                        <DropdownMenuItem className="focus:bg-neutral-50 text-xs cursor-pointer text-primary" onClick={() => setTranslatedSummaryText(null)}>
                          Revert to English
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AudioPlaybackButton text={translatedSummaryText || doc.summary} />
                </div>
              </div>
              <p className="text-xs leading-relaxed text-neutral-700">{translatedSummaryText || doc.summary}</p>
            </TabsContent>

            <TabsContent value="entities" className="glass-card p-5 mt-3">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-2xs font-mono uppercase text-neutral-800">Extracted Entities</span>
              </div>
              <div className="space-y-3">
                {doc.entities && doc.entities.length > 0 ? (
                  doc.entities.map((entity) => (
                    <div key={entity.id} className="flex justify-between items-center text-xs py-1.5 border-b border-border/60">
                      <div>
                        <p className="font-semibold text-neutral-800">{entity.name}</p>
                        <p className="text-[10px] text-neutral-500">{entity.value}</p>
                      </div>
                      <Badge variant="secondary" className="text-3xs font-mono uppercase bg-neutral-100">{entity.type}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 text-center py-6">No entities detected.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="laws" className="glass-card p-5 mt-3">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="h-4 w-4 text-primary" />
                <span className="text-2xs font-mono uppercase text-neutral-800">Applicable Laws & Citations</span>
              </div>
              <div className="space-y-3">
                {doc.legalReferences && doc.legalReferences.length > 0 ? (
                  doc.legalReferences.map((ref) => (
                    <div key={ref.id} className="flex justify-between items-center text-xs py-1.5 border-b border-border/60">
                      <p className="text-neutral-800 leading-relaxed">{ref.reference}</p>
                      <Badge variant="secondary" className="text-3xs font-mono uppercase bg-neutral-100 shrink-0 ml-3">{ref.type}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 text-center py-6">
                    No acts, sections, or courts were detected in this document.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="risk" className="glass-card p-5 mt-3">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="h-4 w-4 text-primary" />
                <span className="text-2xs font-mono uppercase text-neutral-800">Risk Factors Detected</span>
              </div>
              <div className="space-y-3">
                {doc.aiNotes && doc.aiNotes.length > 0 ? (
                  doc.aiNotes.map((j) => (
                    <div key={j.id} className="p-3 bg-red-50/50 border border-red-100 rounded text-xs">
                      <p className="text-xs text-red-900 leading-relaxed font-semibold">{j.note}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 text-center py-6">No specific risk notes found.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default DocumentIntelligence;
