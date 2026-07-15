import { Link } from "react-router-dom";
import { FEED_CATEGORIES } from "./CategoryTabs";

interface DigestSectionProps {
  digestEmail: string;
  onEmailChange: (email: string) => void;
  digestFrequency: "daily" | "weekly";
  onFrequencyChange: (freq: "daily" | "weekly") => void;
  digestCategories: string[];
  onToggleCategory: (cat: string) => void;
  onSubscribe: () => void;
  subscribing: boolean;
  subscribed: boolean;
}

const FREQ_OPTS: { value: "daily" | "weekly"; label: string; sub: string }[] = [
  { value: "daily",  label: "Daily",  sub: "7am brief"       },
  { value: "weekly", label: "Weekly", sub: "Sunday long read" },
];

export function DigestSection({
  digestEmail, onEmailChange,
  digestFrequency, onFrequencyChange,
  digestCategories, onToggleCategory,
  onSubscribe, subscribing, subscribed,
}: DigestSectionProps) {
  return (
    <section
      style={{
        background: "hsl(var(--foreground))",
        color: "hsl(var(--background))",
      }}
    >
      <div
        style={{
          maxWidth: 1280, margin: "0 auto",
          padding: "60px 28px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 60,
          alignItems: "center",
        }}
      >
        {/* Left — headline */}
        <div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              letterSpacing: ".18em",
              color: "hsl(var(--accent-ink))",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            The Morning Wire
          </div>
          <h2
            style={{
              fontFamily: "'Newsreader', serif",
              fontWeight: 500,
              fontSize: 38,
              lineHeight: 1.08,
              letterSpacing: "-.02em",
              margin: "0 0 16px",
              color: "hsl(var(--background))",
            }}
          >
            The world, edited down to what matters — in your inbox.
          </h2>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: "hsl(var(--ink-3))",
              margin: 0,
              maxWidth: "46ch",
            }}
          >
            A human-curated brief drawing from 30+ countries. No autoplay, no clickbait. Choose your cadence and the beats you care about.
          </p>
        </div>

        {/* Right — form card */}
        <div
          style={{
            background: "hsl(var(--card))",
            color: "hsl(var(--foreground))",
            borderRadius: 6,
            padding: 28,
            boxShadow: "0 4px 24px hsl(var(--shadow))",
          }}
        >
          {subscribed ? (
            <SubscribedState digestFrequency={digestFrequency} onReset={() => onFrequencyChange(digestFrequency)} />
          ) : (
            <SubscribeForm
              digestEmail={digestEmail}
              onEmailChange={onEmailChange}
              digestFrequency={digestFrequency}
              onFrequencyChange={onFrequencyChange}
              digestCategories={digestCategories}
              onToggleCategory={onToggleCategory}
              onSubscribe={onSubscribe}
              subscribing={subscribing}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function SubscribedState({
  digestFrequency,
  onReset,
}: {
  digestFrequency: string;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", gap: 14, padding: "18px 0",
      }}
    >
      <div
        style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "hsl(var(--accent-wash))",
          display: "grid", placeItems: "center",
          color: "hsl(var(--accent-ink))",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <div
        style={{
          fontFamily: "'Newsreader', serif",
          fontSize: 24,
          color: "hsl(var(--foreground))",
        }}
      >
        You're subscribed.
      </div>
      <div
        style={{
          fontSize: 14,
          color: "hsl(var(--ink-2))",
          maxWidth: "34ch",
        }}
      >
        Your first {digestFrequency} Morning Wire lands tomorrow at 7 am local. We sent a confirmation to your inbox.
      </div>
      <button
        onClick={onReset}
        style={{
          marginTop: 4, background: "transparent", border: 0,
          color: "hsl(var(--accent-ink))",
          fontFamily: "inherit", fontSize: 13, fontWeight: 600,
          cursor: "pointer", textDecoration: "underline",
        }}
      >
        Edit preferences
      </button>
    </div>
  );
}

function SubscribeForm({
  digestEmail, onEmailChange,
  digestFrequency, onFrequencyChange,
  digestCategories, onToggleCategory,
  onSubscribe, subscribing,
}: Omit<DigestSectionProps, "subscribed">) {
  const topicCount = digestCategories.length;

  return (
    <div>
      {/* Frequency toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {FREQ_OPTS.map(({ value, label, sub }) => {
          const active = digestFrequency === value;
          return (
            <button
              key={value}
              onClick={() => onFrequencyChange(value)}
              style={{
                flex: 1, padding: "10px 12px", textAlign: "left",
                border: `1px solid ${active ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                background: active ? "hsl(var(--accent-wash))" : "transparent",
                borderRadius: "var(--radius)",
                cursor: "pointer", fontFamily: "inherit",
                fontSize: 13.5, fontWeight: active ? 600 : 500,
                color: "hsl(var(--foreground))",
              }}
            >
              {label}
              <span
                style={{
                  display: "block", fontSize: 11, fontWeight: 400,
                  color: "hsl(var(--muted-foreground))", marginTop: 2,
                }}
              >
                {sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* Topics label */}
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, letterSpacing: ".12em",
          color: "hsl(var(--muted-foreground))",
          textTransform: "uppercase", marginBottom: 10,
        }}
      >
        Topics
      </div>

      {/* Topic chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
        {FEED_CATEGORIES.map(({ value, label }) => {
          const active = digestCategories.includes(value);
          return (
            <button
              key={value}
              onClick={() => onToggleCategory(value)}
              style={{
                height: 28, padding: "0 10px",
                border: `1px solid ${active ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                background: active ? "hsl(var(--primary))" : "transparent",
                color: active ? "#fff" : "hsl(var(--foreground))",
                borderRadius: "var(--radius)",
                cursor: "pointer", fontFamily: "inherit",
                fontSize: 12, fontWeight: active ? 600 : 400,
              }}
              aria-pressed={active}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Email + subscribe */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="email"
          placeholder="you@example.com"
          value={digestEmail}
          onChange={(e) => onEmailChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !subscribing && onSubscribe()}
          style={{
            flex: 1, height: 44, padding: "0 14px",
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--field))",
            color: "hsl(var(--foreground))",
            borderRadius: "var(--radius)",
            fontFamily: "inherit", fontSize: 14, outline: "none",
          }}
          aria-label="Digest email address"
        />
        <button
          onClick={onSubscribe}
          disabled={subscribing}
          style={{
            height: 44, padding: "0 22px",
            border: 0,
            background: "hsl(var(--primary))",
            color: "#fff",
            borderRadius: "var(--radius)",
            fontFamily: "inherit", fontSize: 14, fontWeight: 600,
            cursor: subscribing ? "not-allowed" : "pointer",
            opacity: subscribing ? 0.7 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {subscribing ? "Saving…" : "Subscribe"}
        </button>
      </div>

      {/* Footer line */}
      <div
        style={{
          fontSize: 11.5, color: "hsl(var(--muted-foreground))",
          marginTop: 11, display: "flex", justifyContent: "space-between",
        }}
      >
        <span>{topicCount} topic{topicCount !== 1 ? "s" : ""} · {digestFrequency} cadence</span>
        <Link
          to="/unsubscribe"
          style={{ color: "hsl(var(--muted-foreground))", textDecoration: "underline" }}
        >
          Unsubscribe
        </Link>
      </div>
    </div>
  );
}
