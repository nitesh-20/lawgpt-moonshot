import { apiClient } from "@/utils/apiClient";

export interface DocumentSummary {
  id: string;
  title: string;
  type: string;
  lastModified: string;
  size: string;
  category: string;
  file_path?: string;
  tags?: string[];
  results?: any;
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const response = await apiClient.get("/documents");
  const data = (response && Array.isArray(response.data)) ? response.data : (Array.isArray(response) ? response : []);
  return data;
}

export async function uploadDocument(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  return await apiClient.postMultipart("/upload", formData);
}

export async function deleteDocument(docId: string): Promise<any> {
  return await apiClient.delete(`/documents/${docId}`);
}

export async function renameDocument(docId: string, newTitle: string): Promise<any> {
  return await apiClient.patch(`/documents/${docId}`, { title: newTitle });
}
