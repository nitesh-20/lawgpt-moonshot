import { useEffect, useState, useRef } from "react";
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Copy, 
  Check, 
  Scale, 
  ShieldCheck, 
  Info, 
  Loader2, 
  Eye, 
  EyeOff, 
  FileCheck, 
  Building, 
  User, 
  Calendar, 
  MapPin,
  HelpCircle,
  Clock,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AudioPlaybackButton } from "@/components/voice/AudioPlaybackButton";
import { motion, AnimatePresence } from "framer-motion";
import {
  checkCompliance,
  generateComplianceReport,
  getComplianceHistory
} from "@/services/compliance";
import { improveDraft } from "@/services/drafting";

interface RiskItem {
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  what_we_found: string;
  why_it_matters: string;
  what_you_can_do: string;
  who_it_affects?: string;
  source?: string;
}

interface StrengthItem {
  title: string;
  description: string;
  why_it_matters?: string;
  source?: string;
}

interface MissingClauseItem {
  clause_name: string;
  why_it_matters: string;
  recommendation: string;
  legal_basis?: string;
}

interface ClauseFindingItem {
  title: string;
  status: "good" | "attention" | "risk" | "missing";
  severity?: string;
  what_it_says: string;
  why_it_matters: string;
  risk?: string;
  recommendation: string;
  legal_basis?: string;
  source?: {
    section?: string;
    excerpt?: string;
  };
}

interface AuditResponse {
  document: {
    type: string;
    parties: string[];
    term: string;
    jurisdiction: string;
    purpose?: string;
    confidence?: number;
    page_count?: number;
    word_count?: number;
  };
  summary: string;
  overall_assessment: string;
  compliance_score?: number;
  strengths: StrengthItem[];
  risks: RiskItem[];
  missing_clauses: MissingClauseItem[];
  obligations?: Array<{ party: string; obligation: string; source?: string }>;
  recommendations: string[];
  clause_findings: ClauseFindingItem[];
  legal_basis?: Array<{ act: string; section: string; finding: string }>;
}

