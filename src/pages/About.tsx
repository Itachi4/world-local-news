import { Link } from "react-router-dom";
import { SiteFooter } from "@/components/feed/SiteFooter";

const BODY: string[] = [
  "Snew is an independent news aggregator that carries live headlines from more than thirty countries across six world regions. We don't write the news — we organise it, source it transparently, and put the world's journalism on one fast, legible page.",
  "Every headline links back to its original publisher. We surface region, country, and dateline on every story so you always know where reporting comes from. No paywall, no autoplay, no infinite scroll engineered to keep you here.",
  "Our editors curate the Morning Wire, our daily and weekly email digest, and our community of analysts publishes long-form context alongside the raw feed.",
];

const About = () => (
  <div style={{ minHeight: "100vh", background: "hsl(var(--background))" }}>
    <PageHeader />
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "54px 28px 90px" }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10, letterSpacing: ".16em",
        color: "hsl(var(--accent-ink))",
        textTransform: "uppercase", marginBottom: 16,
      }}>
        About Snew
      </div>
      <h1 style={{
        fontFamily: "'Newsreader', serif",
        fontWeight: 600, fontSize: 42,
        lineHeight: 1.08, letterSpacing: "-.02em",
        margin: "0 0 24px", color: "hsl(var(--foreground))",
      }}>
        A free front page for the whole world.
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

function PageHeader() {
  return (
    <div style={{
      borderBottom: "1px solid hsl(var(--border))",
      padding: "16px 28px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      maxWidth: 1280, margin: "0 auto",
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

export default About;
