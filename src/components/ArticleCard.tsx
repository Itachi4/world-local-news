import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

// Decode common HTML entities from feeds
const decodeEntities = (str: string) => {
  if (!str) return "";
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
};

// Strip any HTML tags and collapse whitespace
const stripHtml = (str: string) => {
  if (!str) return "";
  return str
    .replace(/<[^>]*>/g, " ") // remove tags
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
};

// Decode and sanitize description/snippet text safely for display
const cleanSnippet = (str: string) => stripHtml(decodeEntities(str));

// Prefer canonical article URL over Google News redirect
const getDisplayUrl = (input: string) => {
  if (!input) return input;
  try {
    // Try to extract canonical URL from Google News redirect
    const match = input.match(/[?&]url=([^&]+)/);
    if (match) {
      const candidate = decodeURIComponent(match[1]);
      if (candidate && !candidate.includes('news.google.com')) return candidate;
    }
  } catch {}
  return input;
};

interface ArticleCardProps {
  title: string;
  snippet: string;
  url: string;
  sourceName: string;
  sourceCountry: string;
  sourceRegion: string;
  publishedAt?: string;
}

export const ArticleCard = ({
  title,
  snippet,
  url,
  sourceName,
  sourceCountry,
  sourceRegion,
  publishedAt,
}: ArticleCardProps) => {
  return (
    <Card className="group h-full flex flex-col hover:shadow-xl transition-all duration-300 border-border/50 hover:border-primary/20 hover:-translate-y-1 bg-card">
      <CardHeader className="pb-3">
        <div className="flex gap-2 flex-wrap mb-3">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-medium">
            {sourceRegion}
          </Badge>
          <Badge variant="outline" className="border-border/50 text-muted-foreground">
            {sourceCountry}
          </Badge>
        </div>
        <CardTitle className="text-lg leading-tight font-bold">
          <a 
            href={getDisplayUrl(url)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="group-hover:text-primary transition-colors duration-200 flex items-start gap-2"
          >
            <span className="flex-1">{decodeEntities(title)}</span>
            <ExternalLink className="w-4 h-4 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <CardDescription className="line-clamp-3 text-sm leading-relaxed mb-4 flex-1">
          {cleanSnippet(snippet)}
        </CardDescription>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/50">
          <span className="font-semibold text-foreground/80">{sourceName}</span>
          {publishedAt && (
            <span className="flex items-center gap-1">
              {new Date(publishedAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
