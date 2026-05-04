import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
        </div>
        <p className="text-muted-foreground mb-4">
          We collect only the data needed to provide core features such as sign-in, favorites, and notes.
        </p>
        <p className="text-muted-foreground mb-8">
          We do not sell personal data. You can request account and data removal by contacting support@snewweb.org.
        </p>
        <Button asChild>
          <Link to="/">Back to Headlines</Link>
        </Button>
      </div>
    </main>
  );
};

export default Privacy;
