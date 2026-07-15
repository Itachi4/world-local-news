import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle colour theme"
      style={{
        width: 34, height: 34,
        display: "grid", placeItems: "center",
        border: "1px solid hsl(var(--line-2))",
        background: "hsl(var(--card))",
        color: "hsl(var(--foreground))",
        borderRadius: 3,
        cursor: "pointer",
        fontSize: 16,
        lineHeight: 1,
      }}
    >
      {resolvedTheme === "dark" ? "☀" : "☾"}
    </button>
  );
}
