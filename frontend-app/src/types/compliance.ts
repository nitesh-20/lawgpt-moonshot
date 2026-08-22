export interface ComplianceViolation {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning";
  regulation: string;
}

export interface ComplianceRecommendation {
  id: string;
  text: string;
}

export interface CategoryScore {
  category: string;
  score: number;
}

export interface ComplianceSnapshot {
  complianceScore: number;
  riskScore: number;
  documentsReviewed: number;
  lastScan: string;
  categoryScores: CategoryScore[];
  violations: ComplianceViolation[];
  recommendations: ComplianceRecommendation[];
}
