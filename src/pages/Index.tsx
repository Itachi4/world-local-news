import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard } from "@/components/ArticleCard";
import ArticleNotesModal from "@/components/ArticleNotesModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, User, LogIn, Globe, Heart, FileText, Video, Cpu, DollarSign, Building2, Palette, Trophy, Plane, Church, X, MailCheck, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnalysisEditor } from "@/components/AnalysisEditor";
import { UserSidebar } from "@/components/UserSidebar";
import { UserContentViewer } from "@/components/UserContentViewer";
import InteractiveGlobeView from "@/components/InteractiveGlobeView";
import { COUNTRIES_BY_REGION, REGION_OPTIONS } from "@/lib/countryMap";
import { Link } from "react-router-dom";

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

const FONT_SCALE_STEPS = [90, 100, 112];

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
  const [viewMode, setViewMode] = useState<"cards" | "globe">("cards");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Map<string, { text: string; isPublic: boolean; userId?: string }>>(new Map());
  const [publicNotes, setPublicNotes] = useState<Map<string, Array<{ text: string; userId: string }>>>(new Map());
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fontScale, setFontScale] = useState(100);
  const [digestEmail, setDigestEmail] = useState("");
  const [digestFrequency, setDigestFrequency] = useState<"daily" | "weekly">("daily");
  const [digestCategories, setDigestCategories] = useState<string[]>(["general"]);
  const [subscribingDigest, setSubscribingDigest] = useState(false);
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

  const getCategoryLabel = (value: string) =>
    categories.find((category) => category.value === value)?.label || value;

  const getLocalDigestSubscriptions = () => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("digest_subscriptions");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  type DigestSubscription = {
    email: string;
    user_id: string | null;
    frequency: "daily" | "weekly";
    categories: string[];
    is_active: boolean;
    updated_at: string;
    created_at?: string;
  };

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
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      const errorMessage = error?.message || "Failed to update favorites";
      toast({
        title: "Error",
        description: errorMessage,
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

        // Fetch enough per region to fill several pages after global date sort
        const PER_REGION_LIMIT = 60;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const regionPromises = regionTables.map(async (tableName) => {
          let query = (supabase.from(tableName as any) as any)
            .select("*", { count: 'exact' })
            .gte("published_at", sevenDaysAgo)
            .order("published_at", { ascending: false })
            .limit(PER_REGION_LIMIT);

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
        totalCount = regionResults.reduce((sum, result) => sum + result.count, 0);

        // Round-robin merge: take the freshest article from each region in turn so
        // every region is always represented — prevents high-volume regions (e.g. Asia)
        // from flooding the first pages.
        const queues = regionResults.map(r => [...r.articles]); // each already newest-first from DB
        const combined: any[] = [];
        let anyLeft = true;
        while (anyLeft) {
          anyLeft = false;
          for (const q of queues) {
            if (q.length > 0) { combined.push(q.shift()); anyLeft = true; }
          }
        }

        // Apply pagination to round-robin results
        const startIndex = (page - 1) * ARTICLES_PER_PAGE;
        const endIndex = startIndex + ARTICLES_PER_PAGE;
        newArticles = combined.slice(startIndex, endIndex);

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
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        let query = (supabase.from(tableName as any) as any)
          .select("*", { count: 'exact' })
          .gte("published_at", sevenDaysAgo)
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

      if (data.articlesScraped > 0) {
        toast({
          title: "Headlines fetched successfully",
          description: `Fetched ${data.articlesScraped} new articles. ${displayedCount > 0 ? `${displayedCount} articles displayed.` : 'Articles fetched but not matching current filters.'}`,
        });
      } else if (displayedCount > 0) {
        // Articles are already in the DB — don't alarm the user
        toast({
          title: "Already up to date",
          description: `Showing ${displayedCount} cached articles. No newer articles found right now.`,
        });
      } else {
        toast({
          title: "That's all we have for now",
          description: "Check back soon to get new headlines, or try a different category or region!",
        });
      }
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

  const allTabArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return articles;
    }

    return articles.filter((article) => {
      const haystack = [
        article.title,
        article.snippet,
        article.source_name,
        article.source_country,
        article.source_region,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [articles, searchQuery]);

  const favoriteArticles = useMemo(
    () => articles.filter((article) => favorites.has(article.id)),
    [articles, favorites]
  );

  const favoriteTabArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return favoriteArticles;
    }

    return favoriteArticles.filter((article) => {
      const haystack = [
        article.title,
        article.snippet,
        article.source_name,
        article.source_country,
        article.source_region,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [favoriteArticles, searchQuery]);

  const activeTabArticles = activeTab === "favorites" ? favoriteTabArticles : allTabArticles;
  const displayedArticles = viewMode === "globe" ? allTabArticles : activeTabArticles;

  // Keep selected country valid for the current region.
  useEffect(() => {
    if (selectedRegion === "all") return;

    const regionCountries = COUNTRIES_BY_REGION[selectedRegion] || [];
    const existsInRegion = selectedCountry === "all"
      || regionCountries.some((country) => country.code === selectedCountry);
    if (!existsInRegion) {
      setSelectedCountry("all");
    }
  }, [selectedRegion, selectedCountry]);

  useEffect(() => {
    if (viewMode === "globe") {
      setActiveTab("all");
      setSelectedRegion("all");
      setSelectedCountry("all");
    }
  }, [viewMode]);

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
      if (user.email) {
        setDigestEmail((prev) => prev || user.email);
      }
    }
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedFontScale = Number(window.localStorage.getItem("preferred_font_scale") || "100");
    if (FONT_SCALE_STEPS.includes(savedFontScale)) {
      setFontScale(savedFontScale);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.fontSize = `${fontScale}%`;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("preferred_font_scale", String(fontScale));
    }
  }, [fontScale]);

  const toggleDigestCategory = (categoryValue: string) => {
    setDigestCategories((prev) => {
      if (prev.includes(categoryValue)) {
        const next = prev.filter((value) => value !== categoryValue);
        return next.length > 0 ? next : prev;
      }
      return [...prev, categoryValue];
    });
  };

  const subscribeToDigest = async () => {
    const normalizedEmail = digestEmail.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setSubscribingDigest(true);

    const payload = {
      email: normalizedEmail,
      user_id: user?.id ?? null,
      frequency: digestFrequency,
      categories: digestCategories,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await (supabase.from("digest_subscriptions" as any) as any).upsert(payload, {
        onConflict: "email",
      });

      if (error) throw error;

      toast({
        title: "Digest subscription updated",
        description: `You will receive ${digestFrequency} alerts for ${digestCategories.map(getCategoryLabel).join(", ")}.`,
      });
    } catch (error) {
      const localSubs = getLocalDigestSubscriptions() as DigestSubscription[];
      const existingIndex = localSubs.findIndex((entry) => entry.email === normalizedEmail);

      if (existingIndex >= 0) {
        localSubs[existingIndex] = { ...localSubs[existingIndex], ...payload };
      } else {
        localSubs.push({ ...payload, created_at: new Date().toISOString() });
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("digest_subscriptions", JSON.stringify(localSubs));
      }

      toast({
        title: "Subscribed!",
        description: `You'll receive ${digestFrequency} alerts for ${digestCategories.map(getCategoryLabel).join(", ")}.`,
      });
    } finally {
      setSubscribingDigest(false);
    }
  };

  const handleGlobeCountrySelect = (countryCode: string, explicitRegion?: string) => {
    if (countryCode === "all") {
      setSelectedCountry("all");
      setCurrentPage(1);
      setHasMore(true);
      return;
    }

    const normalized = countryCode.toUpperCase();
    // Keep globe mode global; filter by country only so all hotspots remain visible.
    setSelectedRegion("all");
    setSelectedCountry(normalized);
    setCurrentPage(1);
    setHasMore(true);
  };

  if (viewMode === "globe") {
    return (
      <div className="h-screen w-screen overflow-hidden bg-black">
        <button
          onClick={() => setViewMode("cards")}
          className="fixed left-4 top-4 z-40 flex items-center gap-2 rounded-full border border-white/40 bg-black/75 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-white/20"
          aria-label="Exit globe view"
        >
          ← Exit Globe
        </button>
        <InteractiveGlobeView
          selectedRegion={selectedRegion}
          selectedCountry={selectedCountry}
          articles={allTabArticles}
          loading={loading || scraping}
          onSelectCountry={handleGlobeCountrySelect}
          fullscreen
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ background: 'radial-gradient(ellipse 80% 50% at 20% 10%, hsl(240 60% 96%), transparent), radial-gradient(ellipse 60% 40% at 80% 90%, hsl(270 50% 96%), transparent), hsl(var(--background))' }}>
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[hsl(235_85%_45%)] via-[hsl(245_75%_55%)] to-[hsl(270_70%_50%)] text-primary-foreground py-6 px-6">
        {/* Floating orbs */}
        <div className="absolute -top-16 -left-16 w-80 h-80 bg-blue-400/25 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -right-10 w-96 h-96 bg-purple-500/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.2s' }}></div>
        <div className="absolute top-8 right-1/4 w-56 h-56 bg-indigo-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.6s' }}></div>
        <div className="absolute bottom-4 left-1/3 w-48 h-48 bg-violet-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1.8s' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent"></div>
        <div className="container mx-auto relative z-10">
          {/* Auth Header */}
          <div className="flex justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-2">
              <Globe className="w-6 h-6 text-blue-400" />
              <span className="text-sm font-medium">Free Global News Service</span>
            </div>
            <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-2">
              <Button asChild variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                <Link to="/">Home</Link>
              </Button>
              <Button asChild variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                <Link to="/about">About</Link>
              </Button>
              <Button asChild variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                <Link to="/contact">Contact</Link>
              </Button>
              <Button asChild variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                <Link to="/privacy">Privacy</Link>
              </Button>
              <Button asChild variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                <Link to="/terms">Terms</Link>
              </Button>
            </nav>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5">
                <span className="text-xs font-medium text-white/90">Interactive View</span>
                <Switch
                  checked={false}
                  onCheckedChange={(checked) => setViewMode(checked ? "globe" : "cards")}
                  aria-label="Toggle interactive globe view"
                />
              </div>
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
            <div className="flex justify-center animate-fade-in-up -mt-1">
              <img
                src="/snewweb-logo.png"
                alt="snewweb.org"
                className="h-20 md:h-24 w-auto object-contain drop-shadow-lg"
                decoding="async"
              />
            </div>
            <div className="mt-4 text-sm text-blue-100/90">
              <span className="font-medium">Home</span> / {categories.find(c => c.value === selectedCategory)?.label || "General"}
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
                    className="flex items-center gap-2 h-11"
                    disabled={scraping}
                    aria-pressed={selectedCategory === category.value}
                  >
                    <Icon className="w-4 h-4" />
                    {category.label}
                  </Button>
                );
              })}
            </div>

            {/* Region Selector and Fetch Button */}
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex items-center gap-2 rounded-md border bg-background/80 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">Interactive View</span>
                <Switch
                  checked={false}
                  onCheckedChange={(checked) => setViewMode(checked ? "globe" : "cards")}
                  aria-label="Toggle interactive globe mode"
                />
              </div>
              <div className="flex items-center gap-1 rounded-md border bg-background/80 p-1">
                <Type className="w-4 h-4 text-muted-foreground mx-1" />
                {FONT_SCALE_STEPS.map((scale) => (
                  <Button
                    key={scale}
                    type="button"
                    variant={fontScale === scale ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setFontScale(scale)}
                    aria-label={`Set font size to ${scale}%`}
                  >
                    {scale === 90 ? "A-" : scale === 100 ? "A" : "A+"}
                  </Button>
                ))}
              </div>
              <div className="relative w-full sm:w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search headlines, sources, countries..."
                  className="pl-9 pr-9 h-11"
                  aria-label="Search articles"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="w-[180px] h-11 border-border/50 hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {REGION_OPTIONS.map((region) => (
                    <SelectItem key={region.value} value={region.value}>
                      {region.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Country selector — visible only when a specific region is selected */}
              {selectedRegion !== "all" && COUNTRIES_BY_REGION[selectedRegion] && (
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-[200px] h-11 border-border/50 hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {COUNTRIES_BY_REGION[selectedRegion].map((c) => (
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
              {displayedArticles.length} shown
              {searchQuery ? ` for "${searchQuery}"` : ` of ${totalArticles}`} {totalArticles === 1 ? "article" : "articles"}
            </p>
          </div>
        </div>

        <>
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
                {renderArticles(allTabArticles)}
              </TabsContent>

              <TabsContent value="favorites" className="mt-6">
                {renderArticles(favoriteTabArticles)}
              </TabsContent>

              <TabsContent value="analysis" className="mt-6">
                {!user ? (
                  <div className="text-center py-24 bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl border-2 border-dashed border-border/50">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">Sign in to create and view analyses.</p>
                    <Button onClick={onLogin} variant="default">
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </Button>
                  </div>
                ) : (
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
            )}
              </TabsContent>
            </Tabs>
        </>

        <section className="mt-10 rounded-xl border bg-card/70 p-5">
          <div className="flex items-center gap-2 mb-2">
            <MailCheck className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Email alerts & digest subscription</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Get daily or weekly summaries for your selected categories.
          </p>
          <div className="flex flex-col md:flex-row gap-3 mb-3">
            <Input
              value={digestEmail}
              onChange={(e) => setDigestEmail(e.target.value)}
              placeholder="your@email.com"
              type="email"
              className="h-11 md:max-w-sm"
              aria-label="Digest email address"
            />
            <Select value={digestFrequency} onValueChange={(value: "daily" | "weekly") => setDigestFrequency(value)}>
              <SelectTrigger className="h-11 md:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily digest</SelectItem>
                <SelectItem value="weekly">Weekly digest</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" onClick={subscribeToDigest} disabled={subscribingDigest} className="h-11 md:w-auto">
              {subscribingDigest ? "Saving..." : "Subscribe"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={`digest-${category.value}`}
                type="button"
                variant={digestCategories.includes(category.value) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleDigestCategory(category.value)}
                aria-pressed={digestCategories.includes(category.value)}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </section>
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

      <footer className="border-t border-border/60 bg-card/60 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} snewweb.org - Global news insights.</p>
          <nav aria-label="Footer links" className="flex flex-wrap items-center gap-3 text-sm">
            <Link to="/about" className="text-muted-foreground hover:text-foreground">About</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
          </nav>
        </div>
      </footer>
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
              {activeTab === "favorites" ? "No favorites yet" : "That's all we have for now"}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {activeTab === "favorites"
                ? "Start adding articles to your favorites by clicking the heart icon"
                : "Check back soon to get new headlines, or try a different category or region!"
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
                      imageUrl={article.image_url}
                      articleId={article.id}
                      userId={user?.id}
                      isFavorited={favorites.has(article.id)}
                      noteText={noteData?.text}
                      noteIsPublic={noteData?.isPublic}
                      publicNotes={articlePublicNotes}
                      onToggleFavorite={toggleFavorite}
                      onOpenNotes={openNotesModal}
                      onRequestLogin={onLogin}
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
