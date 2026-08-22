import { Progress } from "@/components/ui/progress";
import type { Agent } from "@/types/agents";
import AgentStatusBadge from "./AgentStatusBadge";

interface AgentCardProps {
  agent: Agent;
}

const AgentCard = ({ agent }: AgentCardProps) => (
  <div className="rounded-lg border border-border bg-card shadow-card hover:shadow-card-hover transition-shadow duration-200 p-5">
    <div className="flex items-start justify-between gap-2 mb-1.5">
      <h3 className="font-serif text-lg font-semibold text-ink">{agent.name}</h3>
      <AgentStatusBadge status={agent.status} />
    </div>
    <p className="text-[13px] text-muted-foreground leading-snug mb-4">{agent.description}</p>

    <Progress value={agent.progress} className="h-1.5 mb-3" />

    <p className="text-[13px] text-foreground leading-snug mb-2">{agent.activity}</p>
    <p className="font-mono text-[11px] text-muted-foreground">Last run · {agent.lastExecution}</p>
  </div>
);

export default AgentCard;
