import { Link } from "react-router-dom";
import { Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const Contact = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Contact</h1>
        </div>
        <p className="text-muted-foreground mb-4">
          We welcome feedback, source suggestions, and partnership inquiries.
        </p>
        <p className="text-muted-foreground mb-6 flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Email: support@snewweb.org
        </p>
        <Button asChild>
          <Link to="/">Back to Headlines</Link>
        </Button>
      </div>
    </main>
  );
};

export default Contact;
