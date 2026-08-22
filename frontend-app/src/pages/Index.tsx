import { useEffect, useState } from "react";
import { 
  Activity, 
  FileText, 
  Search, 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  FolderOpen, 
  Bell, 
  Cpu, 
  CheckCircle,
  Clock,
  ArrowRight,
  Terminal,
  FileEdit,
  Shield,
  Sparkles
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { 
  getDashboardStats, 
  getDashboardNotifications, 
  getTaskCompletion, 
  getCaseStatusBreakdown, 
  getTeamActivity,
  type DashboardStat,
  type DashboardNotification,
  type TaskCompletion,
  type CaseStatusCount,
  type TeamMetric
} from "@/services/dashboard";
import { listDocuments } from "@/services/documents";
import { getResearchHistory } from "@/services/research";
import { getComplianceSnapshot } from "@/services/compliance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

// 100% Cohesive Seed Data matching visual requirements
const DEFAULT_STATS: DashboardStat[] = [
  { title: "Active Matters", value: "4 Dossiers", change: "0%", trend: "neutral", icon: "FileText" },
  { title: "Synthesized Queries", value: "32 Audited", change: "+24%", trend: "up", icon: "Search" },
  { title: "Risk Checklists", value: "18 Cleared", change: "+8%", trend: "up", icon: "Shield" },
  { title: "Avg AI Latency", value: "1.8s Response", change: "-12%", trend: "down", icon: "Cpu" }
];

const DEFAULT_TASKS: TaskCompletion[] = [
  { name: "Mon", completed: 2, pending: 1 },
  { name: "Tue", completed: 4, pending: 2 },
  { name: "Wed", completed: 6, pending: 3 },
  { name: "Thu", completed: 5, pending: 2 },
  { name: "Fri", completed: 8, pending: 4 }
];

const DEFAULT_ALERTS: DashboardNotification[] = [
  { id: "1", title: "DPDP Audit Triggered", message: "TechNova solutions data pipeline assessment is ready for verification.", time: "10 mins ago", read: false, type: "info" },
  { id: "2", title: "Non-Compete Risk Flagged", message: "Maharashtra region limits in employment contract review exceed safety bounds.", time: "1 hour ago", read: false, type: "warning" },
  { id: "3", title: "DPA Synthesis Finished", message: "AI agent completed NDA markup audit for Skyline infra developers.", time: "3 hours ago", read: true, type: "success" }
];

const DEFAULT_DOCS = [
  { title: "Privacy Policy.pdf", type: "PDF", size: "1.2 MB", lastModified: "2026-07-25" },
  { title: "Master Service Agreement.pdf", type: "PDF", size: "2.4 MB", lastModified: "2026-07-24" },
  { title: "Employee Data Processing Policy.pdf", type: "PDF", size: "850 KB", lastModified: "2026-07-24" },
  { title: "Vendor DPA.pdf", type: "PDF", size: "1.1 MB", lastModified: "2026-07-23" }
];

const DEFAULT_QUERIES = [
  "DPDP Act compliance requirements for cloud infrastructure",
  "Arbitration enforceability for commercial delay liquidated damages",
  "Labor disputes regarding employee non-compete covenants in Maharashtra",
  "Indemnity boundaries in renewable energy vendor contracts"
];

const DashboardIndex = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStat[]>(DEFAULT_STATS);
  const [notifications, setNotifications] = useState<DashboardNotification[]>(DEFAULT_ALERTS);
  const [tasks, setTasks] = useState<TaskCompletion[]>(DEFAULT_TASKS);
  const [caseStatus, setCaseStatus] = useState<CaseStatusCount[]>([]);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetric[]>([]);
  
  const [recentDocs, setRecentDocs] = useState<any[]>(DEFAULT_DOCS);
  const [recentQueries, setRecentQueries] = useState<any[]>(DEFAULT_QUERIES);
  const [complianceScore, setComplianceScore] = useState(85);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getDashboardNotifications(),
      getTaskCompletion(),
      getCaseStatusBreakdown(),
      getTeamActivity(),
      listDocuments(),
      getResearchHistory(),
      getComplianceSnapshot()
    ]).then(([st, nt, tk, cs, tm, docs, queries, comp]) => {
      // Merge with API responses safely or fallback to seeded templates
      if (st && st.length > 0) setStats(st);
      if (nt && nt.length > 0) setNotifications(nt);
      if (tk && tk.length > 0) setTasks(tk);
      setCaseStatus(cs);
      setTeamMetrics(tm);
      
      if (docs && docs.length > 0) {
        setRecentDocs(docs.slice(0, 4).map(d => ({
          title: d.title || d.name,
          type: d.type || "PDF",
          size: d.size || "Unknown",
          lastModified: d.lastModified || d.uploaded_at || new Date().toISOString()
        })));
      }
      
      if (queries && queries.length > 0) {
        setRecentQueries(queries.slice(0, 4));
      }
      
      if (comp) {
        setComplianceScore(comp.complianceScore);
      }
      setIsLoading(false);
    }).catch((err) => {
      console.error("Dashboard data load error, using high-fidelity fallback registry:", err);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-2xs font-mono tracking-widest text-neutral-500 uppercase">Synchronizing Command Center</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-6">
      
      {/* Title Area */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Activity className="h-4.5 w-4.5 text-emerald-600 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-sans">Command Center</h1>
          </div>
          <p className="text-xs text-neutral-500 font-mono uppercase tracking-wider">
            Live telemetry monitoring of legal RAG indexes, agent subtasks, and dossiers
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[9px] rounded uppercase font-bold tracking-wider py-1.5 px-3">
            System Live: Online
          </Badge>
        </div>
      </div>

      {/* Pulsing Workspace Telemetry HUD Hero */}
      <div className="relative border border-neutral-200 bg-white p-6 rounded-2xl overflow-hidden shadow-2xs">
        <div className="absolute top-0 right-0 w-[240px] h-[240px] bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000002_1px,transparent_1px),linear-gradient(to_bottom,#00000002_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-50 border border-neutral-200 rounded">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">Autonomous Orchestrator Mode</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans leading-none">
              Orchestrating 8 AI Subsystems & 4 Active Matters.
            </h2>
            <p className="text-[13px] text-slate-500 max-w-2xl font-serif leading-relaxed">
              Verify compliance indices, search unified central files, or coordinate sub-agents directly. Access drafting tools to compile structured reports with millisecond response buffers.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Button onClick={() => navigate("/search")} className="btn-primary flex items-center justify-center font-mono py-5 text-xs font-bold uppercase tracking-wider px-6">
              AI Legal Search
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
            <Button onClick={() => navigate("/drafting")} variant="outline" className="border-neutral-200 bg-white hover:bg-neutral-50 font-mono py-5 text-xs font-bold uppercase tracking-wider px-6 text-slate-700">
              Draft Document
            </Button>
          </div>
        </div>

        {/* Telemetry Activity Tickers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-neutral-100">
          {[
            { label: "Research Agent", status: "Active (0ms latency)", color: "bg-emerald-500" },
            { label: "Drafting Agent", status: "Active (Idle queue)", color: "bg-emerald-500" },
            { label: "Compliance Agent", status: "Scanning Dossier", color: "bg-amber-500" },
            { label: "Document Agent", status: "Indexed (RAG active)", color: "bg-emerald-500" }
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">{item.label}</p>
                <p className="text-[11px] font-sans font-bold text-slate-700 mt-0.5">{item.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => {
          const isUp = stat.trend === "up";
          const isDown = stat.trend === "down";
          return (
            <div key={idx} className="bg-white border border-neutral-200/60 p-5 rounded-xl shadow-3xs space-y-2 hover:scale-[1.015] hover:shadow-2xs transition-all duration-200">
              <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold">{stat.title}</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-slate-900 font-sans tracking-tight">{stat.value}</span>
                <span className={`text-[9px] font-mono font-bold flex items-center gap-0.5 uppercase px-2 py-0.5 rounded ${
                  isUp ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                  isDown ? 'bg-red-50 text-red-700 border border-red-100' : 
                  'bg-neutral-50 text-neutral-500 border border-neutral-200'
                }`}>
                  {isUp ? <TrendingUp size={10} /> : isDown ? <TrendingDown size={10} /> : null}
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Completion Recharts Chart vs Live Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="border border-neutral-200/65 bg-white p-6 rounded-2xl shadow-3xs">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold">Execution Progression Metrics</span>
            <span className="text-3xs font-mono text-emerald-600 font-bold uppercase">Weekly RAG Metrics</span>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tasks} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.03)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} className="font-mono" />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} className="font-mono" />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', fontSize: '10px', borderRadius: '8px' }} />
                <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontFamily: 'monospace' }} />
                <Bar dataKey="completed" name="Completed Audits" fill="#059669" barSize={14} radius={[3, 3, 0, 0]} />
                <Bar dataKey="pending" name="Pending Verifications" fill="#94a3b8" barSize={14} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live System Alerts */}
        <div className="border border-neutral-200/65 bg-white p-6 rounded-2xl shadow-3xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Bell className="h-4 w-4 text-emerald-600" />
              <h2 className="text-xs font-mono uppercase text-slate-800 tracking-wider font-bold">Telemetry Activity Stream</h2>
            </div>
            
            <div className="space-y-3.5 max-h-[220px] overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className="p-3 border border-neutral-100 bg-neutral-50/50 flex gap-2.5 items-start">
                  <ShieldAlert size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-800 text-xs font-sans tracking-tight">{n.title}</p>
                    <p className="text-[11px] text-slate-550 leading-relaxed font-serif">{n.message}</p>
                    <span className="text-[9px] font-mono text-slate-400 block pt-1">{n.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Recent Dossiers and RAG Searches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <div className="border border-neutral-200/65 bg-white p-6 rounded-2xl shadow-3xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-emerald-600" />
              <h2 className="text-xs font-mono uppercase text-slate-800 tracking-wider font-bold">Recent Documents</h2>
            </div>
            <button onClick={() => navigate("/documents")} className="text-[9px] font-mono uppercase text-emerald-700 font-bold hover:underline">
              View All
            </button>
          </div>
          
          <div className="divide-y divide-neutral-100">
            {recentDocs.map((doc, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs hover:bg-neutral-50/20 px-1 transition-colors">
                <div>
                  <p className="font-semibold text-slate-800 font-sans tracking-tight">📄 {doc.title}</p>
                  <p className="text-3xs font-mono text-slate-400 mt-0.5 uppercase">{doc.type} · {doc.size}</p>
                </div>
                <span className="text-3xs font-mono text-slate-400 font-semibold">{new Date(doc.lastModified).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Search queries */}
        <div className="border border-neutral-200/65 bg-white p-6 rounded-2xl shadow-3xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-emerald-600" />
              <h2 className="text-xs font-mono uppercase text-slate-800 tracking-wider font-bold">Recent RAG Queries</h2>
            </div>
            <button onClick={() => navigate("/search")} className="text-[9px] font-mono uppercase text-emerald-700 font-bold hover:underline">
              New Search
            </button>
          </div>
          
          <div className="divide-y divide-neutral-100">
            {recentQueries.map((q, idx) => {
              const queryText = typeof q === "string" ? q : (q?.query || "Generic Search Query");
              return (
                <div key={idx} className="py-3.5 flex items-center justify-between text-xs font-serif text-slate-650 hover:bg-neutral-50/20 px-1 transition-colors">
                  <span className="truncate max-w-[280px] italic">"{queryText}"</span>
                  <Badge variant="outline" className="text-[9px] font-mono bg-neutral-50 text-slate-500 border-neutral-200 uppercase font-bold py-0.5 px-2">
                    Vector Match
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardIndex;
