import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArticleCard } from "@/components/ArticleCard";
import ArticleNotesModal from "@/components/ArticleNotesModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogIn, FileText, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnalysisEditor } from "@/components/AnalysisEditor";
import { UserSidebar } from "@/components/UserSidebar";
import { UserContentViewer } from "@/components/UserContentViewer";
import InteractiveGlobeView from "@/components/InteractiveGlobeView";
import { COUNTRIES_BY_REGION, REGION_OPTIONS } from "@/lib/countryMap";
import { SiteHeader } from "@/components/feed/SiteHeader";
import { isBrandingImage } from "@/lib/brandImage";
import { CategoryTabs } from "@/components/feed/CategoryTabs";
import { FilterBar } from "@/components/feed/FilterBar";
import { FeedTabs } from "@/components/feed/FeedTabs";
import { LeadStory } from "@/components/feed/LeadStory";
import { ArticleGrid } from "@/components/feed/ArticleGrid";
import { DigestSection } from "@/components/feed/DigestSection";
import { SiteFooter } from "@/components/feed/SiteFooter";

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
  { value: "general",                    label: "General"                      },
  { value: "tech-ai",                    label: "Tech & AI"                    },
  { value: "business-finance",           label: "Business & Finance"           },
  { value: "politics",                   label: "Politics"                     },
  { value: "arts-entertainment-fashion", label: "Arts, Entertainment & Fashion" },
  { value: "sports-games",               label: "Sports & Games"               },
  { value: "travel-leisure",             label: "Travel & Leisure"             },
  { value: "religion-spirituality",      label: "Religion & Spirituality"      },
];

const FONT_SCALE_STEPS = [90, 100, 112];

// ── Lead promotion ────────────────────────────────────────────────────────────
// Returns true when an article has a real content image (not a Google branding logo).
function hasRealImage(article: any): boolean {
  const url: string = article.image_url;
  if (!url) return false;
  return !isBrandingImage(url);
}

// Promotes up to 3 image-having articles to the first 3 positions (lead +
// secondaries) so the lead card always has a photo when one exists anywhere in
// the feed. Order of all other articles is preserved.
function promoteImageLead(articles: any[]): any[] {
  if (articles.length < 3) return articles;
  const result = [...articles];
  let filled = 0;
  for (let i = filled; i < result.length && filled < 3; i++) {
    if (hasRealImage(result[i])) {
      if (i !== filled) {
        const [item] = result.splice(i, 1);
        result.splice(filled, 0, item);
      }
      filled++;
    }
  }
  return result;
}

interface IndexProps {
  user: any;
}

