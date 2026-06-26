import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const FIELD_STYLE: React.CSSProperties = {
  width: "100%", height: 46, padding: "0 14px",
  border: "1px solid hsl(var(--line-2))",
  background: "hsl(var(--field))",
  borderRadius: 4, outline: "none",
  color: "hsl(var(--foreground))",
  fontFamily: "inherit", fontSize: 14.5,
  boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block", fontSize: 12.5, fontWeight: 600,
  color: "hsl(var(--ink-2))", marginBottom: 7,
};

const AuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: displayName.trim() || undefined } },
        });
        if (error) throw error;
        toast({ title: "Account created", description: "Check your inbox to confirm your email." });
        navigate("/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!" });
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const title = isRegister ? "Create an account." : "Welcome back.";
  const sub = isRegister
    ? "Free forever. Save stories, write notes, and follow the wire."
    : "Sign in to your saved stories, notes, and digest.";
  const cta = isRegister ? "Create account" : "Sign in";
  const switchText = isRegister ? "Already have an account?" : "Don't have an account?";
  const switchCta = isRegister ? "Sign in" : "Create one";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      {/* Left — dark editorial panel */}
      <div
        style={{
          background: "hsl(var(--foreground))",
          color: "hsl(var(--background))",
          padding: "56px 60px",
          display: "flex", flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
          <span style={{ width: 11, height: 11, background: "hsl(var(--primary))", display: "inline-block" }} />
          <span style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 24, color: "hsl(var(--background))" }}>
            Snew<span style={{ color: "hsl(var(--primary))" }}>.</span>
          </span>
        </div>

        {/* Tagline */}
        <div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, letterSpacing: ".18em",
              color: "hsl(var(--accent-ink))",
              textTransform: "uppercase", marginBottom: 18,
            }}
          >
            Since 2026
          </div>
          <h2
            style={{
              fontFamily: "'Newsreader', serif",
              fontWeight: 500, fontSize: 38,
              lineHeight: 1.12, letterSpacing: "-.02em",
              margin: "0 0 18px",
              color: "hsl(var(--background))",
            }}
          >
            Read the world without the noise.
          </h2>
          <p
            style={{
              fontSize: 15, lineHeight: 1.6,
              color: "hsl(var(--ink-3))", margin: 0, maxWidth: "42ch",
            }}
          >
            Save stories, write analysis, and follow the wire from 30+ countries. Free, forever.
          </p>
        </div>

        {/* Stats line */}
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: "rgba(255,255,255,.4)",
          }}
        >
          30+ countries · 6 regions · Google News RSS
        </div>
      </div>

      {/* Right — form panel */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 40,
          background: "hsl(var(--background))",
        }}
      >
        <div style={{ width: "100%", maxWidth: 360 }}>
          <h1
            style={{
              fontFamily: "'Newsreader', serif",
              fontWeight: 600, fontSize: 30,
              letterSpacing: "-.015em",
              margin: "0 0 6px",
              color: "hsl(var(--foreground))",
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", margin: "0 0 28px" }}>
            {sub}
          </p>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div style={{ marginBottom: 16 }}>
                <label style={LABEL_STYLE}>Display name</label>
                <input
                  placeholder="Jordan Avery"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={FIELD_STYLE}
                  autoComplete="name"
                />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={LABEL_STYLE}>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={FIELD_STYLE}
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={LABEL_STYLE}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={FIELD_STYLE}
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "hsl(var(--destructive))", marginBottom: 14 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", height: 48, border: 0,
                background: "hsl(var(--primary))",
                color: "#fff",
                borderRadius: 4,
                fontFamily: "inherit", fontSize: 15, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Please wait…" : cta}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 18, fontSize: 13.5, color: "hsl(var(--muted-foreground))" }}>
            {switchText}{" "}
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              style={{
                background: "none", border: 0, padding: 0,
                color: "hsl(var(--accent-ink))",
                fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", fontSize: "inherit",
              }}
            >
              {switchCta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
