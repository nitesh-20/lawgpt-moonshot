import { useState, useEffect } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { generateDocument } from "@/services/drafting";
import DocumentPreview from "./DocumentPreview";

const DocumentGenerator = () => {
  const [details, setDetails] = useState("");
  const [documentType, setDocumentType] = useState("contract");
  const [jurisdiction, setJurisdiction] = useState("federal");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!details.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide details for your document",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent("");
    
    toast({
      title: "Generating Document",
      description: "Our AI is crafting your legal document...",
    });

    try {
      const { document } = await generateDocument({ documentType, details, jurisdiction });
      setGeneratedContent(document);

      // Save the generated document
      const newDocument = {
        id: crypto.randomUUID(),
        title: `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} - ${new Date().toLocaleDateString()}`,
        content: document,
        timestamp: new Date().toISOString(),
        type: documentType,
      };

      const existingDocs = JSON.parse(localStorage.getItem('generatedDocuments') || '[]');
      localStorage.setItem('generatedDocuments', JSON.stringify([newDocument, ...existingDocs]));
      
      window.dispatchEvent(new Event('storage'));
      
      toast({
        title: "Document Generated Successfully",
        description: "Your document has been saved and is ready for use.",
      });

    } catch (error: any) {
      console.error('Document generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const templateContent = urlParams.get('template');
    if (templateContent) {
      setDetails(decodeURIComponent(templateContent));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <div id="document-generator" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Contract Agreement</SelectItem>
                <SelectItem value="employment_contract">Employment Contract</SelectItem>
                <SelectItem value="nda">Non-Disclosure Agreement</SelectItem>
                <SelectItem value="letter">Legal Letter</SelectItem>
                <SelectItem value="motion">Court Motion</SelectItem>
                <SelectItem value="brief">Legal Brief</SelectItem>
                <SelectItem value="memo">Legal Memorandum</SelectItem>
                <SelectItem value="pleading">Legal Pleading</SelectItem>
                <SelectItem value="affidavit">Affidavit</SelectItem>
                <SelectItem value="settlement">Settlement Agreement</SelectItem>
                <SelectItem value="power_of_attorney">Power of Attorney</SelectItem>
                <SelectItem value="will">Last Will and Testament</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Jurisdiction</Label>
            <Select value={jurisdiction} onValueChange={setJurisdiction}>
              <SelectTrigger>
                <SelectValue placeholder="Select jurisdiction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="federal">Federal</SelectItem>
                <SelectItem value="state">State</SelectItem>
                <SelectItem value="international">International</SelectItem>
                <SelectItem value="california">California</SelectItem>
                <SelectItem value="new_york">New York</SelectItem>
                <SelectItem value="texas">Texas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <Label>Document Details & Requirements</Label>
          <Textarea
            placeholder="Describe what you need in your document. For example:&#10;&#10;- Parties involved&#10;- Purpose of the document&#10;- Key terms and conditions&#10;- Specific clauses needed&#10;- Any special requirements&#10;&#10;The more details you provide, the better the document will be."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="min-h-[250px]"
          />
        </div>
      </div>
      
      <Button 
        className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white"
        onClick={handleGenerate}
        disabled={isGenerating || !details.trim()}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating Document...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4 mr-2" />
            Generate Document with AI
          </>
        )}
      </Button>

      {generatedContent && (
        <DocumentPreview content={generatedContent} />
      )}
    </div>
  );
};

export default DocumentGenerator;