
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface TemplateGalleryProps {
  onSelectTemplate: (title: string, prompt: string) => void;
}

const TemplateGallery = ({ onSelectTemplate }: TemplateGalleryProps) => {
  const { toast } = useToast();

  const templates = [
    {
      title: "Service Agreement",
      description: "Standard service contract template",
      preview: "This Service Agreement (the 'Agreement') is entered into as of [DATE] between [SERVICE PROVIDER NAME] ('Provider') and [CLIENT NAME] ('Client')..."
    },
    {
      title: "NDA",
      description: "Non-disclosure agreement template",
      preview: "This Non-Disclosure Agreement ('Agreement') is made between [PARTY A] ('Disclosing Party') and [PARTY B] ('Receiving Party')..."
    },
    {
      title: "Employment Contract",
      description: "Standard employment agreement",
      preview: "This Employment Agreement is made between [EMPLOYER NAME] ('Employer') and [EMPLOYEE NAME] ('Employee')..."
    },
    {
      title: "Terms of Service",
      description: "Website terms of service template",
      preview: "Welcome to [WEBSITE NAME]. By accessing our website, you agree to these terms of service..."
    },
    {
      title: "Privacy Policy",
      description: "Standard privacy policy template",
      preview: "This Privacy Policy describes how [COMPANY NAME] collects, uses, and shares your personal information..."
    },
    {
      title: "Cease & Desist",
      description: "Legal notice template",
      preview: "NOTICE TO CEASE AND DESIST\n\nTo: [RECIPIENT NAME]\nFrom: [SENDER NAME]\n\nRe: Demand to Cease and Desist..."
    },
    {
      title: "Partnership Agreement",
      description: "Business partnership contract",
      preview: "This Partnership Agreement is made between [PARTNER A] and [PARTNER B], collectively referred to as 'Partners'..."
    },
    {
      title: "Real Estate Purchase",
      description: "Property purchase agreement",
      preview: "This Real Estate Purchase Agreement ('Agreement') is made between [SELLER] ('Seller') and [BUYER] ('Buyer')..."
    },
    {
      title: "Intellectual Property License",
      description: "IP licensing agreement",
      preview: "This Intellectual Property License Agreement is made between [LICENSOR] ('Licensor') and [LICENSEE] ('Licensee')..."
    },
    {
      title: "Settlement Agreement",
      description: "Legal dispute settlement",
      preview: "This Settlement Agreement and Release is made between [PARTY A] and [PARTY B] to resolve all claims..."
    },
    {
      title: "Consulting Agreement",
      description: "Professional consulting contract",
      preview: "This Consulting Agreement is entered into by and between [CONSULTANT NAME] and [CLIENT NAME]..."
    },
    {
      title: "Power of Attorney",
      description: "Legal authorization document",
      preview: "KNOW ALL PERSONS BY THESE PRESENTS: That I, [PRINCIPAL NAME], hereby appoint [AGENT NAME] as my Attorney-in-Fact..."
    }
  ];

  const handleSelectTemplate = (template: typeof templates[0]) => {
    toast({
      title: "Loading Template",
      description: "Please wait while we prepare your template...",
    });

    // Add template content to URL and switch to generate tab
    const searchParams = new URLSearchParams();
    searchParams.set('template', encodeURIComponent(template.preview));
    window.history.pushState({}, '', `${window.location.pathname}?${searchParams.toString()}`);

    // Simulate loading time
    setTimeout(() => {
      onSelectTemplate(template.title.toLowerCase(), template.preview);
      toast({
        title: "Template Loaded",
        description: `${template.title} template has been loaded successfully.`,
      });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((template, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">{template.title}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => handleSelectTemplate(template)}
              >
                <FileText className="w-4 h-4 mr-2" />
                Use Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TemplateGallery;
