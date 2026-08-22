import { apiClient } from "@/utils/apiClient";
import type { Message } from "@/types/chat";

export async function sendMessage(content: string, threadId: string = "default"): Promise<Message> {
  const response = await apiClient.post("/chat", {
    message: content,
    session_id: threadId,
  });

  if (response && response.response) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content: response.response,
      timestamp: new Date().toISOString(),
    };
  }
  throw new Error("Chat API failed");
}

export async function getSuggestedPrompts(): Promise<string[]> {
  // Can be pulled from backend dynamically if needed, 
  // but for UI layout purposes, returning an empty array if no backend endpoint exists.
  return [
    "Draft a standard NDA",
    "Summarize this legal document",
    "What are the penalties under IPC Section 302?"
  ];
}
