
export interface Citation {
  id: string;
  label: string;
  source: string;
  court?: string;
  year?: string;
  url?: string;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  documentRef?: string;
  citations?: Citation[];
  isStreaming?: boolean;
}

export interface Feature {
  icon: any;
  title: string;
  description: string;
}

// Renamed from Document to UploadedDocument to avoid collision with DOM Document type
export interface UploadedDocument {
  id: string;
  name: string;
  content: string;
  uploadDate: Date;
}
