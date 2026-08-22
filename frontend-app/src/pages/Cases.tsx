import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Scale, FilterIcon, Calendar, Clipboard, Users, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewCaseDialog } from "@/components/cases/NewCaseDialog";
import { Case } from "@/types/case";
import { listCases, createCase, type CaseInput } from "@/services/cases";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// 4 Realistic Legal Dossier Seed Cases
const DEMO_CASES: Case[] = [
  {
    id: "demo-case-1",
    user_id: "default-user",
    party_name: "TechNova Solutions Pvt. Ltd.",
    case_number: "DPDP Act Compliance Assessment",
    court_name: "Ministry of Electronics & IT",
    stage: "Corporate compliance review under the Digital Personal Data Protection Act, 2023.",
    status: "active",
    priority: "high",
    jurisdiction: "India",
    case_type: "Compliance",
    created_at: "2026-07-20T10:00:00Z",
    updated_at: "2026-07-25T18:30:00Z",
    next_date: "2026-08-15T00:00:00Z",
    assigned_lawyer: "Aarav Mehta",
    documents: ["Privacy Policy.pdf", "Employee Data Processing Policy.pdf", "Vendor DPA.pdf"],
    ai_notes: "Completed initial mapping of employee database. Found high vulnerability in vendor processing clause 14. Recommend immediate NDA/DPA updates.",
    compliance_status: "Pending Vendor Audit (78% compliant)",
    recent_activity: [
      { date: "25 Jul 2026", activity: "Ingested employee policy logs for semantic audit." },
      { date: "22 Jul 2026", activity: "Completed regulatory gap analysis mapping." }
    ],
    hearings: []
  },
  {
    id: "demo-case-2",
    user_id: "default-user",
    party_name: "Skyline Infra Developers",
    case_number: "Commercial Contract Dispute",
    court_name: "Delhi High Court",
    stage: "Dispute regarding delayed project delivery and payment obligations.",
    status: "pending",
    priority: "medium",
    jurisdiction: "Delhi High Court",
    case_type: "Commercial",
    created_at: "2026-07-18T10:00:00Z",
    updated_at: "2026-07-24T15:20:00Z",
    next_date: "2026-08-22T00:00:00Z",
    assigned_lawyer: "Riya Sharma",
    documents: ["Master Service Agreement.pdf", "Purchase Order.pdf", "Email Communications.pdf"],
    ai_notes: "Claimant alleges delay of 45 days. Defense cites force majeure due to municipal clearance delays. Probability of success in arbitration: 64%.",
    compliance_status: "Under Arbitration Assessment",
    recent_activity: [
      { date: "24 Jul 2026", activity: "Added communications email chain to RAG index." },
      { date: "20 Jul 2026", activity: "Drafted reply to motion for interim relief." }
    ],
    hearings: []
  },
  {
    id: "demo-case-3",
    user_id: "default-user",
    party_name: "HealthPlus Hospitals",
    case_number: "Employment Agreement Review",
    court_name: "Labor Commission, Mumbai",
    stage: "Review of employment contracts and HR compliance.",
    status: "under_review",
    priority: "medium",
    jurisdiction: "India",
    case_type: "Employment",
    created_at: "2026-07-15T09:00:00Z",
    updated_at: "2026-07-23T11:15:00Z",
    next_date: undefined,
    assigned_lawyer: "Kabir Singh",
    documents: ["Employment Agreement.pdf", "HR Policy.pdf", "Offer Letter.pdf"],
    ai_notes: "Audited non-compete covenants. Found Maharashtra state restrictions render clause 9 partially unenforceable. Recommend lowering radius limits.",
    compliance_status: "Awaiting Counsel Sign-off",
    recent_activity: [
      { date: "23 Jul 2026", activity: "Analyzed non-compete clause validity under Section 27." },
      { date: "19 Jul 2026", activity: "Uploaded offer letters repository." }
    ],
    hearings: []
  },
  {
    id: "demo-case-4",
    user_id: "default-user",
    party_name: "GreenGrid Energy Ltd.",
    case_number: "Vendor Agreement Audit",
    court_name: "National Green Tribunal",
    stage: "AI audit of vendor agreement and contractual obligations.",
    status: "closed",
    priority: "low",
    jurisdiction: "Mumbai",
    case_type: "Corporate",
    created_at: "2026-06-10T11:00:00Z",
    updated_at: "2026-07-10T16:45:00Z",
    next_date: undefined,
    assigned_lawyer: "Neha Kapoor",
    documents: ["Vendor Agreement.pdf", "Audit Report.pdf", "Compliance Checklist.pdf"],
    ai_notes: "Audit concluded successfully. Indemnity clauses aligned with national grid safety guidelines. Low risk rating confirmed.",
    compliance_status: "100% Compliant (Archived)",
    recent_activity: [
      { date: "10 Jul 2026", activity: "Archived case dossier after final corporate sign-off." },
      { date: "05 Jul 2026", activity: "Generated risk audit report summary." }
    ],
    hearings: []
  }
];

