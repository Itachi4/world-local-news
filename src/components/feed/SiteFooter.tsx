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
  color: "hsl(var(--ink-2))",
  marginBottom: 9,
  textDecoration: "none",
};

const COL_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10,
  letterSpacing: ".12em",
  color: "hsl(var(--ink-3))",
  textTransform: "uppercase" as const,
  marginBottom: 14,
};

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "hsl(var(--background))",
        borderTop: "1px solid hsl(var(--border))",
      }}
    >
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
                background: "hsl(var(--primary))",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontFamily: "'Newsreader', serif",
                fontWeight: 600, fontSize: 22,
                color: "hsl(var(--foreground))",
              }}
            >
              Snew<span style={{ color: "hsl(var(--primary))" }}>.</span>
            </span>
          </div>
          <p
            style={{
              fontSize: 13, lineHeight: 1.6,
              color: "hsl(var(--ink-3))",
              margin: 0, maxWidth: "34ch",
            }}
          >
            A free, independent news aggregator carrying live headlines from 30+ countries across six world regions.
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

        {/* Col 4 — company */}
        <div>
          <div style={COL_LABEL_STYLE}>Company</div>
          {COMPANY.map(({ label, to }) => (
            <Link key={label} to={to} style={LINK_STYLE}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom rule */}
      <div style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <div
          style={{
            maxWidth: 1280, margin: "0 auto",
            padding: "18px 28px",
            display: "flex", justifyContent: "space-between",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: "hsl(var(--ink-3))",
            flexWrap: "wrap", gap: 10,
          }}
        >
          <span>© {year} Snew Global Wire · snewweb.org</span>
          <span>Google News RSS · 30+ countries tracked</span>
        </div>
      </div>
    </footer>
  );
}
