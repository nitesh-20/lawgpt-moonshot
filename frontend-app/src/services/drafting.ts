import { apiClient } from "@/utils/apiClient";

export interface GenerateDraftPayload {
  doc_type: string;
  variables?: Record<string, any>;
  custom_clauses?: Record<string, string>;
  user_instructions?: string;
  document_id?: string;
}

export interface ReviewDraftPayload {
  text: string;
  doc_type?: string;
}

export interface RedlineDraftPayload {
  original_text: string;
  revised_text: string;
}

export interface ImproveDraftPayload {
  text: string;
  instructions?: string;
  doc_type?: string;
}

export async function listDraftTemplates(): Promise<any> {
  const res = await apiClient.get("/drafting/templates");
  if (res && res.status === "success") {
    return res.data || res;
  }
  return res;
}

export async function generateDraft(payload: GenerateDraftPayload): Promise<any> {
  const res = await apiClient.post("/drafting/generate", payload);
  if (res && res.status === "success") {
    return res.data || res;
  }
  return res;
}

export async function reviewDraft(payload: ReviewDraftPayload): Promise<any> {
  const res = await apiClient.post("/drafting/review", payload);
  if (res && res.status === "success") {
    return res.data || res;
  }
  return res;
}

export async function redlineDraft(payload: RedlineDraftPayload): Promise<any> {
  const res = await apiClient.post("/drafting/redline", payload);
  if (res && res.status === "success") {
    return res.data || res;
  }
  return res;
}

export async function improveDraft(payload: ImproveDraftPayload): Promise<any> {
  const res = await apiClient.post("/drafting/improve", payload);
  if (res && res.status === "success") {
    return res.data || res;
  }
  return res;
}
