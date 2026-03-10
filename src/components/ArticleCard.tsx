import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalLink, Heart, StickyNote } from "lucide-react";
import { useState } from "react";
import { PublicNoteModal } from "./PublicNoteModal";

// Left-border accent colour keyed by region
const regionAccent: Record<string, string> = {
  Asia:          'border-l-amber-400',
  Europe:        'border-l-emerald-400',
  'North America': 'border-l-blue-400',
  'South America': 'border-l-teal-400',
  'Middle East': 'border-l-orange-400',
  Africa:        'border-l-rose-400',
  Oceania:       'border-l-cyan-400',
};

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
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
};

// Strip any HTML tags and collapse whitespace
const stripHtml = (str: string) => {
  if (!str) return "";
  return str
    .replace(/<[^>]*>/g, " ") // remove tags
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
};

// Truncate at first &nbsp; or U+00A0 — content after that is usually source name/junk
const truncateAtNbsp = (str: string) => {
  if (!str) return "";
  const atLiteral = str.indexOf("&nbsp;");
  if (atLiteral !== -1) return str.slice(0, atLiteral).trim();
  const atChar = str.indexOf("\u00A0");
  if (atChar !== -1) return str.slice(0, atChar).trim();
  return str;
};

// Decode and sanitize description/snippet text safely for display
const cleanSnippet = (str: string) => stripHtml(decodeEntities(truncateAtNbsp(str)));

// Prefer canonical article URL over Google News redirect
const getDisplayUrl = (input: string) => {
  if (!input) return input;
  try {
    // First, try to extract canonical URL from Google News redirect
    const urlParamMatch = input.match(/[?&]url=([^&]+)/);
    if (urlParamMatch) {
      const candidate = decodeURIComponent(urlParamMatch[1]);
      if (candidate && !candidate.includes('news.google.com')) {
        return candidate;
      }
    }
    
    // If it's a Google News redirect URL, try to extract the actual URL
    if (input.includes('news.google.com/articles/')) {
      const articleMatch = input.match(/news\.google\.com\/articles\/([^?]+)/);
      if (articleMatch) {
        // This is a Google News internal article, return the original URL
        return input;
      }
    }
    
    // If it's a Google News redirect with different pattern
    if (input.includes('news.google.com') && input.includes('url=')) {
      const urlMatch = input.match(/url=([^&]+)/);
      if (urlMatch) {
        const decodedUrl = decodeURIComponent(urlMatch[1]);
        if (decodedUrl && !decodedUrl.includes('news.google.com')) {
          return decodedUrl;
        }
      }
    }
  } catch (error) {
    console.warn('Error processing URL:', error);
  }
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
  imageUrl?: string | null;
  articleId?: string;
  userId?: string;
  isFavorited?: boolean;
  noteText?: string;
  noteIsPublic?: boolean;
  publicNotes?: Array<{ text: string; userId: string }>;
  onToggleFavorite?: (articleId: string) => void;
  onOpenNotes?: (articleId: string, title: string, noteText?: string, noteIsPublic?: boolean) => void;
  /** When set, opening the article (title/image) without being logged in will call this instead of navigating */
  onRequestLogin?: () => void;
}

