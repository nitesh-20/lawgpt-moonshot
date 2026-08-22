import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  Upload,
  Search,
  Folder,
  Calendar,
  Sparkles,
  Files,
  Trash2,
  Download,
  Edit2,
  Eye,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Building,
  User,
  Scale,
  Clock,
  Shield,
  Loader2,
  X,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  FileUp,
  FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  listDocuments,
  uploadDocument,
  deleteDocument,
  renameDocument,
  type DocumentSummary
} from "@/services/documents";
import { compareDocuments } from "@/services/documentIntelligence";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Clean human-friendly title formatter
function formatDocumentTitle(title: string): string {
  if (!title) return "Untitled Legal Document";
  const lower = title.toLowerCase();
  if (lower.includes("sample_fir") || lower.includes("fir")) {
    if (lower.includes("v2")) return "First Information Report (FIR) — Amended Copy";
    return "First Information Report (FIR) — Initial Filing";
  }
  if (lower.includes("lost_phone") || lower.includes("phone_fir")) {
    return "Police Incident Report — Lost Mobile Device Draft";
  }
  if (lower.includes("rental") || lower.includes("lease")) {
    return "Residential Rental & Tenancy Agreement";
  }
  if (lower.includes("nda") || lower.includes("non_disclosure") || lower.includes("confidentiality")) {
    return "Mutual Non-Disclosure & Confidentiality Agreement";
  }
  if (lower.includes("employment") || lower.includes("job") || lower.includes("offer")) {
    return "Executive Employment & Services Contract";
  }
  if (lower.includes("consulting") || lower.includes("consultant")) {
    return "Independent Consulting Services Agreement";
  }
  if (lower.includes("commercial_lease")) {
    return "Commercial Property Lease & Occupancy Deed";
  }
  // Format generic filenames nicely
  const clean = title.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// Categorize file by extension or content
function getDocumentCategory(doc: DocumentSummary): string {
  const t = (doc.title || "").toLowerCase();
  if (t.includes("rental") || t.includes("lease") || t.includes("tenancy")) return "Tenancy & Lease";
  if (t.includes("fir") || t.includes("police") || t.includes("complaint")) return "Police & Regulatory";
  if (t.includes("nda") || t.includes("confidential")) return "Confidentiality";
  if (t.includes("employment") || t.includes("consulting")) return "Employment & HR";
  return "General Commercial";
}

// Format file extension badge
function getExtensionBadge(type: string, title: string) {
  const lower = (type + " " + title).toLowerCase();
  if (lower.includes("pdf")) return { label: "PDF", color: "bg-red-50 text-red-700 border-red-200" };
  if (lower.includes("word") || lower.includes("docx") || lower.includes("doc"))
    return { label: "Word", color: "bg-blue-50 text-blue-700 border-blue-200" };
  if (lower.includes("txt") || lower.includes("text"))
    return { label: "Text", color: "bg-slate-50 text-slate-700 border-slate-200" };
  if (lower.includes("jpg") || lower.includes("png") || lower.includes("image"))
    return { label: "Scan", color: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "Document", color: "bg-neutral-50 text-neutral-700 border-neutral-200" };
}

// Human relative date
function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return "Recently added";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Recently added";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Added today";
    if (diffDays === 1) return "Added yesterday";
    if (diffDays < 7) return `Added ${diffDays} days ago`;
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "Recently added";
  }
}

