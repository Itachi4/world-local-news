import { ArticleCard } from "@/components/ArticleCard";
import { LiveWireTicker } from "./LiveWireTicker";

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
  if (articles.length < 3) return null;

  const [lead, ...rest] = articles;
  const secondary = rest.slice(0, 2);

  const cardProps = (article: any) => {
    const noteData = notes.get(article.id);
    return {
      title: article.title,
      snippet: article.snippet,
      url: article.url,
      sourceName: article.source_name,
      sourceCountry: article.source_country,
      sourceRegion: article.source_region,
      publishedAt: article.published_at,
      imageUrl: article.image_url,
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
      {/* ArticleCard handles its own AI image generation */}
      <ArticleCard {...cardProps(lead)} isLead />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {secondary.map((article) => (
          <ArticleCard key={article.id} {...cardProps(article)} />
        ))}
        <LiveWireTicker articles={articles.slice(0, 3)} />
      </div>
    </div>
  );
}
