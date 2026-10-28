import { CaseSensitive, Mail, BookmarkCheck, Youtube } from "lucide-react";

const ITEMS = [
  {
    icon: CaseSensitive,
    title: "Adjustable text size",
    body: "Switch between Small, Standard, and Large print any time from the text-size control in the header.",
  },
  {
    icon: Mail,
    title: "Daily or weekly digest",
    body: "Pick a cadence and the categories you care about; it lands in your inbox, nothing else.",
  },
  {
    icon: BookmarkCheck,
    title: "Save & annotate",
    body: "Favorite any story and attach a private or public note for later.",
  },
  {
    icon: Youtube,
    title: "Video commentary",
    body: "Record or watch reader commentary on a story, public or kept to yourself.",
  },
];

export function CapabilitiesStrip() {
  return (
    <section
      style={{
        borderTop: "1px solid hsl(var(--border))",
        background: "hsl(var(--secondary))",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 28px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              fontFamily: "'Public Sans', sans-serif",
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: ".14em",
              color: "hsl(var(--terracotta))",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Thoughtfully Designed
          </div>
          <h2
            style={{
              fontFamily: "Newsreader, serif",
              fontWeight: 600,
              fontSize: 24,
              margin: "0 0 8px",
              color: "hsl(var(--foreground))",
            }}
          >
            Tailored for focused reading
          </h2>
          <p
            style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: 14.5,
              lineHeight: 1.6,
              color: "hsl(var(--muted-foreground))",
              margin: "0 auto",
              maxWidth: "56ch",
            }}
          >
            No blinking banners, pop-up videos, or high-glare neon text. We design every page to give you an uncluttered, comfortable reading experience.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 24,
          }}
        >
          {ITEMS.map(({ icon: Icon, title, body }) => (
            <div key={title} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  width: 36, height: 36,
                  display: "grid", placeItems: "center",
                  border: "1px solid hsl(var(--line-2))",
                  background: "hsl(var(--card))",
                  borderRadius: 4,
                  color: "hsl(var(--primary))",
                }}
              >
                <Icon size={17} strokeWidth={1.75} />
              </div>
              <h3
                style={{
                  fontFamily: "Newsreader, serif",
                  fontWeight: 600,
                  fontSize: 15.5,
                  margin: 0,
                  color: "hsl(var(--foreground))",
                }}
              >
                {title}
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: "hsl(var(--muted-foreground))", margin: 0 }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
