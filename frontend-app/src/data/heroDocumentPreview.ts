export interface DocumentAnalysisPreview {
  fileName: string;
  documentId: string;
  status: string;
  clausesScanned: number;
  flags: {
    id: string;
    severity: "warning" | "success";
    clauseLabel: string;
    excerpt: string;
    note: string;
  }[];
}

export const heroDocumentPreview: DocumentAnalysisPreview = {
  fileName: "Master_Service_Agreement_v2.pdf",
  documentId: "DOC-2023-892",
  status: "Analyzed",
  clausesScanned: 142,
  flags: [
    {
      id: "f1",
      severity: "warning",
      clauseLabel: "Liability Cap",
      excerpt: "Provider liability is capped at 10% of trailing fees.",
      note: "Significantly below industry standard (typically 100%)."
    },
    {
      id: "f2",
      severity: "success",
      clauseLabel: "Auto-Renewal",
      excerpt: "Requires 60 days written notice to renew.",
      note: "Compliant with standard procurement guidelines."
    }
  ]
};
