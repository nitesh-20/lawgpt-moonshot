import { Scale } from "lucide-react";
import type { Citation } from "@/types/chat";

interface CitationCardProps {
  citation: Citation;
}

const CitationCard = ({ citation }: CitationCardProps) => (
  <div className="rounded-md border border-border bg-card px-3 py-2.5 min-w-[200px] max-w-xs">
    <div className="flex items-center gap-1.5 mb-1">
      <Scale className="h-3 w-3 text-accent shrink-0" strokeWidth={2} />
      <p className="font-mono text-[11px] font-medium text-accent truncate">
        {citation.court ?? citation.source}
        {citation.year ? ` · ${citation.year}` : ""}
      </p>
    </div>
    <p className="text-[13px] text-ink leading-snug line-clamp-2">{citation.label}</p>
  </div>
);

export default CitationCard;
