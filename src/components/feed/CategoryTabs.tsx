/** Category tab bar — horizontal scrollable; sits sticky below SiteHeader. */

export interface Category {
  value: string;
  label: string;
}

/** These match the real DB category values used in articles_* tables. */
export const FEED_CATEGORIES: Category[] = [
  { value: "general",                  label: "General"              },
  { value: "tech-ai",                  label: "Tech & AI"            },
  { value: "business-finance",         label: "Business & Finance"   },
  { value: "politics",                 label: "Politics"             },
  { value: "arts-entertainment-fashion", label: "Arts & Culture"     },
  { value: "sports-games",             label: "Sports & Games"       },
  { value: "travel-leisure",           label: "Travel & Leisure"     },
  { value: "religion-spirituality",    label: "Religion"             },
];

interface CategoryTabsProps {
  selectedCategory: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export function CategoryTabs({ selectedCategory, onSelect, disabled }: CategoryTabsProps) {
  return (
    <div
      style={{
        borderBottom: "1px solid hsl(var(--border))",
        background: "hsl(var(--background))",
      }}
    >
      <div
        style={{
          maxWidth: 1280, margin: "0 auto",
          padding: "0 28px",
          display: "flex", gap: 2, overflowX: "auto",
          // Hide scrollbar but keep scrollability
          scrollbarWidth: "none",
        }}
      >
        {FEED_CATEGORIES.map(({ value, label }) => {
          const active = value === selectedCategory;
          return (
            <button
              key={value}
              onClick={() => !disabled && onSelect(value)}
              style={{
                flexShrink: 0,
                padding: "14px 12px",
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                textDecoration: "none",
                cursor: disabled ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${active ? "hsl(var(--primary))" : "transparent"}`,
                fontFamily: "inherit",
                opacity: disabled ? 0.6 : 1,
              }}
              aria-pressed={active}
              disabled={disabled}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