const Cases = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showNewCaseDialog, setShowNewCaseDialog] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("recent");

  // Details Drawer States
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const fetchCasesData = () => {
    listCases().then((storedCases) => {
      // De-duplicate cases so they don't overlay
      const filteredStored = storedCases.filter(
        sc => !DEMO_CASES.some(dc => dc.id === sc.id || dc.party_name === sc.party_name)
      );
      setCases([...DEMO_CASES, ...filteredStored]);
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setCases(DEMO_CASES);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchCasesData();
  }, []);

  const handleAddCase = async (newCase: CaseInput) => {
    try {
      const caseToAdd = await createCase(newCase);
      setCases((prevCases) => [caseToAdd, ...prevCases]);
      toast({
        title: "Success",
        description: "New case registered successfully.",
      });
      fetchCasesData();
    } catch (error) {
      console.error('Error adding case:', error);
      toast({
        title: "Error",
        description: "Failed to add case.",
        variant: "destructive",
      });
    }
  };

  const handleOpenDrawer = (c: Case) => {
    setSelectedCase(c);
    setShowDrawer(true);
  };

  const filteredCases = cases.filter(
    (case_) => {
      const matchesSearch = 
        (case_.party_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (case_.case_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (case_.jurisdiction || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (case_.assigned_lawyer || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTab = 
        activeTab === "all" || 
        (activeTab === "active" && case_.status === "active") ||
        (activeTab === "pending" && case_.status === "pending") ||
        (activeTab === "closed" && case_.status === "closed");
      
      return matchesSearch && matchesTab;
    }
  );

  const sortedCases = [...filteredCases].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    } else if (sortBy === "oldest") {
      return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    } else if (sortBy === "name") {
      return (a.party_name || "").localeCompare(b.party_name || "");
    }
    return 0;
  });

  const caseStatistics = {
    total: cases.length,
    active: cases.filter(c => c.status === 'active').length,
    pending: cases.filter(c => c.status === 'pending').length,
    closed: cases.filter(c => c.status === 'closed').length
  };

  // Badge Style Generators
  const getStatusBadgeClass = (status?: string) => {
    const term = (status || "active").toLowerCase();
    switch (term) {
      case "active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[9px] rounded uppercase font-bold";
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200 font-mono text-[9px] rounded uppercase font-bold";
      case "under review":
      case "under_review":
        return "bg-blue-50 text-blue-700 border-blue-200 font-mono text-[9px] rounded uppercase font-bold";
      case "closed":
      default:
        return "bg-neutral-100 text-neutral-500 border-neutral-300 font-mono text-[9px] rounded uppercase font-bold";
    }
  };

  const getPriorityBadgeClass = (priority?: string) => {
    const term = (priority || "medium").toLowerCase();
    switch (term) {
      case "high":
        return "bg-red-50 text-red-700 border-red-200 font-mono text-[9px] rounded uppercase font-bold";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200 font-mono text-[9px] rounded uppercase font-bold";
      case "low":
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[9px] rounded uppercase font-bold";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-2xs font-mono tracking-widest text-neutral-500 uppercase">Synchronizing Cases Registry</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Scale className="h-4.5 w-4.5 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">Cases Registry</h1>
          </div>
          <p className="text-xs text-neutral-500 font-mono uppercase tracking-wider">Manage dossiers, hearing schedules, and client files</p>
        </div>
        <Button onClick={() => setShowNewCaseDialog(true)} className="btn-primary">
          <PlusCircle className="mr-2 h-4 w-4" />
          Register Case
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { title: "Total Cases", value: caseStatistics.total, icon: Clipboard },
          { title: "Active Matters", value: caseStatistics.active, icon: Users },
          { title: "Pending Audits", value: caseStatistics.pending, icon: Clock },
          { title: "Upcoming hearings", value: cases.filter(c => c.next_date).length, icon: Calendar }
        ].map((item, idx) => (
          <div key={idx} className="glass-card p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase">{item.title}</span>
              <p className="text-xl font-bold text-neutral-900 mt-1">{item.value}</p>
            </div>
            <div className="w-8 h-8 rounded bg-neutral-50 flex items-center justify-center border border-border">
              <item.icon className="h-4 w-4 text-primary" />
            </div>
          </div>
        ))}
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            placeholder="Search dossiers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-premium pl-10 w-full text-xs"
          />
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-white border border-border text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-border text-neutral-900">
              <SelectGroup>
                <SelectLabel className="text-3xs text-neutral-400">Order</SelectLabel>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Client Name (A-Z)</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-border text-xs hover:bg-neutral-50">
                <FilterIcon className="mr-2 h-3.5 w-3.5 text-neutral-400" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border border-border text-neutral-900">
              <DropdownMenuItem className="focus:bg-neutral-50 text-xs">Civil</DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-neutral-50 text-xs">Criminal</DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-neutral-50 text-xs">Corporate</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="space-y-4">
        <div className="flex border-b border-border gap-2 pb-px">
          {["all", "active", "pending", "closed"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-semibold tracking-wide uppercase border-b-2 transition-all duration-200 ${
                activeTab === tab 
                  ? "border-primary text-primary" 
                  : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader className="bg-neutral-50 border-b border-border">
              <TableRow className="hover:bg-transparent border-b-0">
                <TableHead className="text-[10px] font-mono text-neutral-500 uppercase py-3.5">Client</TableHead>
                <TableHead className="text-[10px] font-mono text-neutral-500 uppercase py-3.5">Case</TableHead>
                <TableHead className="text-[10px] font-mono text-neutral-500 uppercase py-3.5">Category</TableHead>
                <TableHead className="text-[10px] font-mono text-neutral-500 uppercase py-3.5">Jurisdiction</TableHead>
                <TableHead className="text-[10px] font-mono text-neutral-500 uppercase py-3.5">Status</TableHead>
                <TableHead className="text-[10px] font-mono text-neutral-500 uppercase py-3.5">Priority</TableHead>
                <TableHead className="text-[10px] font-mono text-neutral-500 uppercase py-3.5">Assigned Lawyer</TableHead>
                <TableHead className="text-[10px] font-mono text-neutral-500 uppercase py-3.5">Next Hearing</TableHead>
                <TableHead className="text-[10px] font-mono text-neutral-500 uppercase py-3.5">Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {sortedCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-neutral-400">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <Scale className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
                      <p className="text-xs font-semibold text-neutral-800">No dossiers recorded</p>
                      <p className="text-3xs text-neutral-500 max-w-xs leading-relaxed">Register a new case to begin mapping schedules.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedCases.map((case_) => (
                  <TableRow
                    key={case_.id}
                    className="cursor-pointer hover:bg-neutral-50/50 transition-colors"
                    onClick={() => handleOpenDrawer(case_)}
                  >
                    <TableCell className="font-semibold text-xs py-4 text-neutral-900">{case_.party_name}</TableCell>
                    <TableCell className="text-xs text-neutral-600 font-semibold">{case_.case_number}</TableCell>
                    <TableCell className="text-xs text-neutral-600">
                      <span className="text-[10px] font-mono bg-neutral-100 text-slate-600 px-2 py-0.5 border border-neutral-200 uppercase">
                        {case_.case_type || "General"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-neutral-600">{case_.jurisdiction || 'India'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeClass(case_.status)}>
                        {case_.status?.replace("_", " ") || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityBadgeClass(case_.priority)}>
                        {case_.priority || 'medium'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-neutral-600">{case_.assigned_lawyer || "Unassigned"}</TableCell>
                    <TableCell className="text-xs text-neutral-600">
                      {case_.next_date ? (
                        <div className="flex items-center gap-1.5 font-mono text-2xs">
                          <Calendar className="h-3 w-3 text-primary" />
                          {new Date(case_.next_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-neutral-600 font-mono text-2xs">
                      {new Date(case_.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Case Details Drawer Modal */}
      <Sheet open={showDrawer} onOpenChange={setShowDrawer}>
        <SheetContent className="bg-white border-l border-neutral-200 text-neutral-900 w-full sm:max-w-md overflow-y-auto p-6 space-y-6">
          {selectedCase && (
            <>
              <SheetHeader className="border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={getStatusBadgeClass(selectedCase.status)}>
                    {selectedCase.status?.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline" className={getPriorityBadgeClass(selectedCase.priority)}>
                    {selectedCase.priority} Priority
                  </Badge>
                </div>
                <SheetTitle className="text-lg font-bold font-sans text-slate-900 tracking-tight leading-snug">
                  {selectedCase.case_number}
                </SheetTitle>
                <p className="text-2xs font-mono uppercase tracking-wider text-slate-400 mt-1">Dossier ID: {selectedCase.id}</p>
              </SheetHeader>

              {/* Case Summary */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Case Summary</span>
                <p className="text-xs text-slate-600 font-serif leading-relaxed bg-slate-50/50 p-3 border border-slate-100/50">
                  {selectedCase.stage}
                </p>
              </div>

              {/* Client & Lawyer details */}
              <div className="grid grid-cols-2 gap-4 text-xs font-sans border-b border-neutral-100 pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Client</span>
                  <span className="font-semibold text-slate-800">{selectedCase.party_name}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Assigned Lawyer</span>
                  <span className="font-semibold text-slate-800">{selectedCase.assigned_lawyer || "Unassigned"}</span>
                </div>
              </div>

              {/* Jurisdiction & Category info */}
              <div className="grid grid-cols-2 gap-4 text-xs font-sans border-b border-neutral-100 pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Jurisdiction</span>
                  <span className="font-semibold text-slate-800">{selectedCase.jurisdiction || "India"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Category</span>
                  <span className="font-semibold text-slate-800">{selectedCase.case_type || "Compliance"}</span>
                </div>
              </div>

              {/* Compliance Status */}
              <div className="space-y-2 border-b border-neutral-100 pb-4">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Compliance Status</span>
                <div className="flex items-center gap-2 text-xs font-sans text-slate-700 bg-emerald-50/40 p-2.5 border border-emerald-100/60">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{selectedCase.compliance_status || "Standard Compliant"}</span>
                </div>
              </div>

              {/* AI Notes */}
              <div className="space-y-2 border-b border-neutral-100 pb-4">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">AI Notes</span>
                <p className="text-xs font-serif leading-relaxed text-slate-650 italic bg-amber-50/30 p-3 border border-amber-100/40">
                  "{selectedCase.ai_notes || "No AI briefing notes compiled for this matter."}"
                </p>
              </div>

              {/* Associated Documents */}
              <div className="space-y-2.5 border-b border-neutral-100 pb-4">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Dossier Documents</span>
                <div className="space-y-1.5 text-xs font-sans">
                  {selectedCase.documents && selectedCase.documents.length > 0 ? (
                    selectedCase.documents.map((doc, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-neutral-50 p-2 border border-neutral-200">
                        <span className="font-semibold text-slate-700 truncate max-w-[200px]">📄 {doc}</span>
                        <button 
                          onClick={() => toast({ title: "Downloading File", description: `Fetching source payload for ${doc}...` })}
                          className="text-[9px] font-mono uppercase text-emerald-700 font-bold hover:underline"
                        >
                          Download
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">No documents attached.</span>
                  )}
                </div>
              </div>

              {/* Recent Activity Timeline */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">Recent Activity</span>
                <div className="space-y-4 relative pl-4 border-l border-neutral-200 text-xs font-sans">
                  {selectedCase.recent_activity && selectedCase.recent_activity.length > 0 ? (
                    selectedCase.recent_activity.map((act, idx) => (
                      <div key={idx} className="space-y-0.5 relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 border-2 border-white" />
                        <span className="text-[10px] font-mono text-slate-400 block">{act.date}</span>
                        <p className="text-slate-700 leading-normal font-semibold">{act.activity}</p>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-0.5 relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-neutral-400 border-2 border-white" />
                      <span className="text-[10px] font-mono text-slate-400 block">Current</span>
                      <p className="text-slate-755 leading-normal italic font-semibold">No recorded activity history.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <NewCaseDialog 
        open={showNewCaseDialog}
        onOpenChange={setShowNewCaseDialog}
        onSuccess={handleAddCase}
      />
    </div>
  );
};

export default Cases;
