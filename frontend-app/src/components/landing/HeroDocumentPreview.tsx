import { CheckCircle2, FileText, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DocumentAnalysisPreview } from "@/data/heroDocumentPreview";

interface HeroDocumentPreviewProps {
  document: DocumentAnalysisPreview;
}

const HeroDocumentPreview = ({ document }: HeroDocumentPreviewProps) => (
  <div className="glass-card p-5 sm:p-6 max-w-md w-full slide-in" style={{ animationDelay: "150ms", animationFillMode: "backwards" }}>
    <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-border">
      <div className="flex items-center gap-2.5 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink truncate">{document.fileName}</p>
          <p className="font-mono text-xs text-muted-foreground">{document.documentId}</p>
        </div>
      </div>
      <Badge variant="secondary" className="shrink-0 gap-1 font-mono text-[11px] font-medium">
        <CheckCircle2 className="h-3 w-3" />
        {document.status}
      </Badge>
    </div>

    <p className="font-mono text-xs text-muted-foreground mb-4">
      {document.clausesScanned} clauses scanned
    </p>

    <div className="space-y-3">
      {document.flags.map((flag) => (
        <div key={flag.id} className="rounded-md border border-border bg-card p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            {flag.severity === "warning" ? (
              <TriangleAlert className="h-3.5 w-3.5 text-accent shrink-0" strokeWidth={2} />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={2} />
            )}
            <p className="font-mono text-xs font-medium text-ink">{flag.clauseLabel}</p>
          </div>
          <p className="text-[13px] text-muted-foreground italic leading-snug mb-2 line-clamp-1">
            "{flag.excerpt}"
          </p>
          <p className="text-[13px] text-foreground leading-snug">{flag.note}</p>
        </div>
      ))}
    </div>
  </div>
);

export default HeroDocumentPreview;
