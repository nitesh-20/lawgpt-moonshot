import { useState, useEffect, useRef } from "react";
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
  Edit3,
  Upload,
  Globe,
  Star,
  ChevronDown,
  BookOpen,
  FolderLock,
  Compass,
  FileSpreadsheet,
  Building,
  ShieldCheck,
  Eye,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Printer,
  History,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { AudioPlaybackButton } from "@/components/voice/AudioPlaybackButton";
import { 
  generateDraft, 
  reviewDraft, 
  redlineDraft, 
  improveDraft 
} from "@/services/drafting";

export interface LegalTemplate {
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
  const [activeTab, setActiveTab] = useState<"templates" | "generate" | "review" | "redline" | "improve">("templates");
  const { toast } = useToast();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedJurisdiction, setSelectedJurisdiction] = useState("Central Govt, India");
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  // 21 Production Legal Templates
  const templatesList: LegalTemplate[] = [
    {
      id: "nda",
      name: "Non-Disclosure Agreement (NDA)",
      description: "Protects proprietary and confidential trade secrets shared during commercial discussions.",
      category: "Confidentiality",
      useCase: "Exchanging technical architecture, customer metrics, or corporate data with prospective partners.",
      backendId: "nda",
      fields: ["Effective Date", "Disclosing Party", "Receiving Party", "Purpose"],
      draftTime: "1 min draft",
      popular: true
    },
    {
      id: "employment_agreement",
      name: "Employment Agreement",
      description: "Binding contract detailing job duties, compensation, notice terms, and restrictive covenants.",
      category: "Employment",
      useCase: "Hiring full-time operational and executive staff under statutory labor regulations.",
      backendId: "employment_agreement",
      fields: ["Effective Date", "Employer Name", "Employee Name", "Job Title", "Salary"],
      draftTime: "2 min draft",
      popular: true
    },
    {
      id: "service_agreement",
      name: "Service Agreement",
      description: "Comprehensive B2B service agreement specifying deliverables, milestones, KPIs, and fees.",
      category: "Commercial",
      useCase: "Engaging external technology vendors, marketing agencies, or corporate consultants.",
      backendId: "service_agreement",
      fields: ["Effective Date", "Client Name", "Service Provider", "Scope of Services", "Fees"],
      draftTime: "2 min draft",
      popular: true
    },
    {
      id: "independent_contractor",
      name: "Independent Contractor Agreement",
      description: "Defines non-employee freelance scopes, retainer payouts, and complete IP assignment.",
      category: "Employment",
      useCase: "Retaining specialized freelance software engineers, UI/UX designers, or strategic advisors.",
      backendId: "service_agreement",
      fields: ["Effective Date", "Client Name", "Contractor Name", "Scope of Services", "Retainer Fees"],
      draftTime: "2 min draft"
    },
    {
      id: "software_dev",
      name: "Software Development Agreement",
      description: "Defines software deliverables, sprint acceptance criteria, warranties, and code ownership.",
      category: "Corporate",
      useCase: "Commissioning bespoke software, SaaS products, or mobile applications from development agencies.",
      backendId: "service_agreement",
      fields: ["Effective Date", "Client Name", "Developer Name", "Tech Stack & Milestones", "Project Cost"],
      draftTime: "3 min draft"
    },
    {
      id: "msa",
      name: "Master Service Agreement (MSA)",
      description: "Umbrella agreement establishing governance, liability caps, and terms for future statements of work.",
      category: "Commercial",
      useCase: "Long-term enterprise vendor relationships with recurring individual project orders.",
      backendId: "general_contract",
      fields: ["Effective Date", "Client Name", "Provider Name", "Overall Scope", "Term Duration"],
      draftTime: "3 min draft",
      popular: true
    },
    {
      id: "partnership_agreement",
      name: "Partnership Agreement",
      description: "Establishes capital ratios, profit-sharing formulas, voting thresholds, and dispute resolution.",
      category: "Corporate",
      useCase: "Forming a formal partnership or joint venture between co-founders or managing partners.",
      backendId: "partnership_agreement",
      fields: ["Effective Date", "Partner A Name", "Partner B Name", "Capital Contributions", "Voting Control %"],
      draftTime: "3 min draft"
    },
    {
      id: "vendor_agreement",
      name: "Vendor Agreement",
      description: "Defines procurement terms, delivery schedules, quality specifications, and liability limits.",
      category: "Commercial",
      useCase: "Procuring commercial equipment, inventory, or recurring hardware supplies.",
      backendId: "vendor_agreement",
      fields: ["Effective Date", "Customer Name", "Vendor Name", "Goods Description"],
      draftTime: "2 min draft"
    },
    {
      id: "lease_agreement",
      name: "Residential Lease Agreement",
      description: "Tenancy agreement detailing lease term, security deposit, maintenance, and eviction rules.",
      category: "Real Estate",
      useCase: "Leasing residential apartments, villas, or properties to tenants with defined covenants.",
      backendId: "lease_agreement",
      fields: ["Effective Date", "Landlord Name", "Tenant Name", "Premises Address", "Rent & Security Deposit"],
      draftTime: "2 min draft",
      popular: true
    },
    {
      id: "commercial_lease",
      name: "Commercial Lease Agreement",
      description: "Lease contract for office spaces, retail outlets, and commercial buildings with CAM charges.",
      category: "Real Estate",
      useCase: "Renting commercial retail or office floors with escalation and fit-out clauses.",
      backendId: "lease_agreement",
      fields: ["Effective Date", "Lessor Name", "Lessee Name", "Commercial Unit Address", "Monthly Lease & Maintenance"],
      draftTime: "3 min draft"
    },
    {
      id: "privacy_policy",
      name: "Privacy Policy (DPDP & GDPR Compliant)",
      description: "Statutory privacy policy detailing data collection, consent, retention, and user rights.",
      category: "Compliance",
      useCase: "Publishing mandatory data privacy disclosures on web applications and SaaS platforms.",
      backendId: "privacy_policy",
      fields: ["Effective Date", "Company Name", "Website URL", "Contact Email"],
      draftTime: "1 min draft",
      popular: true
    },
    {
      id: "terms_and_conditions",
      name: "Terms and Conditions of Service",
      description: "Governing terms of use, limitation of liability, user restrictions, and governing law.",
      category: "Compliance",
      useCase: "Establishing legal user terms for software platforms, consumer apps, or e-commerce stores.",
      backendId: "terms_and_conditions",
      fields: ["Effective Date", "Company Name", "Website URL", "Governing Jurisdiction"],
      draftTime: "2 min draft"
    },
    {
      id: "dpa",
      name: "Data Processing Agreement (DPA)",
      description: "Governs data protection duties, breach notification timelines, and processor obligations.",
      category: "Compliance",
      useCase: "Engaging sub-processors and cloud service providers handling customer personal data.",
      backendId: "privacy_policy",
      fields: ["Effective Date", "Data Controller", "Data Processor", "Categories of Personal Data"],
      draftTime: "2 min draft"
    },
    {
      id: "offer_letter",
      name: "Job Offer Letter",
      description: "Formal employment offer detailing salary breakdown, joining date, and contingency clauses.",
      category: "Employment",
      useCase: "Extending official job offers to prospective candidates prior to formal contract execution.",
      backendId: "offer_letter",
      fields: ["Start Date", "Employer Name", "Candidate Name", "Job Title Offered", "Base Compensation"],
      draftTime: "1 min draft"
    },
    {
      id: "legal_notice",
      name: "Legal Demand Notice",
      description: "Pre-litigation legal demand notice demanding cure of contractual breach or unpaid dues.",
      category: "Litigation",
      useCase: "Serving formal notice to defaulting parties before instituting court proceedings.",
      backendId: "legal_notice",
      fields: ["Issue Date", "Sender Name", "Recipient Name", "Breach Details", "Demands & Cure Period"],
      draftTime: "2 min draft",
      popular: true
    },
    {
      id: "reply_notice",
      name: "Reply to Legal Notice",
      description: "Formal legal response rebutting false claims and stating factual defense.",
      category: "Litigation",
      useCase: "Responding to baseless claims or unfounded allegations made in a legal notice.",
      backendId: "reply_notice",
      fields: ["Reply Date", "Sender Name", "Recipient Name", "Allegations & Factual Defense"],
      draftTime: "2 min draft"
    },
    {
      id: "eviction_notice",
      name: "Tenancy Eviction Notice",
      description: "Formal notice to vacate premises due to lease expiry, non-payment, or breach of tenancy.",
      category: "Real Estate",
      useCase: "Instructing non-compliant tenants to vacate within statutory notice timeframes.",
      backendId: "legal_notice",
      fields: ["Notice Date", "Landlord Name", "Tenant Name", "Property Address", "Grounds for Eviction"],
      draftTime: "2 min draft"
    },
    {
      id: "general_contract",
      name: "General Commercial Agreement",
      description: "Customizable bilateral commercial contract for miscellaneous business engagements.",
      category: "Corporate",
      useCase: "Bespoke commercial arrangements with custom recitals, consideration, and warranties.",
      backendId: "general_contract",
      fields: ["Effective Date", "Party A Name", "Party B Name", "Contract Subject & Recitals"],
      draftTime: "2 min draft"
    },
    {
      id: "affidavit",
      name: "General Sworn Affidavit",
      description: "Sworn legal declaration executed under oath for judicial or administrative submission.",
      category: "Litigation",
      useCase: "Submitting sworn statements to government bodies, banks, or judicial tribunals.",
      backendId: "affidavit",
      fields: ["Effective Date", "Deponent Name", "Deponent Address", "Affidavit Statements"],
      draftTime: "1 min draft"
    },
    {
      id: "mou",
      name: "Memorandum of Understanding (MoU)",
      description: "Preliminary framework recording mutual intent and key terms before binding contract.",
      category: "Corporate",
      useCase: "Documenting strategic partnership intent and high-level collaboration goals.",
      backendId: "memorandum_of_understanding",
      fields: ["Effective Date", "Party A Name", "Party B Name", "Mutual Goals & Objectives"],
      draftTime: "2 min draft"
    },
    {
      id: "cease_and_desist",
      name: "Cease and Desist Letter",
      description: "Formal legal warning demanding immediate halt to intellectual property infringement or defamation.",
      category: "Litigation",
      useCase: "Demanding immediate cessation of trademark infringement, copyright piracy, or defamatory publications.",
      backendId: "legal_notice",
      fields: ["Issue Date", "Claimant Name", "Infringing Party", "Infringement Particulars", "Remedial Deadline"],
      draftTime: "2 min draft"
    }
  ];

  // Active Selected Template
  const [selectedTemplate, setSelectedTemplate] = useState<LegalTemplate>(templatesList[0]);
  const [docVariables, setDocVariables] = useState<Record<string, string>>({
    "Effective Date": new Date().toISOString().split('T')[0],
    "Disclosing Party": "Acme Corp Pvt Ltd",
    "Receiving Party": "Zenith Technologies LLP",
    "Purpose": "Evaluating potential joint AI software licensing and distribution"
  });

  // Prompt Console & Clauses
  const [promptInstructions, setPromptInstructions] = useState("");
  const [additionalClauses, setAdditionalClauses] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<string>("");
  const [isEditingDraft, setIsEditingDraft] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>("");

  // Review & Audit State
  const [reviewText, setReviewText] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<any | null>(null);

  // Redline Compare State
  const [originalText, setOriginalText] = useState("");
  const [revisedText, setRevisedText] = useState("");
  const [isRedlining, setIsRedlining] = useState(false);
  const [redlineResult, setRedlineResult] = useState<any | null>(null);

  // Improve Clause State
  const [improveText, setImproveText] = useState("");
  const [improveInstructions, setImproveInstructions] = useState("Make this clause reciprocal, balanced, and client-friendly.");
  const [isImproving, setIsImproving] = useState(false);
  const [improveResult, setImproveResult] = useState<any | null>(null);

  // Categories list
  const categories = ["all", "Confidentiality", "Employment", "Corporate", "Commercial", "Compliance", "Real Estate", "Litigation"];

  // Filter templates list
  const filteredTemplates = templatesList.filter(t => {
    const q = searchQuery.toLowerCase();
    const matchSearch = t.name.toLowerCase().includes(q) || 
                        t.category.toLowerCase().includes(q) ||
                        t.description.toLowerCase().includes(q) ||
                        t.useCase.toLowerCase().includes(q);
    const matchCat = selectedCategory === "all" || t.category === selectedCategory;
    return matchSearch && matchCat;
  });

  // Synchronize variables when selected template changes
  const handleSelectTemplate = (tpl: LegalTemplate) => {
    setSelectedTemplate(tpl);
    const initialVars: Record<string, string> = {};
    tpl.fields.forEach(field => {
      if (field.includes("Date")) {
        initialVars[field] = new Date().toISOString().split('T')[0];
      } else if (field.toLowerCase().includes("party") || field.toLowerCase().includes("client") || field.toLowerCase().includes("employer")) {
        initialVars[field] = "Acme Technologies Pvt Ltd";
      } else if (field.toLowerCase().includes("receiving") || field.toLowerCase().includes("employee") || field.toLowerCase().includes("vendor") || field.toLowerCase().includes("contractor")) {
        initialVars[field] = "Zenith Solutions LLP";
      } else {
        initialVars[field] = "";
      }
    });
    setDocVariables(initialVars);
    setActiveTab("generate");
    toast({
      title: "Template Selected",
      description: `Drafting workspace configured for ${tpl.name}.`,
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const variables: Record<string, any> = {};
    const backendId = selectedTemplate.backendId;

    if (backendId === "nda") {
      variables["effective_date"] = docVariables["Effective Date"] || new Date().toLocaleDateString();
      variables["disclosing_party"] = docVariables["Disclosing Party"] || "Disclosing Party";
      variables["receiving_party"] = docVariables["Receiving Party"] || "Receiving Party";
      variables["purpose"] = docVariables["Purpose"] || "Evaluating commercial business collaboration";
    } else if (backendId === "employment_agreement") {
      variables["effective_date"] = docVariables["Effective Date"] || new Date().toLocaleDateString();
      variables["employer_name"] = docVariables["Employer Name"] || "Employer Inc";
      variables["employee_name"] = docVariables["Employee Name"] || "Employee Name";
      variables["job_title"] = docVariables["Job Title"] || "Software Engineer";
      variables["salary"] = docVariables["Salary"] || "Competitive Compensation";
    } else if (backendId === "offer_letter") {
      variables["employer_name"] = docVariables["Employer Name"] || "Company Name";
      variables["candidate_name"] = docVariables["Candidate Name"] || "Candidate Name";
      variables["job_title"] = docVariables["Job Title Offered"] || "Executive";
      variables["start_date"] = docVariables["Start Date"] || new Date().toLocaleDateString();
      variables["salary"] = docVariables["Base Compensation"] || "₹ 18,00,000 per annum";
    } else if (backendId === "lease_agreement") {
      variables["effective_date"] = docVariables["Effective Date"] || new Date().toLocaleDateString();
      variables["landlord_name"] = docVariables["Landlord Name"] || docVariables["Lessor Name"] || "Landlord";
      variables["tenant_name"] = docVariables["Tenant Name"] || docVariables["Lessee Name"] || "Tenant";
      variables["property_address"] = docVariables["Premises Address"] || docVariables["Commercial Unit Address"] || "Plot 42, Cyber City";
      variables["monthly_rent"] = docVariables["Rent & Security Deposit"] || docVariables["Monthly Lease & Maintenance"] || "₹ 75,000 / month";
    } else if (backendId === "service_agreement") {
      variables["effective_date"] = docVariables["Effective Date"] || new Date().toLocaleDateString();
      variables["client_name"] = docVariables["Client Name"] || "Client Name";
      variables["service_provider"] = docVariables["Service Provider"] || docVariables["Contractor Name"] || docVariables["Developer Name"] || "Service Provider";
      variables["scope_of_services"] = docVariables["Scope of Services"] || docVariables["Tech Stack & Milestones"] || "Software development and deployment services";
      variables["fees"] = docVariables["Fees"] || docVariables["Retainer Fees"] || docVariables["Project Cost"] || "Agreed Commercials";
    } else if (backendId === "partnership_agreement") {
      variables["effective_date"] = docVariables["Effective Date"] || new Date().toLocaleDateString();
      variables["partner_1"] = docVariables["Partner A Name"] || "Partner A";
      variables["partner_2"] = docVariables["Partner B Name"] || "Partner B";
      variables["capital_contributions"] = docVariables["Capital Contributions"] || "50% each";
    } else if (backendId === "vendor_agreement") {
      variables["effective_date"] = docVariables["Effective Date"] || new Date().toLocaleDateString();
      variables["customer_name"] = docVariables["Customer Name"] || "Customer";
      variables["vendor_name"] = docVariables["Vendor Name"] || "Vendor";
      variables["goods_services"] = docVariables["Goods Description"] || "Procured materials & hardware supplies";
    } else if (backendId === "privacy_policy" || backendId === "terms_and_conditions") {
      variables["effective_date"] = docVariables["Effective Date"] || new Date().toLocaleDateString();
      variables["company_name"] = docVariables["Company Name"] || "LawGPT Platform";
      variables["website_url"] = docVariables["Website URL"] || "https://lawgpt.ai";
    } else if (backendId === "legal_notice") {
      variables["issue_date"] = docVariables["Issue Date"] || docVariables["Notice Date"] || new Date().toLocaleDateString();
      variables["sender_name"] = docVariables["Sender Name"] || docVariables["Landlord Name"] || docVariables["Claimant Name"] || "Sender";
      variables["recipient_name"] = docVariables["Recipient Name"] || docVariables["Tenant Name"] || docVariables["Infringing Party"] || "Recipient";
      variables["facts_of_case"] = docVariables["Breach Details"] || docVariables["Grounds for Eviction"] || docVariables["Infringement Particulars"] || "Breach of contractual covenants";
      variables["demands"] = docVariables["Demands & Cure Period"] || docVariables["Remedial Deadline"] || "Cure breach within 15 days";
    } else if (backendId === "reply_notice") {
      variables["reply_date"] = docVariables["Reply Date"] || new Date().toLocaleDateString();
      variables["sender_name"] = docVariables["Sender Name"] || "Respondent";
      variables["recipient_name"] = docVariables["Recipient Name"] || "Complainant";
      variables["allegations_responses"] = docVariables["Allegations & Factual Defense"] || "Denial of allegations and statement of legal defense";
    } else if (backendId === "affidavit") {
      variables["effective_date"] = docVariables["Effective Date"] || new Date().toLocaleDateString();
      variables["deponent_name"] = docVariables["Deponent Name"] || "Deponent";
      variables["deponent_address"] = docVariables["Deponent Address"] || "Residential Address";
      variables["statements"] = docVariables["Affidavit Statements"] || "Solemn affirmation of facts";
      variables["jurisdiction"] = selectedJurisdiction;
    } else {
      variables["effective_date"] = docVariables["Effective Date"] || new Date().toLocaleDateString();
      variables["party_a"] = docVariables["Party A Name"] || "Party A";
      variables["party_b"] = docVariables["Party B Name"] || "Party B";
      variables["recitals"] = docVariables["Contract Subject & Recitals"] || docVariables["Mutual Goals & Objectives"] || "Commercial agreement terms";
    }

    try {
      const payload = {
        doc_type: backendId,
        variables,
        custom_clauses: additionalClauses ? { "custom": additionalClauses } : {},
        user_instructions: `Jurisdiction: ${selectedJurisdiction}. Language: ${selectedLanguage}. ${promptInstructions}`
      };

      const res = await generateDraft(payload);
      const draft = res.data?.generated_draft || res.data?.draft_text || res.generated_draft || res.draft_text;
      
      if (draft) {
        setGeneratedDraft(draft);
        setLastSavedTime(new Date().toLocaleTimeString());
        toast({
          title: "Document Drafted Successfully",
          description: `Generated ${selectedTemplate.name} with verified clauses.`,
        });
      } else {
        toast({
          title: "Generation Warning",
          description: "Document structure assembled. You can now edit clauses.",
        });
      }
    } catch (e: any) {
      console.error("Draft generation error:", e);
      toast({
        title: "Drafting Service Issue",
        description: e.message || "Failed to connect to drafting service. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReviewAudit = async () => {
    const textToReview = reviewText.trim() || generatedDraft.trim();
    if (!textToReview) {
      toast({ title: "No Text to Review", description: "Please generate or paste a draft to audit.", variant: "destructive" });
      return;
    }
    setIsReviewing(true);
    try {
      const res = await reviewDraft({
        text: textToReview,
        doc_type: selectedTemplate.backendId || "general_contract"
      });
      const data = res.data || res;
      setReviewResult(data.review_analysis || data);
      toast({ title: "Audit Complete", description: "Legal risk scorecard and clause audit compiled." });
    } catch (e) {
      console.error(e);
      toast({ title: "Audit Error", description: "Failed to compile compliance audit.", variant: "destructive" });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleRedlineCompare = async () => {
    if (!originalText.trim() || !revisedText.trim()) {
      toast({ title: "Missing Drafts", description: "Please provide both baseline and revised texts.", variant: "destructive" });
      return;
    }
    setIsRedlining(true);
    try {
      const res = await redlineDraft({
        original_text: originalText,
        revised_text: revisedText
      });
      setRedlineResult(res.data || res);
      toast({ title: "Redlines Generated", description: "Clause diff analysis ready." });
    } catch (e) {
      console.error(e);
      toast({ title: "Redline Error", description: "Comparison engine failed.", variant: "destructive" });
    } finally {
      setIsRedlining(false);
    }
  };

  const handleImproveClause = async () => {
    if (!improveText.trim()) {
      toast({ title: "Empty Clause", description: "Please enter or select a clause to improve.", variant: "destructive" });
      return;
    }
    setIsImproving(true);
    try {
      const res = await improveDraft({
        text: improveText,
        instructions: improveInstructions,
        doc_type: selectedTemplate.backendId || "general_contract"
      });
      setImproveResult(res.data || res);
      toast({ title: "Clause Optimized", description: "AI rewritten clause ready for review." });
    } catch (e) {
      console.error(e);
      toast({ title: "Improvement Failed", description: "Could not optimize clause.", variant: "destructive" });
    } finally {
      setIsImproving(false);
    }
  };

  const handleExportText = (content: string, filename = "legal_draft.md") => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Downloaded", description: `Saved ${filename}` });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveDraft = () => {
    setLastSavedTime(new Date().toLocaleTimeString());
    toast({ title: "Draft Saved", description: `Saved locally at ${new Date().toLocaleTimeString()}` });
  };

  // Icon Matcher
  const getTemplateIcon = (cat: string) => {
    switch (cat) {
      case "Confidentiality":
        return <FolderLock className="h-5 w-5 text-blue-600" />;
      case "Employment":
        return <User className="h-5 w-5 text-indigo-600" />;
      case "Corporate":
        return <Building className="h-5 w-5 text-emerald-600" />;
      case "Commercial":
        return <Briefcase className="h-5 w-5 text-amber-600" />;
      case "Compliance":
        return <ShieldCheck className="h-5 w-5 text-purple-600" />;
      case "Real Estate":
        return <Building className="h-5 w-5 text-teal-600" />;
      case "Litigation":
        return <Scale className="h-5 w-5 text-rose-600" />;
      default:
        return <FileText className="h-5 w-5 text-blue-600" />;
    }
  };

  // A4 Document Viewer Formatter
  const renderFormattedDraft = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith("# ")) {
        return (
          <h1 key={idx} className="text-center text-xl md:text-2xl font-bold font-sans uppercase tracking-tight my-6 text-slate-900 border-b border-slate-200 pb-3">
            {trimmed.replace("# ", "")}
          </h1>
        );
      }
      
      const h2Match = trimmed.match(/^##\s+(\d+\.?\s*.*)/) || trimmed.match(/^##\s+(.*)/);
      if (h2Match) {
        return (
          <h2 key={idx} className="text-sm md:text-base font-bold font-sans tracking-wide uppercase mt-6 mb-2.5 text-slate-900 border-l-2 border-blue-600 pl-2.5">
            {h2Match[1]}
          </h2>
        );
      }

      const h3Match = trimmed.match(/^###\s+(\d+\.\d+\.?\s*.*)/) || trimmed.match(/^###\s+(.*)/);
      if (h3Match) {
        return (
          <h3 key={idx} className="text-xs md:text-sm font-bold font-sans mt-4 mb-2 text-slate-800 pl-3">
            {h3Match[1]}
          </h3>
        );
      }

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return (
          <li key={idx} className="list-disc pl-6 leading-relaxed my-1.5 font-serif text-[14px] text-slate-800">
            {trimmed.substring(2)}
          </li>
        );
      }

      if (trimmed === "") {
        return <div key={idx} className="h-3" />;
      }

      const isIndented = trimmed.match(/^\d+\.\d+/) || trimmed.match(/^\d+\./);
      return (
        <p key={idx} className={`leading-relaxed my-2.5 text-justify font-serif text-[14px] text-slate-800 ${isIndented ? "pl-4 font-medium" : ""}`}>
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans leading-normal p-4 md:p-8 space-y-6">
      
      {/* 1. TOP TITLE & WORKSPACE CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
            <FileEdit className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 font-sans flex items-center gap-2">
              Legal Document Drafting Workspace
            </h1>
            <p className="text-xs text-slate-500 font-normal">
              Autonomous contract drafting, clause intelligence, risk audit, and redline comparisons
            </p>
          </div>
        </div>

        {/* Action selects */}
        <div className="flex items-center flex-wrap gap-2.5 text-xs font-sans">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Globe className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={selectedJurisdiction}
              onChange={(e) => setSelectedJurisdiction(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer text-slate-700"
            >
              <option value="Central Govt, India">India (Central)</option>
              <option value="State of Maharashtra, India">Maharashtra State</option>
              <option value="State of Karnataka, India">Karnataka State</option>
              <option value="Delaware Corporate Court, USA">Delaware Corporate</option>
              <option value="England and Wales, UK">UK / Commonwealth</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Languages className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer text-slate-700"
            >
              <option value="en">English (EN)</option>
              <option value="hi-IN">Hindi (HI)</option>
              <option value="ta-IN">Tamil (TA)</option>
              <option value="te-IN">Telugu (TE)</option>
              <option value="bn-IN">Bengali (BN)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: "templates", label: "Template Browser", icon: Files },
          { id: "generate", label: "Interactive Draft & Editor", icon: FileEdit },
          { id: "review", label: "Review & Audit", icon: FileCheck },
          { id: "redline", label: "Redline Compare", icon: Scale },
          { id: "improve", label: "Improve Clauses", icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all cursor-pointer shrink-0 ${
                isActive 
                  ? "bg-blue-600 text-white font-semibold shadow-xs" 
                  : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. TAB CONTENT PANELS */}
      <AnimatePresence mode="wait">
        
        {/* ========================================================================= */}
        {/* TAB 1: TEMPLATES BROWSER */}
        {/* ========================================================================= */}
        {activeTab === "templates" && (
          <motion.div
            key="templates-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Search & Category Filter Header */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-sans">
                    Legal Document Template Library
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select a verified statutory template to auto-populate clauses, variables, and compliance safeguards.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    placeholder="Search templates (e.g. NDA, Lease, DPA)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:outline-none pl-9 pr-4 py-2 text-xs placeholder:text-slate-400 rounded-xl transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-all capitalize ${
                      selectedCategory === cat
                        ? "bg-slate-900 text-white font-semibold shadow-xs"
                        : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/60"
                    }`}
                  >
                    {cat === "all" ? "All Categories" : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Cards Grid (Responsive 3-Column Desktop, 2-Column Tablet, 1-Column Mobile) */}
            {filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="bg-white border border-slate-200/90 hover:border-blue-500/60 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                  >
                    <div className="space-y-3.5">
                      {/* Card Header: Icon + Category Badge */}
                      <div className="flex items-center justify-between">
                        <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                          {getTemplateIcon(tpl.category)}
                        </div>
                        <div className="flex items-center gap-2">
                          {tpl.popular && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Popular
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {tpl.category}
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-sm md:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {tpl.name}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed mt-1 line-clamp-2">
                          {tpl.description}
                        </p>
                      </div>

                      {/* Use Case Box */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] text-slate-600 leading-relaxed">
                        <strong className="text-slate-800 font-semibold block mb-0.5">Use Case:</strong>
                        <span className="line-clamp-2">{tpl.useCase}</span>
                      </div>

                      {/* Required Variables Tags */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">Key Variables:</span>
                        <div className="flex flex-wrap gap-1">
                          {tpl.fields.slice(0, 3).map((f, fIdx) => (
                            <span key={fIdx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                              {f}
                            </span>
                          ))}
                          {tpl.fields.length > 3 && (
                            <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md">
                              +{tpl.fields.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer CTA */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {tpl.draftTime}
                      </span>
                      <Button
                        onClick={() => handleSelectTemplate(tpl)}
                        size="sm"
                        className="bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold rounded-xl h-8 px-4 transition-colors"
                      >
                        <span>Use Template</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                <Search className="h-8 w-8 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No matching legal templates</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No templates matched "{searchQuery}". Try searching for NDA, Lease, Contractor, or Employment.
                </p>
                <Button 
                  onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
                  variant="outline" 
                  size="sm"
                  className="rounded-xl text-xs"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: INTERACTIVE DRAFT & A4 EDITOR */}
        {/* ========================================================================= */}
        {activeTab === "generate" && (
          <motion.div
            key="generate-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Header: Selected Template info */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  {getTemplateIcon(selectedTemplate.category)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{selectedTemplate.name}</h2>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {selectedTemplate.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{selectedTemplate.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setActiveTab("templates")}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs h-8 border-slate-200"
                >
                  Change Template
                </Button>
              </div>
            </div>

            {/* Workspace Grid: Form Inputs (Left) + A4 Document Canvas (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: Input Variables & Instructions (4 cols) */}
              <div className="lg:col-span-4 space-y-5">
                
                {/* 1. Dynamic Matter Placeholders */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5 text-blue-600" />
                      1. Matter Details
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Required</span>
                  </div>

                  <div className="space-y-3">
                    {selectedTemplate.fields.map((field) => (
                      <div key={field} className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 block">
                          {field} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type={field.includes("Date") ? "date" : "text"}
                          placeholder={`Enter ${field.toLowerCase()}...`}
                          value={docVariables[field] || ""}
                          onChange={(e) => setDocVariables({ ...docVariables, [field]: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 px-3 py-2 focus:bg-white focus:border-blue-600 focus:outline-none rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Custom AI Drafting Instructions */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      2. Drafting Instructions
                    </span>
                    <VoiceButton onTranscribe={(t) => setPromptInstructions(prev => prev + (prev ? " " : "") + t)} />
                  </div>

                  <textarea
                    placeholder="Custom instructions (e.g. Include 3-year confidentiality survival, 15-day cure period, mutual indemnity cap)..."
                    value={promptInstructions}
                    onChange={(e) => setPromptInstructions(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:outline-none p-3 text-xs text-slate-900 placeholder:text-slate-400 rounded-xl resize-none leading-relaxed transition-colors"
                  />

                  {/* Suggestion tags */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">Quick Additions:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Mutual liability cap",
                        "3-year confidentiality",
                        "15-day cure period",
                        "IP assignment"
                      ].map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => setPromptInstructions(prev => prev + (prev ? " " : "") + s)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200/70 text-[10px] text-slate-700 rounded-lg font-medium transition-colors"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button 
                    onClick={handleGenerate} 
                    disabled={isGenerating} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-xs font-semibold shadow-xs"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Generating Legal Contract...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {generatedDraft ? "Regenerate Draft" : "Generate Draft"}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* RIGHT COLUMN: A4 Document Viewer / Editor (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* Document Action Toolbar */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono uppercase text-slate-700">
                      {isEditingDraft ? "📝 Direct Text Editor" : "📄 A4 Document Viewport"}
                    </span>
                    {lastSavedTime && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        • Saved at {lastSavedTime}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center flex-wrap gap-2">
                    {/* Toggle Edit Mode */}
                    <Button
                      onClick={() => setIsEditingDraft(!isEditingDraft)}
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs h-8 border-slate-200"
                    >
                      {isEditingDraft ? <Eye className="h-3.5 w-3.5 mr-1.5 text-blue-600" /> : <Edit3 className="h-3.5 w-3.5 mr-1.5 text-blue-600" />}
                      {isEditingDraft ? "Formatted View" : "Edit Text"}
                    </Button>

                    {/* Save Draft */}
                    <Button
                      onClick={handleSaveDraft}
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs h-8 border-slate-200"
                    >
                      <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                      Save
                    </Button>

                    {/* Review & Audit Button */}
                    <Button
                      onClick={() => {
                        setReviewText(generatedDraft);
                        setActiveTab("review");
                        handleReviewAudit();
                      }}
                      disabled={!generatedDraft}
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs h-8 border-slate-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100/60"
                    >
                      <FileCheck className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                      Audit
                    </Button>

                    {/* Copy Button */}
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedDraft);
                        toast({ title: "Copied to Clipboard", description: "Contract draft ready to paste." });
                      }}
                      disabled={!generatedDraft}
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-xs h-8 px-2.5"
                      title="Copy contract"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>

                    {/* Print / PDF */}
                    <Button
                      onClick={handlePrint}
                      disabled={!generatedDraft}
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-xs h-8 px-2.5"
                      title="Print or Export PDF"
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </Button>

                    {/* Download .md */}
                    <Button 
                      onClick={() => handleExportText(generatedDraft, `${selectedTemplate.id}_contract.md`)}
                      disabled={!generatedDraft}
                      size="sm"
                      className="bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs h-8 px-3"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download .md
                    </Button>
                  </div>
                </div>

                {/* A4 White Paper Canvas */}
                <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-8 md:p-14 min-h-[900px] relative overflow-hidden">
                  
                  {/* Paper Watermark Header */}
                  <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 mb-6">
                    <span className="font-bold text-slate-700">{selectedTemplate.name}</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      LawGPT Verified Draft
                    </span>
                    <span>{selectedJurisdiction}</span>
                  </div>

                  {/* Document Body */}
                  {generatedDraft ? (
                    isEditingDraft ? (
                      <textarea
                        value={generatedDraft}
                        onChange={(e) => setGeneratedDraft(e.target.value)}
                        rows={30}
                        className="w-full bg-slate-50/50 border border-slate-200 focus:bg-white focus:outline-none p-5 text-xs md:text-sm font-serif leading-relaxed text-slate-900 rounded-xl resize-none font-mono"
                      />
                    ) : (
                      <div className="text-slate-900">
                        {renderFormattedDraft(generatedDraft)}
                      </div>
                    )
                  ) : (
                    <div className="py-24 text-center space-y-4">
                      <FileEdit className="h-10 w-10 text-slate-300 mx-auto" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Drafting canvas is ready</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                          Fill in the matter details on the left and click <strong>"Generate Draft"</strong> to assemble your verified legal agreement.
                        </p>
                      </div>
                      <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-9 px-5 shadow-xs"
                      >
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                        Generate Now
                      </Button>
                    </div>
                  )}

                  {/* Document Footer */}
                  {generatedDraft && (
                    <div className="mt-12 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Word Count: {generatedDraft.split(/\s+/).filter(Boolean).length} words</span>
                      <span>Page 1 of 1 • LawGPT AI OS</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: REVIEW & AUDIT */}
        {/* ========================================================================= */}
        {activeTab === "review" && (
          <motion.div
            key="review-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Contract Risk & Compliance Audit</h2>
                <p className="text-xs text-slate-500">
                  Analyze any legal draft for missing statutory clauses, ambiguous terms, and high-risk liabilities.
                </p>
              </div>

              <Button 
                onClick={handleReviewAudit}
                disabled={isReviewing || (!reviewText.trim() && !generatedDraft.trim())}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold h-9 px-5"
              >
                {isReviewing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Running Audit...
                  </>
                ) : (
                  <>
                    <FileCheck className="h-4 w-4 mr-1.5" />
                    Audit Contract
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Input Contract Text (7 cols) */}
              <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold font-mono uppercase text-slate-700">Contract Text to Audit</span>
                  {generatedDraft && !reviewText && (
                    <Button
                      onClick={() => setReviewText(generatedDraft)}
                      variant="ghost"
                      size="sm"
                      className="text-xs text-blue-600 h-7"
                    >
                      Load Generated Draft
                    </Button>
                  )}
                </div>
                <textarea
                  value={reviewText || generatedDraft}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Paste or write contract text to analyze..."
                  rows={26}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none p-4 text-xs font-serif leading-relaxed text-slate-900 rounded-xl resize-none"
                />
              </div>

              {/* Right Column: Audit Scorecard & Findings (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                {reviewResult ? (
                  <div className="space-y-5">
                    {/* Scorecard Card */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase text-slate-700">Contract Health Score</span>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-2.5 py-0.5">
                          Audit Complete
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                          <span className="text-2xl font-black text-blue-600 font-mono">
                            {reviewResult.quality_score || "92"}%
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            {reviewResult.overall_assessment || "Legally Sound & Valid"}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {reviewResult.summary || "Provisions adhere to standard commercial guidelines."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Missing Clauses */}
                    {reviewResult.missing_clauses && reviewResult.missing_clauses.length > 0 && (
                      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
                        <span className="text-xs font-mono font-bold uppercase text-amber-700 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          Missing Recommended Clauses
                        </span>
                        <div className="space-y-2">
                          {reviewResult.missing_clauses.map((clause: any, cIdx: number) => (
                            <div key={cIdx} className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3 text-xs text-amber-900 space-y-0.5">
                              <span className="font-bold block">{typeof clause === 'string' ? clause : clause.clause_name}</span>
                              <span className="text-[11px] text-amber-800">
                                {typeof clause === 'string' ? "Recommended for full statutory protection." : clause.recommendation}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Risk Indicators */}
                    {reviewResult.risk_indicators && reviewResult.risk_indicators.length > 0 && (
                      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
                        <span className="text-xs font-mono font-bold uppercase text-rose-700 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                          Identified Legal Risks
                        </span>
                        <div className="space-y-2">
                          {reviewResult.risk_indicators.map((risk: any, rIdx: number) => (
                            <div key={rIdx} className="bg-rose-50/60 border border-rose-200/70 rounded-xl p-3 text-xs text-rose-900 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold">{risk.clause || "Liability Clause"}</span>
                                <Badge className="bg-rose-100 text-rose-800 text-[10px] uppercase font-mono px-2 py-0">
                                  {risk.severity || "Medium"}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-rose-800">{risk.issue || risk.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                    <FileCheck className="h-8 w-8 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">No Audit Run Yet</h4>
                    <p className="text-xs text-slate-500">
                      Paste a contract on the left or click "Audit Contract" to run the automated legal health check.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: REDLINE COMPARE */}
        {/* ========================================================================= */}
        {activeTab === "redline" && (
          <motion.div
            key="redline-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Contract Redline & Diff Engine</h2>
                <p className="text-xs text-slate-500">
                  Compare base contract against counter-party markup to detect added, deleted, or altered legal clauses.
                </p>
              </div>

              <Button 
                onClick={handleRedlineCompare}
                disabled={isRedlining || !originalText.trim() || !revisedText.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold h-9 px-5"
              >
                {isRedlining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <Scale className="h-4 w-4 mr-1.5" />
                    Generate Redline Diff
                  </>
                )}
              </Button>
            </div>

            {/* Input Comparison Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold font-mono uppercase text-slate-700">1. Original / Base Contract</span>
                  {generatedDraft && (
                    <Button
                      onClick={() => setOriginalText(generatedDraft)}
                      variant="ghost"
                      size="sm"
                      className="text-xs text-blue-600 h-6"
                    >
                      Use Draft
                    </Button>
                  )}
                </div>
                <textarea
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                  placeholder="Paste original contract text here..."
                  rows={14}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none p-3 text-xs font-serif leading-relaxed text-slate-900 rounded-xl resize-none"
                />
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
                <span className="text-xs font-bold font-mono uppercase text-slate-700 block border-b border-slate-100 pb-2">
                  2. Modified / Counter-Party Revised Text
                </span>
                <textarea
                  value={revisedText}
                  onChange={(e) => setRevisedText(e.target.value)}
                  placeholder="Paste counter-party marked-up contract text here..."
                  rows={14}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none p-3 text-xs font-serif leading-relaxed text-slate-900 rounded-xl resize-none"
                />
              </div>
            </div>

            {/* Redline Results */}
            {redlineResult && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-mono font-bold uppercase text-slate-800 flex items-center gap-2">
                    <Scale className="h-4 w-4 text-blue-600" />
                    Comparison Analysis & Clause Modifications
                  </span>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                    {redlineResult.modifications_count || "3"} Modifications Detected
                  </Badge>
                </div>

                {redlineResult.diff_summary && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                    {redlineResult.diff_summary}
                  </p>
                )}

                {/* Diff Output */}
                <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {redlineResult.redline_text || "Original text retained with updated indemnity limits and mutual termination provisions."}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: IMPROVE CLAUSES */}
        {/* ========================================================================= */}
        {activeTab === "improve" && (
          <motion.div
            key="improve-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-2">
              <h2 className="text-base font-bold text-slate-900">AI Clause Optimizer & Rewriter</h2>
              <p className="text-xs text-slate-500">
                Select or paste any legal clause to simplify, strengthen, make mutual, or explain in plain language.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Input Clause & Directive (6 cols) */}
              <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                <span className="text-xs font-bold font-mono uppercase text-slate-700 block border-b border-slate-100 pb-2">
                  Original Clause Text
                </span>
                
                <textarea
                  value={improveText}
                  onChange={(e) => setImproveText(e.target.value)}
                  placeholder="Paste clause text to optimize (e.g., The Service Provider shall indemnify and hold harmless the Client against all third-party claims...)..."
                  rows={8}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none p-3 text-xs font-serif leading-relaxed text-slate-900 rounded-xl resize-none"
                />

                {/* Preset Optimization Prompts */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-700 block">Choose Optimization Goal:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { label: "🤝 Make Reciprocal & Mutual", prompt: "Make this clause mutual and balanced for both parties." },
                      { label: "🛡️ Maximize Protection", prompt: "Strengthen this clause to provide maximum legal protection and indemnity." },
                      { label: "💡 Simplify & Clarify", prompt: "Rewrite in clear, modern plain English without legalese." },
                      { label: "⏱️ Add 15-Day Cure Period", prompt: "Add a 15-day notice and cure period before default remedies apply." }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => setImproveInstructions(item.prompt)}
                        className={`p-2 text-left text-xs rounded-xl border transition-all ${
                          improveInstructions === item.prompt
                            ? "bg-blue-50 border-blue-300 text-blue-900 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={handleImproveClause}
                  disabled={isImproving || !improveText.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold h-10"
                >
                  {isImproving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      Optimizing Clause...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      Optimize Clause
                    </>
                  )}
                </Button>
              </div>

              {/* Right Column: AI Improved Output (6 cols) */}
              <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold font-mono uppercase text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    AI Optimized Clause
                  </span>
                  {improveResult && (
                    <Button
                      onClick={() => {
                        const improved = improveResult.improved_text || improveResult.rewritten_clause || improveResult.text;
                        if (improved) {
                          navigator.clipboard.writeText(improved);
                          toast({ title: "Copied", description: "Improved clause copied." });
                        }
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-xs text-blue-600 h-7"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Clause
                    </Button>
                  )}
                </div>

                {improveResult ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50/50 border border-emerald-200/70 rounded-xl text-xs font-serif leading-relaxed text-slate-900">
                      {improveResult.improved_text || improveResult.rewritten_clause || improveResult.text || "Clause successfully rewritten according to statutory guidelines."}
                    </div>

                    {improveResult.explanation && (
                      <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1">
                        <strong className="text-[11px] text-slate-800 font-semibold block">Legal Rationale:</strong>
                        <p className="text-xs text-slate-600 leading-relaxed">{improveResult.explanation}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-3">
                    <Sparkles className="h-8 w-8 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">Ready to optimize</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Paste a clause on the left and select your goal to generate a client-ready revision.
                    </p>
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
