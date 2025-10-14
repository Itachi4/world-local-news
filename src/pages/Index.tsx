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
        .order("published_at", { ascending: false })
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
      // Just fetch headlines without search query
      const { data, error } = await supabase.functions.invoke("scrape-news", {
        body: { searchQuery: null, region: selectedRegion === "all" ? null : selectedRegion }
      });
      
      if (error) throw error;
      
      toast({
        title: "Headlines fetched successfully",
        description: `Fetched ${data.articlesScraped} articles`,
      });
      
      // Refresh articles after scraping
      await fetchArticles();
    } catch (error) {
      console.error("Error scraping news:", error);
      toast({
        title: "Error fetching headlines",
        description: "Failed to fetch articles",
        variant: "destructive",
      });
    } finally {
      setScraping(false);
    }
  };

  const handleSearchArticles = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Enter a search term",
        description: "Please enter a keyword to search for articles",
        variant: "destructive",
      });
      return;
    }

    setScraping(true);
    try {
      // Search for specific articles with the keyword
      const { data, error } = await supabase.functions.invoke("scrape-news", {
        body: { searchQuery: searchQuery.trim(), region: selectedRegion === "all" ? null : selectedRegion }
      });
      
      if (error) throw error;
      
      toast({
        title: "Search completed",
        description: `Found ${data.articlesScraped} articles about "${searchQuery}"`,
      });
      
      // Refresh articles after scraping
      await fetchArticles();
    } catch (error) {
      console.error("Error searching articles:", error);
      toast({
        title: "Error searching articles",
        description: "Failed to search for articles",
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
    handleSearchArticles();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground py-16 px-6 shadow-lg">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="container mx-auto relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 tracking-tight animate-fade-in">Latest Now</h1>
          <p className="text-xl opacity-95 animate-fade-in">Breaking news from around the world</p>
        </div>
      </header>

      {/* Search and Filter Bar */}
      <div className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex gap-3 flex-wrap items-center">
            <div className="flex-1 min-w-[280px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 border-border/50 focus:border-primary transition-colors"
                />
              </div>
            </div>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[180px] h-11 border-border/50">
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
            <Button type="submit" disabled={scraping || !searchQuery.trim()} className="h-11 px-6 shadow-md hover:shadow-lg transition-all">
              <Search className="w-4 h-4 mr-2" />
              {scraping ? "Searching..." : "Search"}
            </Button>
            <Button onClick={handleScrape} disabled={scraping} variant="secondary" className="h-11 px-6 shadow-md hover:shadow-lg transition-all">
              <RefreshCw className={`w-4 h-4 mr-2 ${scraping ? 'animate-spin' : ''}`} />
              {scraping ? "Fetching..." : "Fetch Headlines"}
            </Button>
          </form>
        </div>
      </div>

      {/* Articles Grid */}
      <main className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-foreground">
            {searchQuery ? `"${searchQuery}"` : "Latest Headlines"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {articles.length} {articles.length === 1 ? 'article' : 'articles'}
          </p>
        </div>
        
        {loading ? (
          <div className="text-center py-20">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-muted-foreground">Loading articles...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
            <p className="text-lg text-muted-foreground mb-2">No articles found</p>
            <p className="text-sm text-muted-foreground">
              Try fetching headlines or searching for a specific topic
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {articles.map((article, index) => (
              <div key={article.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-scale-in">
                <ArticleCard
                  title={article.title}
                  snippet={article.snippet}
                  url={article.url}
                  sourceName={article.source_name}
                  sourceCountry={article.source_country}
                  sourceRegion={article.source_region}
                  publishedAt={article.published_at}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
