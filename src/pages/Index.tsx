import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard } from "@/components/ArticleCard";
import ArticleNotesModal from "@/components/ArticleNotesModal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, User, LogIn, Globe, Heart, StickyNote, FileText, Video, Cpu, DollarSign, Building2, Palette, Trophy, Plane, Church } from "lucide-react";
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

const countriesByRegion: Record<string, { code: string; name: string }[]> = {
  Africa: [
    { code: "ZA", name: "South Africa" },
    { code: "NG", name: "Nigeria" },
    { code: "EG", name: "Egypt" },
    { code: "KE", name: "Kenya" },
    { code: "GH", name: "Ghana" },
    { code: "MA", name: "Morocco" },
    { code: "ET", name: "Ethiopia" },
    { code: "TZ", name: "Tanzania" },
  ],
  Asia: [
    { code: "IN", name: "India" },
    { code: "CN", name: "China" },
    { code: "JP", name: "Japan" },
    { code: "SG", name: "Singapore" },
    { code: "SA", name: "Saudi Arabia" },
    { code: "KR", name: "South Korea" },
    { code: "PK", name: "Pakistan" },
    { code: "AE", name: "United Arab Emirates" },
  ],
  Europe: [
    { code: "GB", name: "United Kingdom" },
    { code: "FR", name: "France" },
    { code: "DE", name: "Germany" },
    { code: "IT", name: "Italy" },
    { code: "ES", name: "Spain" },
    { code: "NL", name: "Netherlands" },
    { code: "SE", name: "Sweden" },
    { code: "PL", name: "Poland" },
  ],
  "North America": [
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" },
    { code: "MX", name: "Mexico" },
  ],
  Oceania: [
    { code: "AU", name: "Australia" },
    { code: "NZ", name: "New Zealand" },
    { code: "FJ", name: "Fiji" },
    { code: "PG", name: "Papua New Guinea" },
  ],
  "South America": [
    { code: "BR", name: "Brazil" },
    { code: "AR", name: "Argentina" },
    { code: "CO", name: "Colombia" },
    { code: "CL", name: "Chile" },
    { code: "PE", name: "Peru" },
    { code: "VE", name: "Venezuela" },
    { code: "EC", name: "Ecuador" },
    { code: "UY", name: "Uruguay" },
  ],
};

// Helper function to get table name for a region
function getTableNameForRegion(region: string): string | null {
  const regionToTable: Record<string, string> = {
    'Africa': 'articles_africa',
    'Asia': 'articles_asia',
    'Europe': 'articles_europe',
    'North America': 'articles_north_america',
    'Oceania': 'articles_oceania',
    'South America': 'articles_south_america',
  };
  return regionToTable[region] || null;
}

const categories = [
  { value: "general", label: "General", icon: Globe },
  { value: "tech-ai", label: "Tech & AI", icon: Cpu },
  { value: "business-finance", label: "Business & Finance", icon: DollarSign },
  { value: "politics", label: "Politics", icon: Building2 },
  { value: "arts-entertainment-fashion", label: "Arts, Entertainment & Fashion", icon: Palette },
  { value: "sports-games", label: "Sports & Games", icon: Trophy },
  { value: "travel-leisure", label: "Travel & Leisure", icon: Plane },
  { value: "religion-spirituality", label: "Religion & Spirituality", icon: Church },
];

interface IndexProps {
  user: any;
  onLogin: () => void;
  onProfile: () => void;
}

