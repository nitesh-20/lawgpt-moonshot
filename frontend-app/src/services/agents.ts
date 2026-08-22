import { apiClient } from "@/utils/apiClient";
import type { Agent, ExecutionRun } from "@/types/agents";

export async function listAgents(): Promise<Agent[]> {
  const response = await apiClient.get("/orchestrator/agents");
  if (response && Array.isArray(response)) {
     return response.map((agent: any) => ({
       key: agent.name || agent.agent_id,
       name: agent.name || "Agent",
       status: "idle",
       lastExecution: "Unknown",
       activity: agent.description || "Standing by"
     }));
  } else if (response && response.status === "success" && Array.isArray(response.data)) {
     return response.data.map((agent: any) => ({
       key: agent.id || agent.key,
       name: agent.name || agent.id,
       status: "idle",
       lastExecution: "Unknown",
       activity: agent.description || "Standing by"
     }));
  }
  return [];
}

export async function runAgentExecution(query: string): Promise<ExecutionRun> {
  const response = await apiClient.post("/orchestrator/plan", { message: query });
  if (response && response.tasks) {
     return {
       query,
       steps: response.tasks.map((task: any, index: number) => ({
         id: task.task_id || `step-${index}`,
         label: task.agent_id || "Processing Agent",
         agentKey: task.agent_id || "orchestrator",
         detail: `Executing sub-task for: ${query.substring(0, 20)}...`
       }))
     };
  }
  throw new Error("Failed to plan execution via API");
}