const Documents = () => {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Modals & Sliders
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentSummary | null>(null);
  const [renameDoc, setRenameDoc] = useState<DocumentSummary | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [deleteDoc, setDeleteDoc] = useState<DocumentSummary | null>(null);

  // Compare Tab / Workspace
  const [isCompareView, setIsCompareView] = useState(false);
  const [compareDocId1, setCompareDocId1] = useState("");
  const [compareDocId2, setCompareDocId2] = useState("");
  const [isComparing, setIsComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<any | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchDocs = async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  // Upload handler
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadDocument(file);
      toast({
        title: "Document Uploaded",
        description: `"${file.name}" has been indexed and added to your legal library.`
      });
      setIsUploadModalOpen(false);
      await fetchDocs();
    } catch (err) {
      console.error(err);
      toast({
        title: "Upload Failed",
        description: "Could not process document. Please verify the file and try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!deleteDoc) return;
    try {
      await deleteDocument(deleteDoc.id);
      toast({
        title: "Document Removed",
        description: `"${deleteDoc.title}" was deleted from your library.`
      });
      setDeleteDoc(null);
      if (previewDoc?.id === deleteDoc.id) setPreviewDoc(null);
      await fetchDocs();
    } catch (err) {
      console.error(err);
      toast({
        title: "Delete Failed",
        description: "Failed to delete document. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Rename handler
  const handleRenameConfirm = async () => {
    if (!renameDoc || !renameInput.trim()) return;
    try {
      await renameDocument(renameDoc.id, renameInput.trim());
      toast({
        title: "Document Renamed",
        description: `Renamed to "${renameInput.trim()}".`
      });
      setRenameDoc(null);
      await fetchDocs();
    } catch (err) {
      console.error(err);
      toast({
        title: "Rename Failed",
        description: "Failed to update title. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Compare handler
  const handleRunCompare = async () => {
    if (!compareDocId1 || !compareDocId2) {
      toast({
        title: "Select Two Documents",
        description: "Please select both an original and an updated document to compare.",
        variant: "destructive"
      });
      return;
    }
    if (compareDocId1 === compareDocId2) {
      toast({
        title: "Identical Documents",
        description: "Please select two different documents to perform a comparison.",
        variant: "destructive"
      });
      return;
    }

    setIsComparing(true);
    setCompareResult(null);

    try {
      const res = await compareDocuments(compareDocId1, compareDocId2);
      if (res && res.results) {
        setCompareResult(res.results);
        toast({
          title: "Comparison Complete",
          description: "Contractual comparison report generated successfully."
        });
      } else {
        throw new Error(res?.detail || "Comparison returned no results");
      }
    } catch (err: any) {
      console.error("Comparison error:", err);
      toast({
        title: "Comparison Notice",
        description: err?.message || "Could not compare these documents. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsComparing(false);
    }
  };

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const title = (doc.title || "").toLowerCase();
      const humanTitle = formatDocumentTitle(doc.title).toLowerCase();
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || title.includes(query) || humanTitle.includes(query);

      const ext = (doc.type + " " + doc.title).toLowerCase();
      let matchesFilter = true;
      if (selectedCategory === "pdf") matchesFilter = ext.includes("pdf");
      else if (selectedCategory === "word") matchesFilter = ext.includes("word") || ext.includes("docx") || ext.includes("doc");
      else if (selectedCategory === "text") matchesFilter = ext.includes("txt") || ext.includes("text");
      else if (selectedCategory === "recent") {
        const d = new Date(doc.lastModified || 0);
        const daysAgo = (Date.now() - d.getTime()) / (1000 * 3600 * 24);
        matchesFilter = daysAgo <= 30;
      }

      return matchesSearch && matchesFilter;
    });
  }, [documents, searchQuery, selectedCategory]);

  const doc1Details = documents.find((d) => d.id === compareDocId1);
  const doc2Details = documents.find((d) => d.id === compareDocId2);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-sans">Loading your legal library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 pb-16">

      {/* ===================================================================== */}
      {/* 1. PAGE HEADER */}
      {/* ===================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Folder className="h-4.5 w-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans">Your Legal Documents</h1>
          </div>
          <p className="text-xs text-slate-500">
            Keep your agreements organized, review them anytime, and compare different versions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsCompareView(!isCompareView)}
            variant="outline"
            className={cn(
              "h-9 text-xs border-slate-200 cursor-pointer font-medium",
              isCompareView && "bg-blue-50 text-blue-700 border-blue-200 font-semibold"
            )}
          >
            <Files className="h-3.5 w-3.5 mr-1.5" />
            {isCompareView ? "View Library" : "Compare Versions"}
          </Button>

          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. COMPARE WORKSPACE (TOGGLED) */}
      {/* ===================================================================== */}
      {isCompareView ? (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-sans">Compare Versions</h2>
              <p className="text-xs text-slate-500">
                See what changed between two versions of a legal document.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Document 1 Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Original Document (Base Version)
                </label>
                <select
                  value={compareDocId1}
                  onChange={(e) => setCompareDocId1(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 cursor-pointer shadow-3xs"
                >
                  <option value="">Select original document...</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {formatDocumentTitle(d.title)} ({d.title})
                    </option>
                  ))}
                </select>
                {doc1Details && (
                  <p className="text-[11px] text-slate-400 font-sans">
                    {doc1Details.size} · {formatRelativeDate(doc1Details.lastModified)}
                  </p>
                )}
              </div>

              {/* Document 2 Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Updated Document (Revised Version)
                </label>
                <select
                  value={compareDocId2}
                  onChange={(e) => setCompareDocId2(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-xs text-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 cursor-pointer shadow-3xs"
                >
                  <option value="">Select updated document...</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {formatDocumentTitle(d.title)} ({d.title})
                    </option>
                  ))}
                </select>
                {doc2Details && (
                  <p className="text-[11px] text-slate-400 font-sans">
                    {doc2Details.size} · {formatRelativeDate(doc2Details.lastModified)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleRunCompare}
                disabled={isComparing || !compareDocId1 || !compareDocId2}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-5 rounded-xl font-semibold cursor-pointer"
              >
                {isComparing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Comparing changes...
                  </>
                ) : (
                  <>
                    <Files className="h-3.5 w-3.5 mr-1.5" />
                    Compare Changes
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* COMPARISON RESULTS REPORT */}
          {compareResult && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600">
                    Document Comparison Report
                  </span>
                  <h3 className="text-base font-bold text-slate-900 font-sans mt-0.5">
                    {formatDocumentTitle(doc1Details?.title || "Version 1")} → {formatDocumentTitle(doc2Details?.title || "Version 2")}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold py-1">
                    {((compareResult.modified_clauses?.length || 0) + (compareResult.inserted_clauses?.length || 0) + (compareResult.deleted_clauses?.length || 0))} changes found
                  </Badge>
                </div>
              </div>

              {/* Executive Comparison Summary */}
              {compareResult.comparison_summary && (
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wide block">
                    Overview of Changes
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-serif">
                    {compareResult.comparison_summary}
                  </p>
                </div>
              )}

              {/* Legal Impact & Risk Shifts */}
              {(compareResult.legal_impact || compareResult.risk_changes) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {compareResult.legal_impact && compareResult.legal_impact !== "None" && (
                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-blue-900 block">Legal Impact Assessment</span>
                      <p className="text-xs text-slate-700 leading-relaxed font-serif">
                        {compareResult.legal_impact}
                      </p>
                    </div>
                  )}

                  {compareResult.risk_changes && compareResult.risk_changes !== "None" && (
                    <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-amber-900 block">Risk Shifts</span>
                      <p className="text-xs text-slate-700 leading-relaxed font-serif">
                        {compareResult.risk_changes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Clause-by-Clause Changes */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Clause-by-Clause Revisions
                </h4>

                {/* Modified Clauses */}
                {compareResult.modified_clauses && compareResult.modified_clauses.map((m: any, idx: number) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white shadow-3xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 font-sans">
                        {m.clause_type || `Modified Clause #${idx + 1}`}
                      </span>
                      <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">
                        Modified
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-red-50/50 border border-red-100 rounded-lg space-y-1">
                        <span className="text-[10px] font-bold text-red-800 uppercase block">Original</span>
                        <p className="text-slate-800 font-serif leading-relaxed line-through decoration-red-400">
                          {m.original_text || m.original || "N/A"}
                        </p>
                      </div>
                      <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg space-y-1">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Updated</span>
                        <p className="text-slate-800 font-serif leading-relaxed">
                          {m.modified_text || m.revised || "N/A"}
                        </p>
                      </div>
                    </div>

                    {(m.difference || m.legal_impact || m.impact_summary) && (
                      <p className="text-xs text-slate-600 font-serif pt-1">
                        <strong className="text-slate-800">Impact: </strong>
                        {m.legal_impact || m.impact_summary || m.difference}
                      </p>
                    )}
                  </div>
                ))}

                {/* Inserted Clauses */}
                {compareResult.inserted_clauses && compareResult.inserted_clauses.map((c: any, idx: number) => (
                  <div key={`ins-${idx}`} className="border border-emerald-200 rounded-xl p-4 space-y-2 bg-emerald-50/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 font-sans">
                        New Clause Added
                      </span>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                        Added
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-800 font-serif leading-relaxed">
                      "{c.clause_text || c.text || c}"
                    </p>
                    {c.impact && (
                      <p className="text-xs text-emerald-900 font-serif">
                        <strong>Impact: </strong>{c.impact}
                      </p>
                    )}
                  </div>
                ))}

                {/* Deleted Clauses */}
                {compareResult.deleted_clauses && compareResult.deleted_clauses.map((c: any, idx: number) => (
                  <div key={`del-${idx}`} className="border border-red-200 rounded-xl p-4 space-y-2 bg-red-50/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-900 font-sans">
                        Clause Removed
                      </span>
                      <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px]">
                        Removed
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-800 font-serif leading-relaxed line-through">
                      "{c.clause_text || c.text || c}"
                    </p>
                    {c.impact && (
                      <p className="text-xs text-red-900 font-serif">
                        <strong>Impact: </strong>{c.impact}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ===================================================================== */
        /* 3. DOCUMENT LIBRARY VIEW */
        /* ===================================================================== */
        <div className="space-y-5">
          {/* Filter Tabs & Search Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: "all", label: "All Documents", count: documents.length },
                { key: "pdf", label: "PDF", count: documents.filter(d => (d.type + d.title).toLowerCase().includes("pdf")).length },
                { key: "word", label: "Word", count: documents.filter(d => (d.type + d.title).toLowerCase().includes("doc")).length },
                { key: "text", label: "Text", count: documents.filter(d => (d.type + d.title).toLowerCase().includes("txt")).length },
                { key: "recent", label: "Recently Added", count: null }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedCategory(tab.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer",
                    selectedCategory === tab.key
                      ? "bg-slate-900 text-white font-semibold shadow-3xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-white border border-slate-200"
                  )}
                >
                  {tab.label}
                  {tab.count !== null && (
                    <span className={cn(
                      "ml-1.5 px-1.5 py-0.2 rounded-full text-[10px]",
                      selectedCategory === tab.key ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-600"
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search your documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:outline-none pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 rounded-lg shadow-3xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Document Table / List */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>All Documents ({filteredDocuments.length})</span>
              <span className="hidden sm:inline text-[11px] text-slate-400">Supported: PDF, DOCX, TXT, JPG, PNG</span>
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">No documents yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Upload an agreement, contract, or legal document to start building your document library.
                </p>
                <div className="pt-2">
                  <Button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4 rounded-lg cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Upload Document
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => {
                  const extBadge = getExtensionBadge(doc.type, doc.title);
                  const humanTitle = formatDocumentTitle(doc.title);
                  const category = getDocumentCategory(doc);

                  return (
                    <div
                      key={doc.id}
                      className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Document Details */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                          <FileText className="h-4.5 w-4.5" />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="font-bold text-xs text-slate-900 hover:text-blue-600 transition-colors text-left truncate cursor-pointer font-sans"
                            >
                              {humanTitle}
                            </button>
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-semibold", extBadge.color)}>
                              {extBadge.label}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                            <span className="text-slate-600 font-medium">{category}</span>
                            <span>·</span>
                            <span>{doc.size || "1.4 KB"}</span>
                            <span>·</span>
                            <span>{formatRelativeDate(doc.lastModified)}</span>
                            <span className="text-slate-400 text-[10px] hidden md:inline">({doc.title})</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          onClick={() => setPreviewDoc(doc)}
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-semibold border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Open
                        </Button>

                        <Button
                          asChild
                          size="sm"
                          className="h-8 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                        >
                          <Link to={`/documents/${doc.id}`}>
                            Analyze
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>

                        {/* Quick options menu */}
                        <div className="relative group/menu">
                          <button
                            type="button"
                            className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>

                          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 hidden group-hover/menu:block group-focus-within/menu:block">
                            <button
                              onClick={() => {
                                setCompareDocId1(doc.id);
                                setIsCompareView(true);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                            >
                              <Files className="h-3.5 w-3.5 text-slate-400" />
                              Compare Version
                            </button>
                            <button
                              onClick={() => {
                                setRenameDoc(doc);
                                setRenameInput(doc.title);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                              Rename
                            </button>
                            <button
                              onClick={() => {
                                const text = doc.results?.executive_summary || "Document export content";
                                const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `${doc.title || "document"}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5 text-slate-400" />
                              Download Copy
                            </button>
                            <div className="my-1 border-t border-slate-100" />
                            <button
                              onClick={() => setDeleteDoc(doc)}
                              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. DOCUMENT PREVIEW / SLIDE-OVER */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex justify-end"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden"
            >
              {/* Preview Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div className="space-y-1">
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                    {getDocumentCategory(previewDoc)}
                  </Badge>
                  <h3 className="text-sm font-bold text-slate-900 font-sans">
                    {formatDocumentTitle(previewDoc.title)}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {previewDoc.size} · {formatRelativeDate(previewDoc.lastModified)}
                  </p>
                </div>

                <button
                  onClick={() => setPreviewDoc(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Document Summary */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Document Overview
                  </h4>
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-serif text-slate-800 leading-relaxed">
                    {previewDoc.results?.executive_summary ||
                      previewDoc.results?.key_findings?.[1] ||
                      "This document is indexed and ready for compliance auditing, clause extraction, and comparison."}
                  </div>
                </div>

                {/* Key Parties & Entities */}
                {previewDoc.results?.entities && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Identified Entities & Parties
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {previewDoc.results.entities.people?.length > 0 && (
                        <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Parties / Persons</span>
                          <span className="font-medium text-slate-800">{previewDoc.results.entities.people.join(", ")}</span>
                        </div>
                      )}
                      {previewDoc.results.entities.dates?.length > 0 && (
                        <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Key Dates</span>
                          <span className="font-medium text-slate-800">{previewDoc.results.entities.dates.slice(0, 3).join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Legal References */}
                {previewDoc.results?.legal_references?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Statutory References
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {previewDoc.results.legal_references.map((r: any, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200 py-1">
                          § {r.reference}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Footer Actions */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
                <Button
                  onClick={() => {
                    setCompareDocId1(previewDoc.id);
                    setPreviewDoc(null);
                    setIsCompareView(true);
                  }}
                  variant="outline"
                  className="text-xs h-9 border-slate-200 cursor-pointer"
                >
                  <Files className="h-3.5 w-3.5 mr-1.5" />
                  Compare Version
                </Button>

                <Button
                  asChild
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-5 font-semibold cursor-pointer"
                >
                  <Link to={`/documents/${previewDoc.id}`}>
                    Analyze Document
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* 5. UPLOAD DOCUMENT DIALOG */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-sans">Upload a Legal Document</h3>
                  <p className="text-xs text-slate-500">
                    Drag and drop a file here, or browse from your computer.
                  </p>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploading}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Upload Dropzone */}
              <label className={cn(
                "border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors space-y-3 bg-slate-50/50",
                isUploading && "pointer-events-none opacity-60"
              )}>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.doc,.txt,.jpg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  disabled={isUploading}
                />
                <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-900">
                    {isUploading ? "Uploading & Indexing Document..." : "Click to browse or drag document here"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Supported: PDF, DOCX, TXT, JPG, PNG (Max 25 MB)
                  </p>
                </div>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploading}
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs h-8 px-4"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* 6. RENAME DOCUMENT DIALOG */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {renameDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4"
            >
              <h3 className="text-base font-bold text-slate-900 font-sans">Rename Document</h3>
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                placeholder="Enter document title..."
                autoFocus
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={() => setRenameDoc(null)}
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs h-8 px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRenameConfirm}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs h-8 px-4 font-semibold"
                >
                  Save Title
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* 7. DELETE CONFIRMATION DIALOG */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {deleteDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4"
            >
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 font-sans">Delete Document?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to remove <strong>"{deleteDoc.title}"</strong>? This will remove the document and its analysis from your library.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={() => setDeleteDoc(null)}
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs h-8 px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteConfirm}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs h-8 px-4 font-semibold"
                >
                  Delete Document
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Documents;
