import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  FileUp, 
  Search, 
  Folder, 
  Calendar, 
  Tag, 
  ArrowRight, 
  FileText, 
  Loader2, 
  Sparkles, 
  Files,
  Trash2,
  FileMinus,
  Download,
  BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { listDocuments, uploadDocument, type DocumentSummary } from "@/services/documents";
import { compareDocuments } from "@/services/documentIntelligence";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

const Documents = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Document Compare State
  const [compareDocId1, setCompareDocId1] = useState("");
  const [compareDocId2, setCompareDocId2] = useState("");
  const [isComparing, setIsComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<any | null>(null);

  const fetchDocs = () => {
    listDocuments().then((docs) => {
      setDocuments(docs);
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast({
      title: "Analyzing Document",
      description: `Uploading and building vector index for ${file.name}...`,
    });

    try {
      await uploadDocument(file);
      toast({
        title: "Success",
        description: `Document '${file.name}' processed and indexed in knowledge base.`,
      });
      fetchDocs();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to upload or analyze the document.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCompare = async () => {
    if (!compareDocId1 || !compareDocId2) {
      toast({ title: "Validation Error", description: "Please select two documents to compare.", variant: "destructive" });
      return;
    }
    setIsComparing(true);
    setCompareResult(null);
    try {
      const result = await compareDocuments(compareDocId1, compareDocId2);
      setCompareResult(result);
      toast({ title: "Comparison Completed", description: "AI comparative report generated." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to compare documents.", variant: "destructive" });
    } finally {
      setIsComparing(false);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const titleVal = doc.title || "";
    const typeVal = doc.type || "";
    const matchesSearch = titleVal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      typeVal.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || doc.category === activeTab;
    return matchesSearch && matchesTab;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-2xs font-mono tracking-widest text-neutral-500 uppercase">Synchronizing document vault</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Folder className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-sans">Document Knowledge Vault</h1>
          </div>
          <p className="text-xs text-neutral-500 font-mono uppercase tracking-wider">
            Semantic file indexing, OCR ingestion, and side-by-side comparative analysis
          </p>
        </div>

        {/* Upload Button */}
        <div className="relative">
          <input
            type="file"
            id="file-upload-input"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
            accept=".pdf,.docx,.txt"
          />
          <Button
            asChild
            className="btn-primary cursor-pointer h-9 px-4 font-mono text-[10px] font-bold uppercase tracking-wider"
            disabled={isUploading}
          >
            <label htmlFor="file-upload-input">
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-white" />
                  Indexing vectors...
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4 shrink-0" />
                  Upload Document
                </>
              )}
            </label>
          </Button>
        </div>
      </div>

      {/* Main Split workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
        
        {/* LEFT WORKSPACE: Documents list & Search controls */}
        <div className="space-y-6">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              placeholder="Search indexed dossiers or regulations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-neutral-200 focus:border-emerald-600 focus:outline-none pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-neutral-400 rounded-lg"
            />
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Tracked Files Index</span>
              <span className="text-[9px] font-mono text-emerald-600 font-bold uppercase">{filteredDocs.length} Total Documents</span>
            </div>

            <div className="divide-y divide-neutral-100">
              {filteredDocs.length === 0 ? (
                <div className="text-center py-16 text-slate-400 p-8 space-y-3">
                  <Folder className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-700">No documents found</p>
                  <p className="text-2xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">Upload target contracts or local laws to build reference libraries.</p>
                </div>
              ) : (
                filteredDocs.map((doc) => (
                  <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-neutral-50/30 transition-colors">
                    <div className="space-y-1">
                      <Link to={`/documents/${doc.id}`} className="font-semibold text-xs text-slate-805 hover:text-emerald-700 transition-colors block">
                        📄 {doc.title || doc.name}
                      </Link>
                      <div className="flex items-center gap-2 text-[9px] font-mono text-slate-400">
                        <span className="uppercase font-bold text-emerald-600">{doc.type || "PDF"}</span>
                        <span>·</span>
                        <span>{doc.size || "Unknown Size"}</span>
                        <span>·</span>
                        <span className="font-semibold">ID: {doc.id.substring(0, 8)}...</span>
                      </div>
                    </div>

                    <Button asChild size="sm" variant="ghost" className="h-8 text-2xs font-mono font-bold uppercase tracking-wider text-emerald-700 hover:bg-emerald-50">
                      <Link to={`/documents/${doc.id}`}>
                        Analyze
                        <ArrowRight className="h-3.5 w-3.5 ml-1 shrink-0" />
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Comparative analysis desk */}
        <div className="bg-white border border-neutral-200/80 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Files className="h-4.5 w-4.5 text-emerald-600" />
            <h2 className="text-xs font-mono uppercase text-slate-800 tracking-wider font-bold">Compare Documents</h2>
          </div>

          <div className="space-y-4 font-sans text-xs">
            <div className="space-y-1.5">
              <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Document A (Original Baseline):</label>
              <select
                value={compareDocId1}
                onChange={(e) => setCompareDocId1(e.target.value)}
                className="w-full bg-white border border-neutral-200 text-xs px-2.5 py-1.5 focus:outline-none focus:border-emerald-600 rounded cursor-pointer"
              >
                <option value="">Select original...</option>
                {documents.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Document B (Revised Markup):</label>
              <select
                value={compareDocId2}
                onChange={(e) => setCompareDocId2(e.target.value)}
                className="w-full bg-white border border-neutral-200 text-xs px-2.5 py-1.5 focus:outline-none focus:border-emerald-600 rounded cursor-pointer"
              >
                <option value="">Select revised...</option>
                {documents.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </div>

            <Button 
              onClick={handleCompare} 
              disabled={isComparing || !compareDocId1 || !compareDocId2} 
              className="btn-primary w-full h-9 font-mono text-[10px] font-bold uppercase tracking-wider"
            >
              {isComparing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  Generating comparative audit...
                </>
              ) : (
                "Generate Comparative Report"
              )}
            </Button>
          </div>

          {/* COMPARE RESULTS */}
          <AnimatePresence>
            {compareResult && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4 border-t border-neutral-105 space-y-3"
              >
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Revisions Log</span>
                <div className="p-3 bg-neutral-50/50 border border-neutral-200/40 rounded-xl text-xs space-y-3.5 max-h-[280px] overflow-y-auto font-sans shadow-3xs">
                  {compareResult.modifications && compareResult.modifications.map((m: any, idx: number) => (
                    <div key={idx} className="border-b border-neutral-200/60 pb-3 last:border-0 last:pb-0 space-y-1">
                      <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wide font-mono">[{idx + 1}] Clause: {m.clause_type || "General"}</p>
                      <p className="text-[11px] text-red-650 line-through leading-normal font-serif bg-red-50/30 p-2 border border-red-100/30">Original: "{m.original}"</p>
                      <p className="text-[11px] text-emerald-705 leading-normal font-serif bg-emerald-50/30 p-2 border border-emerald-100/30">Revised: "{m.revised}"</p>
                      <p className="text-[10px] text-slate-500 font-serif leading-relaxed pt-1">Impact Analysis: {m.impact_summary}</p>
                    </div>
                  ))}
                  {(!compareResult.modifications || compareResult.modifications.length === 0) && (
                    <div className="text-center py-4 text-slate-400 font-serif italic text-2xs">No structural clause revisions detected.</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default Documents;