const Index = ({ user }: IndexProps) => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<any[]>([]);
  const [articleBuffer, setArticleBuffer] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("general");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [scraping, setScraping] = useState(false);
  const [autoFetching, setAutoFetching] = useState(false);
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [fontScale, setFontScale] = useState(100);
  const [digestEmail, setDigestEmail] = useState("");
  const [digestFrequency, setDigestFrequency] = useState<"daily" | "weekly">("daily");
  const [digestCategories, setDigestCategories] = useState<string[]>(["general"]);
  const [subscribingDigest, setSubscribingDigest] = useState(false);
  const [digestSubscribed, setDigestSubscribed] = useState(false);
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
      setArticleBuffer([]);
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

        // Day-bucket-aware round-robin: group articles by calendar day (newest day first),
        // then round-robin across regions within each day. This guarantees today's stories
        // always precede yesterday's, while still preventing any single high-volume region
        // (e.g. Asia) from flooding the first pages.
        const queues = regionResults.map(r => [...r.articles]); // each already newest-first from DB
        const allPooled = queues.flat();

        // Collect unique calendar day strings, sorted newest-first.
        const daySet = new Set<string>();
        for (const a of allPooled) {
          const d = new Date(a.published_at);
          if (!isNaN(d.getTime())) daySet.add(d.toDateString());
        }
        const sortedDays = Array.from(daySet).sort(
          (a, b) => new Date(b).getTime() - new Date(a).getTime()
        );

        const combined: any[] = [];
        for (const day of sortedDays) {
          // Build per-region sub-queues for this day only (maintaining newest-first order).
          const dayQueues = queues.map(q =>
            q.filter(a => {
              const d = new Date(a.published_at);
              return !isNaN(d.getTime()) && d.toDateString() === day;
            })
          );
          // Round-robin within this day across all regions.
          const ptrs = dayQueues.map(() => 0);
          let anyLeft = true;
          while (anyLeft) {
            anyLeft = false;
            for (let i = 0; i < dayQueues.length; i++) {
              if (ptrs[i] < dayQueues[i].length) {
                combined.push(dayQueues[i][ptrs[i]++]);
                anyLeft = true;
              }
            }
          }
        }

        // Apply pagination to day-bucketed results.
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
        // Page 1: pre-fetch 3× to fill buffer; subsequent pages: fetch 1× to append
        const fetchCount = page === 1 ? 3 * ARTICLES_PER_PAGE : ARTICLES_PER_PAGE;
        const from = page === 1 ? 0 : articles.length;
        const to = from + fetchCount - 1;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        let query = (supabase.from(tableName as any) as any)
          .select("*", { count: 'exact' })
          .gte("published_at", sevenDaysAgo)
          .order("published_at", { ascending: false })
          .range(from, to);

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
        // Page 1: put excess rows into the buffer; display only the first page
        if (page === 1) {
          setArticleBuffer(newArticles.slice(ARTICLES_PER_PAGE));
          newArticles = newArticles.slice(0, ARTICLES_PER_PAGE);
        }
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
    if (loading || loadingMore || !hasMore) return;

    // Serve from pre-fetched buffer instantly (no spinner, no DB call)
    if (articleBuffer.length >= ARTICLES_PER_PAGE) {
      const next = articleBuffer.slice(0, ARTICLES_PER_PAGE);
      const remaining = articleBuffer.slice(ARTICLES_PER_PAGE);
      setArticles(prev => [...prev, ...next]);
      setArticleBuffer(remaining);
      setCurrentPage(p => p + 1);
      return;
    }

    // Buffer exhausted — fetch next batch from DB
    await fetchArticles(currentPage + 1, true);
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

  // Lead slot: promote image-having stories to the first 3 positions.
  const leadArticles = useMemo(() => promoteImageLead(allTabArticles), [allTabArticles]);

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
    let ignore = false;
    const autoFetch = async () => {
      // 1. Render any cached articles immediately so the page isn't blank
      await fetchArticles(1, false, selectedCountry);
      if (ignore) return;

      // 2. Fire the scrape and await it — this is what was missing before.
      //    We surface a "Fetching latest…" state via autoFetching so the user
      //    knows work is in progress instead of seeing "That's all we have."
      setAutoFetching(true);
      try {
        const categoryValue = selectedCategory === "general" ? null : selectedCategory;
        const requestBody = {
          category: categoryValue,
          region: selectedRegion === "all" ? null : selectedRegion,
          country: selectedCountry === "all" ? null : selectedCountry,
          limit: 100,
        };
        console.log(`Auto-fetching: Category="${selectedCategory}", Region="${selectedRegion}", Country="${selectedCountry}"`);
        await supabase.functions.invoke("scrape-news", { body: requestBody });
        if (ignore) return;

        // 3. Give the DB a moment to settle, then refetch to show new rows
        await new Promise(r => setTimeout(r, 1500));
        if (ignore) return;
        const displayed = await fetchArticles(1, false, selectedCountry);
        if (ignore) return;

        // 4. One retry if the scrape wrote rows but they haven't appeared yet
        if (displayed === 0) {
          await new Promise(r => setTimeout(r, 2000));
          if (ignore) return;
          await fetchArticles(1, false, selectedCountry);
        }
      } catch (err) {
        console.error('Auto-fetch error:', err);
      } finally {
        if (!ignore) setAutoFetching(false);
      }
    };

    autoFetch();
    // Cleanup: discard results from this effect if filters changed mid-flight
    return () => { ignore = true; };
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

  const handleFontDown = () => {
    const idx = FONT_SCALE_STEPS.indexOf(fontScale);
    if (idx > 0) setFontScale(FONT_SCALE_STEPS[idx - 1]);
  };
  const handleFontReset = () => setFontScale(100);
  const handleFontUp = () => {
    const idx = FONT_SCALE_STEPS.indexOf(fontScale);
    if (idx < FONT_SCALE_STEPS.length - 1) setFontScale(FONT_SCALE_STEPS[idx + 1]);
  };

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

      setDigestSubscribed(true);
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

      setDigestSubscribed(true);
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
      <InteractiveGlobeView
        selectedRegion={selectedRegion}
        selectedCountry={selectedCountry}
        articles={allTabArticles}
        loading={loading || scraping || autoFetching}
        onSelectCountry={handleGlobeCountrySelect}
        fullscreen
        onExit={() => setViewMode("cards")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader
        user={user}
        onLogin={() => navigate("/auth")}
        onProfile={() => navigate("/account")}
        onOpenGlobe={() => setViewMode("globe")}
        searchOpen={searchOpen}
        onToggleSearch={() => setSearchOpen(s => !s)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFontDown={handleFontDown}
        onFontReset={handleFontReset}
        onFontUp={handleFontUp}
      />
      <CategoryTabs
        selectedCategory={selectedCategory}
        onSelect={(val) => setSelectedCategory(val)}
        disabled={scraping}
      />
      <FilterBar
        selectedRegion={selectedRegion}
        onRegionChange={(val) => { setSelectedRegion(val); setSelectedCountry("all"); }}
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
        isScraping={scraping}
        onFetchHeadlines={handleScrape}
      />

      {/* Feed body */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 28px 56px" }}>
        <FeedTabs
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          favoritesCount={favorites.size}
          articleCount={displayedArticles.length}
          totalArticles={totalArticles}
          searchQuery={searchQuery}
        />

        {activeTab === "all" && (
          <>
            <LeadStory
              articles={leadArticles.slice(0, 3)}
              userId={user?.id}
              favorites={favorites}
              notes={notes}
              publicNotes={publicNotes}
              onToggleFavorite={toggleFavorite}
              onOpenNotes={openNotesModal}
              onRequestLogin={() => navigate("/auth")}
            />
            <ArticleGrid
              articles={leadArticles.length >= 3 ? leadArticles.slice(3) : leadArticles}
              loading={loading}
              loadingMore={loadingMore}
              hasMore={hasMore}
              scraping={scraping}
              autoFetching={autoFetching}
              activeTab="all"
              userId={user?.id}
              favorites={favorites}
              notes={notes}
              publicNotes={publicNotes}
              onToggleFavorite={toggleFavorite}
              onOpenNotes={openNotesModal}
              onRequestLogin={() => navigate("/auth")}
              onLoadMore={handleLoadMore}
              onFetchHeadlines={handleScrape}
              searchQuery={searchQuery}
            />
          </>
        )}

        {activeTab === "favorites" && (
          <ArticleGrid
            articles={favoriteTabArticles}
            loading={loading}
            loadingMore={false}
            hasMore={false}
            scraping={false}
            autoFetching={false}
            activeTab="favorites"
            userId={user?.id}
            favorites={favorites}
            notes={notes}
            publicNotes={publicNotes}
            onToggleFavorite={toggleFavorite}
            onOpenNotes={openNotesModal}
            onRequestLogin={() => navigate("/auth")}
            onLoadMore={handleLoadMore}
            onFetchHeadlines={handleScrape}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === "analysis" && (
          <div className="mt-6">
                {!user ? (
                  <div className="text-center py-24 bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl border-2 border-dashed border-border/50">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">Sign in to create and view analyses.</p>
                    <Button onClick={() => navigate("/auth")} variant="default">
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
          </div>
        )}

      </main>

      <DigestSection
        digestEmail={digestEmail}
        onEmailChange={setDigestEmail}
        digestFrequency={digestFrequency}
        onFrequencyChange={setDigestFrequency}
        digestCategories={digestCategories}
        onToggleCategory={toggleDigestCategory}
        onSubscribe={subscribeToDigest}
        subscribing={subscribingDigest}
        subscribed={digestSubscribed}
      />

      {/* Notes modal */}
      <ArticleNotesModal
        isOpen={notesModal.isOpen}
        onClose={closeNotesModal}
        onSave={saveNote}
        onDelete={deleteNote}
        initialNoteText={notesModal.noteText}
        initialIsPublic={notesModal.noteIsPublic}
        articleTitle={notesModal.title}
      />

      <SiteFooter />
    </div>
  );

};

export default Index;
