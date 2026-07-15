interface FeedTabsProps {
  activeTab: "all" | "favorites" | "analysis";
  onTabChange: (tab: "all" | "favorites" | "analysis") => void;
  favoritesCount: number;
  articleCount: number;
  totalArticles: number;
  searchQuery?: string;
}

const TABS = [
  { id: "all",       label: "All Articles" },
  { id: "favorites", label: "Favorites"    },
  { id: "analysis",  label: "Analysis"     },
] as const;

export function FeedTabs({
  activeTab, onTabChange,
  favoritesCount, articleCount, totalArticles, searchQuery,
}: FeedTabsProps) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid hsl(var(--border))",
        marginBottom: 28,
      }}
    >
      <div style={{ display: "flex" }}>
        {TABS.map(({ id, label }) => {
          const active = activeTab === id;
          const badge = id === "favorites" ? ` (${favoritesCount})` : "";
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              style={{
                padding: "14px 16px",
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${active ? "hsl(var(--primary))" : "transparent"}`,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {label}{badge}
            </button>
          );
        })}
      </div>

      <span
        style={{
          fontSize: 12,
          fontFamily: '"IBM Plex Mono", monospace',
          color: "hsl(var(--muted-foreground))",
          paddingRight: 4,
        }}
      >
        {articleCount} shown{searchQuery ? ` for "${searchQuery}"` : ` of ${totalArticles}`}
      </span>
    </div>
  );
}
