import { useEffect, useState } from "react";
import { 
  Shield, 
  TriangleAlert, 
  ShieldCheck, 
  Lightbulb, 
  History, 
  Download, 
  Play, 
  FileText, 
  CheckCircle2, 
  Loader2,
  FileDown,
  ArrowRight,
  TrendingUp,
  Volume2
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  getComplianceSnapshot,
  checkCompliance,
  generateComplianceReport,
  getComplianceHistory
} from "@/services/compliance";
import { listDocuments } from "@/services/documents";
import type { ComplianceSnapshot } from "@/types/compliance";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioPlaybackButton } from "@/components/voice/AudioPlaybackButton";
import { motion, AnimatePresence } from "framer-motion";

const ComplianceChecker = () => {
  const [snapshot, setSnapshot] = useState<ComplianceSnapshot>({
    complianceScore: 85,
    riskScore: 15,
    documentsReviewed: 0,
    lastScan: "",
    categoryScores: [
      { category: "Corporate", score: 90 },
      { category: "Labor Laws", score: 80 },
      { category: "SEBI Guide", score: 85 }
    ],
    violations: [],
    recommendations: [],
  });
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Audit Form state
  const [auditQuery, setAuditQuery] = useState("");
  const [auditDocId, setAuditDocId] = useState("");
  const [auditRegs, setAuditRegs] = useState("sebi_regulations");
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);

  const fetchComplianceData = () => {
    Promise.all([
      getComplianceSnapshot(),
      getComplianceHistory(),
      listDocuments()
    ]).then(([snap, hist, docs]) => {
      if (snap && snap.categoryScores) {
        setSnapshot(snap);
      }
      setHistoryLogs(hist);
      setDocuments(docs);
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const handleAudit = async () => {
    setIsAuditing(true);
    setAuditResult(null);
    try {
      const regList = auditRegs.split(",").map(r => r.trim()).filter(Boolean);
      const res = await checkCompliance({
        query: auditQuery || undefined,
        document_id: auditDocId || undefined,
        regulation_ids: regList.length ? regList : undefined
      });

      setAuditResult(res.data || res);
      toast({ title: "Compliance Audit Completed", description: "Vulnerabilities and regulations evaluated." });
      fetchComplianceData();
    } catch (e) {
      toast({ title: "Error", description: "Audit failed.", variant: "destructive" });
    } finally {
      setIsAuditing(false);
    }
  };

  const handleDownloadMarkdownReport = async () => {
    try {
      const regList = auditRegs.split(",").map(r => r.trim()).filter(Boolean);
      const res = await generateComplianceReport({
        query: auditQuery || undefined,
        document_id: auditDocId || undefined,
        regulation_ids: regList.length ? regList : undefined,
        report_format: "markdown"
      });

      if (res && res.report) {
        const blob = new Blob([res.report], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "compliance_report.md");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Report Exported", description: "Downloaded compliance_report.md" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Report export failed.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-2xs font-mono tracking-widest text-neutral-500 uppercase">Analyzing compliance calendars</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-6">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Shield className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-sans">Compliance Control Cabin</h1>
          </div>
          <p className="text-xs text-neutral-500 font-mono uppercase tracking-wider">
            Audit portfolio risks, verify regulatory bounds, and generate downloadable reports
          </p>
        </div>

        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[9px] rounded uppercase font-bold py-1.5 px-3">
          Index active across {snapshot.documentsReviewed || documents.length} files
        </Badge>
      </div>

      {/* Hero Overview metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { title: "Compliance Posture Index", value: `${snapshot.complianceScore || 100}%`, icon: ShieldCheck, color: "text-emerald-600", desc: "Average posture across active files" },
          { title: "Portfolio Risk Factor", value: `${snapshot.riskScore || 0}%`, icon: TriangleAlert, color: "text-amber-500", desc: "Unmitigated contract vulnerabilities" },
          { title: "Vault Files Audited", value: snapshot.documentsReviewed || documents.length, icon: FileText, color: "text-slate-700", desc: "Total vectorized target references" }
        ].map((item, idx) => (
          <div key={idx} className="bg-white border border-neutral-200/60 p-5 rounded-xl shadow-3xs flex justify-between items-center hover:scale-[1.01] hover:shadow-2xs transition-all duration-200">
            <div className="space-y-1">
              <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold">{item.title}</span>
              <p className="text-2xl font-bold text-slate-900 font-sans tracking-tight">{item.value}</p>
              <p className="text-[10px] text-slate-400 font-serif leading-none pt-1">{item.desc}</p>
            </div>
            <div className="w-10 h-10 rounded bg-neutral-50 border border-neutral-200/50 flex items-center justify-center shrink-0 ml-4">
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Split Cockpit layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
        
        {/* LEFT WORKSPACE: Trigger audits & detailed findings */}
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200/80 p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[180px] h-[180px] bg-primary/5 rounded-full blur-[50px] pointer-events-none" />
            
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-5">
              <span className="text-[10px] font-mono text-emerald-600 uppercase font-bold">Trigger In-Depth Audit</span>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Operational query or checklist scope:</label>
                <textarea
                  value={auditQuery}
                  onChange={(e) => setAuditQuery(e.target.value)}
                  placeholder="Describe your compliance check (e.g. Verify if sharing employee identifiers violates the personal privacy norms under the DPDP Act...)"
                  className="w-full bg-white border border-neutral-200 focus:border-emerald-600 focus:outline-none p-3 text-xs text-slate-900 placeholder:text-neutral-400 rounded-lg resize-none leading-relaxed min-h-[90px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Audit Target Document Context:</label>
                  <select
                    value={auditDocId}
                    onChange={(e) => setAuditDocId(e.target.value)}
                    className="w-full bg-white border border-neutral-200 text-xs px-3 py-2 focus:outline-none focus:border-emerald-600 rounded cursor-pointer"
                  >
                    <option value="">Select target file from vault...</option>
                    {documents.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Regulation IDs (Comma Separated):</label>
                  <input
                    type="text"
                    value={auditRegs}
                    onChange={(e) => setAuditRegs(e.target.value)}
                    placeholder="e.g. sebi_regulations, dpdp"
                    className="w-full bg-white border border-neutral-200 text-xs px-3 py-2 focus:outline-none focus:border-emerald-600 rounded"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <Button 
                  onClick={handleAudit} 
                  disabled={isAuditing} 
                  className="btn-primary flex-1 py-4 text-xs font-mono font-bold uppercase tracking-wider h-10"
                >
                  {isAuditing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Scanning regulations...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 mr-2 shrink-0" />
                      Execute Compliance Check
                    </>
                  )}
                </Button>
                
                {auditResult && (
                  <Button onClick={handleDownloadMarkdownReport} variant="outline" className="border-neutral-200 bg-white hover:bg-neutral-50 font-mono text-xs font-bold uppercase tracking-wider h-10 px-5 text-slate-700">
                    <Download className="h-4 w-4 mr-1.5 text-slate-400 shrink-0" />
                    Report Markdown
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* DYNAMIC AUDIT RESULTS HUD PANEL */}
          <AnimatePresence>
            {auditResult && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-neutral-200/80 p-6 rounded-2xl shadow-sm space-y-4"
              >
                <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                    <span className="text-[10px] font-mono text-slate-800 font-bold uppercase">Audit Summary Output</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-mono bg-neutral-100 text-slate-500 border border-neutral-200 px-2 py-0.5 rounded-sm">
                    <Volume2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <AudioPlaybackButton text={auditResult.executive_summary || auditResult.message || ""} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-neutral-50/50 border border-neutral-200/40 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-450">
                      <span>AUDIT RESULT ID: {auditResult.id || "CURRENT_SCAN"}</span>
                      <span className="text-emerald-600 font-bold">SUCCESS</span>
                    </div>
                    <p className="text-xs text-slate-700 font-serif leading-relaxed whitespace-pre-line">
                      {auditResult.executive_summary || auditResult.message || "Audit completed successfully."}
                    </p>
                  </div>

                  {/* Violation gaps */}
                  {auditResult.compliance_gaps && auditResult.compliance_gaps.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[9px] font-mono text-red-500 uppercase tracking-wider block font-bold">Identified Vulnerabilities:</span>
                      <div className="space-y-2.5">
                        {auditResult.compliance_gaps.map((gap: any, idx: number) => (
                          <div key={idx} className="p-3.5 bg-red-50/40 border border-red-150 rounded-xl text-xs text-red-950 font-sans space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-mono text-red-600 font-bold">
                              <span>RULE EXCEPTION: {gap.rule_id || "Gap detected"}</span>
                              <span>SECTOR: {gap.regulatory_section || "General"}</span>
                            </div>
                            <p className="leading-relaxed font-serif text-slate-800">{gap.findings}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT PANEL: Compliance by Category Graph & Posture scores */}
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200/80 p-6 rounded-2xl shadow-sm space-y-6">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Posture By Code Category</span>
            
            <div className="h-60 w-full font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshot.categoryScores} margin={{ top: 10, right: 10, left: -32, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.03)" />
                  <XAxis dataKey="category" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.01)" }} contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '9px' }} />
                  <Bar dataKey="score" fill="#059669" radius={[3, 3, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Audit History Logs Ticker */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Historical Audit Logs</span>
            <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
              {historyLogs.length > 0 ? (
                historyLogs.map((log, idx) => (
                  <div key={idx} className="bg-white border border-neutral-200 p-4 rounded-xl shadow-3xs hover:border-emerald-650 transition-colors space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 mb-1.5">
                        <span>POSTURE LOG</span>
                        <span>{log.timestamp ? new Date(log.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Just Now"}</span>
                      </div>
                      <p className="font-semibold text-2xs text-slate-805 leading-relaxed font-serif line-clamp-3">"{log.executive_summary || "Audit log record"}"</p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-100/60 mt-1">
                      <Badge variant="outline" className="text-[9px] font-mono bg-emerald-50 text-emerald-700 border-emerald-200 uppercase font-bold py-0.5">
                        SCORE: {log.metrics?.overall_compliance_score || 100}%
                      </Badge>
                      <span className="text-[9px] font-mono text-slate-450 ml-auto uppercase font-bold">RISK: {log.metrics?.risk_level || "LOW"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-3xs border border-dashed border-neutral-200 bg-white">No historical audit logs compiled.</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ComplianceChecker;
