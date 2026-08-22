import { ArrowUpRight } from "lucide-react";

interface SuggestedPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
}

const SuggestedPrompts = ({ prompts, onSelect }: SuggestedPromptsProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl">
    {prompts.map((prompt) => (
      <button
        key={prompt}
        type="button"
        onClick={() => onSelect(prompt)}
        className="group flex items-start justify-between gap-2 text-left rounded-md border border-border bg-card px-4 py-3 text-[13px] text-foreground hover:border-primary/40 hover:bg-secondary/40 transition-colors duration-200"
      >
        <span className="leading-snug">{prompt}</span>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
      </button>
    ))}
  </div>
);

export default SuggestedPrompts;
