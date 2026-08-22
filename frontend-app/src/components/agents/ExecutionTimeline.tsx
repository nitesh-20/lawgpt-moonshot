import { Check, Loader2, X } from "lucide-react";
import type { ExecutionStep } from "@/types/agents";

interface ExecutionTimelineProps {
  steps: ExecutionStep[];
}

const ExecutionTimeline = ({ steps }: ExecutionTimelineProps) => (
  <div className="relative">
    {steps.map((step, i) => {
      const isLast = i === steps.length - 1;
      const isRunning = step.status === "running" || step.status === "queued";

      return (
        <div key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
          {!isLast && (
            <div
              className={`absolute left-[15px] top-8 bottom-0 w-px ${
                step.status === "done" ? "bg-primary/30" : "bg-border"
              }`}
            />
          )}

          <div
            className={`relative z-10 w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
              step.status === "done"
                ? "bg-primary border-primary"
                : step.status === "error"
                  ? "bg-destructive border-destructive"
                  : isRunning
                    ? "bg-card border-accent"
                    : "bg-card border-border"
            }`}
          >
            {step.status === "done" && <Check className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />}
            {step.status === "error" && <X className="h-4 w-4 text-destructive-foreground" strokeWidth={2.5} />}
            {isRunning && <Loader2 className="h-4 w-4 text-accent animate-spin" strokeWidth={2} />}
            {step.status === "idle" && <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />}
          </div>

          <div className="min-w-0 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-mono text-xs font-medium text-accent">{step.agentName}</p>
              <span className="font-mono text-[11px] text-muted-foreground">
                {(step.durationMs / 1000).toFixed(1)}s
              </span>
            </div>
            <p className="text-[14px] text-foreground leading-snug mt-1">{step.detail}</p>
          </div>
        </div>
      );
    })}
  </div>
);

export default ExecutionTimeline;
