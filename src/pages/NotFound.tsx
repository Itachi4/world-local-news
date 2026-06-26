import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: 40,
        background: "hsl(var(--background))",
      }}
    >
      <div
        style={{
          fontFamily: "'Newsreader', serif",
          fontWeight: 600, fontSize: 120,
          lineHeight: 1, letterSpacing: "-.03em",
          color: "hsl(var(--primary))",
        }}
      >
        404
      </div>

      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11, letterSpacing: ".16em",
          color: "hsl(var(--muted-foreground))",
          textTransform: "uppercase",
          margin: "6px 0 18px",
        }}
      >
        Off the wire
      </div>

      <h1
        style={{
          fontFamily: "'Newsreader', serif",
          fontWeight: 600, fontSize: 30,
          letterSpacing: "-.015em",
          margin: "0 0 12px",
          color: "hsl(var(--foreground))",
        }}
      >
        This story has moved on.
      </h1>

      <p
        style={{
          fontSize: 15.5, color: "hsl(var(--ink-2))",
          maxWidth: "40ch", margin: "0 0 26px", lineHeight: 1.6,
        }}
      >
        The page you're after isn't here — it may have been archived or the link mistyped.
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
  );
};

export default NotFound;
