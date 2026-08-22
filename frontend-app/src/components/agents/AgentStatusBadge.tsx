import { Badge } from "@/components/ui/badge";
import type { AgentStatus } from "@/types/agents";

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "Idle",
  queued: "Queued",
  running: "Running",
  done: "Done",
  error: "Error",
};

interface AgentStatusBadgeProps {
  status: AgentStatus;
}

const AgentStatusBadge = ({ status }: AgentStatusBadgeProps) => {
  const isLive = status === "running" || status === "queued";
  return (
    <Badge
      variant={status === "error" ? "destructive" : "secondary"}
      className="gap-1.5 font-mono text-[11px] font-medium"
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "done"
            ? "bg-primary"
            : status === "error"
              ? "bg-destructive"
              : isLive
                ? "bg-accent animate-pulse"
                : "bg-muted-foreground"
        }`}
      />
      {STATUS_LABEL[status]}
    </Badge>
  );
};

export default AgentStatusBadge;
