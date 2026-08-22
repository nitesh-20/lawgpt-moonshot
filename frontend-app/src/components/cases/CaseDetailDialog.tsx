import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChartContainer, ChartLegend, ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Hearing {
  date: string;
  summary: string;
  stage: string;
  amount: number;
}

interface CaseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseData: any;
  onAddHearing: (hearing: Hearing) => void;
}

export function CaseDetailDialog({ open, onOpenChange, caseData, onAddHearing }: CaseDetailDialogProps) {
  const { toast } = useToast();
  const [newHearing, setNewHearing] = useState<Hearing>({
    date: "",
    summary: "",
    stage: "",
    amount: 0,
  });

  const handleAddHearing = () => {
    if (!newHearing.date || !newHearing.summary || !newHearing.stage || !newHearing.amount) {
      toast({
        title: "Error",
        description: "Please fill all hearing details",
        variant: "destructive",
      });
      return;
    }

    onAddHearing(newHearing);
    setNewHearing({
      date: "",
      summary: "",
      stage: "",
      amount: 0,
    });
    toast({
      title: "Success",
      description: "Hearing details added successfully",
    });
  };

  const chartData = caseData?.hearings?.map((hearing: Hearing) => ({
    date: hearing.date,
    amount: hearing.amount,
  })) || [];

  const chartConfig = {
    amount: {
      label: "Amount per Hearing",
      theme: {
        light: "#4f46e5",
        dark: "#818cf8",
      },
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Case Details - {caseData?.party_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-6 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-muted-foreground">Case Information</h3>
              <p><span className="font-medium">Case Number:</span> {caseData?.case_number}</p>
              <p><span className="font-medium">Court:</span> {caseData?.court_name}</p>
              <p><span className="font-medium">Stage:</span> {caseData?.stage}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-muted-foreground">Dates</h3>
              <p><span className="font-medium">Previous Date:</span> {caseData?.previous_date}</p>
              <p><span className="font-medium">Next Date:</span> {caseData?.next_date}</p>
              <p><span className="font-medium">Total Hearings:</span> {caseData?.hearings?.length || 0}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-muted-foreground">Add New Hearing</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                value={newHearing.date}
                onChange={(e) => setNewHearing({ ...newHearing, date: e.target.value })}
                placeholder="Hearing Date"
              />
              <Input
                type="text"
                value={newHearing.stage}
                onChange={(e) => setNewHearing({ ...newHearing, stage: e.target.value })}
                placeholder="Stage"
              />
              <Input
                type="number"
                value={newHearing.amount}
                onChange={(e) => setNewHearing({ ...newHearing, amount: Number(e.target.value) })}
                placeholder="Amount"
              />
              <Input
                type="text"
                value={newHearing.summary}
                onChange={(e) => setNewHearing({ ...newHearing, summary: e.target.value })}
                placeholder="Summary"
              />
            </div>
            <Button onClick={handleAddHearing}>Add Hearing</Button>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-muted-foreground">Hearing History</h3>
            <div className="space-y-4">
              {caseData?.hearings?.map((hearing: Hearing, index: number) => (
                <div key={index} className="p-4 border rounded-lg">
                  <p><span className="font-medium">Date:</span> {hearing.date}</p>
                  <p><span className="font-medium">Stage:</span> {hearing.stage}</p>
                  <p><span className="font-medium">Amount:</span> ₹{hearing.amount}</p>
                  <p><span className="font-medium">Summary:</span> {hearing.summary}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-muted-foreground">Financial Analysis</h3>
            <div className="h-[300px] w-full">
              <ChartContainer config={chartConfig}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip />
                  <Bar dataKey="amount" fill="var(--color-amount)" />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}