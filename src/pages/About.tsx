import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const About = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">About snewweb.org</h1>
        </div>
        <p className="text-muted-foreground mb-4">
          snewweb.org curates global headlines by region and topic, so readers can quickly compare how stories are covered around the world.
        </p>
        <p className="text-muted-foreground mb-8">
          Our goal is to make international coverage easier to discover, while giving readers tools like favorites, notes, and analysis for deeper understanding.
        </p>
        <Button asChild>
          <Link to="/">Back to Headlines</Link>
        </Button>
      </div>
    </main>
  );
};

export default About;
