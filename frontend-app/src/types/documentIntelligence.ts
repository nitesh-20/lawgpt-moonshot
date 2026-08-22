export interface DocClause {
  id: string;
  label: string;
  text: string;
  risk: "low" | "medium" | "high";
  note: string;
}

export interface DocEntity {
  id: string;
  name: string;
  type: string;
  value: string;
}

export interface LegalReference {
  id: string;
  type: string;
  reference: string;
}

export interface RelatedJudgment {
  id: string;
  title: string;
  court: string;
  year: string;
  relevance: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  label: string;
}

export interface AINote {
  id: string;
  note: string;
}

export interface DocumentDetail {
  id: string;
  title: string;
  type: string;
  summary: string;
  clauses: DocClause[];
  entities: DocEntity[];
  legalReferences: LegalReference[];
  relatedJudgments: RelatedJudgment[];
  timeline: TimelineEvent[];
  aiNotes: AINote[];
  /** Completeness-check fields (e.g. FIR draft review) — empty for contract-style docs. */
  missingInformation: string[];
  suggestions: string[];
  completenessScore: number | null;
  completenessStatus: string | null;
}
