import { Link } from "react-router-dom";
import { SiteFooter } from "@/components/feed/SiteFooter";

const BODY: string[] = [
  "Snew aggregates publicly available headlines and links to original sources. Copyright in linked articles belongs to their publishers. Public notes and analyses you post are yours, but you grant Snew a licence to display them.",
  "Be decent. Don't use Snew to harass, mislead, or scrape at scale. We may remove content or accounts that break these rules.",
  "The service is provided as-is and free of charge. We may change these terms with notice posted on this page.",
];

function PageHeader() {
  return (
    <div style={{
      borderBottom: "1px solid hsl(var(--border))",
      padding: "16px 28px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <Link to="/" style={{ display: "flex", alignItems: "baseline", gap: 8, textDecoration: "none" }}>
        <span style={{ width: 10, height: 10, background: "hsl(var(--primary))", display: "inline-block" }} />
        <span style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 22, color: "hsl(var(--foreground))" }}>
          Snew<span style={{ color: "hsl(var(--primary))" }}>.</span>
        </span>
      </Link>
      <Link to="/" style={{ fontSize: 13.5, color: "hsl(var(--muted-foreground))", textDecoration: "none" }}>
        ← Front page
      </Link>
    </div>
  );
}

const Terms = () => (
  <div style={{ minHeight: "100vh", background: "hsl(var(--background))" }}>
    <PageHeader />
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "54px 28px 90px" }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10, letterSpacing: ".16em",
        color: "hsl(var(--accent-ink))",
        textTransform: "uppercase", marginBottom: 16,
      }}>
        Terms
      </div>
      <h1 style={{
        fontFamily: "'Newsreader', serif",
        fontWeight: 600, fontSize: 42,
        lineHeight: 1.08, letterSpacing: "-.02em",
        margin: "0 0 24px", color: "hsl(var(--foreground))",
      }}>
        The fine print, in plain language.
      </h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {BODY.map((p, i) => (
          <p key={i} style={{ fontSize: 16.5, lineHeight: 1.7, color: "hsl(var(--ink-2))", margin: 0 }}>{p}</p>
        ))}
      </div>
    </main>
    <SiteFooter />
  </div>
);

export default Terms;
