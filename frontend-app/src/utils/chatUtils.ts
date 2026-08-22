import { Citation, UploadedDocument } from '@/types/chat';
import { apiClient } from '@/utils/apiClient';

export interface StreamChunk {
  token: string;
  done: boolean;
  citations?: Citation[];
}

export async function* streamMockResponse(
  userMessage: string,
  documents: UploadedDocument[] = []
): AsyncGenerator<StreamChunk> {
  let responseText = "Failed to connect to backend.";
  let citations: Citation[] = [];
  
  try {
    const response = await apiClient.post("/chat", { message: userMessage });
    if (response && response.response) {
      responseText = response.response;
    }
  } catch (error) {
    console.error("Chat API error:", error);
  }

  const prefix = documents.length > 0
    ? `[Referencing ${documents.length} uploaded document(s)]\n\n`
    : '';

  const fullText = prefix + responseText;
  const words = fullText.split(' ');

  for (let i = 0; i < words.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, 18));
    yield { token: (i === 0 ? '' : ' ') + words[i], done: false };
  }

  yield { token: '', done: true, citations };
}
