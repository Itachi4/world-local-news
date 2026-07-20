import { ArticleCard } from "@/components/ArticleCard";

interface ArticleGridProps {
  articles: any[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  scraping: boolean;
  autoFetching: boolean;
  activeTab: "all" | "favorites" | "analysis";
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
  onLoadMore: () => void;
  onFetchHeadlines: () => void;
  searchQuery?: string;
}

export function ArticleGrid({
  articles, loading, loadingMore, hasMore, scraping, autoFetching, activeTab,
  userId, favorites, notes, publicNotes, commentaries, publicCommentaries,
  onToggleFavorite, onOpenNotes, onOpenCommentary, onRequestLogin,
  onLoadMore, onFetchHeadlines, searchQuery,
}: ArticleGridProps) {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <svg
          width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke="hsl(var(--primary))" strokeWidth="2"
          style={{ display: "inline-block", animation: "sn-spin .8s linear infinite", marginBottom: 14 }}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5"/>
        </svg>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 15 }}>Loading articles…</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div
        style={{
          textAlign: "center", padding: "80px 24px",
          border: "2px dashed hsl(var(--border))",
          borderRadius: "var(--radius)",
        }}
      >
        <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          {autoFetching ? "Fetching latest headlines…" : activeTab === "favorites" ? "No favorites yet" : "Nothing here yet"}
        </p>
        <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", marginBottom: 20 }}>
          {autoFetching
            ? "Hang tight, pulling the freshest stories for you."
            : activeTab === "favorites"
            ? "Click the heart on any article to save it here."
            : searchQuery
            ? `No results for "${searchQuery}"`
            : "Try a different category or region, or fetch fresh headlines."}
        </p>
        {activeTab === "all" && !autoFetching && (
          <button
            onClick={onFetchHeadlines}
            disabled={scraping}
            style={{
              height: 36, padding: "0 18px",
              background: "hsl(var(--primary))", color: "#fff",
              border: 0, borderRadius: "var(--radius)",
              fontFamily: "inherit", fontSize: 14, fontWeight: 600,
              cursor: scraping ? "not-allowed" : "pointer",
              opacity: scraping ? 0.7 : 1,
            }}
          >
            Fetch Headlines
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
          gap: 22,
        }}
      >
        {articles.map((article) => {
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
              sourceRegion={article.source_region}
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

      {/* Load more */}
      {hasMore && articles.length > 0 && activeTab === "all" && (
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            style={{
              height: 38, padding: "0 24px",
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              borderRadius: "var(--radius)",
              fontFamily: "inherit", fontSize: 14, fontWeight: 500,
              cursor: loadingMore ? "not-allowed" : "pointer",
              opacity: loadingMore ? 0.7 : 1,
              display: "inline-flex", alignItems: "center", gap: 8,
            }}
          >
            <svg
              width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              style={loadingMore ? { animation: "sn-spin .8s linear infinite" } : undefined}
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5"/>
            </svg>
            {loadingMore ? "Loading more…" : "Load more articles"}
          </button>
        </div>
      )}

      {/* Background scrape toast */}
      {scraping && (
        <div
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 50,
            background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)", padding: "10px 16px",
            boxShadow: "0 4px 24px hsl(var(--shadow))",
            display: "flex", alignItems: "center", gap: 10,
            fontSize: 13.5, fontWeight: 500,
          }}
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="hsl(var(--primary))" strokeWidth="2"
            style={{ animation: "sn-spin .8s linear infinite" }}
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5"/>
          </svg>
          Fetching fresh headlines…
        </div>
      )}
    </>
  );
}
