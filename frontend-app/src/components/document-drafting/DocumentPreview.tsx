
import { useState } from "react";
import { Download, Edit, Eye, Save, Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface DocumentPreviewProps {
  content: string;
}

const DocumentPreview = ({ content }: DocumentPreviewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState(content);
  const { toast } = useToast();

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([editableContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `document-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: "Document Downloaded",
      description: "Your document has been downloaded successfully.",
    });
  };

  const handleSave = () => {
    toast({
      title: "Document Saved",
      description: "Your changes have been saved successfully.",
    });
    setIsEditing(false);
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(editableContent);
    toast({
      title: "Copied to Clipboard",
      description: "Document content has been copied to clipboard.",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Legal Document',
        text: editableContent,
      }).then(() => {
        toast({
          title: "Document Shared",
          description: "Your document has been shared successfully.",
        });
      }).catch(console.error);
    } else {
      toast({
        title: "Share Not Available",
        description: "Sharing is not supported on this device.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-6 space-y-4 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-lg font-medium gradient-text">Generated Document</h3>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsEditing(!isEditing)}
            className="bg-white/80 hover:bg-white"
          >
            {isEditing ? <Eye className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
            {isEditing ? "Preview" : "Edit"}
          </Button>
          {isEditing && (
            <Button 
              variant="outline" 
              onClick={handleSave}
              className="bg-white/80 hover:bg-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={handleCopy}
            className="bg-white/80 hover:bg-white"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownload}
            className="bg-white/80 hover:bg-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button 
            variant="outline" 
            onClick={handleShare}
            className="bg-white/80 hover:bg-white"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
      {isEditing ? (
        <Textarea
          value={editableContent}
          onChange={(e) => setEditableContent(e.target.value)}
          className="min-h-[400px] font-mono glass-card p-6"
        />
      ) : (
        <div className="glass-card p-6 rounded-xl min-h-[400px] whitespace-pre-wrap font-mono shadow-lg">
          {editableContent}
        </div>
      )}
    </div>
  );
};

export default DocumentPreview;
