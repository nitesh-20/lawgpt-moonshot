import { apiClient } from "@/utils/apiClient";

export interface DashboardStat {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: string;
}

export interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "alert" | "info" | "success" | "warning";
}

export interface TaskCompletion {
  name: string;
  completed: number;
  pending: number;
}

export interface CaseStatusCount {
  name: string;
  count: number;
  fill: string;
}

export interface TeamMetric {
  name: string;
  cases: number;
  hours: number;
}

export async function getDashboardStats(): Promise<DashboardStat[]> {
  const response = await apiClient.get("/dashboard/stats");
  if (response && response.status === "success" && response.data) {
    return response.data as DashboardStat[];
  }
  if (Array.isArray(response)) return response as DashboardStat[];
  return [];
}

export async function getDashboardNotifications(): Promise<DashboardNotification[]> {
  const response = await apiClient.get("/dashboard/notifications");
  if (response && response.status === "success" && response.data) {
    return response.data as DashboardNotification[];
  }
  if (Array.isArray(response)) return response as DashboardNotification[];
  return [];
}

export async function getTaskCompletion(): Promise<TaskCompletion[]> {
  const response = await apiClient.get("/dashboard/task-completion");
  if (response && response.status === "success" && response.data) {
    return response.data as TaskCompletion[];
  }
  if (Array.isArray(response)) return response as TaskCompletion[];
  return [];
}

export async function getCaseStatusBreakdown(): Promise<CaseStatusCount[]> {
  const response = await apiClient.get("/dashboard/case-status");
  if (response && response.status === "success" && response.data) {
    return response.data as CaseStatusCount[];
  }
  if (Array.isArray(response)) return response as CaseStatusCount[];
  return [];
}

export async function getTeamActivity(): Promise<TeamMetric[]> {
  const response = await apiClient.get("/dashboard/team-activity");
  if (response && response.status === "success" && response.data) {
    return response.data as TeamMetric[];
  }
  if (Array.isArray(response)) return response as TeamMetric[];
  return [];
}
