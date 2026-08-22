import { apiClient } from "@/utils/apiClient";
import type { Case, Hearing } from "@/types/case";

// Mapper function: Backend Case -> Frontend Case
function mapBackendToFrontend(b: any): Case {
  return {
    id: b.id || "",
    user_id: b.user_id || "default-user",
    party_name: b.client || "Unknown Client",
    case_number: b.title || "N/A",
    court_name: b.court || "Unknown Court",
    stage: b.description || "Pre-trial",
    status: b.status || "active",
    jurisdiction: b.jurisdiction || "Federal",
    case_type: b.type || "Civil",
    created_at: b.created_at || new Date().toISOString(),
    updated_at: b.updated_at || new Date().toISOString(),
    hearings: b.hearings || [],
    priority: b.priority || "medium",
    assigned_lawyer: b.assigned_lawyer || "Unassigned",
    documents: b.documents || [],
    ai_notes: b.ai_notes || "",
    compliance_status: b.compliance_status || "",
    recent_activity: b.recent_activity || [],
  };
}

// Mapper function: Frontend CaseInput -> Backend CaseInput
function mapFrontendToBackend(f: any): any {
  return {
    title: f.case_number || "Untitled Case",
    client: f.party_name || "Unknown Client",
    status: f.status || "active",
    type: f.case_type || "Civil",
    priority: "medium", // required by backend model
    court: f.court_name || "Unknown Court",
    jurisdiction: f.jurisdiction || "Federal",
    description: f.stage || "Pre-trial",
  };
}

export async function listCases(): Promise<Case[]> {
  const response = await apiClient.get("/cases");
  const data = (response && Array.isArray(response.data)) ? response.data : (Array.isArray(response) ? response : []);
  return data.map(mapBackendToFrontend);
}

export async function getCase(id: string): Promise<Case | undefined> {
  const response = await apiClient.get(`/cases/${id}`);
  if (response && response.id === id) {
    return mapBackendToFrontend(response);
  } else if (response && response.data) {
    return mapBackendToFrontend(response.data);
  }
  return undefined;
}

export type CaseInput = Omit<Case, "id" | "user_id" | "created_at" | "updated_at" | "hearings">;

export async function createCase(input: CaseInput): Promise<Case> {
  const backendInput = mapFrontendToBackend(input);
  const response = await apiClient.post("/cases", backendInput);
  const data = response?.data || response;
  if (data && data.id) {
    return mapBackendToFrontend(data);
  }
  throw new Error("Failed to create case");
}

export async function addHearing(caseId: string, hearing: Omit<Hearing, "id" | "case_id" | "created_at">): Promise<Case> {
  const response = await apiClient.post(`/cases/${caseId}/hearings`, {
    date: hearing.date,
    type: hearing.stage, // map stage to type
    status: "scheduled",
    notes: hearing.summary || ""
  });
  const data = response?.data || response;
  if (data && data.id) {
    return mapBackendToFrontend(data);
  }
  throw new Error("Failed to add hearing");
}

export async function deleteCase(id: string): Promise<void> {
  await apiClient.post(`/cases/${id}/delete`, {});
}
