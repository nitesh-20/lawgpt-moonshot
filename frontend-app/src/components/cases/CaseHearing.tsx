
import { Hearing } from "@/types/case";
import { formatDate } from "@/lib/utils";

interface CaseHearingProps {
  hearing: Hearing;
}

export const CaseHearing = ({ hearing }: CaseHearingProps) => {
  return (
    <div className="p-6 glass-card hover:scale-[1.02] transition-all duration-300">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Date</p>
          <p className="font-medium">{formatDate(hearing.date)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Stage</p>
          <p className="font-medium">{hearing.stage}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Amount</p>
          <p className="font-medium">₹{hearing.amount}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Summary</p>
          <p className="font-medium">{hearing.summary}</p>
        </div>
      </div>
    </div>
  );
};
