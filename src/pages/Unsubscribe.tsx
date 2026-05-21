import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "success" | "already" | "invalid" | "error";

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

  const messages: Record<Status, { heading: string; body: string }> = {
    loading: { heading: "Unsubscribing…",         body: "Please wait." },
    success: { heading: "You've been unsubscribed", body: "You won't receive any more digest emails from snewweb. You can resubscribe any time from the site." },
    already: { heading: "Already unsubscribed",    body: "This address is not currently subscribed to digest emails." },
    invalid: { heading: "Invalid link",            body: "This unsubscribe link is invalid or has expired." },
    error:   { heading: "Something went wrong",    body: "We couldn't process your request. Please try again or contact support." },
  };

  const { heading, body } = messages[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 text-center">
        <div className="text-3xl font-black text-blue-900 tracking-tight mb-1">snewweb</div>
        <div className="text-sm text-slate-400 mb-8">Global news, delivered to you</div>

        {status === "loading" ? (
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className={`w-14 h-14 rounded-full mx-auto mb-6 flex items-center justify-center text-2xl
            ${status === "success" ? "bg-green-100 text-green-600" :
              status === "already" ? "bg-blue-100 text-blue-600" :
              "bg-red-100 text-red-500"}`}>
            {status === "success" ? "✓" : status === "already" ? "✓" : "✕"}
          </div>
        )}

        <h1 className="text-xl font-bold text-slate-800 mb-3">{heading}</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">{body}</p>

        <Link
          to="/"
          className="inline-block bg-gradient-to-r from-blue-700 to-violet-600 text-white text-sm font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
        >
          Back to snewweb →
        </Link>
      </div>
    </div>
  );
}