const Index = ({ user, onLogin, onProfile }: IndexProps) => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("general");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
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

  const fetchArticles = async (page = 1, append = false, countryOverride?: string): Promise<number> => {
    const countryFilter = countryOverride !== undefined ? countryOverride : selectedCountry;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setCurrentPage(1);
    }

    try {
      let newArticles: any[] = [];
      let totalCount = 0;

      if (selectedRegion === "all") {
        // For "All Regions": Get top 10 from each region table, combine, sort, and paginate
        const regionTables = [
          'articles_africa',
          'articles_asia',
          'articles_europe',
          'articles_north_america',
          'articles_oceania',
          'articles_south_america',
        ];

        const regionPromises = regionTables.map(async (tableName) => {
          // Use type assertion for dynamic table names
          let query = (supabase.from(tableName as any) as any)
            .select("*", { count: 'exact' })
            .order("published_at", { ascending: false })
            .limit(10); // Get top 10 from each region

          // Filter by category if not general
          if (selectedCategory !== "general") {
            query = query.eq("category", selectedCategory);
          }

          // Filter by country if selected (only applies within a specific region)
          if (countryFilter !== "all") {
            query = query.eq("source_country", countryFilter);
          }

          const { data, error, count } = await query;
          if (error) {
            console.error(`❌ Error querying ${tableName}:`, error);
            return { articles: [], count: 0 };
          }
          return { articles: data || [], count: count || 0 };
        });

        const regionResults = await Promise.all(regionPromises);
        
        // Combine all articles from all regions
        const allRegionArticles = regionResults.flatMap(result => result.articles);
        totalCount = regionResults.reduce((sum, result) => sum + result.count, 0);
        
        // Sort combined articles by published_at (newest first)
        allRegionArticles.sort((a, b) => {
          const dateA = new Date(a.published_at).getTime();
          const dateB = new Date(b.published_at).getTime();
          return dateB - dateA;
        });
        
        // Apply pagination to combined results
        const startIndex = (page - 1) * ARTICLES_PER_PAGE;
        const endIndex = startIndex + ARTICLES_PER_PAGE;
        newArticles = allRegionArticles.slice(startIndex, endIndex);
        
        console.log(`📊 All Regions query: category="${selectedCategory}", found ${totalCount} total articles across all regions, showing ${newArticles.length} on page ${page}`);
      } else {
        // For specific region: Query that region's table
        const tableName = getTableNameForRegion(selectedRegion);
        if (!tableName) {
          console.error(`❌ No table found for region "${selectedRegion}"`);
          toast({
            title: "Error",
            description: `Invalid region: ${selectedRegion}`,
            variant: "destructive",
          });
          return 0;
        }

        // For specific region: Use standard query
        let query = (supabase.from(tableName as any) as any)
          .select("*", { count: 'exact' })
          .order("published_at", { ascending: false })
          .range((page - 1) * ARTICLES_PER_PAGE, page * ARTICLES_PER_PAGE - 1);

        // Filter by category if not general
        if (selectedCategory !== "general") {
          query = query.eq("category", selectedCategory);
        }

        // Filter by country if selected
        if (countryFilter !== "all") {
          query = query.eq("source_country", countryFilter);
        }

        const { data, error, count } = await query;
        
        // Log for debugging
        console.log(`📊 Database query: table="${tableName}", category="${selectedCategory}", region="${selectedRegion}", found ${count || 0} articles`);
        
        // If no articles found, log sample data from table to debug
        if ((count || 0) === 0 && !error) {
          const sampleQuery = (supabase.from(tableName as any) as any)
            .select("category, source_country, source_region, published_at")
            .order("published_at", { ascending: false })
            .limit(5);
          const { data: sampleData } = await sampleQuery;
          console.log(`🔍 Sample data from ${tableName}:`, sampleData);
          console.log(`🔍 Looking for: category="${selectedCategory}"`);
        }

        if (error) {
          console.error('❌ Database query error:', error);
          const errorMessage = error?.message || String(error) || '';
          
          // If error is about missing column, show helpful message and fall back
          if (errorMessage.includes('column') && errorMessage.includes('category')) {
            console.warn("⚠️ Category column doesn't exist yet. Please run the database migration.");
            console.warn("Falling back to fetching all articles without category filter...");
            
            // Fall back to fetching all articles without category filter
            let fallbackQuery = (supabase.from(tableName as any) as any)
              .select("*", { count: 'exact' })
              .order("published_at", { ascending: false })
              .range((page - 1) * ARTICLES_PER_PAGE, page * ARTICLES_PER_PAGE - 1);
            
            const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery;
            if (fallbackError) {
              console.error('❌ Fallback query also failed:', fallbackError);
              throw fallbackError;
            }
            
            newArticles = fallbackData || [];
            totalCount = fallbackCount || 0;
            
            // Show warning toast
            toast({
              title: "Category filter unavailable",
              description: "Please run the database migration to enable category filtering.",
              variant: "destructive",
            });
            
            if (append) {
              setArticles(prev => [...prev, ...newArticles]);
            } else {
              setArticles(newArticles);
            }
            
            setHasMore(newArticles.length === ARTICLES_PER_PAGE);
            setCurrentPage(page);
            setTotalArticles(totalCount);
            
            return newArticles.length;
          }
          throw error;
        }
        
        newArticles = data || [];
        totalCount = count || 0;
      }
      
      setTotalArticles(totalCount);
      
      if (append) {
        setArticles(prev => [...prev, ...newArticles]);
      } else {
        setArticles(newArticles);
      }
      
      setHasMore(newArticles.length === ARTICLES_PER_PAGE);
      setCurrentPage(page);
      
      // Log for debugging
      if (selectedCategory !== "general" && newArticles.length === 0) {
        console.log(`No articles found for category "${selectedCategory}" in region "${selectedRegion}". Total articles in DB: ${totalCount}`);
      }
      
      return newArticles.length;
    } catch (error) {
      console.error("Error fetching articles:", error);
      toast({
        title: "Error",
        description: "Failed to load articles",
        variant: "destructive",
      });
      return 0;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    
    // Show initial fetching message
    toast({
      title: "Fetching headlines...",
      description: `Getting ${categories.find(c => c.value === selectedCategory)?.label || "latest"} news from ${selectedRegion === "all" ? "all regions" : selectedRegion}`,
    });
    
    try {
      // First, show existing articles immediately
      await fetchArticles(1, false);
      
      // Create a timeout promise - increased to 45 seconds for initial fetch
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - function took too long to respond')), 45000); // 45 second timeout
      });
      
      // Create the function call promise with category
      const categoryValue = selectedCategory === "general" ? null : selectedCategory;
      console.log('Frontend sending:', { selectedCategory, categoryValue, region: selectedRegion, country: selectedCountry });
      
        // Initial fetch: get more articles to ensure good coverage from all countries
        const requestBody = { 
          category: categoryValue, 
          region: selectedRegion === "all" ? null : selectedRegion,
          country: selectedCountry === "all" ? null : selectedCountry,
          limit: 100  // Fetch 100 articles to get good coverage from all countries
        };
      
      console.log('📡 Fetching articles with:', requestBody);
      console.log('🔗 Expected RSS URLs will be logged in Supabase Edge Function logs');
      
      const functionPromise = supabase.functions.invoke("scrape-news", {
        body: requestBody
      });
      
      // Race between timeout and function call
      console.log('⏱️ Starting fetch with 45 second timeout...');
      const startTime = Date.now();
      const result = await Promise.race([functionPromise, timeoutPromise]) as any;
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Fetch completed in ${elapsedTime} seconds`);
      
      const { data, error } = result;
      
      if (error) {
        console.error('❌ Error from edge function:', error);
        throw error;
      }
      
      console.log('📊 Response from edge function:', data);
      
      // Refresh articles after scraping to show new ones
      // Wait longer for database to update (especially for multiple region tables)
      console.log('⏳ Waiting for database to update...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Try fetching articles, with retry if needed
      let displayedCount = await fetchArticles(1, false);
      console.log(`📈 First fetch: Scraped ${data.articlesScraped} articles, displaying ${displayedCount} articles`);
      
      // If no articles displayed but articles were scraped, try again after a longer delay
      if (displayedCount === 0 && data.articlesScraped > 0) {
        console.log('⚠️ No articles displayed on first fetch, retrying after delay...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        displayedCount = await fetchArticles(1, false);
        console.log(`📈 Retry fetch: Displaying ${displayedCount} articles`);
      }
      
      toast({
        title: data.articlesScraped > 0 ? "Headlines fetched successfully" : "No new articles found",
        description: data.articlesScraped > 0 
          ? `Fetched ${data.articlesScraped} articles. ${displayedCount > 0 ? `${displayedCount} articles displayed.` : 'Articles fetched but not matching current filters.'}`
          : 'No articles were found. Try a different category or region.',
        variant: data.articlesScraped === 0 ? "destructive" : "default",
      });
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

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    
    // If we're on the first page and have few articles, fetch more from the edge function
    if (currentPage === 1 && articles.length < 20) {
      setLoadingMore(true);
      try {
        const categoryValue = selectedCategory === "general" ? null : selectedCategory;
        const functionPromise = supabase.functions.invoke("scrape-news", {
          body: { 
            category: categoryValue, 
            region: selectedRegion === "all" ? null : selectedRegion,
            country: selectedCountry === "all" ? null : selectedCountry,
            limit: 100  // Fetch more articles to get good coverage
          }
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 30000);
        });
        
        const result = await Promise.race([functionPromise, timeoutPromise]) as any;
        const { data, error } = result;
      
      if (error) throw error;
      
        // Refresh articles from database
        await fetchArticles(currentPage + 1, true);
    } catch (error) {
        console.error("Error loading more articles:", error);
        // Fall back to regular pagination if edge function fails
        await fetchArticles(currentPage + 1, true);
    } finally {
        setLoadingMore(false);
      }
    } else {
      // Regular pagination for subsequent pages
      await fetchArticles(currentPage + 1, true);
    }
  };

  // Filter articles based on active tab
  const filteredArticles = activeTab === "favorites" 
    ? articles.filter(article => favorites.has(article.id))
    : articles;

  // Reset country when region changes
  useEffect(() => {
    setSelectedCountry("all");
  }, [selectedRegion]);

  // Auto-fetch articles when category, region, or country changes
  useEffect(() => {
    const autoFetch = async () => {
      // First, fetch existing articles from database
      const count = await fetchArticles(1, false, selectedCountry);
      
      // Always auto-fetch new headlines when filters change
      console.log(`Auto-fetching: Category="${selectedCategory}", Region="${selectedRegion}", Country="${selectedCountry}", found ${count} existing articles`);
      
      // Call scrape in background (don't await to avoid blocking UI)
      const categoryValue = selectedCategory === "general" ? null : selectedCategory;
      const requestBody = { 
        category: categoryValue, 
        region: selectedRegion === "all" ? null : selectedRegion,
        country: selectedCountry === "all" ? null : selectedCountry,
        limit: 100
      };
      
      supabase.functions.invoke("scrape-news", { body: requestBody })
        .then(async (result: any) => {
          const { data, error } = result;
          if (error) {
            console.error('Auto-fetch error:', error);
            return;
          }
          
          // Wait a moment for database to update, then refresh articles
          await new Promise(resolve => setTimeout(resolve, 500));
          await fetchArticles(1, false, selectedCountry);
        })
        .catch(err => {
          console.error('Auto-fetch error:', err);
        });
    };
    
    autoFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedRegion, selectedCountry]);

  useEffect(() => {
    if (user) {
      fetchFavorites();
      fetchNotes();
      fetchAnalyses();
    }
  }, [user]);

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

      {/* Category Tabs and Filter Bar */}
      <div className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-md shadow-md animate-slide-up">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col gap-4">
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.value}
                    variant={selectedCategory === category.value ? "default" : "outline"}
                    onClick={() => {
                      setSelectedCategory(category.value);
                    }}
                    className="flex items-center gap-2 h-10"
                    disabled={scraping}
                  >
                    <Icon className="w-4 h-4" />
                    {category.label}
                  </Button>
                );
              })}
              </div>
            
            {/* Region Selector and Fetch Button */}
            <div className="flex gap-3 items-center flex-wrap">
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

            {/* Country selector — visible only when a specific region is selected */}
            {selectedRegion !== "all" && countriesByRegion[selectedRegion] && (
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-[200px] h-11 border-border/50 hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countriesByRegion[selectedRegion].map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
              <Button 
                onClick={handleScrape} 
                disabled={scraping} 
                variant="secondary" 
                className="h-11 px-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 hover-glow disabled:opacity-50 disabled:cursor-not-allowed"
              >
              <RefreshCw className={`w-4 h-4 mr-2 ${scraping ? 'animate-spin' : ''}`} />
              {scraping ? "Fetching Headlines..." : "Fetch Headlines"}
            </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {categories.find(c => c.value === selectedCategory)?.label || "Latest Global News Headlines"}
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
