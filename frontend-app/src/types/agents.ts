export type AgentKey =
  | "orchestrator"
  | "document-intelligence"
  | "legal-research"
  | "risk-analysis"
  | "compliance"
  | "drafting";

export type AgentStatus = "idle" | "queued" | "running" | "done" | "error";

export interface Agent {
  key: AgentKey;
  name: string;
  description: string;
  status: AgentStatus;
  progress: number;
  lastExecution: string;
  activity: string;
}

export interface ExecutionStep {
  id: string;
  agentKey: AgentKey;
  agentName: string;
  status: AgentStatus;
  detail: string;
  durationMs: number;
}

export interface ExecutionRun {
  id: string;
  query: string;
  steps: ExecutionStep[];
}
