import { Link } from "react-router-dom";

const SECTIONS = [
  { label: "Home",         to: "/" },
  { label: "Globe View",   to: "/#globe" },
  { label: "Analysis",     to: "/#analysis" },
  { label: "Morning Wire", to: "/#digest" },
];

const REGIONS = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "Oceania",
  "South America",
];

const COMPANY = [
  { label: "About",          to: "/about" },
  { label: "Contact",        to: "/contact" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms",          to: "/terms" },
];

const LINK_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 13.5,
  color: "hsl(var(--primary-foreground) / 0.75)",
  marginBottom: 9,
  textDecoration: "none",
};

const INERT_STYLE: React.CSSProperties = {
  ...LINK_STYLE,
  color: "hsl(var(--primary-foreground) / 0.4)",
  cursor: "not-allowed",
  display: "flex", alignItems: "center", gap: 6,
};

const COL_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'Public Sans', sans-serif",
  fontSize: 10,
  letterSpacing: ".12em",
  color: "hsl(var(--primary-foreground) / 0.5)",
  textTransform: "uppercase" as const,
  marginBottom: 14,
};

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: "hsl(var(--primary))" }}>
      {/* 4-column grid */}
      <div
        style={{
          maxWidth: 1280, margin: "0 auto",
          padding: "48px 28px 40px",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
          gap: 40,
        }}
      >
        {/* Col 1 — brand */}
        <div>
          <div
            style={{
              display: "flex", alignItems: "baseline",
              gap: 8, marginBottom: 14,
            }}
          >
            <span
              style={{
                width: 10, height: 10,
                background: "hsl(var(--terracotta))",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontFamily: "Newsreader, serif",
                fontWeight: 600, fontSize: 22,
                color: "hsl(var(--primary-foreground))",
              }}
            >
              Snew<span style={{ color: "hsl(var(--terracotta))" }}>.</span>
            </span>
          </div>
          <p
            style={{
              fontSize: 13, lineHeight: 1.6,
              color: "hsl(var(--primary-foreground) / 0.6)",
              margin: 0, maxWidth: "34ch",
            }}
          >
            A free, independent news aggregator carrying live headlines from 70+ countries across six world regions.
          </p>
        </div>

        {/* Col 2 — sections */}
        <div>
          <div style={COL_LABEL_STYLE}>Sections</div>
          {SECTIONS.map(({ label, to }) => (
            <Link key={label} to={to} style={LINK_STYLE}>
              {label}
            </Link>
          ))}
        </div>

        {/* Col 3 — regions */}
        <div>
          <div style={COL_LABEL_STYLE}>Regions</div>
          {REGIONS.map((r) => (
            <span key={r} style={{ ...LINK_STYLE, cursor: "default" }}>
              {r}
            </span>
          ))}
        </div>

        {/* Col 4 — company (plus two clearly-inert, not-yet-built items) */}
        <div>
          <div style={COL_LABEL_STYLE}>Company</div>
          {COMPANY.map(({ label, to }) => (
            <Link key={label} to={to} style={LINK_STYLE}>
              {label}
            </Link>
          ))}
          <span aria-disabled="true" style={{ ...INERT_STYLE, marginTop: 5 }}>
            Large Type Mode
            <span style={{ fontSize: 9.5, letterSpacing: ".06em", textTransform: "uppercase" }}>Soon</span>
          </span>
          <span aria-disabled="true" style={INERT_STYLE}>
            Screen Reader Guide
            <span style={{ fontSize: 9.5, letterSpacing: ".06em", textTransform: "uppercase" }}>Soon</span>
          </span>
        </div>
      </div>

      {/* Bottom rule */}
      <div style={{ borderTop: "1px solid hsl(var(--primary-foreground) / 0.15)" }}>
        <div
          style={{
            maxWidth: 1280, margin: "0 auto",
            padding: "18px 28px",
            display: "flex", justifyContent: "space-between",
            fontFamily: "'Public Sans', sans-serif",
            fontSize: 11, color: "hsl(var(--primary-foreground) / 0.5)",
            flexWrap: "wrap", gap: 10,
          }}
        >
          <span>© {year} Snew Global Wire · snewweb.org</span>
          <span>Google News RSS · 70+ countries tracked</span>
        </div>
      </div>
    </footer>
  );
}
