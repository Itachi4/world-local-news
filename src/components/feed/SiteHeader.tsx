import { useState } from "react";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface SiteHeaderProps {
  user: any;
  /** Called when Sign-in is clicked; replaced by <Link to="/auth"> in Phase 6 */
  onLogin: () => void;
  /** Called when account is clicked; replaced by <Link to="/account"> in Phase 6 */
  onProfile: () => void;
  onOpenGlobe: () => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  /** Decrease font scale one step */
  onFontDown: () => void;
  /** Reset font scale to 100 % */
  onFontReset: () => void;
  /** Increase font scale one step */
  onFontUp: () => void;
}

const navLinkStyle: React.CSSProperties = {
  padding: "7px 11px",
  fontSize: 13.5,
  fontWeight: 500,
  color: "hsl(var(--muted-foreground))",
  textDecoration: "none",
  cursor: "pointer",
  borderRadius: 4,
};

const iconBtnStyle: React.CSSProperties = {
  width: 34, height: 34,
  display: "grid", placeItems: "center",
  border: "1px solid hsl(var(--line-2))",
  background: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
  borderRadius: 3,
  cursor: "pointer",
};

export function SiteHeader({
  user, onLogin, onProfile, onOpenGlobe,
  searchOpen, onToggleSearch, searchQuery, onSearchChange,
  onFontDown, onFontReset, onFontUp,
}: SiteHeaderProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      style={{
        position: "sticky", top: 0, zIndex: 40,
        background: "hsl(var(--background))",
        borderBottom: "1px solid hsl(var(--border))",
      }}
    >
      {/* Main header row */}
      <div
        style={{
          maxWidth: 1280, margin: "0 auto", padding: "0 28px",
          height: 62, display: "flex", alignItems: "center", gap: 26,
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            display: "flex", alignItems: "baseline", gap: 9,
            cursor: "pointer", flexShrink: 0, textDecoration: "none",
          }}
        >
          <span
            style={{
              width: 11, height: 11,
              background: "hsl(var(--primary))",
              display: "inline-block",
              transform: "translateY(-1px)",
            }}
          />
          <span
            style={{
              fontFamily: "Newsreader, serif",
              fontWeight: 600,
              fontSize: 25,
              letterSpacing: "-0.01em",
              lineHeight: 1,
              color: "hsl(var(--foreground))",
            }}
          >
            Snew<span style={{ color: "hsl(var(--primary))" }}>.</span>
          </span>
          <span
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9.5,
              letterSpacing: "0.22em",
              color: "hsl(var(--muted-foreground))",
              textTransform: "uppercase",
            }}
          >
            Global&nbsp;Wire
          </span>
        </Link>

        {/* Primary nav */}
        <nav style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {(["Home", "About", "Contact"] as const).map((label) => {
            const to = label === "Home" ? "/" : `/${label.toLowerCase()}`;
            return (
              <Link
                key={label}
                to={to}
                style={{
                  ...navLinkStyle,
                  background: hovered === label ? "hsl(var(--surface-2))" : "transparent",
                  color: hovered === label ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                }}
                onMouseEnter={() => setHovered(label)}
                onMouseLeave={() => setHovered(null)}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Globe button */}
          <button
            onClick={onOpenGlobe}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              height: 34, padding: "0 13px",
              border: "1px solid hsl(var(--line-2))",
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              borderRadius: 3,
              fontFamily: "inherit", fontSize: 13, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="9"/>
              <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>
            </svg>
            Globe
          </button>

          {/* A / A / A font-scale control */}
          <div
            style={{
              display: "flex", alignItems: "center",
              border: "1px solid hsl(var(--line-2))",
              borderRadius: 3, height: 34, overflow: "hidden",
            }}
          >
            {(["down", "reset", "up"] as const).map((dir, i) => (
              <>
                {i > 0 && (
                  <span key={`div-${dir}`} style={{ width: 1, height: 18, background: "hsl(var(--border))" }} />
                )}
                <button
                  key={dir}
                  onClick={dir === "down" ? onFontDown : dir === "reset" ? onFontReset : onFontUp}
                  style={{
                    width: 30, height: "100%", border: 0,
                    background: "hsl(var(--card))",
                    color: dir === "reset" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                    cursor: "pointer",
                    fontFamily: "Newsreader, serif",
                    fontSize: dir === "down" ? 12 : dir === "reset" ? 15 : 18,
                  }}
                  aria-label={`Font size ${dir}`}
                >
                  A
                </button>
              </>
            ))}
          </div>

          {/* Search toggle */}
          <button
            onClick={onToggleSearch}
            aria-label="Toggle search"
            style={{
              ...iconBtnStyle,
              borderColor: searchOpen ? "hsl(var(--primary))" : "hsl(var(--line-2))",
              color: searchOpen ? "hsl(var(--accent-ink))" : "hsl(var(--foreground))",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85">
              <circle cx="11" cy="11" r="7"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
          </button>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Sign in / account */}
          {user ? (
            <button
              onClick={onProfile}
              style={{
                height: 34, padding: "0 13px",
                border: "1px solid hsl(var(--line-2))",
                background: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                borderRadius: 3,
                fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                marginLeft: 4,
              }}
            >
              <User size={14} />
              {user.user_metadata?.full_name || user.email?.split("@")[0] || "Account"}
            </button>
          ) : (
            <button
              onClick={onLogin}
              style={{
                height: 34, padding: "0 15px",
                border: 0,
                background: "hsl(var(--foreground))",
                color: "hsl(var(--background))",
                borderRadius: 3,
                fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                cursor: "pointer",
                marginLeft: 4,
              }}
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      {/* Search bar (appears below the header bar when open) */}
      {searchOpen && (
        <div
          style={{
            borderTop: "1px solid hsl(var(--border))",
            background: "hsl(var(--secondary))",
          }}
        >
          <div
            style={{
              maxWidth: 1280, margin: "0 auto", padding: "14px 28px",
              display: "flex", alignItems: "center", gap: 12,
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.75">
              <circle cx="11" cy="11" r="7"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search headlines, sources, countries…"
              style={{
                flex: 1, border: 0, background: "transparent", outline: "none",
                color: "hsl(var(--foreground))",
                fontFamily: "inherit", fontSize: 18, fontWeight: 500,
              }}
            />
            <span
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11, color: "hsl(var(--muted-foreground))",
                cursor: "pointer",
              }}
              onClick={onToggleSearch}
            >
              ESC
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
