import { ArticleCard } from "@/components/ArticleCard";

export interface RegionSnapshotArticle {
  region: string;
  article: any;
}

interface RegionSnapshotProps {
  snapshots: RegionSnapshotArticle[];
  loading: boolean;
  userId?: string;
  favorites: Set<string>;
  notes: Map<string, { text: string; isPublic: boolean }>;
  publicNotes: Map<string, Array<{ text: string; userId: string }>>;
  commentaries: Map<string, { videoUrl: string; title?: string; isPublic: boolean }>;
  publicCommentaries: Map<string, Array<{ videoUrl: string; title?: string; userId: string; authorName: string }>>;
  onToggleFavorite: (id: string) => void;
  onOpenNotes: (id: string, title: string, noteText?: string, noteIsPublic?: boolean) => void;
  onOpenCommentary: (id: string, title: string, videoUrl?: string, commentaryTitle?: string, isPublic?: boolean) => void;
  onRequestLogin: () => void;
}

export function RegionSnapshot({
  snapshots, loading, userId, favorites, notes, publicNotes, commentaries, publicCommentaries,
  onToggleFavorite, onOpenNotes, onOpenCommentary, onRequestLogin,
}: RegionSnapshotProps) {
  if (!loading && snapshots.length === 0) return null;

  return (
    <section style={{ marginBottom: 36 }}>
      <div
        style={{
          fontFamily: "'Public Sans', sans-serif",
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: ".14em",
          color: "hsl(var(--primary))",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        Six World Regions
      </div>
      <h2
        style={{
          fontFamily: "Newsreader, serif",
          fontWeight: 600,
          fontSize: 22,
          letterSpacing: "-.01em",
          margin: "0 0 4px",
          color: "hsl(var(--foreground))",
        }}
      >
        Reports across six continents
      </h2>
      <p
        style={{
          fontSize: 13.5,
          color: "hsl(var(--muted-foreground))",
          margin: "0 0 16px",
        }}
      >
        The latest verified story from each region we track.
      </p>

      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
            gap: 22,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{ border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", overflow: "hidden" }}
            >
              <div className="loading-shimmer" style={{ aspectRatio: "16 / 9" }} />
              <div style={{ padding: 14 }}>
                <div className="loading-shimmer" style={{ height: 13, borderRadius: 3, marginBottom: 8, width: "88%" }} />
                <div className="loading-shimmer" style={{ height: 13, borderRadius: 3, width: "55%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
            gap: 22,
          }}
        >
          {snapshots.map(({ region, article }) => {
            const noteData = notes.get(article.id);
            const commentaryData = commentaries.get(article.id);
            return (
              <ArticleCard
                key={article.id}
                title={article.title}
                snippet={article.snippet}
                url={article.url}
                sourceName={article.source_name}
                sourceCountry={article.source_country}
                sourceRegion={article.source_region || region}
                publishedAt={article.published_at}
                imageUrl={article.image_url}
                articleId={article.id}
                userId={userId}
                isFavorited={favorites.has(article.id)}
                noteText={noteData?.text}
                noteIsPublic={noteData?.isPublic}
                publicNotes={publicNotes.get(article.id) || []}
                commentaryVideoUrl={commentaryData?.videoUrl}
                commentaryTitle={commentaryData?.title}
                commentaryIsPublic={commentaryData?.isPublic}
                publicCommentaries={publicCommentaries.get(article.id) || []}
                onToggleFavorite={onToggleFavorite}
                onOpenNotes={onOpenNotes}
                onOpenCommentary={onOpenCommentary}
                onRequestLogin={onRequestLogin}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
