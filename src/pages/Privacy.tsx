import { Link } from "react-router-dom";
import { SiteFooter } from "@/components/feed/SiteFooter";

const BODY: string[] = [
  "We collect the minimum needed to run Snew: your email if you subscribe to the Morning Wire, and your saved articles and notes if you create an account. That's it.",
  "We do not sell personal data. We do not run third-party ad trackers on the feed. Private notes are encrypted at rest and never shown to other readers.",
  "You can export or delete your account and all associated data at any time from your account settings.",
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

const Privacy = () => (
  <div style={{ minHeight: "100vh", background: "hsl(var(--background))" }}>
    <PageHeader />
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "54px 28px 90px" }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10, letterSpacing: ".16em",
        color: "hsl(var(--accent-ink))",
        textTransform: "uppercase", marginBottom: 16,
      }}>
        Privacy
      </div>
      <h1 style={{
        fontFamily: "'Newsreader', serif",
        fontWeight: 600, fontSize: 42,
        lineHeight: 1.08, letterSpacing: "-.02em",
        margin: "0 0 24px", color: "hsl(var(--foreground))",
      }}>
        Your reading is yours.
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

export default Privacy;