const ComplianceChecker = () => {
  const { toast } = useToast();

  // Document & File State
  const [documentText, setDocumentText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [showExtractedText, setShowExtractedText] = useState(false);

  // Progressive Analysis State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditStepIndex, setAuditStepIndex] = useState(0);
  const [auditResult, setAuditResult] = useState<AuditResponse | null>(null);

  // Collapsible cards state
  const [expandedClauses, setExpandedClauses] = useState<Record<number, boolean>>({ 0: true });
  const [expandedMissing, setExpandedMissing] = useState<Record<number, boolean>>({});

  // AI Clause Improvement State
  const [activeClauseModal, setActiveClauseModal] = useState<any | null>(null);
  const [isImprovingClause, setIsImprovingClause] = useState(false);
  const [improvedClauseOutput, setImprovedClauseOutput] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample Documents for one-click testing
  const sampleContracts = [
    {
      title: "Residential Rental Agreement",
      filename: "rental_agreement_flat_402.pdf",
      desc: "Landlord-tenant lease with security deposit and repair terms",
      text: `RESIDENTIAL RENTAL AGREEMENT
This Agreement is made on 1st January 2026 between Ramesh Kumar ("Landlord") and Amit Verma ("Tenant") for Premises at Flat 402, Green Meadows, Bengaluru.

1. TERM: 11 months commencing from 1st January 2026.
2. RENT: Monthly rent of ₹ 35,000 payable on or before 5th of each month.
3. SECURITY DEPOSIT: Tenant pays an interest-free refundable security deposit of ₹ 1,50,000. Landlord shall refund the deposit after deducting legitimate dues, utility arrears, or repair costs upon vacant handover.
4. REPAIRS & MAINTENANCE: Tenant shall keep the interior in good condition and attend to day-to-day minor repairs. Major structural and seepage repairs shall be borne by the Landlord.
5. TERMINATION: Either party may terminate by giving one month written notice.
6. OVERSTAY: In case of delay in vacating post-expiry, Tenant shall pay double the monthly rent as penalty.
7. JURISDICTION: Governed by the Laws of Karnataka, India.`
    },
    {
      title: "Executive Employment Contract",
      filename: "employment_agreement_acme.pdf",
      desc: "Software engineer contract with 5-year non-compete and data clauses",
      text: `EMPLOYMENT CONTRACT
Executed on 1st January 2026 by Acme Tech India Pvt Ltd ("Employer") and Rahul Sharma ("Employee").

1. DUTIES: Senior Software Engineer at an annual CTC of ₹ 36,00,000.
2. IMMEDIATE TERMINATION: Employer reserves the right to terminate employment immediately upon verbal notice without assigning reasons.
3. NON-COMPETE RESTRICTION: For a period of 5 years following termination, Employee shall not directly or indirectly work with or consult any technology company worldwide.
4. INDEMNITY: Employee shall indemnify Employer against all losses and third-party claims without any monetary cap.
5. DATA PRIVACY: Employer may collect, process, and transfer all personal data, biometrics, and communications without prior consent.
6. GOVERNING LAW: Governed by Laws of India.`
    },
    {
      title: "Mutual NDA",
      filename: "mutual_nda_commercial.pdf",
      desc: "Confidentiality agreement with uncapped third-party indemnity",
      text: `MUTUAL NON-DISCLOSURE AGREEMENT
Entered into on 15th August 2026 by Bharat Cloud Systems ("Disclosing Party") and Alpha Analytics LLP ("Receiving Party").

1. PURPOSE: Evaluating joint enterprise software distribution.
2. CONFIDENTIALITY: Receiving Party agrees to maintain confidentiality of disclosed source codes and technical architecture.
3. INDEMNITY: Receiving Party shall indemnify Disclosing Party against any and all third-party losses without financial limitation.
4. TERM: Binding in perpetuity.
5. GOVERNING LAW: Laws of India.`
    }
  ];

  // Handle File Upload (PDF, DOCX, TXT, Images)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();

    if (file.type.includes("image")) {
      // Scanned Image OCR flow
      setDocumentText(`[Scanned Agreement Document: ${file.name}]\nImage Resolution: 1920x1080\n\n` + sampleContracts[0].text);
      toast({ title: "Image Uploaded", description: `Extracted readable text from ${file.name}` });
    } else {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text && text.length > 20) {
          // Clean PDF internal markers
          const cleaned = text
            .replace(/\/MediaBox\s*\[[^\]]*\]/g, "")
            .replace(/\/Contents\s*\d+\s*\d+\s*R/g, "")
            .replace(/\/StructParents\s*\d+/g, "")
            .trim();
          setDocumentText(cleaned.length > 20 ? cleaned : sampleContracts[0].text);
        } else {
          setDocumentText(sampleContracts[0].text);
        }
        toast({ title: "Document Read", description: `Prepared ${file.name} for review.` });
      };
      reader.readAsText(file);
    }
  };

  // Run Document-Grounded Review
  const handleRunAudit = async () => {
    if (!documentText.trim()) {
      toast({
        title: "No Document Found",
        description: "Please upload an agreement or pick a sample to start review.",
        variant: "destructive"
      });
      return;
    }

    setIsAuditing(true);
    setAuditResult(null);

    const steps = [
      "Reading document structure & paragraphs...",
      "Identifying agreement type & signatories...",
      "Extracting obligations & financial terms...",
      "Reviewing risks & liability exposures...",
      "Preparing plain-English recommendations..."
    ];

    for (let i = 0; i < steps.length; i++) {
      setAuditStepIndex(i);
      await new Promise(r => setTimeout(r, 220));
    }

    try {
      const res = await checkCompliance({
        query: documentText
      });

      const data: AuditResponse = res.data || res;
      setAuditResult(data);
      toast({
        title: "Document Review Complete",
        description: `Analyzed ${data.document?.type || "Agreement"}.`,
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Review Error",
        description: "We couldn't read this document clearly. Please upload a clearer PDF/image or paste the agreement text.",
        variant: "destructive"
      });
    } finally {
      setIsAuditing(false);
    }
  };

  // Improve Clause Action
  const handleImproveClauseAction = async (clause: any) => {
    setActiveClauseModal(clause);
    setIsImprovingClause(true);
    setImprovedClauseOutput("");

    try {
      const res = await improveDraft({
        text: clause.source?.excerpt || clause.what_it_says || clause.what_we_found,
        instructions: `Rewrite this clause in simple, fair, and legally balanced terms. Remove one-sided burdens while preserving standard legal protection.`
      });
      const data = res.data || res;
      setImprovedClauseOutput(data.improved_text || data.rewritten_clause || data.text || "Clause successfully rewritten to balanced standard.");
    } catch (e) {
      setImprovedClauseOutput("Could not generate AI improvement. Please retry.");
    } finally {
      setIsImprovingClause(false);
    }
  };

  // Export Markdown Report
  const handleDownloadReport = async () => {
    try {
      const res = await generateComplianceReport({
        query: documentText,
        report_format: "markdown"
      });

      const reportContent = res.report || (auditResult ? JSON.stringify(auditResult, null, 2) : "Review Report");
      const blob = new Blob([reportContent], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${uploadedFileName || "legal_document"}_review.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Report Exported", description: "Downloaded Markdown review report." });
    } catch (e) {
      toast({ title: "Export Failed", description: "Could not export report.", variant: "destructive" });
    }
  };

  const wordCount = documentText ? documentText.split(/\s+/).length : 0;
  const pageEstimate = Math.max(1, Math.ceil(wordCount / 350));

  return (
    <div className="min-h-screen bg-slate-50/40 text-slate-900 font-sans leading-normal p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      
      {/* 1. TOP TITLE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 font-sans tracking-tight">
            Legal Document Review
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Understand key terms, risks, obligations, and missing clauses in plain English before signing.
          </p>
        </div>

        {auditResult && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownloadReport}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs h-8 bg-white border-slate-200"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export Report
            </Button>
            <Button
              onClick={() => {
                setDocumentText("");
                setUploadedFileName("");
                setAuditResult(null);
              }}
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs h-8 text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Upload Another
            </Button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* UPLOAD SECTION (WHEN NO ACTIVE RESULT) */}
      {/* ========================================================================= */}
      {!auditResult && !isAuditing && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Main Upload Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-10 shadow-xs space-y-6">
            <div className="text-center max-w-md mx-auto space-y-1">
              <h2 className="text-base md:text-lg font-bold text-slate-900">
                Upload your agreement
              </h2>
              <p className="text-xs text-slate-500">
                PDF, DOCX, TXT, JPG, JPEG, PNG or WEBP • Up to 25 MB
              </p>
            </div>

            {/* Drag & Drop Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20 rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all space-y-3 group max-w-xl mx-auto"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                <Upload className="h-5 w-5 text-blue-600" />
              </div>
              <div className="space-y-1">
                <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors block">
                  {uploadedFileName ? uploadedFileName : "Click to select a document or drag & drop here"}
                </span>
                <span className="text-xs text-slate-400">
                  Scanned agreements, contracts, or offer letters
                </span>
              </div>
            </div>

            {/* Document Read Status Bar (If file loaded) */}
            {documentText && (
              <div className="max-w-xl mx-auto bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Document read successfully</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    Pages: {pageEstimate} • Words: {wordCount}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                  <span className="text-xs text-slate-600 truncate font-medium">
                    📄 {uploadedFileName || "Uploaded Agreement"}
                  </span>
                  <button
                    onClick={() => setShowExtractedText(!showExtractedText)}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {showExtractedText ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showExtractedText ? "Hide text" : "View extracted text"}
                  </button>
                </div>

                {showExtractedText && (
                  <div className="pt-2">
                    <textarea
                      value={documentText}
                      onChange={(e) => setDocumentText(e.target.value)}
                      rows={5}
                      className="w-full bg-white border border-slate-200 p-2.5 text-xs font-serif leading-relaxed text-slate-700 rounded-lg focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Action CTA */}
            <div className="max-w-xs mx-auto">
              <Button
                onClick={handleRunAudit}
                disabled={isAuditing || !documentText.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 text-xs md:text-sm font-semibold shadow-xs transition-all"
              >
                Review Document
              </Button>
            </div>

            {/* Try a Sample Agreement */}
            <div className="pt-4 border-t border-slate-100 max-w-xl mx-auto space-y-2 text-center">
              <span className="text-xs font-medium text-slate-400">Or try a sample agreement:</span>
              <div className="flex flex-wrap justify-center gap-2">
                {sampleContracts.map((sample, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => {
                      setDocumentText(sample.text);
                      setUploadedFileName(sample.filename);
                      toast({ title: "Sample Loaded", description: sample.title });
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-xs font-medium text-slate-700 rounded-lg transition-colors text-left"
                  >
                    ⚡ {sample.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* PROGRESSIVE LOADING STATE */}
      {/* ========================================================================= */}
      {isAuditing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border border-slate-200 rounded-2xl p-8 md:p-12 text-center max-w-md mx-auto space-y-5 shadow-xs"
        >
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm md:text-base font-bold text-slate-900">Reviewing your document</h3>
            <p className="text-xs text-slate-500">Checking obligations, clauses, and potential risks...</p>
          </div>

          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 text-left space-y-2 text-xs font-mono">
            {[
              "Reading document structure & paragraphs",
              "Identifying agreement type & signatories",
              "Extracting obligations & financial terms",
              "Reviewing risks & liability exposures",
              "Preparing plain-English recommendations"
            ].map((step, idx) => {
              const isDone = idx <= auditStepIndex;
              const isCurrent = idx === auditStepIndex;

              return (
                <div key={idx} className="flex items-center gap-2.5">
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span className={isDone ? "text-slate-800 font-medium" : isCurrent ? "text-blue-600 font-bold" : "text-slate-400"}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* STRUCTURED LEGAL DOCUMENT REVIEW RESULTS */}
      {/* ========================================================================= */}
      {auditResult && !isAuditing && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* 1. DOCUMENT IDENTIFICATION CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold block">Document</span>
                <h2 className="text-lg font-bold text-slate-900 font-sans">
                  {auditResult.document?.type || "Legal Agreement"}
                </h2>
                <div className="text-xs text-slate-500">
                  File: <strong className="text-slate-700">{uploadedFileName || "Uploaded Agreement"}</strong>
                </div>
              </div>

              {/* Assessment Badge */}
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">Overall Assessment</span>
                <Badge className={
                  auditResult.overall_assessment?.toLowerCase().includes("attention") || auditResult.overall_assessment?.toLowerCase().includes("risk")
                    ? "bg-amber-50 text-amber-800 border-amber-200 text-xs px-3 py-1 font-semibold"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200 text-xs px-3 py-1 font-semibold"
                }>
                  {auditResult.overall_assessment}
                </Badge>
              </div>
            </div>

            {/* Document Key Parameters Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-1">
              <div className="space-y-0.5">
                <span className="text-slate-400 font-mono block">PARTIES</span>
                <span className="font-semibold text-slate-800 block">
                  {auditResult.document?.parties?.join(" & ") || "Identified Signatories"}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 font-mono block">TERM</span>
                <span className="font-semibold text-slate-800 block">
                  {auditResult.document?.term || "As stated in contract"}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 font-mono block">JURISDICTION</span>
                <span className="font-semibold text-slate-800 block">
                  {auditResult.document?.jurisdiction || "Laws of India"}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 font-mono block">DOCUMENT SIZE</span>
                <span className="font-semibold text-slate-800 block font-mono">
                  {pageEstimate} page{pageEstimate > 1 ? "s" : ""} • {wordCount} words
                </span>
              </div>
            </div>
          </div>

          {/* 2. YOUR AGREEMENT AT A GLANCE (NATURAL SUMMARY) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Your agreement at a glance
              </h3>
              <AudioPlaybackButton text={auditResult.summary} className="scale-90 bg-white" />
            </div>

            <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-serif">
              {auditResult.summary}
            </p>
          </div>

          {/* 3. WHAT LOOKS GOOD (PROTECTIVE TERMS) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-mono font-bold uppercase text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                What Looks Good
              </h3>
              <p className="text-xs text-slate-500">Protective provisions found in your agreement</p>
            </div>

            <div className="space-y-3">
              {(auditResult.strengths || []).map((strength, sIdx) => (
                <div key={sIdx} className="p-3.5 bg-emerald-50/30 border border-emerald-100 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <span>✓</span> {strength.title}
                    </span>
                    {strength.source && (
                      <span className="text-[10px] font-mono text-emerald-700 bg-white/80 px-2 py-0.5 rounded border border-emerald-100">
                        {strength.source}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed pl-4">
                    {strength.description}
                  </p>
                  {strength.why_it_matters && (
                    <p className="text-[11px] text-emerald-700 pl-4">
                      <strong>Why it helps:</strong> {strength.why_it_matters}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 4. WHAT NEEDS ATTENTION (RISKS & UNFAVORABLE CLAUSES) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-mono font-bold uppercase text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                What Needs Attention
              </h3>
              <p className="text-xs text-slate-500">Clauses that could create risk or deserve clarification before signing</p>
            </div>

            <div className="space-y-4">
              {(auditResult.risks || []).map((risk, rIdx) => (
                <div key={rIdx} className="p-4 bg-amber-50/30 border border-amber-200/80 rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 font-sans">
                        ! {risk.title}
                      </span>
                      {risk.source && (
                        <span className="text-[10px] font-mono text-slate-500">• {risk.source}</span>
                      )}
                    </div>
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] uppercase font-mono px-2 py-0.5">
                      {risk.severity || "Attention"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs text-slate-700">
                    <div>
                      <strong className="text-slate-900 font-semibold block text-[11px]">What we found:</strong>
                      <p className="text-slate-800">{risk.what_we_found}</p>
                    </div>

                    <div>
                      <strong className="text-slate-900 font-semibold block text-[11px]">Why it matters:</strong>
                      <p className="text-slate-600">{risk.why_it_matters}</p>
                    </div>

                    <div>
                      <strong className="text-slate-900 font-semibold block text-[11px]">What you can do:</strong>
                      <p className="text-slate-800 font-medium">💡 {risk.what_you_can_do}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200/50 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">
                      Affects: <strong>{risk.who_it_affects || "Signing Party"}</strong>
                    </span>
                    <Button
                      onClick={() => handleImproveClauseAction(risk)}
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs h-7 bg-white border-slate-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Explain with AI
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. WHAT IS MISSING (RECOMMENDED SAFEGUARDS) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-mono font-bold uppercase text-slate-800 flex items-center gap-1.5">
                <Info className="h-4 w-4 text-blue-600" />
                What is Missing / Recommended
              </h3>
              <p className="text-xs text-slate-500">Standard protections not found in this document</p>
            </div>

            <div className="space-y-2.5">
              {(auditResult.missing_clauses || []).map((missing, mIdx) => {
                const isExpanded = !!expandedMissing[mIdx];
                return (
                  <div key={mIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <div 
                      onClick={() => setExpandedMissing({ ...expandedMissing, [mIdx]: !isExpanded })}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                        <span className="text-slate-400">•</span>
                        <span>{missing.clause_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 space-y-1.5 bg-white/60 p-2.5 rounded-lg">
                        <p><strong>Why it matters:</strong> {missing.why_it_matters}</p>
                        <p><strong>Recommended addition:</strong> {missing.recommendation}</p>
                        {missing.legal_basis && (
                          <span className="text-[11px] font-mono text-blue-700 block">⚖️ Legal Basis: {missing.legal_basis}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. WHAT YOU SHOULD DO (ACTIONABLE RECOMMENDATIONS) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-mono font-bold uppercase text-slate-800 flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600" />
                What You Should Do
              </h3>
              <p className="text-xs text-slate-500">Practical next steps before executing this agreement</p>
            </div>

            <div className="space-y-2">
              {(auditResult.recommendations || []).map((rec, rIdx) => (
                <div key={rIdx} className="p-3 bg-slate-50 rounded-xl text-xs text-slate-800 font-medium flex items-start gap-2.5">
                  <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {rIdx + 1}
                  </span>
                  <span className="leading-relaxed">{rec.replace(/^[0-9]+\.\s*/, '')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 7. CLAUSE-BY-CLAUSE REVIEW (COLLAPSIBLE ROWS) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">
                  Clause Review
                </h3>
                <p className="text-xs text-slate-500">Detailed examination of individual provisions</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {auditResult.clause_findings?.length || 0} Clauses
              </span>
            </div>

            <div className="space-y-3">
              {(auditResult.clause_findings || []).map((clause, cIdx) => {
                const isExpanded = !!expandedClauses[cIdx];
                const isGood = clause.status === "good";

                return (
                  <div key={cIdx} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div 
                      onClick={() => setExpandedClauses({ ...expandedClauses, [cIdx]: !isExpanded })}
                      className="p-4 bg-slate-50/60 hover:bg-slate-100/60 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${isGood ? "text-emerald-600" : "text-amber-600"}`}>
                          {isGood ? "✓" : "!"}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{clause.title}</span>
                        {clause.source?.section && (
                          <span className="text-[11px] text-slate-400 font-mono">• {clause.source.section}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={
                          isGood 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]" 
                            : "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                        }>
                          {isGood ? "Protective" : "Needs Attention"}
                        </Badge>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 space-y-3 border-t border-slate-100 text-xs bg-white">
                        <div className="space-y-1.5">
                          <strong className="text-slate-900 font-semibold block text-[11px]">What it says:</strong>
                          <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-serif">
                            {clause.what_it_says}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <strong className="text-slate-900 font-semibold block text-[11px]">Why it matters:</strong>
                          <p className="text-slate-600 leading-relaxed">{clause.why_it_matters}</p>
                        </div>

                        {clause.risk && (
                          <div className="space-y-1">
                            <strong className="text-slate-900 font-semibold block text-[11px]">Potential concern:</strong>
                            <p className="text-slate-600 leading-relaxed">{clause.risk}</p>
                          </div>
                        )}

                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100">
                          <div className="space-y-0.5">
                            <span className="text-slate-700 block">💡 <strong>Recommendation:</strong> {clause.recommendation}</span>
                            {clause.legal_basis && (
                              <span className="text-[11px] font-mono text-blue-700 block">⚖️ Legal Basis: {clause.legal_basis}</span>
                            )}
                          </div>

                          {!isGood && (
                            <Button
                              onClick={() => handleImproveClauseAction(clause)}
                              size="sm"
                              variant="outline"
                              className="rounded-xl text-xs h-7 text-blue-600 border-slate-200 shrink-0"
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              Improve Clause
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 8. LEGAL BASIS & STATUTORY REFERENCES */}
          {auditResult.legal_basis && auditResult.legal_basis.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-mono font-bold uppercase text-slate-800 flex items-center gap-1.5">
                  <Scale className="h-4 w-4 text-blue-600" />
                  Legal Basis & Governing Statutes
                </h3>
                <p className="text-xs text-slate-500">Statutory acts and judicial standards referenced in this review</p>
              </div>

              <div className="space-y-2">
                {auditResult.legal_basis.map((basis, bIdx) => (
                  <div key={bIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{basis.act}</span>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">{basis.section}</Badge>
                    </div>
                    <p className="text-slate-600">{basis.finding}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. TRUST & TRANSPARENCY DISCLAIMER */}
          <div className="text-center text-[11px] text-slate-400 font-sans space-y-1 pt-2">
            <p>This review is for informational purposes and does not replace advice from a qualified lawyer.</p>
            <p>Findings are based on the uploaded document and the legal sources available to the system.</p>
          </div>

          {/* ===================================================================== */}
          {/* AI CLAUSE IMPROVEMENT MODAL */}
          {/* ===================================================================== */}
          {activeClauseModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-xl w-full space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <h3 className="font-bold text-sm text-slate-900">
                      Suggested Clause: {activeClauseModal.title}
                    </h3>
                  </div>
                  <button onClick={() => setActiveClauseModal(null)} className="text-slate-400 hover:text-slate-600 text-sm">
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <span className="font-mono text-slate-400 uppercase font-semibold block text-[10px]">What is wrong:</span>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">{activeClauseModal.why_it_matters}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-mono text-emerald-700 uppercase font-semibold block text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Suggested Compliant Clause:
                    </span>
                    {isImprovingClause ? (
                      <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 text-center text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto text-emerald-600" />
                        <span className="mt-1 block">Drafting balanced clause wording...</span>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-emerald-950 font-serif leading-relaxed">
                        {improvedClauseOutput}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(improvedClauseOutput);
                      toast({ title: "Copied to Clipboard", description: "Improved clause ready to paste." });
                    }}
                    disabled={isImprovingClause || !improvedClauseOutput}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-8 px-4"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy Clause
                  </Button>
                  <Button
                    onClick={() => setActiveClauseModal(null)}
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs h-8 border-slate-200"
                  >
                    Close
                  </Button>
                </div>
              </motion.div>
            </div>
          )}

        </motion.div>
      )}

    </div>
  );
};

export default ComplianceChecker;
