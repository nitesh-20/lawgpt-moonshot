import { apiClient } from "@/utils/apiClient";
import type { ComplianceSnapshot } from "@/types/compliance";

export interface ComplianceCheckPayload {
  query?: string;
  document_id?: string;
  file_path?: string;
  regulation_ids?: string[];
}

export interface ComplianceReportPayload extends ComplianceCheckPayload {
  report_format?: string;
}

export async function getComplianceSnapshot(): Promise<ComplianceSnapshot> {
  const response = await apiClient.get("/compliance/statistics");
  if (response && response.status === "success" && response.data) {
    return response.data as ComplianceSnapshot;
  }
  return response as unknown as ComplianceSnapshot;
}

export async function checkCompliance(payload: ComplianceCheckPayload): Promise<any> {
  const response = await apiClient.post("/compliance/check", payload);
  return response;
}

export async function generateComplianceReport(payload: ComplianceReportPayload): Promise<any> {
  const response = await apiClient.post("/compliance/report", payload);
  return response;
}

export async function getComplianceHistory(): Promise<any[]> {
  const response = await apiClient.get("/compliance/history");
  return Array.isArray(response) ? response : [];
}
