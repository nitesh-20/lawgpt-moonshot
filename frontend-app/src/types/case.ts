
export interface Case {
  id: string;
  user_id: string;
  party_name: string;
  case_number: string;
  court_name: string;
  stage?: string;
  previous_date?: string;
  next_date?: string;
  created_at: string;
  updated_at: string;
  hearings: Hearing[];
  status?: string; // Added status property
  filing_date?: string; // Added filing_date property
  jurisdiction?: string; // Added jurisdiction as it seems to be used
  case_type?: string; // Added case_type as it seems to be used
  priority?: string;
  assigned_lawyer?: string;
  documents?: string[];
  ai_notes?: string;
  compliance_status?: string;
  recent_activity?: { date: string; activity: string }[];
}

export interface Hearing {
  id: string;
  case_id: string;
  date: string;
  summary?: string;
  stage: string;
  amount: number;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  name: string;
  size: number;
  storage_path: string;
  uploaded_at: string;
}
