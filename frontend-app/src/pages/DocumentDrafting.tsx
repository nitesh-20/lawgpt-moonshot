import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileEdit, 
  Files, 
  Sparkles, 
  RotateCcw, 
  FileText, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  Plus,
  Loader2,
  Copy,
  Languages,
  Share2,
  Scale,
  Calendar,
  Check,
  User,
  Clock,
  Briefcase,
  HelpCircle,
  TrendingUp,
  FileCheck,
  Search,
  FileMinus,
  CornerDownRight,
  Edit2,
  Upload,
  Globe,
  Star,
  ChevronDown,
  BookOpen,
  FolderLock,
  Compass,
  FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { AudioPlaybackButton } from "@/components/voice/AudioPlaybackButton";
import { GradientCard } from "@/components/ui/gradient-card";
import { HighlightCard } from "@/components/ui/highlight-card";
import { 
  generateDraft, 
  reviewDraft, 
  redlineDraft, 
  improveDraft 
} from "@/services/drafting";

interface LegalTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  useCase: string;
  backendId: string;
  fields: string[];
  draftTime: string;
  popular?: boolean;
}

const DocumentDrafting = () => {
  const [activeTab, setActiveTab] = useState("templates");
  const { toast } = useToast();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedJurisdiction, setSelectedJurisdiction] = useState("Central Govt, India");
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  // 21 Realistic Legal Templates
  const templatesList: LegalTemplate[] = [
    {
      id: "nda",
      name: "Non-Disclosure Agreement (NDA)",
      description: "Protects proprietary and confidential information shared during joint commercial discussions.",
      category: "Confidentiality",
      useCase: "Exchanging source code, vendor specs, or corporate metrics with prospective partners.",
      backendId: "nda",
      fields: ["Effective Date", "Disclosing Party", "Receiving Party", "Purpose"],
      draftTime: "1 min draft",
      popular: true
    },
    {
      id: "employment_agreement",
      name: "Employment Agreement",
      description: "Binding contract outlining job responsibilities, compensation, and work conditions.",
      category: "Employment",
      useCase: "Hiring executive-level or operational full-time staff under regional labor guidelines.",
      backendId: "employment_agreement",
      fields: ["Effective Date", "Employer Name", "Employee Name", "Job Title", "Salary"],
      draftTime: "2 min draft",
      popular: true
    },
    {
      id: "independent_contractor",
      name: "Independent Contractor Agreement",
      description: "Defines non-employee project scopes, retainer payouts, and intellectual property transfers.",
      category: "Employment",
      useCase: "Engaging freelance product designers, contract developers, or advisory personnel.",
      backendId: "service_agreement",
      fields: ["Effective Date", "Client Name", "Contractor Name", "Scope of Services", "Retainer Fees"],
      draftTime: "3 min draft"
    },
    {
      id: "service_agreement",
      name: "Service Agreement",
      description: "Standard service level framework defining vendor duties, KPIs, and payments.",
      category: "Commercial",
      useCase: "Outsourcing facility management, cloud monitoring, or customer support operations.",
      backendId: "service_agreement",
      fields: ["Effective Date", "Client Name", "Service Provider", "Scope of Services", "Fees"],
      draftTime: "2 min draft",
      popular: true
    },
    {
      id: "software_dev",
      name: "Software Development Agreement",
      description: "Specifies agile dev iterations, milestone reviews, and custom IP assignments.",
      category: "Intellectual Property",
      useCase: "Commissioning an external software agency to build a custom SaaS or mobile application.",
      backendId: "service_agreement",
      fields: ["Effective Date", "Client Name", "Developer Name", "Tech Stack & Milestones", "Project Cost"],
      draftTime: "3 min draft"
    },
    {
      id: "msa",
      name: "Master Service Agreement (MSA)",
      description: "Umbrella framework governing purchase orders, liability caps, and warranty covenants.",
      category: "Commercial",
      useCase: "Establishing multi-year B2B vendor relations prior to executing statements of work.",
      backendId: "general_contract",
      fields: ["Effective Date", "Client Name", "Provider Name", "Overall Scope", "Term Duration"],
      draftTime: "4 min draft",
      popular: true
    },
    {
      id: "partnership_agreement",
      name: "Partnership Agreement",
      description: "Drafts governance rules, voting thresholds, and capital ratios for partnerships.",
      category: "Corporate",
      useCase: "Structuring equity ratios and operating rules between managing partners.",
      backendId: "partnership_agreement",
      fields: ["Effective Date", "Partner A Name", "Partner B Name", "Capital Contributions", "Voting Control %"],
      draftTime: "3 min draft"
    },
    {
      id: "shareholders_agreement",
      name: "Shareholders Agreement",
      description: "Governs rights, tag-along/drag-along exits, board seats, and share valuations.",
      category: "Corporate",
      useCase: "Aligning venture investors and original co-founders on seed round milestones.",
      backendId: "general_contract",
      fields: ["Effective Date", "Company Name", "Lead Investor Name", "Founder Names", "Board Seat Allocations"],
      draftTime: "4 min draft",
      popular: true
    },
    {
      id: "vendor_agreement",
      name: "Vendor Agreement",
      description: "Specifies purchase timelines, delivery inspections, and defect remedies.",
      category: "Commercial",
      useCase: "Acquiring hardware inventories or manufacturing goods from suppliers.",
      backendId: "vendor_agreement",
      fields: ["Effective Date", "Customer Name", "Vendor Name", "Goods Description", "Purchase Cost"],
      draftTime: "2 min draft"
    },
    {
      id: "consulting_agreement",
      name: "Consulting Agreement",
      description: "Covers advisory scopes, board attendance, and stock options vesting.",
      category: "Commercial",
      useCase: "Retaining corporate consultants or financial strategists for restructuring.",
      backendId: "service_agreement",
      fields: ["Effective Date", "Client Name", "Consultant Name", "Advisory Scope", "Hourly Rate"],
      draftTime: "2 min draft"
    },
    {
      id: "terms_conditions",
      name: "Terms & Conditions",
      description: "Website/app governance rules, acceptable use codes, and liability disclaimers.",
      category: "Tech",
      useCase: "Setting legal requirements for registering on a web forum or online store.",
      backendId: "terms_and_conditions",
      fields: ["Effective Date", "Company Name", "Website URL", "Jurisdiction Forum"],
      draftTime: "1 min draft"
    },
    {
      id: "privacy_policy",
      name: "Privacy Policy",
      description: "Details data collection methodologies, cookie tracking, and user consent regulations.",
      category: "Compliance",
      useCase: "Ensuring store compliance for mobile apps gathering analytics or emails.",
      backendId: "privacy_policy",
      fields: ["Effective Date", "Company Name", "Website URL", "User Data Types Collected"],
      draftTime: "1 min draft",
      popular: true
    },
    {
      id: "cookie_policy",
      name: "Cookie Policy",
      description: "Explains local storage tracers, marketing pixels, and cookie opt-out paths.",
      category: "Compliance",
      useCase: "Publishing mandatory cookie compliance notices on active web applications.",
      backendId: "privacy_policy",
      fields: ["Effective Date", "Company Name", "Website URL", "Third-party Pixels Used"],
      draftTime: "1 min draft"
    },
    {
      id: "dpa",
      name: "Data Processing Agreement (DPA)",
      description: "Specifies secure sub-processor compliance under GDPR and regional privacy rules.",
      category: "Compliance",
      useCase: "Transferring customer database logs to cloud analytical hosting environments.",
      backendId: "nda",
      fields: ["Effective Date", "Data Exporter", "Data Importer", "Categories of Data", "Data Security Covenants"],
      draftTime: "3 min draft"
    },
    {
      id: "offer_letter",
      name: "Employment Offer Letter",
      description: "Formal non-binding onboarding letter outlining role offers and salary structures.",
      category: "Employment",
      useCase: "Extending a formal job offer package to a chosen manager or engineer candidate.",
      backendId: "offer_letter",
      fields: ["Start Date", "Employer Name", "Candidate Name", "Job Title Offered", "Base Compensation"],
      draftTime: "1 min draft"
    },
    {
      id: "legal_notice",
      name: "Legal Notice",
      description: "Formal pre-action notification demanding immediate resolution of defaults.",
      category: "Litigation",
      useCase: "Serving demand notices to defaulting corporate debtors prior to litigation filing.",
      backendId: "legal_notice",
      fields: ["Issue Date", "Sender Name", "Recipient Name", "Breach Details", "Demands & Cure Period"],
      draftTime: "2 min draft"
    },
    {
      id: "cease_desist",
      name: "Cease and Desist Notice",
      description: "Urgent warning demanding immediate suspension of copyright or trademark infringement.",
      category: "Litigation",
      useCase: "Stopping trademark copycats or defamatory posts from active distribution.",
      backendId: "legal_notice",
      fields: ["Issue Date", "Sender Name", "Recipient Name", "Infringement Facts", "Halt Directives"],
      draftTime: "2 min draft"
    },
    {
      id: "rental_agreement",
      name: "Rental / Lease Agreement",
      description: "Outlines residential or commercial property leases, security deposits, and building rules.",
      category: "Real Estate",
      useCase: "Leasing warehouse real estate or corporate office structures to commercial tenants.",
      backendId: "lease_agreement",
      fields: ["Effective Date", "Landlord Name", "Tenant Name", "Premises Address", "Rent & Security Deposit"],
      draftTime: "2 min draft"
    },
    {
      id: "mou",
      name: "Memorandum of Understanding (MoU)",
      description: "Documents consensus on joint milestones and project intents prior to final binding deals.",
      category: "Commercial",
      useCase: "Reaching a baseline preliminary strategic consensus with corporate research partners.",
      backendId: "memorandum_of_understanding",
      fields: ["Effective Date", "Party A Name", "Party B Name", "Mutual Cooperation Goals", "Term Duration"],
      draftTime: "2 min draft"
    },
    {
      id: "board_resolution",
      name: "Board Resolution",
      description: "Official corporate board resolution authorizing specific executive sign-off powers.",
      category: "Corporate",
      useCase: "Approving bank facilities or corporate officer changes at board meetings.",
      backendId: "general_contract",
      fields: ["Effective Date", "Company Name", "Resolution Details", "Voting Directors Names"],
      draftTime: "2 min draft"
    },
    {
      id: "power_of_attorney",
      name: "Power of Attorney",
      description: "Appoints an attorney-in-fact to represent a principal in designated legal matters.",
      category: "Corporate",
      useCase: "Authorizing localized agents to sign land deeds or represent corporate tax filings.",
      backendId: "affidavit",
      fields: ["Effective Date", "Principal Name", "Attorney Name", "Specific Powers Granted", "Jurisdiction Limit"],
      draftTime: "3 min draft"
    }
  ];

  // Active Selected Template
  const [selectedTemplate, setSelectedTemplate] = useState<LegalTemplate>(templatesList[0]);

  // Form Fields / Variables inside Document
  const [docVariables, setDocVariables] = useState<Record<string, string>>({
    "Effective Date": new Date().toISOString().split('T')[0],
    "Disclosing Party": "Acme Ventures Ltd",
    "Receiving Party": "Alpha Software Corp",
    "Purpose": "Evaluation of mutual distribution partnership opportunities"
  });

  const [promptInstructions, setPromptInstructions] = useState("");
  const [additionalClauses, setAdditionalClauses] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Generated Text State (Editable inside virtual editor)
  const [generatedDraft, setGeneratedDraft] = useState("");
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  // Review State
  const [reviewText, setReviewText] = useState("");
  const [reviewResult, setReviewResult] = useState<any | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  // Compare State
  const [originalText, setOriginalText] = useState("");
  const [revisedText, setRevisedText] = useState("");
  const [isRedlining, setIsRedlining] = useState(false);
  const [redlineResult, setRedlineResult] = useState<any | null>(null);

  // Improve State
  const [improveText, setImproveText] = useState("");
  const [improveInstructions, setImproveInstructions] = useState("Make this clause reciprocal and mutual.");
  const [isImproving, setIsImproving] = useState(false);
  const [improveResult, setImproveResult] = useState<any | null>(null);

  // Synchronize variables when selected template changes
  const handleSelectTemplate = (tpl: LegalTemplate) => {
    setSelectedTemplate(tpl);
    const initialVars: Record<string, string> = {};
    tpl.fields.forEach(field => {
      initialVars[field] = "";
    });
    if (tpl.fields.includes("Effective Date")) {
      initialVars["Effective Date"] = new Date().toISOString().split('T')[0];
    }
    setDocVariables(initialVars);
    setGeneratedDraft("");
    setReviewResult(null);
    setPromptInstructions("");
    setAdditionalClauses("");
    setActiveTab("generate");
    toast({
      title: "Workspace Activated",
      description: `Drafting editor configured for ${tpl.name}.`,
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const variables: Record<string, any> = {};
    const backendId = selectedTemplate.backendId;

    if (backendId === "nda") {
      variables["effective_date"] = docVariables["Effective Date"] || "";
      variables["disclosing_party"] = docVariables["Disclosing Party"] || "";
      variables["receiving_party"] = docVariables["Receiving Party"] || "";
      variables["purpose"] = docVariables["Purpose"] || "";
    } else if (backendId === "employment_agreement") {
      variables["effective_date"] = docVariables["Effective Date"] || "";
      variables["employer_name"] = docVariables["Employer Name"] || "";
      variables["employee_name"] = docVariables["Employee Name"] || "";
      variables["job_title"] = docVariables["Job Title"] || "";
      variables["salary"] = docVariables["Salary"] || "";
    } else if (backendId === "offer_letter") {
      variables["employer_name"] = docVariables["Employer Name"] || "";
      variables["candidate_name"] = docVariables["Candidate Name"] || "";
      variables["job_title"] = docVariables["Job Title Offered"] || "";
      variables["start_date"] = docVariables["Start Date"] || "";
      variables["salary"] = docVariables["Base Compensation"] || "";
    } else if (backendId === "lease_agreement") {
      variables["effective_date"] = docVariables["Effective Date"] || "";
      variables["landlord_name"] = docVariables["Landlord Name"] || "";
      variables["tenant_name"] = docVariables["Tenant Name"] || "";
      variables["property_address"] = docVariables["Premises Address"] || "";
      variables["monthly_rent"] = docVariables["Rent & Security Deposit"] || "";
    } else if (backendId === "service_agreement") {
      variables["effective_date"] = docVariables["Effective Date"] || "";
      variables["client_name"] = docVariables["Client Name"] || "";
      variables["service_provider"] = docVariables["Service Provider"] || docVariables["Contractor Name"] || docVariables["Developer Name"] || "";
      variables["scope_of_services"] = docVariables["Scope of Services"] || docVariables["Tech Stack & Milestones"] || docVariables["Advisory Scope"] || "";
      variables["fees"] = docVariables["Fees"] || docVariables["Retainer Fees"] || docVariables["Project Cost"] || docVariables["Hourly Rate"] || "";
    } else if (backendId === "partnership_agreement") {
      variables["effective_date"] = docVariables["Effective Date"] || "";
      variables["partner_1"] = docVariables["Partner A Name"] || "";
      variables["partner_2"] = docVariables["Partner B Name"] || "";
      variables["capital_contributions"] = docVariables["Capital Contributions"] || "";
    } else if (backendId === "vendor_agreement") {
      variables["effective_date"] = docVariables["Effective Date"] || "";
      variables["customer_name"] = docVariables["Customer Name"] || "";
      variables["vendor_name"] = docVariables["Vendor Name"] || "";
      variables["goods_services"] = docVariables["Goods Description"] || "";
    } else if (backendId === "privacy_policy" || backendId === "terms_and_conditions") {
      variables["effective_date"] = docVariables["Effective Date"] || "";
      variables["company_name"] = docVariables["Company Name"] || "";
      variables["website_url"] = docVariables["Website URL"] || "";
    } else if (backendId === "legal_notice") {
      variables["issue_date"] = docVariables["Issue Date"] || "";
      variables["sender_name"] = docVariables["Sender Name"] || "";
      variables["recipient_name"] = docVariables["Recipient Name"] || "";
      variables["facts_of_case"] = docVariables["Breach Details"] || "";
      variables["demands"] = docVariables["Demands & Cure Period"] || "";
    } else if (backendId === "memorandum_of_understanding") {
      variables["effective_date"] = docVariables["Effective Date"] || "";
      variables["party_a"] = docVariables["Party A Name"] || "";
      variables["party_b"] = docVariables["Party B Name"] || "";
      variables["mutual_goals"] = docVariables["Mutual Cooperation Goals"] || "";
    } else if (backendId === "affidavit") {
      variables["effective_date"] = docVariables["Effective Date"] || "";
      variables["deponent_name"] = docVariables["Principal Name"] || "";
      variables["deponent_address"] = docVariables["Attorney Name"] || "";
      variables["statements"] = docVariables["Specific Powers Granted"] || "";
    } else {
      variables["effective_date"] = docVariables["Effective Date"] || "";
      variables["party_a"] = docVariables["Party A Name"] || "";
      variables["party_b"] = docVariables["Party B Name"] || "";
      variables["recitals"] = docVariables["Mutual Cooperation Goals"] || "";
    }

    const compoundInstructions = `
Document Request: Compile a premium ${selectedTemplate.name}.
Selected Jurisdiction Forum: ${selectedJurisdiction}
Language target: ${selectedLanguage}
Drafting direction instructions: ${promptInstructions}
Additional contract clauses to inject: ${additionalClauses}
`.trim();

    try {
      const res = await generateDraft({
        doc_type: selectedTemplate.backendId,
        variables,
        user_instructions: compoundInstructions
      });
      const data = res.data || res;
      setGeneratedDraft(data.generated_draft || data.draft || "");
      toast({ title: "Draft Completed", description: "AI compiled the legal document successfully." });
    } catch (e) {
      console.error(e);
      toast({ title: "Generation Error", description: "Failed to compile document draft.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReviewAudit = async () => {
    if (!reviewText.trim()) return;
    setIsReviewing(true);
    setReviewResult(null);
    try {
      const res = await reviewDraft({
        text: reviewText,
        doc_type: selectedTemplate.backendId
      });
      const data = res.data || res;
      setReviewResult(data.review_analysis || data);
      toast({ title: "Audit Completed", description: "Risk and compliance scorecard updated." });
    } catch (e) {
      console.error(e);
      toast({ title: "Audit Error", description: "Vulnerability analysis failed.", variant: "destructive" });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleRedlineCompare = async () => {
    if (!originalText.trim() || !revisedText.trim()) return;
    setIsRedlining(true);
    setRedlineResult(null);
    try {
      const res = await redlineDraft({
        original_text: originalText,
        revised_text: revisedText
      });
      setRedlineResult(res.data || res);
      toast({ title: "Redlines Generated", description: "Comparison results compiled successfully." });
    } catch (e) {
      console.error(e);
      toast({ title: "Redline Error", description: "Comparison engine failed.", variant: "destructive" });
    } finally {
      setIsRedlining(false);
    }
  };

  const handleImproveClause = async () => {
    if (!improveText.trim()) return;
    setIsImproving(true);
    setImproveResult(null);
    try {
      const res = await improveDraft({
        text: improveText,
        instructions: improveInstructions
      });
      setImproveResult(res.data || res);
      toast({ title: "Clause Rewritten", description: "AI successfully improved your clause." });
    } catch (e) {
      console.error(e);
      toast({ title: "Optimization Failed", description: "Clause improvement failed.", variant: "destructive" });
    } finally {
      setIsImproving(false);
    }
  };

  const handleExportText = (content: string, filename = "draft.txt") => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Categories list
  const categories = ["all", "Confidentiality", "Employment", "Corporate", "Commercial", "Compliance", "Real Estate", "Litigation"];

  // Filter templates list
  const filteredTemplates = templatesList.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === "all" || t.category === selectedCategory;
    return matchSearch && matchCat;
  });

  // A4 Document parser formatter (Premium large readable typography)
  const renderDocumentViewer = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      
      // Document Main Title - Large, bold, centered
      if (trimmed.startsWith("# ")) {
        return (
          <h1 key={idx} className="text-center text-2xl font-bold font-sans uppercase tracking-tight my-8 text-slate-900 leading-tight">
            {trimmed.replace("# ", "")}
          </h1>
        );
      }
      
      // Clause Heading Level 1 (e.g. 1. 2. 3.) - Bold and readable
      const h2Match = trimmed.match(/^##\s+(\d+\.?\s*.*)/) || trimmed.match(/^##\s+(.*)/);
      if (h2Match) {
        return (
          <h2 key={idx} className="text-lg font-bold font-sans tracking-wide uppercase mt-8 mb-4 text-slate-855">
            {h2Match[1]}
          </h2>
        );
      }

      // Subclause Heading Level 2 (e.g. 1.1, 1.2) - Bold and clear
      const h3Match = trimmed.match(/^###\s+(\d+\.\d+\.?\s*.*)/) || trimmed.match(/^###\s+(.*)/);
      if (h3Match) {
        return (
          <h3 key={idx} className="text-base font-bold font-sans tracking-normal mt-6 mb-3 text-slate-800 pl-2">
            {h3Match[1]}
          </h3>
        );
      }

      // Bullet lists
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return (
          <li key={idx} className="list-disc pl-8 leading-relaxed my-3 font-serif text-[15px] text-slate-700">
            {trimmed.substring(2)}
          </li>
        );
      }

      // Empty Lines
      if (trimmed === "") {
        return <div key={idx} className="h-5" />;
      }

      // Paragraph elements (Indented if starting with numbers) - Highly readable serif sizes
      const isIndented = trimmed.match(/^\d+\.\d+/) || trimmed.match(/^\d+\./);
      return (
        <p key={idx} className={`leading-relaxed my-3.5 text-justify font-serif text-[15px] text-slate-700 ${isIndented ? "pl-6 font-semibold" : ""}`}>
          {trimmed}
        </p>
      );
    });
  };

  // Icon Matcher
  const getTemplateIcon = (cat: string) => {
    switch (cat) {
      case "Confidentiality":
        return <FolderLock className="h-8 w-8 text-emerald-600" />;
      case "Employment":
        return <User className="h-8 w-8 text-emerald-600" />;
      case "Corporate":
        return <Scale className="h-8 w-8 text-emerald-600" />;
      case "Commercial":
        return <Briefcase className="h-8 w-8 text-emerald-600" />;
      case "Compliance":
        return <FileCheck className="h-8 w-8 text-emerald-600" />;
      case "Real Estate":
        return <BookOpen className="h-8 w-8 text-emerald-600" />;
      default:
        return <FileText className="h-8 w-8 text-emerald-600" />;
    }
  };

  return (
    <div className="h-full bg-white text-slate-800 font-sans leading-normal px-2 py-4">
      
      {/* 1. TOP TAB NAVIGATION WITH THIN UNDERLINE */}
      <div className="flex flex-wrap items-center justify-between border-b border-neutral-100 pb-4 mb-8 gap-4">
        <div className="flex gap-8 text-xs font-mono uppercase tracking-wider">
          {[
            { id: "templates", label: "Templates Browser" },
            { id: "generate", label: "Interactive Generate" },
            { id: "review", label: "Review & Audit" },
            { id: "redline", label: "Redline Compare" },
            { id: "improve", label: "Improve Clauses" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 transition-all relative font-bold cursor-pointer text-xs md:text-sm ${
                activeTab === tab.id 
                  ? "text-emerald-700 font-extrabold border-b-2 border-emerald-600" 
                  : "text-slate-400 hover:text-slate-900 border-b-2 border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action selects */}
        <div className="flex items-center gap-3 text-xs md:text-sm font-sans">
          <select
            value={selectedJurisdiction}
            onChange={(e) => setSelectedJurisdiction(e.target.value)}
            className="bg-neutral-50/50 border border-neutral-200 text-xs py-1.5 px-3 focus:outline-none focus:border-emerald-600 rounded cursor-pointer text-slate-655"
          >
            <option value="Central Govt, India">India (Central)</option>
            <option value="State of Maharashtra, India">Maharashtra State</option>
            <option value="State of Karnataka, India">Karnataka State</option>
            <option value="Delaware Corporate Court, USA">Delaware Corporate</option>
          </select>

          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="bg-neutral-50/50 border border-neutral-200 text-xs py-1.5 px-3 focus:outline-none focus:border-emerald-600 rounded cursor-pointer text-slate-655"
          >
            <option value="en">English (EN)</option>
            <option value="hi-IN">Hindi (HI)</option>
            <option value="ta-IN">Tamil (TA)</option>
            <option value="te-IN">Telugu (TE)</option>
            <option value="bn-IN">Bengali (BN)</option>
          </select>
        </div>
      </div>

      {/* 2. TAB CONTENT PANELS */}
      <AnimatePresence mode="wait">
        
        {/* TEMPLATES SEARCH TAB */}
        {activeTab === "templates" && (
          <motion.div
            key="templates-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-10"
          >
            {/* HERO HERO SECTION */}
            <div className="text-center max-w-3xl mx-auto py-12 space-y-4">
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-600 font-extrabold block">
                Enterprise AI Contract Studio
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 font-sans sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-700 pb-2">
                A4 Document Drafting Workspace
              </h1>
              <p className="text-sm md:text-base text-neutral-500 font-serif max-w-xl mx-auto leading-relaxed">
                Generate premium legal contract templates, perform automated audits, and optimize terms with side-by-side redlines.
              </p>

              {/* Large search input */}
              <div className="pt-6 max-w-lg mx-auto flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <input
                    placeholder="Search 21 legal templates (e.g. Shareholders, DPA)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-neutral-200 focus:border-emerald-600 focus:outline-none pl-12 pr-4 py-3 text-sm placeholder:text-neutral-400 rounded shadow-3xs transition-all"
                  />
                </div>
              </div>

              {/* Scrollable Category pills */}
              <div className="flex flex-wrap justify-center gap-2 pt-4">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 text-xs font-mono uppercase tracking-wider transition-all border rounded ${
                      selectedCategory === cat
                        ? "bg-emerald-600 text-white border-emerald-600 font-bold"
                        : "bg-white text-slate-500 border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual template cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredTemplates.map((tpl) => (
                <HighlightCard
                  key={tpl.id}
                  title={tpl.name}
                  description={[
                    tpl.description,
                    `Use Case: ${tpl.useCase}`,
                    `Latency: ${tpl.draftTime}`
                  ]}
                  icon={getTemplateIcon(tpl.category)}
                  onClick={() => handleSelectTemplate(tpl)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* DRAFTING WORKSPACE PANEL */}
        {activeTab === "generate" && (
          <motion.div
            key="generate-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Notion style header block */}
            <div className="border-b border-neutral-150 pb-5 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block font-bold">Document Title</span>
                <h2 className="text-base md:text-lg font-bold text-slate-905 font-sans flex items-center gap-2">
                  📄 {selectedTemplate.name}
                </h2>
              </div>
              
              <div className="flex items-center gap-5 text-sm font-sans">
                <div className="text-xs font-mono text-slate-500 uppercase space-y-0.5">
                  <span className="text-slate-400 block text-3xs uppercase">Jurisdiction</span>
                  <span className="font-bold text-slate-800">{selectedJurisdiction}</span>
                </div>
                <div className="text-xs font-mono text-slate-500 uppercase space-y-0.5">
                  <span className="text-slate-400 block text-3xs uppercase">Language</span>
                  <span className="font-bold text-slate-800">{selectedLanguage === 'en' ? 'English' : selectedLanguage}</span>
                </div>
                <button
                  onClick={() => setActiveTab("templates")}
                  className="h-9 px-4 border border-neutral-200 hover:bg-neutral-50 text-xs font-mono uppercase tracking-wider rounded"
                >
                  Change Template
                </button>
              </div>
            </div>

            {/* ChatGPT style large prompt editor */}
            <div className="bg-neutral-50 border border-neutral-200 p-5 space-y-5 rounded shadow-3xs">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-slate-450 uppercase font-bold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  Drafting Instructions Prompt Console
                </span>
                <VoiceButton onTranscribe={(t) => setPromptInstructions(prev => prev + (prev ? " " : "") + t)} />
              </div>

              <textarea
                placeholder="Ask AI to draft or rewrite this contract. Define liabilities, intellectual property rights, notice terms..."
                value={promptInstructions}
                onChange={(e) => setPromptInstructions(e.target.value)}
                rows={4}
                className="w-full bg-white border border-neutral-200 focus:border-emerald-600 focus:outline-none p-4 text-sm text-slate-900 placeholder:text-neutral-400/80 rounded resize-none leading-relaxed font-sans shadow-inner"
              />

              {/* Suggestions quick tags */}
              <div className="flex flex-wrap gap-2">
                {[
                  "Make liability cap mutual.",
                  "Add strict intellectual property assignment.",
                  "Limit confidentiality to 3 years.",
                  "Add 15-day cure period for defaults."
                ].map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPromptInstructions(prev => prev + (prev ? " " : "") + s)}
                    className="px-3 py-1 border border-neutral-200 bg-white hover:bg-neutral-50 text-xs text-slate-500 rounded font-mono"
                  >
                    + {s}
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center border-t border-neutral-200 pt-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Extra clauses (e.g. non-solicit)..."
                    value={additionalClauses}
                    onChange={(e) => setAdditionalClauses(e.target.value)}
                    className="w-72 bg-white border border-neutral-200 focus:border-emerald-600 focus:outline-none px-3 py-1.5 text-xs placeholder:text-neutral-400 rounded font-sans"
                  />
                </div>

                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-8 h-10 text-xs font-semibold uppercase tracking-wider"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Assembling Draft...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Draft
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Workspace split columns */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start pt-4">
              
              {/* Left Column: Virtual Microsoft Word Paper Viewer */}
              <div className="xl:col-span-8 space-y-4">
                {generatedDraft ? (
                  <div className="space-y-4">
                    
                    {/* Document control bar */}
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-2 flex-wrap gap-2 font-mono text-xs text-slate-400 uppercase">
                      <span>Microsoft Word Viewport Editor</span>
                      
                      <div className="flex items-center gap-2">
                        <AudioPlaybackButton text={generatedDraft} className="scale-95 bg-white border-neutral-200" />
                        
                        <Button
                          onClick={() => {
                            setReviewText(generatedDraft);
                            setActiveTab("review");
                            toast({ title: "Document Loaded", description: "Audit dashboard populated." });
                          }}
                          variant="outline"
                          className="h-8 px-4 border-neutral-200 text-xs font-mono uppercase tracking-wider rounded bg-white font-bold"
                        >
                          <FileCheck className="h-4 w-4 mr-1.5 text-emerald-600" />
                          Audit
                        </Button>
                        
                        <Button
                          onClick={() => {
                            setOriginalText(generatedDraft);
                            setActiveTab("redline");
                            toast({ title: "Document Loaded", description: "Compare baseline saved." });
                          }}
                          variant="outline"
                          className="h-8 px-4 border-neutral-200 text-xs font-mono uppercase tracking-wider rounded bg-white font-bold"
                        >
                          <Scale className="h-4 w-4 mr-1.5" />
                          Compare
                        </Button>

                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedDraft);
                            toast({ title: "Copied", description: "Report draft copied." });
                          }}
                          variant="outline"
                          className="h-8 w-8 p-0 border-neutral-200 rounded bg-white"
                          title="Copy draft"
                        >
                          <Copy className="h-4 w-4 text-slate-400" />
                        </Button>

                        <Button 
                          onClick={() => handleExportText(generatedDraft, `${selectedTemplate.id}_draft.md`)}
                          className="h-8 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-mono uppercase tracking-wider rounded font-bold"
                        >
                          <Download className="h-4 w-4 mr-1.5" />
                          Export .md
                        </Button>
                      </div>
                    </div>

                    {/* Virtual A4 White Paper (Highly readable, styled margins, deep shadow) */}
                    <div className="bg-white border border-neutral-200 shadow-lg p-16 md:p-20 min-h-[1000px] relative overflow-hidden rounded mx-auto max-w-[21cm]">
                      
                      {/* Watermark header */}
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-neutral-100 pb-3 mb-10">
                        <span>{selectedTemplate.name}</span>
                        <span className="text-emerald-700 font-bold">✓ AI Document Workspace</span>
                        <span>DATE: {docVariables["Effective Date"] || docVariables["Start Date"] || "Current"}</span>
                      </div>

                      {/* Content editor text */}
                      {isEditingDraft ? (
                        <textarea
                          value={generatedDraft}
                          onChange={(e) => setGeneratedDraft(e.target.value)}
                          rows={34}
                          className="w-full bg-white border border-neutral-200 focus:outline-none p-5 text-sm font-serif leading-relaxed text-slate-850 rounded resize-none"
                        />
                      ) : (
                        <div className="space-y-6">
                          {renderDocumentViewer(generatedDraft)}
                        </div>
                      )}

                      {/* Signatures Panel */}
                      <div className="grid grid-cols-2 gap-12 border-t border-neutral-150 pt-10 mt-16 text-xs font-mono uppercase text-slate-500">
                        <div className="space-y-10">
                          <span>For Party A (Principal):</span>
                          <div className="border-b border-neutral-250 w-40 h-8" />
                          <span>Authorized Representative</span>
                        </div>
                        <div className="space-y-10">
                          <span>For Party B (Counterparty):</span>
                          <div className="border-b border-neutral-250 w-40 h-8" />
                          <span>Authorized Representative</span>
                        </div>
                      </div>

                      {/* Inline Edit trigger */}
                      <button 
                        onClick={() => setIsEditingDraft(!isEditingDraft)} 
                        className="absolute right-6 bottom-6 p-2 border border-neutral-200 hover:bg-neutral-50 rounded text-slate-400 bg-white cursor-pointer"
                        title={isEditingDraft ? "View Styled Paper" : "Edit Raw Text"}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                    </div>

                  </div>
                ) : (
                  <div className="border border-neutral-200 border-dashed bg-neutral-50/50 p-20 text-center space-y-4 rounded min-h-[600px] flex flex-col justify-center items-center font-serif shadow-3xs">
                    <FileText className="h-12 w-12 text-neutral-350" />
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-755 font-sans">Legal drafting page empty</p>
                      <p className="text-xs text-slate-400 max-w-xs leading-normal">
                        Configure the parameters, enter instructions in the prompt bar, and click "Generate Draft" to build.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Placeholders sidebar panel */}
              <div className="xl:col-span-4 border border-neutral-200 bg-white p-6 space-y-5 rounded shadow-3xs">
                <span className="text-xs font-mono text-slate-450 uppercase block font-bold border-b border-neutral-100 pb-2">
                  Document Placeholders
                </span>

                <div className="space-y-4 text-xs md:text-sm font-sans">
                  {selectedTemplate.fields.map((field) => (
                    <div key={field} className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-450 uppercase block font-bold">
                        {field}
                      </label>
                      <input
                        type={field.includes("Date") ? "date" : "text"}
                        placeholder={`Enter ${field.toLowerCase()}...`}
                        value={docVariables[field] || ""}
                        onChange={(e) => setDocVariables({ ...docVariables, [field]: e.target.value })}
                        className="w-full bg-white border border-neutral-200 px-3 py-2 focus:border-emerald-600 focus:outline-none rounded text-slate-800 placeholder:text-neutral-300"
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* REVIEW & AUDIT TAB */}
        {activeTab === "review" && (
          <motion.div
            key="review-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Target contract document editor */}
              <div className="xl:col-span-8 space-y-4">
                <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                  <span className="text-xs font-mono uppercase text-slate-455">Target contract document text</span>
                  <Button 
                    onClick={handleReviewAudit}
                    disabled={isReviewing || !reviewText.trim()}
                    className="h-8 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs uppercase tracking-wider rounded font-bold"
                  >
                    {isReviewing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <FileCheck className="h-4 w-4 mr-1.5" />}
                    Audit Document
                  </Button>
                </div>

                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Paste contract text here to audit..."
                  rows={30}
                  className="w-full bg-white border border-neutral-200 focus:outline-none p-6 text-sm text-slate-800 font-serif leading-relaxed rounded"
                />
              </div>

              {/* Right Column: Scorecard audit panel */}
              <div className="xl:col-span-4 space-y-6">
                {reviewResult ? (
                  <div className="space-y-6">
                    
                    {/* Score badge */}
                    <div className={`p-5 border rounded flex items-center justify-between ${
                      (reviewResult.risks?.length || 0) > 3 
                        ? "bg-red-50/50 border-red-200 text-red-905"
                        : "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                    }`}>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">Risk Assessment</span>
                        <span className="font-sans font-bold text-sm uppercase">
                          {(reviewResult.risks?.length || 0) > 3 ? "Critical Liabilities" : "Secure Contract"}
                        </span>
                      </div>

                      <div className={`text-xs font-mono font-bold border px-3 py-1 ${
                        (reviewResult.risks?.length || 0) > 3 ? "bg-red-100 border-red-300 text-red-800" : "bg-emerald-100 border-emerald-300 text-emerald-800"
                      }`}>
                        {(reviewResult.risks?.length || 0) > 3 ? "HIGH" : "LOW"} RISK
                      </div>
                    </div>

                    {/* Missing clauses */}
                    <div className="border border-neutral-200 bg-white p-5 space-y-4 rounded text-xs text-slate-707 shadow-3xs">
                      <span className="text-xs font-mono text-slate-450 uppercase block font-bold border-b border-neutral-100 pb-2">
                        Missing Clauses
                      </span>
                      <div className="space-y-2.5">
                        {reviewResult.missing_clauses && reviewResult.missing_clauses.length > 0 ? (
                          reviewResult.missing_clauses.map((c: string, idx: number) => (
                            <div key={idx} className="flex justify-between items-center border-b border-neutral-100 pb-2.5 last:border-0 last:pb-0">
                              <span className="font-sans font-semibold text-red-800 text-xs md:text-sm">📄 {c}</span>
                              <Badge className="bg-red-50 text-red-700 text-[9px] font-mono border border-red-200 rounded uppercase font-bold">High</Badge>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">No missing clauses detected.</span>
                        )}
                      </div>
                    </div>

                    {/* Ambiguous clauses */}
                    <div className="border border-neutral-200 bg-white p-5 space-y-4 rounded text-xs text-slate-707 shadow-3xs">
                      <span className="text-xs font-mono text-slate-450 uppercase block font-bold border-b border-neutral-100 pb-2">
                        Ambiguous Clauses
                      </span>
                      <div className="space-y-4">
                        {reviewResult.ambiguous_wording && reviewResult.ambiguous_wording.length > 0 ? (
                          reviewResult.ambiguous_wording.map((c: any, idx: number) => {
                            const title = typeof c === 'object' ? c.clause : `Provision #${idx+1}`;
                            const detail = typeof c === 'object' ? c.description || c.reason : String(c);
                            return (
                              <div key={idx} className="space-y-2 border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
                                <div className="flex justify-between items-center">
                                  <span className="font-sans font-semibold text-slate-805 text-xs md:text-sm">{title}</span>
                                  <Badge className="bg-amber-50 text-amber-700 text-[9px] font-mono border border-amber-200 rounded uppercase font-bold">Medium</Badge>
                                </div>
                                <p className="font-serif text-slate-600 leading-normal text-xs md:text-sm">{detail}</p>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-slate-400 italic font-serif">No ambiguities flagged.</span>
                        )}
                      </div>
                    </div>

                    {/* Compliance issues */}
                    <div className="border border-neutral-200 bg-white p-5 space-y-4 rounded text-xs text-slate-707 shadow-3xs">
                      <span className="text-xs font-mono text-slate-450 uppercase block font-bold border-b border-neutral-100 pb-2">
                        Compliance Issues
                      </span>
                      <div className="space-y-4">
                        {reviewResult.risks && reviewResult.risks.length > 0 ? (
                          reviewResult.risks.map((r: any, idx: number) => (
                            <div key={idx} className="space-y-2 border-b border-neutral-100 pb-3 last:border-0 last:pb-0 text-xs md:text-sm">
                              <div className="flex justify-between items-center font-sans font-semibold text-slate-800">
                                <span className="truncate max-w-[180px]">{r.clause || "Compliance"}</span>
                                <Badge className="bg-red-50 text-red-700 text-[9px] font-mono border border-red-200 rounded uppercase font-bold">{r.level || "Critical"}</Badge>
                              </div>
                              <p className="font-serif text-slate-650 leading-relaxed italic">"{r.excerpt || r.reason}"</p>
                              <p className="font-sans text-slate-700"><span className="font-mono text-slate-455 text-[10px] uppercase font-bold">Recommendation:</span> {r.recommendation}</p>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">No compliance gaps found.</span>
                        )}
                      </div>
                    </div>

                    {/* Suggestions */}
                    <div className="border border-neutral-200 bg-white p-5 space-y-4 rounded text-xs text-slate-707 shadow-3xs">
                      <span className="text-xs font-mono text-slate-450 uppercase block font-bold border-b border-neutral-100 pb-2">
                        Suggestions
                      </span>
                      <ul className="list-disc pl-5 space-y-2 leading-normal text-slate-650 font-serif text-xs md:text-sm">
                        {reviewResult.recommendations && reviewResult.recommendations.map((rec: string, idx: number) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>

                  </div>
                ) : (
                  <div className="border border-neutral-200 border-dashed bg-neutral-50/50 p-12 text-center space-y-3 rounded min-h-[300px] flex flex-col justify-center items-center font-serif shadow-3xs">
                    <FileCheck className="h-10 w-10 text-neutral-350" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-750 font-sans font-bold">Embedded Audit Page</p>
                      <p className="text-xs text-slate-400 max-w-xs leading-normal">
                        Input the contract draft text in the workspace sheet and click 'Audit Document' to load reviews.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}

        {/* REDLINE COMPARE TAB */}
        {activeTab === "redline" && (
          <motion.div
            key="redline-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="border border-neutral-200 bg-white p-5 space-y-3 rounded shadow-3xs">
                <label className="text-xs font-mono text-slate-455 uppercase font-bold block">Document A (Original Baseline)</label>
                <textarea
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                  placeholder="Paste original contract draft..."
                  rows={14}
                  className="w-full bg-white border border-neutral-200 focus:outline-none p-4 text-sm text-slate-805 font-serif leading-relaxed rounded"
                />
              </div>

              <div className="border border-neutral-200 bg-white p-5 space-y-3 rounded shadow-3xs">
                <label className="text-xs font-mono text-slate-455 uppercase font-bold block">Document B (Revised / Counterparty)</label>
                <textarea
                  value={revisedText}
                  onChange={(e) => setRevisedText(e.target.value)}
                  placeholder="Paste revised contract draft..."
                  rows={14}
                  className="w-full bg-white border border-neutral-200 focus:outline-none p-4 text-sm text-slate-805 font-serif leading-relaxed rounded"
                />
              </div>

            </div>

            <Button 
              onClick={handleRedlineCompare} 
              disabled={isRedlining || !originalText.trim() || !revisedText.trim()} 
              className="w-full h-12 bg-slate-805 hover:bg-slate-900 text-white rounded font-semibold text-xs uppercase tracking-wider font-mono font-bold"
            >
              {isRedlining ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating comparison...
                </>
              ) : (
                <>
                  <Scale className="h-4 w-4 mr-2" />
                  Compare Document Versions
                </>
              )}
            </Button>

            {/* Comparison results */}
            {redlineResult ? (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start pt-6 border-t border-neutral-200">
                
                {/* Diff lists */}
                <div className="xl:col-span-8 space-y-6">
                  <span className="text-xs font-mono text-slate-455 uppercase block font-bold">Discrepancy Redlines</span>
                  
                  <div className="space-y-5">
                    {redlineResult.modifications && redlineResult.modifications.map((mod: any, idx: number) => (
                      <div key={idx} className="p-5 bg-white border border-neutral-200 rounded space-y-4 text-xs md:text-sm shadow-3xs">
                        <div className="flex justify-between items-center text-[10px] font-mono border-b border-neutral-100 pb-2">
                          <span className="font-bold text-slate-800 uppercase">📄 {mod.clause_type || "Provision"}</span>
                          <span className="text-emerald-705 font-bold uppercase">Modified</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-4 bg-red-50/40 border border-red-100 rounded text-red-900 font-serif leading-relaxed text-xs md:text-sm">
                            <span className="font-mono text-[9px] text-red-500 uppercase block font-bold mb-1">Removed:</span>
                            {mod.original}
                          </div>
                          <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded text-emerald-900 font-serif leading-relaxed text-xs md:text-sm">
                            <span className="font-mono text-[9px] text-emerald-600 uppercase block font-bold mb-1">Added:</span>
                            {mod.revised}
                          </div>
                        </div>

                        {mod.impact_summary && (
                          <p className="bg-neutral-50 p-3.5 border border-neutral-150 text-slate-655 font-sans leading-normal rounded">
                            <span className="font-mono text-[9px] text-slate-450 uppercase block font-bold">AI Risk Assessment:</span>
                            {mod.impact_summary}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compare summaries */}
                <div className="xl:col-span-4 space-y-6">
                  <div className="border border-neutral-200 bg-white p-5 space-y-4 rounded text-xs md:text-sm text-slate-705 shadow-3xs">
                    <span className="text-xs font-mono text-slate-450 uppercase block font-bold border-b border-neutral-100 pb-2">
                      Comparison Summary
                    </span>
                    <p className="font-serif leading-relaxed text-slate-650">{redlineResult.summary}</p>
                  </div>

                  <div className="border border-neutral-200 bg-white p-5 space-y-4 rounded text-xs md:text-sm text-slate-705 shadow-3xs">
                    <span className="text-xs font-mono text-slate-450 uppercase block font-bold border-b border-neutral-100 pb-2">
                      Legal Impact
                    </span>
                    <p className="font-serif leading-relaxed text-slate-655">{redlineResult.legal_impact || redlineResult.risk_changes}</p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="border border-neutral-200 border-dashed bg-neutral-50/50 p-12 text-center space-y-3 rounded min-h-[300px] flex flex-col justify-center items-center font-serif shadow-3xs">
                <Scale className="h-10 w-10 text-neutral-350" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700 font-sans">Redline Analysis panel</p>
                  <p className="text-xs text-slate-400 max-w-xs leading-normal">
                    Paste original and counterparty drafts in the panels above to generate version control differences.
                  </p>
                </div>
              </div>
            )}

        </motion.div>
      )}

      {/* IMPROVE CLAUSES TAB */}
      {activeTab === "improve" && (
        <motion.div
          key="improve-tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            
            {/* Left: Input details */}
            <div className="xl:col-span-6 border border-neutral-200 bg-white p-6 space-y-6 rounded shadow-3xs">
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-455 uppercase font-bold block">Target Clause Provision</label>
                <textarea
                  value={improveText}
                  onChange={(e) => setImproveText(e.target.value)}
                  placeholder="Paste specific clause text lines here..."
                  rows={10}
                  className="w-full bg-white border border-neutral-200 focus:outline-none p-4 text-sm text-slate-800 font-serif leading-relaxed rounded"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono text-slate-450 uppercase font-bold block">Refinement Prompts / Instructions</label>
                  <VoiceButton onTranscribe={(t) => setImproveInstructions(prev => prev + (prev ? " " : "") + t)} />
                </div>
                <input
                  type="text"
                  value={improveInstructions}
                  onChange={(e) => setImproveInstructions(e.target.value)}
                  placeholder="e.g. Rewrite to make liability caps mutual, or make notices written."
                  className="w-full bg-white border border-neutral-200 focus:border-emerald-600 focus:outline-none px-4 py-3 text-sm text-slate-800 placeholder:text-neutral-350 rounded font-sans"
                />
              </div>

              <Button 
                onClick={handleImproveClause} 
                disabled={isImproving || !improveText.trim()} 
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs uppercase tracking-wider"
              >
                {isImproving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Optimizing clause...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Optimize Clause
                  </>
                )}
              </Button>
            </div>

            {/* Right: Improvement results */}
            <div className="xl:col-span-6 space-y-6">
              {improveResult ? (
                <div className="space-y-6 text-xs md:text-sm text-slate-750">
                  
                  {/* Optimized version output */}
                  <div className="border border-emerald-200 bg-white p-6 space-y-4 rounded relative shadow-3xs">
                    <span className="absolute right-4 top-4 text-[9px] font-mono text-emerald-755 font-bold bg-emerald-50 px-3 py-1 border border-emerald-200 uppercase rounded">
                      AI Optimized Draft
                    </span>
                    <span className="text-xs font-mono text-slate-455 uppercase block font-bold border-b border-neutral-100 pb-2">
                      Improved Clause
                    </span>
                    <div className="font-serif leading-relaxed text-slate-850 bg-neutral-50 p-5 border border-neutral-200 rounded whitespace-pre-wrap text-sm md:text-base">
                      {improveResult.generated_draft || improveResult.improved_text || improveResult.text || ""}
                    </div>
                    <div className="flex justify-end pt-3">
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(improveResult.generated_draft || improveResult.improved_text || "");
                          toast({ title: "Copied", description: "Improved clause copied." });
                        }}
                        className="h-9 px-5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs uppercase tracking-wider rounded"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Clause
                      </Button>
                    </div>
                  </div>

                  {/* Reason for Improvement */}
                  {(improveResult.executive_summary || improveResult.reason) && (
                    <div className="border border-neutral-200 bg-white p-5 space-y-3 rounded shadow-3xs">
                      <span className="text-xs font-mono text-slate-450 uppercase block font-bold border-b border-neutral-100 pb-2">
                        Reason for Improvement
                      </span>
                      <p className="font-serif leading-relaxed text-slate-650">
                        {improveResult.executive_summary || improveResult.reason}
                      </p>
                    </div>
                  )}

                  {/* Legal Benefit */}
                  {improveResult.clause_explanations && (
                    <div className="border border-neutral-200 bg-white p-5 space-y-4 rounded shadow-3xs">
                      <span className="text-xs font-mono text-slate-455 uppercase block font-bold border-b border-neutral-100 pb-2">
                        Legal Benefit
                      </span>
                      <div className="space-y-3">
                        {Object.entries(improveResult.clause_explanations).map(([key, exp]: any, idx) => (
                          <div key={idx} className="space-y-1.5">
                            <span className="font-sans font-semibold text-[9.5px] uppercase tracking-wider text-slate-400 block font-mono">
                              {key.replace("_", " ")}
                            </span>
                            <p className="font-serif leading-relaxed text-slate-600">{exp}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risks */}
                  {improveResult.risk_assessment && improveResult.risk_assessment.length > 0 && (
                    <div className="border border-neutral-200 bg-white p-5 space-y-4 rounded shadow-3xs">
                      <span className="text-xs font-mono text-slate-455 uppercase block font-bold border-b border-neutral-100 pb-2">
                        Potential Risks
                      </span>
                      <div className="space-y-3">
                        {improveResult.risk_assessment.map((r: any, idx: number) => (
                          <div key={idx} className="p-4 bg-red-50/20 border border-red-150 rounded text-xs space-y-2 font-serif text-slate-700">
                            <div className="flex justify-between items-center font-sans font-semibold text-red-900 text-xs md:text-sm">
                              <span>{r.clause || "Liability"}</span>
                              <Badge className="bg-red-100 text-red-750 text-[9px] font-mono uppercase rounded border border-red-200 font-bold">
                                {r.level || "Critical"}
                              </Badge>
                            </div>
                            <p className="leading-normal">{r.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="border border-neutral-200 border-dashed bg-neutral-50/50 p-12 text-center space-y-3 rounded min-h-[300px] flex flex-col justify-center items-center font-serif shadow-3xs">
                  <Sparkles className="h-10 w-10 text-neutral-350" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-750 font-sans">Optimized Clause Results panel</p>
                    <p className="text-xs text-slate-400 max-w-xs leading-normal">
                      Provide a clause and refining prompt to generate the optimized, risk-assessed rewrite options.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </motion.div>
      )}

    </AnimatePresence>

    </div>
  );
};

export default DocumentDrafting;
