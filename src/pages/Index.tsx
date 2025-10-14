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
      <header className="relative overflow-hidden bg-gradient-to-br from-primary via-[hsl(240_80%_65%)] to-accent text-primary-foreground py-20 px-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
        <div className="container mx-auto relative z-10 text-center">
          <h1 className="text-6xl md:text-7xl font-bold mb-4 tracking-tight animate-fade-in-up" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.2)' }}>
            Latest Now
          </h1>
          <p className="text-xl md:text-2xl opacity-95 font-light animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Breaking news from around the world
          </p>
        </div>
      </header>

      {/* Search and Filter Bar */}
      <div className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-md shadow-md">
        <div className="container mx-auto px-4 py-5">
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
            <Button type="submit" disabled={scraping || !searchQuery.trim()} className="h-11 px-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95">
              <Search className="w-4 h-4 mr-2" />
              {scraping ? "Searching..." : "Search"}
            </Button>
            <Button onClick={handleScrape} disabled={scraping} variant="secondary" className="h-11 px-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95">
              <RefreshCw className={`w-4 h-4 mr-2 ${scraping ? 'animate-spin' : ''}`} />
              {scraping ? "Fetching..." : "Fetch Headlines"}
            </Button>
          </form>
        </div>
      </div>

      {/* Articles Grid */}
      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-10 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {searchQuery ? `"${searchQuery}"` : "Latest Headlines"}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <p className="text-sm font-medium text-muted-foreground">
              {articles.length} {articles.length === 1 ? 'article' : 'articles'}
            </p>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-primary/10 animate-glow">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
            <p className="text-lg text-muted-foreground animate-pulse">Loading articles...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-24 bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl border-2 border-dashed border-border/50 animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">No articles found</p>
            <p className="text-sm text-muted-foreground">
              Try fetching headlines or searching for a specific topic
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article, index) => (
              <div 
                key={article.id} 
                style={{ 
                  animationDelay: `${index * 0.05}s`,
                  animationFillMode: 'both'
                }} 
                className="animate-fade-in"
              >
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
