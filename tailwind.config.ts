import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // Editorial type system from the design
        serif: ["Newsreader", "Georgia", "Cambria", "serif"],
        sans:  ['"IBM Plex Sans"', "system-ui", "-apple-system", "sans-serif"],
        mono:  ['"IBM Plex Mono"', '"Courier New"', "monospace"],
      },
      colors: {
        // shadcn/ui semantic tokens
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT:              "hsl(var(--sidebar-background))",
          foreground:           "hsl(var(--sidebar-foreground))",
          primary:              "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:               "hsl(var(--sidebar-accent))",
          "accent-foreground":  "hsl(var(--sidebar-accent-foreground))",
          border:               "hsl(var(--sidebar-border))",
          ring:                 "hsl(var(--sidebar-ring))",
        },

        // Editorial aliases (direct access via Tailwind, e.g. text-ink-2, bg-surface-2)
        paper:          "hsl(var(--background))",
        surface:        "hsl(var(--card))",
        "surface-2":    "hsl(var(--surface-2))",
        ink:            "hsl(var(--foreground))",
        "ink-2":        "hsl(var(--ink-2))",
        "ink-3":        "hsl(var(--ink-3))",
        line:           "hsl(var(--border))",
        "line-2":       "hsl(var(--line-2))",
        "accent-ink":   "hsl(var(--accent-ink))",
        "accent-wash":  "hsl(var(--accent-wash))",
        field:          "hsl(var(--field))",

        // Region colors — used for badges, globe hotspots, article borders
        rg: {
          africa:         "hsl(var(--rg-africa))",
          asia:           "hsl(var(--rg-asia))",
          europe:         "hsl(var(--rg-europe))",
          "north-america":"hsl(var(--rg-north-america))",
          oceania:        "hsl(var(--rg-oceania))",
          "south-america":"hsl(var(--rg-south-america))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to:   { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to:   { height: "0", opacity: "0" },
        },
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%":   { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%":   { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)",   opacity: "1" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":       { transform: "translateY(-10px)" },
        },
        "glow": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.2)" },
          "50%":       { boxShadow: "0 0 30px hsl(var(--primary) / 0.4)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-in":        "fade-in 0.5s ease-out",
        "fade-in-up":     "fade-in-up 0.6s ease-out",
        "scale-in":       "scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "shimmer":        "shimmer 3s linear infinite",
        "float":          "float 3s ease-in-out infinite",
        "glow":           "glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
