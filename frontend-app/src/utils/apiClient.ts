/**
 * LawGPT AI OS API Client
 * Coordinates requests to the local FastAPI backend.
 */

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8001/api/v1";
const BASE_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || DEFAULT_BACKEND_URL;

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  }

  private getUrl(path: string): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  private getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...customHeaders };
    // JWT token injection for Firebase Auth (Phase 9)
    const token = localStorage.getItem("firebase_id_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  async get<T = any>(path: string, customHeaders: Record<string, string> = {}): Promise<T> {
    const response = await fetch(this.getUrl(path), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        ...this.getHeaders(customHeaders),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API GET ${path} failed (${response.status}): ${errorText || response.statusText}`);
    }

    return response.json();
  }

  async post<T = any>(
    path: string,
    body: any,
    customHeaders: Record<string, string> = {}
  ): Promise<T> {
    const response = await fetch(this.getUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...this.getHeaders(customHeaders),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API POST ${path} failed (${response.status}): ${errorText || response.statusText}`);
    }

    return response.json();
  }

  async postMultipart<T = any>(
    path: string,
    formData: FormData,
    customHeaders: Record<string, string> = {}
  ): Promise<T> {
    const response = await fetch(this.getUrl(path), {
      method: "POST",
      headers: {
        "Accept": "application/json",
        ...this.getHeaders(customHeaders),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API POST Multipart ${path} failed (${response.status}): ${errorText || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Helper to handle response streams (like in chat completions)
   */
  async stream(
    path: string,
    body: any,
    onChunk: (text: string) => void,
    onDone?: () => void,
    onError?: (err: Error) => void
  ): Promise<void> {
    try {
      const response = await fetch(this.getUrl(path), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok || !response.body) {
        throw new Error(`API Stream ${path} failed: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let doneStream = false;

      while (!doneStream) {
        const { done, value } = await reader.read();
        if (done) {
          doneStream = true;
          break;
        }

        const chunkText = decoder.decode(value, { stream: true });
        onChunk(chunkText);
      }

      if (onDone) onDone();
    } catch (err: any) {
      if (onError) onError(err);
      else console.error(`Stream error on ${path}:`, err);
    }
  }
}

export const apiClient = new ApiClient(BASE_URL);
