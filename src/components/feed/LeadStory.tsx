import { useEffect, useState, useRef } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import { LiveWireTicker } from "./LiveWireTicker";
import { supabase } from "@/integrations/supabase/client";
import { isBrandingImage } from "@/lib/brandImage";

// Table name from source_region string (mirrors the backend mapping).
function tableForRegion(region: string): string {
  const map: Record<string, string> = {
    Africa: 'articles_africa',
    Asia: 'articles_asia',
    Europe: 'articles_europe',
    'North America': 'articles_north_america',
    Oceania: 'articles_oceania',
    'South America': 'articles_south_america',
  };
  return map[region] || 'articles_africa';
}

interface LeadStoryProps {
  articles: any[];
  userId?: string;
  favorites: Set<string>;
  notes: Map<string, { text: string; isPublic: boolean }>;
  publicNotes: Map<string, Array<{ text: string; userId: string }>>;
  onToggleFavorite: (id: string) => void;
  onOpenNotes: (id: string, title: string, noteText?: string, noteIsPublic?: boolean) => void;
  onRequestLogin: () => void;
}

export function LeadStory({
  articles, userId, favorites, notes, publicNotes,
  onToggleFavorite, onOpenNotes, onRequestLogin,
}: LeadStoryProps) {
  const [leadImageUrl, setLeadImageUrl] = useState<string | null | undefined>(undefined);
  // Track the last articleId we started a generation for to avoid duplicate calls.
  const generatingFor = useRef<string | null>(null);

  if (articles.length < 3) return null;

  const [lead, ...rest] = articles;
  const secondary = rest.slice(0, 2);

  // Determine if the lead needs an AI image.
  const leadNeedsImage = !lead.image_url || isBrandingImage(lead.image_url);

  // Invoke generate-lead-image when the lead has no real photo.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!leadNeedsImage) {
      // Lead already has a real image — use it directly, clear any stale generated URL.
      setLeadImageUrl(lead.image_url ?? null);
      return;
    }
    if (generatingFor.current === lead.id) return; // already in flight for this article
    generatingFor.current = lead.id;
    setLeadImageUrl(null); // reset so brand mark shows while generating

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const table = tableForRegion(lead.source_region);
        // Race against a 15s timeout — Flux Schnell is typically <2s.
        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 15_000)
        );
        const invokePromise = supabase.functions.invoke('generate-lead-image', {
          body: {
            articleId: lead.id,
            table,
            title: lead.title,
            snippet: lead.snippet || '',
          },
        });
        const result = await Promise.race([invokePromise, timeoutPromise]) as any;
        if (cancelled) return;
        const url = result?.data?.url ?? null;
        setLeadImageUrl(url);
      } catch {
        if (!cancelled) setLeadImageUrl(null);
      }
    })();

    return () => { cancelled = true; };
  }, [lead.id, leadNeedsImage, lead.image_url]);

  const cardProps = (article: any, overrideImageUrl?: string | null) => {
    const noteData = notes.get(article.id);
    return {
      title: article.title,
      snippet: article.snippet,
      url: article.url,
      sourceName: article.source_name,
      sourceCountry: article.source_country,
      sourceRegion: article.source_region,
      publishedAt: article.published_at,
      imageUrl: overrideImageUrl !== undefined ? overrideImageUrl : article.image_url,
      articleId: article.id,
      userId,
      isFavorited: favorites.has(article.id),
      noteText: noteData?.text,
      noteIsPublic: noteData?.isPublic,
      publicNotes: publicNotes.get(article.id) || [],
      onToggleFavorite,
      onOpenNotes,
      onRequestLogin,
    };
  };

  // leadImageUrl === undefined means we haven't resolved yet (show brand mark via null).
  const resolvedLeadImage = leadNeedsImage
    ? (leadImageUrl ?? null)
    : (lead.image_url ?? null);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.55fr 1fr",
        gap: 22,
        marginBottom: 36,
        alignItems: "start",
      }}
    >
      {/* Big lead article — with AI-generated or real image */}
      <ArticleCard {...cardProps(lead, resolvedLeadImage)} isLead />

      {/* Right column: 2 secondary + live-wire box */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {secondary.map((article) => (
          <ArticleCard key={article.id} {...cardProps(article)} />
        ))}
        <LiveWireTicker articles={articles.slice(0, 3)} />
      </div>
    </div>
  );
}
