import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const Terms = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Terms of Use</h1>
        </div>
        <p className="text-muted-foreground mb-4">
          Content is provided for informational purposes. Source ownership and copyrights remain with original publishers.
        </p>
        <p className="text-muted-foreground mb-8">
          By using this service, you agree to use it lawfully and avoid attempts to disrupt platform availability or integrity.
        </p>
        <Button asChild>
          <Link to="/">Back to Headlines</Link>
        </Button>
      </div>
    </main>
  );
};

export default Terms;
