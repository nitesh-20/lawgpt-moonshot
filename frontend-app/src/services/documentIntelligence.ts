import { apiClient } from "@/utils/apiClient";
import type { DocumentDetail } from "@/types/documentIntelligence";

/**
 * Maps the backend's DocumentAnalyzer result shape (executive_summary, clause_breakdown,
 * risk_matrix, legal_references, entities, ...) into the frontend's DocumentDetail shape.
 * Kept in one place since both the primary /document/status path and the /document/analyze
 * fallback path return the exact same `results` object.
 */
function mapAnalysisResults(id: string, title: string, type: string, results: any): DocumentDetail {
  const entityGroups: Array<[string, string]> = [
    ["people", "Person"],
    ["companies", "Company/Organization"],
    ["signatories", "Signatory"],
    ["authorities", "Authority"],
    ["money", "Amount"],
    ["dates", "Date"]
  ];

  const entities = entityGroups.flatMap(([key, label]) =>
    (results.entities?.[key] || []).map((value: string, i: number) => ({
      id: `${key}${i}`,
      name: value,
      value: label,
      type: label
    }))
  );

  const legalReferences = (results.legal_references || []).map((r: any, i: number) => ({
    id: `lr${i}`,
    type: r.type || "Reference",
    reference: r.reference || ""
  }));

  return {
    id,
    title,
    type,
    summary: results.executive_summary || "No summary available.",
    clauses: (results.clause_breakdown || []).map((c: any, i: number) => ({
      id: `c${i}`,
      label: c.type || "Clause",
      text: c.clause_text || "No excerpt available.",
      risk: "low",
      note: c.summary || "No notes."
    })),
    aiNotes: (results.risk_matrix || []).map((r: any, i: number) => ({
      id: `n${i}`,
      note: [
        r.level ? `[${r.level}] ` : "",
        r.reason || r.clause || "Risk identified.",
        r.impact ? ` Impact: ${r.impact}.` : "",
        r.recommendation ? ` Recommendation: ${r.recommendation}` : ""
      ].join("")
    })),
    entities,
    legalReferences,
    relatedJudgments: [],
    timeline: (results.important_dates || []).map((t: any, i: number) => ({
      id: `t${i}`,
      date: t.date || "Unspecified",
      label: t.event ? `${t.type ? `[${t.type}] ` : ""}${t.event}` : "Timeline event"
    })),
    missingInformation: results.missing_information || [],
    suggestions: results.suggestions || [],
    completenessScore: typeof results.completeness_score === "number" ? results.completeness_score : null,
    completenessStatus: results.completeness_status || null
  };
}

export async function getDocumentDetail(id: string): Promise<DocumentDetail> {
    try {
      // 1. First attempt to query GET /document/status?document_id=id
      const response = await apiClient.get(`/document/status?document_id=${id}`);
      if (response && response.results) {
        return mapAnalysisResults(id, response.title || `Document ${id}`, response.type || "Legal Document", response.results);
      }
    } catch (e) {
      console.warn("GET /document/status failed, falling back to analyze status check", e);
    }

    // 2. Fallback check: POST /document/analyze with document_id in FormData
    const formData = new FormData();
    formData.append("document_id", id);
    const statusRecord = await apiClient.postMultipart("/document/analyze", formData);
    if (statusRecord && statusRecord.results) {
      return mapAnalysisResults(id, `Document ${id}`, "Legal Document", statusRecord.results);
    }

    throw new Error("Failed to get document detail");
}

export async function summarizeDocument(documentId: string): Promise<string> {
  const formData = new FormData();
  formData.append("document_id", documentId);
  const response = await apiClient.postMultipart("/document/summarize", formData);
  if (response && response.status === "success") {
    return response.summary || response.data?.summary || "";
  }
  return response.summary || "";
}

export async function compareDocuments(docId1: string, docId2: string): Promise<any> {
  const formData = new FormData();
  formData.append("document_id_1", docId1);
  formData.append("document_id_2", docId2);
  formData.append("doc_id_1", docId1);
  formData.append("doc_id_2", docId2);
  const response = await apiClient.postMultipart("/document/compare", formData);
  return response;
}
