
import { Hearing } from "@/types/case";
import { ChevronsRight } from "lucide-react";

interface CaseTimelineProps {
  hearings: Hearing[];
}

export const CaseTimeline = ({ hearings }: CaseTimelineProps) => {
  return (
    <div className="space-y-4">
      {hearings.map((hearing, index) => (
        <div key={index} className="flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <div className="flex-1 glass-card p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{new Date(hearing.date).toLocaleDateString()}</span>
              <ChevronsRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{hearing.stage}</span>
            </div>
            <p className="mt-2">{hearing.summary}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
