import { CheckCircle2, CaseSensitive, Newspaper, Headphones } from "lucide-react";
import { SnewMark } from "@/components/SnewMark";
import { REGION_OPTIONS } from "@/lib/countryMap";
import { regionColor } from "@/lib/regionColor";

interface HeroSectionProps {
  onRegionSelect: (region: string) => void;
}

const BADGES = [
  { icon: CheckCircle2, label: "Zero Sponsored Content" },
  { icon: CaseSensitive, label: "Large-Print Friendly" },
  { icon: CheckCircle2, label: "No Paywalls" },
];

// Rough, illustrative world-map placement — not geographically precise, just
// enough spatial logic (Americas left, Europe/Africa middle, Asia/Oceania right)
// to read as a map at a glance.
const REGION_PINS: Record<string, { top: string; left: string }> = {
  "North America": { top: "28%", left: "16%" },
  "South America": { top: "68%", left: "24%" },
  "Europe":        { top: "22%", left: "48%" },
  "Africa":        { top: "62%", left: "50%" },
  "Asia":          { top: "30%", left: "76%" },
  "Oceania":       { top: "74%", left: "82%" },
};

export function HeroSection({ onRegionSelect }: HeroSectionProps) {
  const regions = REGION_OPTIONS.filter((r) => r.value !== "all");

  const handlePin = (region: string) => {
    onRegionSelect(region);
    document.getElementById("feed")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section style={{ borderBottom: "1px solid hsl(var(--border))" }}>
      <div
        style={{
          maxWidth: 1280, margin: "0 auto", padding: "40px 28px 44px",
          display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 40, alignItems: "start",
        }}
        className="hero-grid"
      >
        {/* Left — headline, CTAs, trust badges */}
        <div>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 7,
              fontFamily: "'Public Sans', sans-serif",
              fontSize: 11.5, fontWeight: 700, letterSpacing: ".12em",
              color: "hsl(var(--terracotta))", textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            <SnewMark size={13} />
            Independent · No Ads · 70+ Countries
          </div>

          <h1
            style={{
              fontFamily: "Newsreader, serif",
              fontWeight: 600, fontSize: 42, lineHeight: 1.1,
              letterSpacing: "-.01em", margin: "0 0 16px",
              color: "hsl(var(--foreground))",
            }}
          >
            Clear, unhurried news from every direction.
          </h1>

          <p
            style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: 17, lineHeight: 1.55,
              color: "hsl(var(--muted-foreground))",
              margin: "0 0 24px", maxWidth: "52ch",
            }}
          >
            Headlines gathered from 70+ countries across six world regions, with no
            sensationalism and no ads. Printed in comfortable, high-contrast type
            designed for focused reading.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <a
              href="#feed"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                height: 46, padding: "0 20px",
                background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
                borderRadius: "var(--radius)", textDecoration: "none",
                fontFamily: "'Public Sans', sans-serif", fontSize: 14.5, fontWeight: 600,
              }}
            >
              <Newspaper size={16} />
              Read Today's Global Edition
            </a>

            {/* Audio summaries aren't a real feature yet — same inert "Soon" treatment
                used for the header's High Contrast toggle and the footer's placeholder items. */}
            <button
              type="button"
              disabled
              aria-disabled="true"
              aria-label="Listen to audio summary, coming soon"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                height: 46, padding: "0 20px",
                background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))",
                border: "1.5px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                fontFamily: "'Public Sans', sans-serif", fontSize: 14.5, fontWeight: 600,
                opacity: 0.6, cursor: "not-allowed",
              }}
            >
              <Headphones size={16} />
              Listen to Audio Summary
              <span
                style={{
                  fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
                  padding: "1px 6px", borderRadius: 99, border: "1px solid hsl(var(--border))",
                }}
              >
                Soon
              </span>
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
            {BADGES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontFamily: "'Public Sans', sans-serif", fontSize: 12.5,
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                <Icon size={14} style={{ color: "hsl(var(--tertiary))" }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Right — Atlas View: decorative region map + real, functional region pills */}
        <div
          style={{
            background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)", padding: 20,
          }}
        >
          <div
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              marginBottom: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Public Sans', sans-serif", fontSize: 10.5, fontWeight: 700,
                  letterSpacing: ".14em", textTransform: "uppercase",
                  color: "hsl(var(--muted-foreground))", marginBottom: 3,
                }}
              >
                Atlas View
              </div>
              <h2
                style={{
                  fontFamily: "Newsreader, serif", fontWeight: 600, fontSize: 18, margin: 0,
                  color: "hsl(var(--foreground))",
                }}
              >
                Six world regions
              </h2>
            </div>
          </div>

          {/* Decorative map — illustrative blob shapes, not geographic data.
              Each pin is a real button: click to filter the feed by that region. */}
          <div
            style={{
              position: "relative", height: 220, borderRadius: 6,
              background: "hsl(var(--secondary))", overflow: "hidden", marginBottom: 14,
            }}
          >
            {regions.map(({ value }) => {
              const pos = REGION_PINS[value];
              if (!pos) return null;
              const accent = regionColor(value);
              return (
                <div
                  key={`blob-${value}`}
                  aria-hidden="true"
                  style={{
                    position: "absolute", top: pos.top, left: pos.left,
                    width: 64, height: 46,
                    background: `color-mix(in srgb, ${accent} 20%, hsl(var(--muted)))`,
                    borderRadius: "40% 60% 55% 45% / 50% 40% 60% 50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              );
            })}
            {regions.map(({ value }) => {
              const pos = REGION_PINS[value];
              if (!pos) return null;
              const accent = regionColor(value);
              return (
                <button
                  key={`pin-${value}`}
                  type="button"
                  onClick={() => handlePin(value)}
                  aria-label={`Filter headlines by ${value}`}
                  style={{
                    position: "absolute", top: pos.top, left: pos.left,
                    transform: "translate(-50%, -50%)",
                    display: "flex", alignItems: "center", gap: 5,
                    background: "hsl(var(--card))", border: `1px solid ${accent}`,
                    borderRadius: 99, padding: "3px 8px 3px 6px",
                    fontFamily: "'Public Sans', sans-serif", fontSize: 10.5, fontWeight: 600,
                    color: "hsl(var(--foreground))", cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, flexShrink: 0 }} />
                  {value}
                </button>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {regions.map(({ value }) => (
              <button
                key={value}
                type="button"
                onClick={() => handlePin(value)}
                style={{
                  height: 34, padding: "0 8px",
                  border: "1px solid hsl(var(--border))", background: "hsl(var(--background))",
                  borderRadius: 4, fontFamily: "'Public Sans', sans-serif",
                  fontSize: 11.5, fontWeight: 500, color: "hsl(var(--foreground))",
                  cursor: "pointer",
                }}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .hero-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
