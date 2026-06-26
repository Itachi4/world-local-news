interface Article {
  title: string;
  source_name: string;
  published_at?: string;
}

interface LiveWireTickerProps {
  articles: Article[];
}

function relTime(iso?: string): string {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function LiveWireTicker({ articles }: LiveWireTickerProps) {
  if (articles.length < 3) return null;

  return (
    <div
      style={{
        background: "hsl(var(--foreground))",
        color: "hsl(var(--background))",
        padding: "16px 18px",
        borderRadius: "var(--radius)",
        flex: "0 0 auto",
      }}
    >
      {/* Live badge */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 7, marginBottom: 13,
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
          color: "hsl(var(--primary))",
        }}
      >
        <span
          style={{
            display: "inline-block", width: 7, height: 7,
            borderRadius: "50%", background: "hsl(var(--primary))",
            animation: "sn-blink 1s step-start infinite",
          }}
        />
        Live Wire
      </div>

      {/* Articles */}
      {articles.map((a, i) => (
        <div
          key={i}
          style={{
            borderTop: i > 0 ? "1px solid rgba(255,255,255,0.12)" : undefined,
            paddingTop: i > 0 ? 11 : 0,
            marginTop: i > 0 ? 11 : 0,
          }}
        >
          <p
            style={{
              margin: 0, fontSize: 13, fontWeight: 500, lineHeight: 1.45,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {a.title}
          </p>
          <p
            style={{
              margin: "4px 0 0", fontSize: 10.5,
              fontFamily: '"IBM Plex Mono", monospace',
              color: "rgba(255,255,255,0.45)",
            }}
          >
            {relTime(a.published_at)} · {a.source_name}
          </p>
        </div>
      ))}
    </div>
  );
}
