
import { FileText, Trash2, Share2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const RecentDocuments = () => {
  const { toast } = useToast();
  const recentDocs = JSON.parse(localStorage.getItem('generatedDocuments') || '[]').slice(0, 5);

  const handleDelete = (docId: string) => {
    const documents = JSON.parse(localStorage.getItem('generatedDocuments') || '[]');
    const updatedDocs = documents.filter((doc: any) => doc.id !== docId);
    localStorage.setItem('generatedDocuments', JSON.stringify(updatedDocs));
    
    toast({
      title: "Document Deleted",
      description: "The document has been removed from your recent list",
    });

    // Force a re-render by updating localStorage
    window.dispatchEvent(new Event('storage'));
  };

  const handleShare = async (doc: any, platform: string) => {
    const shareData = {
      title: doc.title,
      text: doc.content,
      url: window.location.href,
    };

    try {
      if (platform === 'native' && navigator.share) {
        await navigator.share(shareData);
      } else if (platform === 'email') {
        window.location.href = `mailto:?subject=${encodeURIComponent(doc.title)}&body=${encodeURIComponent(doc.content)}`;
      } else if (platform === 'copy') {
        await navigator.clipboard.writeText(doc.content);
        toast({
          title: "Copied to Clipboard",
          description: "Document content has been copied to your clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Share Failed",
        description: "Unable to share the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateNew = () => {
    // Scroll to document generator section
    const generator = document.querySelector('#document-generator');
    if (generator) {
      generator.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="mt-8 pt-8 border-t">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Recent Documents</h3>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New
        </Button>
      </div>
      {recentDocs.length === 0 ? (
        <div className="text-center py-8 text-neutral-500">
          No recent documents. Start by creating a new document above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentDocs.map((doc: any) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-base">{doc.title}</CardTitle>
                    <CardDescription>
                      {new Date(doc.timestamp).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleShare(doc, 'native')}>
                          Share...
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShare(doc, 'email')}>
                          Share via Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShare(doc, 'copy')}>
                          Copy to Clipboard
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentDocuments;
