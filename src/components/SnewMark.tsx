// ── SnewMark ──────────────────────────────────────────────────────────────────
// Four-pointed compass-star brand mark. Used as a placeholder on article cards
// that have no photo (imageless articles, purged branding images, etc.).

interface SnewMarkProps {
  size?: number;
  /** Foreground color (the terracotta arm). Defaults to --primary. */
  primary?: string;
  /** Background color (the dark arm). Defaults to hsl(var(--foreground)) at 85% opacity. */
  ink?: string;
  className?: string;
}

export function SnewMark({ size = 48, primary, ink, className }: SnewMarkProps) {
  const p = primary || "hsl(var(--primary))";
  const d = ink    || "hsl(var(--foreground))";

  // The mark is two overlapping four-pointed stars, one per colour, rotated 45° against each other.
  // Each "arm" is a thin diamond lozenge. The two colours share the central crossing point.
  const h = size / 2;
  const tip = size * 0.5;        // distance from centre to outer tip
  const waist = size * 0.085;    // half-width of the arm at centre

  // Terracotta arm: points up+down
  const tcPath = [
    `M ${h},${h - tip}`,          // top tip
    `L ${h + waist},${h}`,        // right waist
    `L ${h},${h + tip}`,          // bottom tip
    `L ${h - waist},${h}`,        // left waist
    "Z",
  ].join(" ");

  // Dark arm: points left+right (rotated 90° conceptually but drawn as separate path)
  const dkPath = [
    `M ${h - tip},${h}`,          // left tip
    `L ${h},${h - waist}`,        // top waist
    `L ${h + tip},${h}`,          // right tip
    `L ${h},${h + waist}`,        // bottom waist
    "Z",
  ].join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* Dark arm (left↔right) rendered first so terracotta arm overlaps at centre */}
      <path d={dkPath} fill={d} />
      {/* Terracotta arm (up↔down) */}
      <path d={tcPath} fill={p} />
    </svg>
  );
}
