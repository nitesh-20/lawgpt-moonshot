/**
 * Shared fetch wrapper for real backend calls.
 *
 * Not used yet — no backend endpoints exist (see /MISSING_BACKEND.md at repo root).
 * Once endpoints exist, individual services/*.ts files switch their mock-backed
 * functions to call `apiFetch(...)` instead. Components never import this directly.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8001/api/v1";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError(0, `VITE_API_BASE_URL is not configured — cannot call ${path}`);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, `${init?.method ?? "GET"} ${path} failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}
