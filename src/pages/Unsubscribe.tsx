import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "success" | "already" | "invalid" | "error";

const MESSAGES: Record<Status, { heading: string; body: string }> = {
  loading: { heading: "Unsubscribing…",          body: "Please wait." },
  success: { heading: "You've been unsubscribed", body: "You won't receive any more Morning Wire emails. You can resubscribe any time from the front page." },
  already: { heading: "Already unsubscribed",     body: "This address isn't currently subscribed to the Morning Wire." },
  invalid: { heading: "Invalid link",             body: "This unsubscribe link is invalid or has expired." },
  error:   { heading: "Something went wrong",     body: "We couldn't process your request. Please try again or contact support@snewweb.org." },
};

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setStatus("invalid"); return; }

    (async () => {
      const { data, error } = await (supabase.from("digest_subscriptions") as any)
        .select("id, is_active")
        .eq("unsubscribe_token", token)
        .maybeSingle();

      if (error || !data) { setStatus("invalid"); return; }
      if (!data.is_active) { setStatus("already"); return; }

      const { error: updateError } = await (supabase.from("digest_subscriptions") as any)
        .update({ is_active: false })
        .eq("unsubscribe_token", token);

      setStatus(updateError ? "error" : "success");
    })();
  }, [params]);

  const { heading, body } = MESSAGES[status];
  const isOk = status === "success" || status === "already";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "hsl(var(--background))",
        padding: 40,
      }}
    >
      {/* Logo */}
      <Link to="/" style={{ display: "flex", alignItems: "baseline", gap: 8, textDecoration: "none", marginBottom: 48 }}>
        <span style={{ width: 10, height: 10, background: "hsl(var(--primary))", display: "inline-block" }} />
        <span style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 22, color: "hsl(var(--foreground))" }}>
          Snew<span style={{ color: "hsl(var(--primary))" }}>.</span>
        </span>
      </Link>

      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
        {/* Status icon */}
        {status === "loading" ? (
          <div
            style={{
              width: 40, height: 40, margin: "0 auto 28px",
              border: "2px solid hsl(var(--border))",
              borderTopColor: "hsl(var(--primary))",
              borderRadius: "50%",
              animation: "sn-spin .8s linear infinite",
            }}
          />
        ) : (
          <div
            style={{
              width: 52, height: 52, borderRadius: "50%",
              margin: "0 auto 28px",
              background: isOk ? "hsl(var(--accent-wash))" : "hsl(14 62% 94%)",
              display: "grid", placeItems: "center",
              fontSize: 22,
              color: isOk ? "hsl(var(--accent-ink))" : "hsl(var(--primary))",
            }}
          >
            {isOk ? "✓" : "✕"}
          </div>
        )}

        <h1
          style={{
            fontFamily: "'Newsreader', serif",
            fontWeight: 600, fontSize: 28,
            letterSpacing: "-.015em",
            margin: "0 0 12px",
            color: "hsl(var(--foreground))",
          }}
        >
          {heading}
        </h1>

        <p
          style={{
            fontSize: 14.5, lineHeight: 1.6,
            color: "hsl(var(--ink-2))",
            margin: "0 0 28px",
          }}
        >
          {body}
        </p>

        <Link
          to="/"
          style={{
            display: "inline-flex", alignItems: "center",
            height: 46, padding: "0 24px",
            border: 0,
            background: "hsl(var(--foreground))",
            color: "hsl(var(--background))",
            borderRadius: 4,
            fontFamily: "inherit", fontSize: 14.5, fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Back to the front page
        </Link>
      </div>
    </div>
  );
}