export const ArticleCard = ({
  title,
  snippet,
  url,
  sourceName,
  sourceCountry,
  sourceRegion,
  publishedAt,
  imageUrl,
  articleId,
  userId,
  isFavorited = false,
  noteText,
  noteIsPublic = false,
  publicNotes = [],
  onToggleFavorite,
  onOpenNotes,
  onRequestLogin,
}: ArticleCardProps) => {
  const displayUrl = getDisplayUrl(url);
  const [selectedNote, setSelectedNote] = useState<{ text: string; userId: string } | null>(null);
  const [imgError, setImgError] = useState(false);
  const requireLoginToOpen = onRequestLogin && !userId;

  const accentBorder = regionAccent[sourceRegion] ?? 'border-l-primary/40';

  const handleArticleClick = (e: React.MouseEvent) => {
    if (requireLoginToOpen) {
      e.preventDefault();
      onRequestLogin?.();
    }
  };

  return (
    <Card className={`group h-full flex flex-col hover:shadow-2xl transition-all duration-500 ease-out border-border/50 hover:border-primary/30 hover:-translate-y-2 bg-card relative overflow-hidden animate-fade-in hover-lift border-l-4 ${accentBorder}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* Article thumbnail */}
      {imageUrl && !imgError && (
        <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden" onClick={handleArticleClick}>
          <img
            src={imageUrl}
            alt={title}
            onError={() => setImgError(true)}
            className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </a>
      )}

      <CardHeader className="pb-3 relative z-10">
        <div className="flex gap-2 flex-wrap mb-3">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-medium hover:bg-primary/20 transition-colors cursor-default animate-scale-in">
            {sourceRegion}
          </Badge>
          <Badge variant="outline" className="border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors cursor-default animate-scale-in" style={{ animationDelay: '0.1s' }}>
            {sourceCountry}
          </Badge>
        </div>
        <CardTitle className="text-lg leading-tight font-bold">
          <a 
            href={displayUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="group-hover:text-primary transition-all duration-300 flex items-start gap-2 hover:gap-3 hover:scale-[1.02] transition-bounce"
            onClick={handleArticleClick}
          >
            <span className="flex-1">{decodeEntities(title)}</span>
            <ExternalLink className="w-4 h-4 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110" />
          </a>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col relative z-10">
        <CardDescription className="line-clamp-3 text-sm leading-relaxed mb-4 flex-1 text-muted-foreground/90 group-hover:text-muted-foreground transition-colors">
          {cleanSnippet(snippet)}
        </CardDescription>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/50 group-hover:border-primary/20 transition-colors">
          <span className="font-semibold text-foreground/70 group-hover:text-foreground transition-colors">{sourceName}</span>
          {publishedAt && (
            <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              {new Date(publishedAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          )}
        </div>
        
        {/* Public Notes from Other Users */}
        {publicNotes && publicNotes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Public Notes:</div>
            <div className="space-y-2">
              {publicNotes.map((note, idx) => {
                const isLongNote = note.text.length > 100;
                const displayText = isLongNote ? note.text.substring(0, 100) + "..." : note.text;
                
                return (
                  <div 
                    key={idx} 
                    className={`text-xs bg-muted/50 p-2 rounded border-l-2 border-primary/30 ${
                      isLongNote ? 'cursor-pointer hover:bg-muted transition-colors' : ''
                    }`}
                    onClick={() => isLongNote && setSelectedNote(note)}
                    title={isLongNote ? "Click to view full note" : undefined}
                  >
                    <p className="text-foreground/80">{displayText}</p>
                    {isLongNote && (
                      <p className="text-xs text-primary mt-1 font-medium">Click to read more...</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        {userId && articleId ? (
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/30">
            <TooltipProvider>
              {/* Favorite Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleFavorite?.(articleId)}
                    className={`h-8 w-8 p-0 hover:bg-red-50 hover:text-red-500 transition-all duration-200 ${
                      isFavorited 
                        ? 'text-red-500 hover:text-red-600' 
                        : 'text-muted-foreground hover:text-red-500'
                    }`}
                  >
                    <Heart 
                      className={`w-4 h-4 transition-all duration-200 ${
                        isFavorited 
                          ? 'fill-current scale-110' 
                          : 'hover:scale-110'
                      }`} 
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}</p>
                </TooltipContent>
              </Tooltip>

              {/* Notes Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                        onClick={() => onOpenNotes?.(articleId, title, noteText, noteIsPublic)}
                    className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-500 transition-all duration-200 text-muted-foreground hover:text-blue-500 relative"
                  >
                    <StickyNote className="w-4 h-4 hover:scale-110 transition-transform duration-200" />
                    {noteText && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{noteText ? 'Edit Note' : 'Add Note'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <div className="text-xs mt-3 pt-3 border-t border-border/30">
            {!userId ? (
              <button type="button" onClick={onRequestLogin} className="text-muted-foreground hover:text-primary underline">
                Please log in to use favorites and notes
              </button>
            ) : (
              <span className="text-muted-foreground">Loading...</span>
            )}
          </div>
        )}
      </CardContent>
      
      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      
      {/* Public Note Modal */}
      {selectedNote && (
        <PublicNoteModal
          isOpen={!!selectedNote}
          onClose={() => setSelectedNote(null)}
          noteText={selectedNote.text}
          userId={selectedNote.userId}
        />
      )}
    </Card>
  );
};
