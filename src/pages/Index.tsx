import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard } from "@/components/ArticleCard";
import ArticleNotesModal from "@/components/ArticleNotesModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, User, LogIn, Globe, Heart, StickyNote, FileText, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnalysisEditor } from "@/components/AnalysisEditor";
import { UserSidebar } from "@/components/UserSidebar";
import { UserContentViewer } from "@/components/UserContentViewer";

const regions = [
  { value: "all", label: "All Regions" },
  { value: "Africa", label: "Africa" },
  { value: "Asia", label: "Asia" },
  { value: "Europe", label: "Europe" },
  { value: "North America", label: "North America" },
  { value: "Oceania", label: "Oceania" },
  { value: "South America", label: "South America" },
];

interface IndexProps {
  user: any;
  onLogin: () => void;
  onProfile: () => void;
}

const Index = ({ user, onLogin, onProfile }: IndexProps) => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [scraping, setScraping] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "favorites" | "analysis">("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Map<string, { text: string; isPublic: boolean; userId?: string }>>(new Map());
  const [publicNotes, setPublicNotes] = useState<Map<string, Array<{ text: string; userId: string }>>>(new Map());
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [editingAnalysis, setEditingAnalysis] = useState<any | null>(null);
  const [notesModal, setNotesModal] = useState<{
    isOpen: boolean;
    articleId: string;
    title: string;
    noteText?: string;
    noteIsPublic?: boolean;
  }>({
    isOpen: false,
    articleId: "",
    title: "",
  });
  const ARTICLES_PER_PAGE = 10;
  const { toast } = useToast();

  // Fetch user favorites
  const fetchFavorites = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("article_id")
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      const favoriteIds = new Set(data?.map(fav => fav.article_id) || []);
      setFavorites(favoriteIds);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  // Fetch user notes
  const fetchNotes = async () => {
    if (!user) return;
    
    try {
      // Fetch current user's notes (both public and private)
      const { data: userNotes, error: userError } = await supabase
        .from("article_notes")
        .select("article_id, note_text, is_public")
        .eq("user_id", user.id);
      
      if (userError) throw userError;
      
      const notesMap = new Map();
      userNotes?.forEach(note => {
        notesMap.set(note.article_id, {
          text: note.note_text,
          isPublic: note.is_public,
          userId: user.id
        });
      });
      setNotes(notesMap);

      // Fetch public notes from other users
      const { data: publicNotesData, error: publicError } = await supabase
        .from("article_notes")
        .select("article_id, note_text, user_id")
        .eq("is_public", true)
        .neq("user_id", user.id);
      
      if (publicError) {
        console.error("Error fetching public notes:", publicError);
        return;
      }

      // Group public notes by article_id
      const publicNotesMap = new Map<string, Array<{ text: string; userId: string }>>();
      publicNotesData?.forEach(note => {
        if (!publicNotesMap.has(note.article_id)) {
          publicNotesMap.set(note.article_id, []);
        }
        publicNotesMap.get(note.article_id)!.push({
          text: note.note_text,
          userId: note.user_id
        });
      });
      setPublicNotes(publicNotesMap);
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  // Fetch user analyses
  const fetchAnalyses = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("user_analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error("Error fetching analyses:", error);
    }
  };

  // Toggle favorite
  const toggleFavorite = async (articleId: string) => {
    if (!user) return;
    
    try {
      const isFavorited = favorites.has(articleId);
      
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("article_id", articleId);
        
        if (error) throw error;
        
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(articleId);
          return newSet;
        });
        
        toast({
          title: "Removed from favorites",
          description: "Article removed from your favorites",
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from("favorites")
          .insert({
            user_id: user.id,
            article_id: articleId
          });
        
        if (error) throw error;
        
        setFavorites(prev => new Set([...prev, articleId]));
        
        toast({
          title: "Added to favorites",
          description: "Article added to your favorites",
        });
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    }
  };

  // Save note
  const saveNote = async (noteText: string, isPublic: boolean) => {
    if (!user || !notesModal.articleId) return;
    
    try {
      console.log('Saving note:', { 
        user_id: user.id, 
        article_id: notesModal.articleId, 
        note_text: noteText, 
        is_public: isPublic 
      });
      
      // First, try to check if the table exists by doing a simple select
      const { data: testData, error: testError } = await supabase
        .from("article_notes")
        .select("id")
        .limit(1);
      
      if (testError) {
        console.error('Table check error:', testError);
        throw new Error(`Database table 'article_notes' may not exist. Please run the setup script in Supabase SQL Editor. Error: ${testError.message}`);
      }
      
      // First check if note exists
      const { data: existingNote } = await supabase
        .from("article_notes")
        .select("id, is_public")
        .eq("user_id", user.id)
        .eq("article_id", notesModal.articleId)
        .single();

      let result;
      if (existingNote) {
        // Update existing note
        const { data, error } = await supabase
          .from("article_notes")
          .update({
            note_text: noteText,
            is_public: isPublic,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingNote.id)
          .eq("user_id", user.id)
          .select()
          .single();
        
        result = { data, error };
      } else {
        // Insert new note
        const { data, error } = await supabase
          .from("article_notes")
          .insert({
            user_id: user.id,
            article_id: notesModal.articleId,
            note_text: noteText,
            is_public: isPublic
          })
          .select()
          .single();
        
        result = { data, error };
      }
      
      if (result.error) {
        console.error('Supabase save error:', result.error);
        throw result.error;
      }
      
      // Verify the saved data
      console.log('Note saved successfully:', result.data);
      console.log('is_public value:', result.data?.is_public);
      
      // Update local state
      setNotes(prev => {
        const newMap = new Map(prev);
        newMap.set(notesModal.articleId, { text: noteText, isPublic });
        return newMap;
      });
      
      // Refresh notes from database to ensure we have the latest data
      await fetchNotes();
      
      // Close the modal after successful save
      closeNotesModal();
      
      toast({
        title: "Note saved",
        description: isPublic ? "Note saved and made public" : "Note saved privately",
      });
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Error",
        description: `Failed to save note: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Open notes modal
  const openNotesModal = (articleId: string, title: string, noteText?: string, noteIsPublic?: boolean) => {
    setNotesModal({
      isOpen: true,
      articleId,
      title,
      noteText,
      noteIsPublic
    });
  };

  // Close notes modal
  const closeNotesModal = () => {
    setNotesModal({
      isOpen: false,
      articleId: "",
      title: "",
    });
  };

  // Delete note
  const deleteNote = async () => {
    if (!user || !notesModal.articleId) return;
    
    try {
      const { error } = await supabase
        .from("article_notes")
        .delete()
        .eq("user_id", user.id)
        .eq("article_id", notesModal.articleId);

      if (error) throw error;

      // Update local state
      setNotes(prev => {
        const newMap = new Map(prev);
        newMap.delete(notesModal.articleId);
        return newMap;
      });

      // Refresh notes from database
      await fetchNotes();

      // Close the modal
      closeNotesModal();

      toast({
        title: "Note deleted",
        description: "Your note has been deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting note:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  const fetchArticles = async (page = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
    setLoading(true);
      setCurrentPage(1);
    }

    try {
      let query = supabase
        .from("articles")
        .select("*", { count: 'exact' })
        .order("published_at", { ascending: false })
        .range((page - 1) * ARTICLES_PER_PAGE, page * ARTICLES_PER_PAGE - 1);

      if (selectedRegion !== "all") {
        query = query.eq("source_region", selectedRegion);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,snippet.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      
      const newArticles = data || [];
      setTotalArticles(count || 0);
      
      if (append) {
        setArticles(prev => [...prev, ...newArticles]);
      } else {
        setArticles(newArticles);
      }
      
      setHasMore(newArticles.length === ARTICLES_PER_PAGE);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching articles:", error);
      toast({
        title: "Error",
        description: "Failed to load articles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    try {
      // First, show existing articles immediately
      await fetchArticles(1, false);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - function took too long to respond')), 30000); // 30 second timeout
      });
      
      // Create the function call promise
      const functionPromise = supabase.functions.invoke("scrape-news", {
        body: { searchQuery: null, region: selectedRegion === "all" ? null : selectedRegion }
      });
      
      // Race between timeout and function call
      const result = await Promise.race([functionPromise, timeoutPromise]) as any;
      const { data, error } = result;
      
      if (error) throw error;
      
      toast({
        title: "Headlines fetched successfully",
        description: `Fetched ${data.articlesScraped} articles`,
      });
      
      // Refresh articles after scraping to show new ones
      await fetchArticles(1, false);
    } catch (error) {
      console.error("Error scraping news:", error);
      
      // Check if it's a timeout error
      if (error.message.includes('timeout')) {
        toast({
          title: "Request Timeout",
          description: "The function took too long to respond. Please try again.",
          variant: "destructive",
        });
      } else {
      toast({
        title: "Error fetching headlines",
        description: "Failed to fetch articles",
        variant: "destructive",
      });
      }
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
      // Clear existing articles to show loading state
      setArticles([]);
      setTotalArticles(0);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - function took too long to respond')), 30000); // 30 second timeout
      });
      
      // Create the function call promise
      const functionPromise = supabase.functions.invoke("scrape-news", {
        body: { searchQuery: searchQuery.trim(), region: selectedRegion === "all" ? null : selectedRegion }
      });
      
      // Race between timeout and function call
      const result = await Promise.race([functionPromise, timeoutPromise]) as any;
      const { data, error } = result;
      
      if (error) throw error;
      
      console.log('Search function response:', data);
      
      // Show success message
      if (data.articlesScraped > 0) {
      toast({
        title: "Search completed",
        description: `Found ${data.articlesScraped} articles about "${searchQuery}"`,
      });
      } else {
        toast({
          title: "No articles found",
          description: `No articles found for "${searchQuery}" in ${selectedRegion === "all" ? "all regions" : selectedRegion}`,
          variant: "destructive",
        });
      }
      
      // Refresh articles after scraping to show new results
      await fetchArticles(1, false);
    } catch (error) {
      console.error("Error searching articles:", error);
      
      // Check if it's a timeout error
      if (error.message.includes('timeout')) {
        toast({
          title: "Request Timeout",
          description: "The search took too long to respond. Please try again.",
          variant: "destructive",
        });
      } else {
      toast({
        title: "Error searching articles",
        description: "Failed to search for articles",
        variant: "destructive",
      });
      }
    } finally {
      setScraping(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    await fetchArticles(currentPage + 1, true);
  };

  // Filter articles based on active tab
  const filteredArticles = activeTab === "favorites" 
    ? articles.filter(article => favorites.has(article.id))
    : articles;

  useEffect(() => {
    fetchArticles();
  }, [selectedRegion]);

  useEffect(() => {
    if (user) {
      fetchFavorites();
      fetchNotes();
      fetchAnalyses();
    }
  }, [user]);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchArticles();
  };

  // If no user, don't render the main content
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary via-[hsl(240_80%_65%)] to-accent text-primary-foreground py-20 px-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-accent/20 animate-pulse"></div>
        <div className="container mx-auto relative z-10">
          {/* Auth Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <Globe className="w-6 h-6 text-blue-400" />
              <span className="text-sm font-medium">Free Global News Service</span>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <Button
                  variant="outline"
                  onClick={onProfile}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <User className="w-4 h-4 mr-2" />
                  {user.user_metadata?.full_name || user.email}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={onLogin}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>

          {/* Main Header Content */}
          <div className="text-center">
            <h1 className="text-6xl md:text-7xl font-bold mb-4 tracking-tight animate-fade-in-up" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.2)' }}>
              Latest Now
            </h1>
            <p className="text-xl md:text-2xl opacity-95 font-light animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Breaking news from around the world
            </p>
            <div className="mt-8 flex justify-center">
              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce-gentle"></div>
              <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce-gentle mx-2" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-white/20 rounded-full animate-bounce-gentle" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </header>

      {/* Search and Filter Bar */}
      <div className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-md shadow-md animate-slide-up">
        <div className="container mx-auto px-4 py-5">
          <form onSubmit={handleSearch} className="flex gap-3 flex-wrap items-center">
            <div className="flex-1 min-w-[280px]">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-primary transition-colors" />
                <Input
                  type="text"
                  placeholder="Search by keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 border-border/50 focus:border-primary transition-all duration-300 focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                />
              </div>
            </div>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[180px] h-11 border-border/50 hover:border-primary/50 transition-colors">
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
            <Button 
              type="submit" 
              disabled={scraping || !searchQuery.trim()} 
              className="h-11 px-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 hover-glow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="w-4 h-4 mr-2" />
              {scraping ? "Searching..." : "Search"}
            </Button>
            <Button 
              onClick={handleScrape} 
              disabled={scraping} 
              variant="secondary" 
              className="h-11 px-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 hover-glow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${scraping ? 'animate-spin' : ''}`} />
              {scraping ? "Fetching..." : "Fetch Headlines"}
            </Button>
          </form>
        </div>
      </div>

      {/* Articles Grid */}
      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {searchQuery ? `Search Results for "${searchQuery}"` : "Latest Global News Headlines"}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <p className="text-sm font-medium text-muted-foreground">
              {filteredArticles.length} of {totalArticles} {totalArticles === 1 ? 'article' : 'articles'}
            </p>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "all" | "favorites" | "analysis")} className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              All Articles
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Favorites ({favorites.size})
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Analysis
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            {renderArticles(articles)}
          </TabsContent>
          
          <TabsContent value="favorites" className="mt-6">
            {renderArticles(filteredArticles)}
          </TabsContent>

          <TabsContent value="analysis" className="mt-6">
            <div className="flex gap-6 min-h-[600px]">
              <UserSidebar 
                currentUserId={user?.id}
                onSelectUser={(userId, userName) => {
                  setSelectedUserId(userId);
                  setSelectedUserName(userName);
                  setEditingAnalysis(null);
                }} 
              />
              
              {selectedUserId ? (
                <UserContentViewer
                  userId={selectedUserId}
                  userName={selectedUserName}
                  currentUserId={user?.id}
                  onClose={() => {
                    setSelectedUserId(null);
                    setSelectedUserName("");
                  }}
                  onEdit={(analysis) => {
                    setSelectedUserId(null);
                    setSelectedUserName("");
                    setEditingAnalysis(analysis);
                  }}
                  onDelete={fetchAnalyses}
                />
              ) : (
                <div className="flex-1">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-4">
                      {editingAnalysis ? "Edit Analysis" : "Create New Analysis"}
                    </h3>
                    <AnalysisEditor 
                      userId={user.id} 
                      onSave={() => {
                        fetchAnalyses();
                        setEditingAnalysis(null);
                      }}
                      editingAnalysis={editingAnalysis}
                      onCancel={() => setEditingAnalysis(null)}
                    />
                  </div>
                  
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4">My Analyses</h3>
                    {analyses.length === 0 ? (
                      <div className="text-center py-12 bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl border-2 border-dashed border-border/50">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No analyses yet. Create one above!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analyses.map((analysis) => (
                          <Card key={analysis.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{analysis.title}</CardTitle>
                                <div className="flex items-center gap-2">
                                  {analysis.is_public && (
                                    <Badge variant="secondary" className="text-xs">Public</Badge>
                                  )}
                                  {analysis.video_url && (
                                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                                      <Video className="w-3 h-3" />
                                      Video
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                {analysis.content}
                              </p>
                              {analysis.video_url && analysis.thumbnail_url && (
                                <div className="mb-4">
                                  <img
                                    src={analysis.thumbnail_url}
                                    alt={analysis.title}
                                    className="w-full h-32 object-cover rounded-md"
                                  />
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-2 border-t">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(analysis.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingAnalysis(analysis)}
                                    className="h-7 px-2 text-xs"
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      if (confirm("Are you sure you want to delete this analysis?")) {
                                        try {
                                          const { error } = await supabase
                                            .from('user_analyses')
                                            .delete()
                                            .eq('id', analysis.id)
                                            .eq('user_id', user.id);
                                          
                                          if (error) throw error;
                                          fetchAnalyses();
                                          toast({
                                            title: "Analysis deleted",
                                            description: "Your analysis has been deleted",
                                          });
                                        } catch (error: any) {
                                          toast({
                                            title: "Error",
                                            description: error.message || "Failed to delete analysis",
                                            variant: "destructive",
                                          });
                                        }
                                      }
                                    }}
                                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Notes Dropdown */}
      <ArticleNotesModal
        isOpen={notesModal.isOpen}
        onClose={closeNotesModal}
        onSave={saveNote}
        onDelete={deleteNote}
        initialNoteText={notesModal.noteText}
        initialIsPublic={notesModal.noteIsPublic}
        articleTitle={notesModal.title}
      />
    </div>
  );

  // Render articles function
  function renderArticles(articlesToRender: any[]) {
    return (
      <>
        {loading ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-primary/10 animate-glow">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
            <p className="text-lg text-muted-foreground animate-pulse">Loading articles...</p>
            <div className="mt-4 flex justify-center space-x-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce-gentle"></div>
              <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce-gentle" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-primary/30 rounded-full animate-bounce-gentle" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        ) : articlesToRender.length === 0 ? (
          <div className="text-center py-24 bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl border-2 border-dashed border-border/50 animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center animate-bounce-gentle">
              {activeTab === "favorites" ? (
                <Heart className="w-8 h-8 text-muted-foreground" />
              ) : (
              <Search className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <p className="text-xl font-semibold text-foreground mb-2">
              {activeTab === "favorites" ? "No favorites yet" : "No articles found"}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {activeTab === "favorites" 
                ? "Start adding articles to your favorites by clicking the heart icon"
                : "Try fetching headlines or searching for a specific topic"
              }
            </p>
            {activeTab === "all" && (
              <div className="flex justify-center gap-3">
                <Button onClick={handleScrape} disabled={scraping} className="animate-scale-in">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Fetch Headlines
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articlesToRender.map((article, index) => {
                const noteData = notes.get(article.id);
                const articlePublicNotes = publicNotes.get(article.id) || [];
                return (
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
                      articleId={article.id}
                      userId={user?.id}
                      isFavorited={favorites.has(article.id)}
                      noteText={noteData?.text}
                      noteIsPublic={noteData?.isPublic}
                      publicNotes={articlePublicNotes}
                      onToggleFavorite={toggleFavorite}
                      onOpenNotes={openNotesModal}
                    />
                  </div>
                );
              })}
            </div>
            
            {/* Load More Button */}
            {hasMore && articlesToRender.length > 0 && activeTab === "all" && (
              <div className="flex justify-center mt-12">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="px-8 py-3 hover:scale-105 transition-all hover-glow"
                >
                  {loadingMore ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Load More Articles
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Background Loading Indicator */}
            {scraping && (
              <div className="fixed bottom-6 right-6 bg-card/95 backdrop-blur-md border border-border/50 rounded-lg px-4 py-3 shadow-lg animate-slide-up">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm font-medium">Fetching fresh headlines...</span>
                </div>
          </div>
            )}
          </>
        )}
      </>
  );
  }
};

export default Index;
