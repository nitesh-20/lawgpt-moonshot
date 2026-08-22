import { apiClient } from "@/utils/apiClient";

export type ResearchContentType = "cases" | "statutes" | "articles" | "all";

export interface ResearchResult {
  id: string;
  title: string;
  court?: string;
  date: string;
  matchScore: number;
  summary: string;
  citations: string[];
  type: string;
  content?: string;
  direct_answer?: string;
  legal_basis?: string;
  sources_detail?: any[];
  why_this_source_matters?: string;
  important_notes?: string[];
  disclaimer?: string;
  executive_summary?: string;
  applicable_law?: any[];
  legal_analysis?: any;
  compliance_requirements?: string[];
  risks?: string[];
  recommendations?: string[];
  case_references?: any[];
  confidence?: string;
  source?: string;
  is_context_grounded?: boolean;
}

export interface ResearchSearchParams {
  query: string;
  contentType: ResearchContentType;
  jurisdiction?: string;
}

export async function search(params: ResearchSearchParams): Promise<ResearchResult[]> {
  const response = await apiClient.post("/research/query", {
    query: params.query,
    filters: {
      category: params.contentType === "all" ? undefined : params.contentType,
      jurisdiction: params.jurisdiction || undefined,
    }
  });

  if (response && response.status === "success" && response.data) {
    console.log("\n=== STEP 6: FRONTEND RECEIVED PAYLOAD ===", response);
    if (response.data.results) {
      return response.data.results as ResearchResult[];
    }
    
    // Map the complete structured AI report into the returned result
    const report = response.data;
    const score = report.confidence === "High" ? 95 : (report.confidence === "Medium" ? 75 : 40);
    return [{
      id: `report-${Date.now()}`,
      title: "AI Legal Research Report",
      date: new Date().toISOString().split('T')[0],
      matchScore: score,
      summary: report.direct_answer || report.answer || "",
      citations: report.citations || [],
      type: "AI Report",
      direct_answer: report.direct_answer,
      legal_basis: report.legal_basis,
      sources_detail: report.sources_detail,
      why_this_source_matters: report.why_this_source_matters,
      important_notes: report.important_notes,
      disclaimer: report.disclaimer || "This information is for general legal understanding and is not a substitute for professional legal advice.",
      executive_summary: report.executive_summary,
      applicable_law: report.applicable_law,
      legal_analysis: report.legal_analysis,
      compliance_requirements: report.compliance_requirements,
      risks: report.risks,
      recommendations: report.recommendations,
      case_references: report.case_references,
      confidence: report.confidence,
      source: report.source,
      is_context_grounded: report.is_context_grounded
    }];
  }
  return [];
}

export async function getResearchHistory(): Promise<any[]> {
  const response = await apiClient.get("/research/history");
  if (response && response.status === "success" && Array.isArray(response.data)) {
    return response.data;
  }
  return Array.isArray(response) ? response : [];
}

export async function getResearchStatistics(): Promise<any> {
  const response = await apiClient.get("/research/statistics");
  if (response && response.status === "success" && response.data) {
    return response.data;
  }
  return response;
}
