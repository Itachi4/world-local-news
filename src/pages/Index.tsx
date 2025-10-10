import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard } from "@/components/ArticleCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const regions = [
  { value: "all", label: "All Regions" },
  { value: "Africa", label: "Africa" },
  { value: "Asia", label: "Asia" },
  { value: "Europe", label: "Europe" },
  { value: "North America", label: "North America" },
  { value: "Oceania", label: "Oceania" },
  { value: "South America", label: "South America" },
];

const Index = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [scraping, setScraping] = useState(false);
  const { toast } = useToast();

  const fetchArticles = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("articles")
        .select("*")
        .order("scraped_at", { ascending: false })
        .limit(50);

      if (selectedRegion !== "all") {
        query = query.eq("source_region", selectedRegion);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,snippet.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error("Error fetching articles:", error);
      toast({
        title: "Error",
        description: "Failed to load articles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-news");
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Scraped ${data.articlesScraped} articles`,
      });
      
      // Clear search query and refresh articles after scraping
      setSearchQuery("");
      await fetchArticles();
    } catch (error) {
      console.error("Error scraping news:", error);
      toast({
        title: "Error",
        description: "Failed to scrape news",
        variant: "destructive",
      });
    } finally {
      setScraping(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [selectedRegion]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchArticles();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold mb-2">Global News Aggregator</h1>
          <p className="text-muted-foreground">
            Discover how events are reported across different regions
          </p>
        </div>
      </header>

      {/* Search and Filter Bar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <form onSubmit={handleSearch} className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={loading}>
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleScrape}
              disabled={scraping}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${scraping ? "animate-spin" : ""}`} />
              Scrape News
            </Button>
          </form>
        </div>
      </div>

      {/* Articles Grid */}
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-6">
          {searchQuery ? "Search Results" : "Latest Now"}
        </h2>
        
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading articles...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No articles found. Click "Scrape News" to fetch the latest articles.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                title={article.title}
                snippet={article.snippet}
                url={article.url}
                sourceName={article.source_name}
                sourceCountry={article.source_country}
                sourceRegion={article.source_region}
                publishedAt={article.published_at}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
