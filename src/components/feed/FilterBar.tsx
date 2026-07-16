/** Filter bar — region chips + country dropdown + Fetch headlines button. Not sticky. */

import { REGION_OPTIONS, COUNTRIES_BY_REGION } from "@/lib/countryMap";

interface FilterBarProps {
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  isScraping: boolean;
  onFetchHeadlines: () => void;
}

const monoLabel: React.CSSProperties = {
  fontFamily: '"IBM Plex Mono", monospace',
  fontSize: 10,
  letterSpacing: "0.14em",
  color: "hsl(var(--muted-foreground))",
  textTransform: "uppercase",
};

export function FilterBar({
  selectedRegion, onRegionChange,
  selectedCountry, onCountryChange,
  isScraping, onFetchHeadlines,
}: FilterBarProps) {
  const showCountry = selectedRegion !== "all" && !!COUNTRIES_BY_REGION[selectedRegion];

  return (
    <div
      style={{
        background: "hsl(var(--secondary))",
        borderBottom: "1px solid hsl(var(--border))",
      }}
    >
      <div
        style={{
          maxWidth: 1280, margin: "0 auto", padding: "13px 28px",
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        }}
      >
        {/* Region label */}
        <span style={monoLabel}>Region</span>

        {/* Region chips */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {REGION_OPTIONS.map(({ value, label }) => {
            const active = value === selectedRegion;
            return (
              <button
                key={value}
                onClick={() => { onRegionChange(value); onCountryChange("all"); }}
                style={{
                  height: 32, padding: "0 13px",
                  borderRadius: 16,
                  border: `1px solid ${active ? "hsl(var(--primary))" : "hsl(var(--line-2))"}`,
                  background: active ? "hsl(var(--primary))" : "hsl(var(--card))",
                  color: active ? "#fff" : "hsl(var(--ink-2))",
                  fontFamily: "inherit",
                  fontSize: 12.5,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Country selector */}
        {showCountry && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 9,
              paddingLeft: 6,
              borderLeft: "1px solid hsl(var(--line-2))",
            }}
          >
            <span style={monoLabel}>Country</span>
            <div style={{ position: "relative" }}>
              <select
                value={selectedCountry}
                onChange={(e) => onCountryChange(e.target.value)}
                style={{
                  appearance: "none",
                  height: 32, padding: "0 30px 0 12px",
                  minWidth: 160,
                  border: "1px solid hsl(var(--line-2))",
                  background: "hsl(var(--card))",
                  color: "hsl(var(--foreground))",
                  borderRadius: 3,
                  fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <option value="all">All Countries</option>
                {COUNTRIES_BY_REGION[selectedRegion]?.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="hsl(var(--muted-foreground))" strokeWidth="2"
                style={{ position: "absolute", right: 9, top: 9, pointerEvents: "none" }}
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </div>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Fetch headlines button */}
        <button
          onClick={onFetchHeadlines}
          disabled={isScraping}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            height: 34, padding: "0 16px",
            border: 0,
            background: "hsl(var(--primary))",
            color: "#fff",
            borderRadius: 3,
            fontFamily: "inherit", fontSize: 13, fontWeight: 600,
            cursor: isScraping ? "not-allowed" : "pointer",
            opacity: isScraping ? 0.7 : 1,
          }}
        >
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            style={isScraping ? { animation: "sn-spin .8s linear infinite" } : undefined}
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5"/>
          </svg>
          {isScraping ? "Fetching…" : "Fetch headlines"}
        </button>
      </div>
    </div>
  );
}
