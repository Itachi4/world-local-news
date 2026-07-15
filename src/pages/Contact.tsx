import { Link } from "react-router-dom";
import { SiteFooter } from "@/components/feed/SiteFooter";

const BODY: string[] = [
  "We welcome feedback, source suggestions, editorial tips, and partnership inquiries. Snew is built by a small team — we read every message.",
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

const Contact = () => (
  <div style={{ minHeight: "100vh", background: "hsl(var(--background))" }}>
    <PageHeader />
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "54px 28px 90px" }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10, letterSpacing: ".16em",
        color: "hsl(var(--accent-ink))",
        textTransform: "uppercase", marginBottom: 16,
      }}>
        Contact
      </div>
      <h1 style={{
        fontFamily: "'Newsreader', serif",
        fontWeight: 600, fontSize: 42,
        lineHeight: 1.08, letterSpacing: "-.02em",
        margin: "0 0 24px", color: "hsl(var(--foreground))",
      }}>
        Get in touch.
      </h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 30 }}>
        {BODY.map((p, i) => (
          <p key={i} style={{ fontSize: 16.5, lineHeight: 1.7, color: "hsl(var(--ink-2))", margin: 0 }}>{p}</p>
        ))}
      </div>

      {/* Contact cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{
          padding: 18,
          border: "1px solid hsl(var(--border))",
          borderRadius: 6,
        }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10, letterSpacing: ".1em",
            color: "hsl(var(--muted-foreground))",
            textTransform: "uppercase", marginBottom: 8,
          }}>
            Newsroom
          </div>
          <div style={{ fontSize: 15, color: "hsl(var(--foreground))" }}>
            news@snewweb.org
          </div>
        </div>
        <div style={{
          padding: 18,
          border: "1px solid hsl(var(--border))",
          borderRadius: 6,
        }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10, letterSpacing: ".1em",
            color: "hsl(var(--muted-foreground))",
            textTransform: "uppercase", marginBottom: 8,
          }}>
            Support
          </div>
          <div style={{ fontSize: 15, color: "hsl(var(--foreground))" }}>
            support@snewweb.org
          </div>
        </div>
      </div>
    </main>
    <SiteFooter />
  </div>
);

export default Contact;
