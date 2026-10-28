import { useState, useEffect } from "react";
import { ExternalLink, Heart, StickyNote, Share2, Copy, Send, Linkedin, Youtube, MoreHorizontal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PublicNoteModal } from "./PublicNoteModal";
import VideoPlayerModal from "./VideoPlayerModal";
import { useToast } from "@/hooks/use-toast";
import { regionColor } from "@/lib/regionColor";
import { proxyImage } from "@/lib/imageProxy";
import { isBrandingImage, isAiImage } from "@/lib/brandImage";
import { SnewMark } from "./SnewMark";

// ── Text helpers ──────────────────────────────────────────────────────────────

const decodeEntities = (str: string) => {
  if (!str) return "";
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#x27;/g, "'")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
};

const stripHtml = (str: string) =>
  str ? str.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";

const truncateAtNbsp = (str: string) => {
  if (!str) return "";
  const a = str.indexOf("&nbsp;");
  if (a !== -1) return str.slice(0, a).trim();
  const b = str.indexOf(" ");
  if (b !== -1) return str.slice(0, b).trim();
  return str;
};

const cleanSnippet = (str: string) => stripHtml(decodeEntities(truncateAtNbsp(str)));

const getDisplayUrl = (input: string) => {
  if (!input) return input;
  try {
    const urlParamMatch = input.match(/[?&]url=([^&]+)/);
    if (urlParamMatch) {
      const candidate = decodeURIComponent(urlParamMatch[1]);
      if (candidate && !candidate.includes("news.google.com")) return candidate;
    }
    if (input.includes("news.google.com") && input.includes("url=")) {
      const urlMatch = input.match(/url=([^&]+)/);
      if (urlMatch) {
        const decoded = decodeURIComponent(urlMatch[1]);
        if (decoded && !decoded.includes("news.google.com")) return decoded;
      }
    }
  } catch {
    // ignore
  }
  return input;
};

const isSafeExternalUrl = (input?: string | null) => {
  if (!input) return false;
  try {
    const p = new URL(input).protocol;
    return p === "http:" || p === "https:";
  } catch { return false; }
};

// ── Props ─────────────────────────────────────────────────────────────────────

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
  commentaryVideoUrl?: string;
  commentaryTitle?: string;
  commentaryIsPublic?: boolean;
  publicCommentaries?: Array<{ videoUrl: string; title?: string; userId: string; authorName: string }>;
  onToggleFavorite?: (articleId: string) => void;
  onOpenNotes?: (articleId: string, title: string, noteText?: string, noteIsPublic?: boolean) => void;
  onOpenCommentary?: (articleId: string, title: string, videoUrl?: string, commentaryTitle?: string, isPublic?: boolean) => void;
  onRequestLogin?: () => void;
  /** When true, renders with larger image and headline (for the lead position). */
  isLead?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ArticleCard = ({
  title, snippet, url, sourceName, sourceCountry, sourceRegion,
  publishedAt, imageUrl, articleId, userId,
  isFavorited = false, noteText, noteIsPublic = false,
  publicNotes = [], commentaryVideoUrl, commentaryTitle, commentaryIsPublic = false,
  publicCommentaries = [], onToggleFavorite, onOpenNotes, onOpenCommentary, onRequestLogin,
  isLead = false,
}: ArticleCardProps) => {
  const displayUrl = getDisplayUrl(url);
  const articleUrl = isSafeExternalUrl(displayUrl) ? displayUrl : isSafeExternalUrl(url) ? url : null;
  const [selectedNote, setSelectedNote] = useState<{ text: string; userId: string } | null>(null);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  // "proxy" → try weserv.nl; "raw" → retry with unproxied URL; "failed" → show SnewMark
  const [imgState, setImgState] = useState<"proxy" | "raw" | "failed">("proxy");
  const requireLoginToOpen = onRequestLogin && !userId;
  const { toast } = useToast();

  // Reset image state whenever the URL changes (e.g. switching region/article)
  useEffect(() => { setImgState("proxy"); }, [imageUrl]);

  // TEMP: images disabled to match the current reference card style (text-only,
  // no thumbnail). Flip back to the commented-out line below to restore images —
  // the whole thumbnail block further down is commented out to match.
  const hasImage = false;
  // const hasImage = !!imageUrl && !isBrandingImage(imageUrl) && imgState !== "failed";

  const accent = regionColor(sourceRegion);

  const handleArticleClick = (e: React.MouseEvent) => {
    if (requireLoginToOpen) { e.preventDefault(); onRequestLogin?.(); return; }
    if (!articleUrl) e.preventDefault();
  };

  const shareText = `${decodeEntities(title)} (${sourceName})`;

  const openShareWindow = (shareUrl: string) =>
    window.open(shareUrl, "_blank", "noopener,noreferrer");

  const handleNativeShare = async () => {
    if (!articleUrl) {
      toast({ title: "Sharing unavailable", description: "No valid URL for this article.", variant: "destructive" });
      return;
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: decodeEntities(title), text: shareText, url: articleUrl }); return; } catch { /* user cancelled share dialog */ }
    }
    try {
      await navigator.clipboard.writeText(articleUrl);
      toast({ title: "Link copied", description: "Article link copied to your clipboard." });
    } catch {
      toast({ title: "Sharing unavailable", description: "Unable to copy link.", variant: "destructive" });
    }
  };

  const handleSocialShare = (platform: "x" | "linkedin") => {
    if (!articleUrl) {
      toast({ title: "Sharing unavailable", description: "No valid URL for this article.", variant: "destructive" });
      return;
    }
    if (platform === "x") {
      openShareWindow(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(articleUrl)}`);
    } else {
      openShareWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`);
    }
  };

  const isPoster = isLead && !hasImage;
  // Use full image height when there's an image; smaller backdrop when logo-only.
  const imgHeight = hasImage ? (isLead ? 224 : 152) : (isLead ? 96 : 72);
  const snippetLines = hasImage ? (isLead ? 4 : 3) : (isLead ? 6 : 5);

  return (
    <article
      className="sn-card flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      {/* Thumbnail — TEMP: commented out entirely (photo, AI-illustration label, and the
          Snew-mark no-photo backdrop) to match the current reference's plain text-only
          card style. hasImage is hardcoded false above, so this whole block never ran
          conditionally anyway — commented out rather than deleted so it's a one-step
          revert (un-comment this block + flip hasImage back) when images come back.
      {hasImage ? (
        <a href={articleUrl || "#"} target="_blank" rel="noopener noreferrer"
          style={{
            display: "block", overflow: "hidden", position: "relative",
            // Lead image grows to fill the column height; grid cards use a fixed height.
            ...(isLead
              ? { flex: "1 0 0", minHeight: 200 }
              : { flexShrink: 0, height: imgHeight }),
          }}
          onClick={handleArticleClick}
          aria-label={`Open: ${decodeEntities(title)}`}
        >
          <img
            src={imgState === "proxy"
              ? (proxyImage(imageUrl, { width: isLead ? 900 : 540 }) ?? imageUrl ?? undefined)
              : imageUrl ?? undefined}
            alt={title}
            onError={() => setImgState(prev => prev === "proxy" ? "raw" : "failed")}
            onLoad={(e) => {
              // A source photo far smaller than its display slot gets blown up by
              // object-fit:cover into a blurry, oversized image — worse than no
              // image at all. Fall back to the SnewMark backdrop in that case.
              const img = e.currentTarget;
              const minWidth = isLead ? 400 : 200;
              const minHeight = isLead ? 250 : 120;
              if (img.naturalWidth < minWidth || img.naturalHeight < minHeight) {
                setImgState("failed");
              }
            }}
            referrerPolicy="no-referrer"
            style={{ width: "100%", height: isLead ? "100%" : imgHeight, objectFit: "cover", display: "block" }}
            loading="lazy" decoding="async"
          />
          {isAiImage(imageUrl) && (
            <span className="pointer-events-none absolute bottom-1.5 left-2 select-none rounded-sm bg-black/45 px-1.5 py-0.5 font-sans text-[9px] tracking-wide text-white/80">
              AI illustration
            </span>
          )}
        </a>
      ) : (
        <div
          aria-hidden="true"
          className="relative flex flex-shrink-0 items-center justify-center overflow-hidden"
          style={{
            height: imgHeight,
            background: isPoster
              ? `color-mix(in srgb, ${accent} 14%, hsl(var(--accent-wash)))`
              : `color-mix(in srgb, ${accent} 16%, hsl(var(--card)))`,
            borderBottom: `1px solid color-mix(in srgb, ${accent} 28%, transparent)`,
          }}
        >
          <SnewMark size={isPoster ? 96 : 40} />
        </div>
      )}
      */}

      {/* Body — lead with image: fixed height (image fills remaining space); everything else: flex-grow */}
      <div className={`flex flex-col gap-2.5 p-4 ${isLead && hasImage ? "flex-none" : "flex-1"}`}>
        {/* Region / country pills */}
        <div className="flex flex-wrap gap-1.5">
          <span
            className="rounded-full border px-2 py-0.5 text-[11.5px] font-semibold tracking-wide"
            style={{
              background: `color-mix(in srgb, ${accent} 12%, transparent)`,
              color: accent,
              borderColor: `color-mix(in srgb, ${accent} 25%, transparent)`,
            }}
          >
            {sourceRegion}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5 text-[11.5px] font-medium text-muted-foreground">
            {sourceCountry}
          </span>
        </div>

        {/* Headline */}
        <h3
          className={`m-0 font-serif font-semibold text-foreground ${
            isPoster
              ? "text-4xl leading-[1.15]"
              : isLead
              ? "text-2xl leading-snug"
              : hasImage
              ? "text-base leading-snug"
              : "text-xl leading-snug"
          }`}
        >
          <a
            href={articleUrl || "#"} target="_blank" rel="noopener noreferrer"
            onClick={handleArticleClick}
            className="flex items-start gap-1.5 text-foreground no-underline"
          >
            <span className="flex-1">{decodeEntities(title)}</span>
            <ExternalLink size={13} className="mt-1 flex-shrink-0 text-muted-foreground opacity-50" />
          </a>
        </h3>

        {/* Snippet — poster cards (lead, no photo) get an italic pull-quote treatment
            since the headline+snippet pairing carries the full visual weight there. */}
        <p
          className={`m-0 flex-1 overflow-hidden text-muted-foreground ${
            isPoster
              ? "sn-italic-safe font-body-serif text-base italic"
              : "text-[13px] leading-relaxed"
          }`}
          style={{ display: "-webkit-box", WebkitLineClamp: snippetLines, WebkitBoxOrient: "vertical" }}
        >
          {cleanSnippet(snippet)}
        </p>

        {/* Dateline */}
        <div className="flex items-center justify-between border-t border-border pt-2 font-sans text-[10.5px]">
          <span className="font-semibold text-foreground opacity-65">{sourceName}</span>
          {publishedAt && (
            <span className="text-muted-foreground">
              {new Date(publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
        </div>

        {/* Public notes from other users — accent-wash ties reader-contributed
            content to the brand accent instead of a flat neutral surface. */}
        {publicNotes.length > 0 && (
          <div className="mt-1">
            <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Public Notes:</p>
            <div className="flex flex-col gap-1.5">
              {publicNotes.map((note, idx) => {
                const isLong = note.text.length > 100;
                return (
                  <button
                    key={idx} type="button"
                    onClick={() => isLong && setSelectedNote(note)}
                    disabled={!isLong}
                    className={`rounded-sm border-0 border-l-2 border-primary bg-accent-wash px-2.5 py-1.5 text-left text-[11.5px] text-foreground ${
                      isLong ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    {isLong ? note.text.slice(0, 100) + "…" : note.text}
                    {isLong && <span className="mt-0.5 block text-[10.5px] text-primary">Read more…</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Public video commentary from other users */}
        {publicCommentaries.length > 0 && (
          <div className="mt-1">
            <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Watch Commentary:</p>
            <div className="flex flex-col gap-1.5">
              {publicCommentaries.map((commentary, idx) => (
                <button
                  key={idx} type="button"
                  onClick={() => setPlayingVideoUrl(commentary.videoUrl)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-sm border-0 border-l-2 border-primary bg-accent-wash px-2.5 py-1.5 text-left text-[11.5px] text-foreground"
                >
                  <Youtube size={13} className="flex-shrink-0 text-primary" />
                  <span>
                    Watch {commentary.authorName}&apos;s commentary
                    {commentary.title && (
                      <span className="mt-0.5 block text-[10.5px] text-muted-foreground">{commentary.title}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {articleId && (
          <div className="mt-0.5 border-t border-border pt-2">
            <div className="flex items-center justify-end gap-0.5">
              <TooltipProvider>
                {/* Share — one trigger holding native/X/LinkedIn/copy-link instead of four separate icons */}
                <DropdownMenu>
                  <Tooltip><TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" aria-label="Share article"
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground">
                        <Share2 size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger><TooltipContent><p>Share</p></TooltipContent></Tooltip>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleNativeShare}>
                      <Share2 size={14} className="mr-2" /> Share…
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSocialShare("x")}>
                      <Send size={14} className="mr-2" /> Share to X
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSocialShare("linkedin")}>
                      <Linkedin size={14} className="mr-2" /> Share to LinkedIn
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        if (!articleUrl) { toast({ title: "Copy unavailable", description: "No valid URL.", variant: "destructive" }); return; }
                        try { await navigator.clipboard.writeText(articleUrl); toast({ title: "Copied", description: "Article URL copied." }); }
                        catch { toast({ title: "Copy unavailable", description: "Could not copy URL.", variant: "destructive" }); }
                      }}>
                      <Copy size={14} className="mr-2" /> Copy link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {userId && (
                  <>
                    <Tooltip><TooltipTrigger asChild>
                      <Button variant="ghost" size="sm"
                        onClick={() => onToggleFavorite?.(articleId)}
                        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                        className={`h-9 w-9 p-0 transition-colors ${isFavorited ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-500"}`}>
                        <Heart size={14} className={isFavorited ? "fill-current" : ""} />
                      </Button>
                    </TooltipTrigger><TooltipContent><p>{isFavorited ? "Remove from Favorites" : "Add to Favorites"}</p></TooltipContent></Tooltip>

                    {/* Note + commentary — secondary actions tucked behind one overflow menu */}
                    <DropdownMenu>
                      <Tooltip><TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label="More actions"
                            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground relative">
                            <MoreHorizontal size={14} />
                            {/* Real state indicator: this article already has a saved note or commentary. */}
                            {(noteText || commentaryVideoUrl) && (
                              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger><TooltipContent><p>More</p></TooltipContent></Tooltip>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onOpenNotes?.(articleId, title, noteText, noteIsPublic)}>
                          <StickyNote size={14} className="mr-2" /> {noteText ? "Edit note" : "Add note"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onOpenCommentary?.(articleId, title, commentaryVideoUrl, commentaryTitle, commentaryIsPublic)}>
                          <Youtube size={14} className="mr-2" /> {commentaryVideoUrl ? "Edit commentary" : "Add commentary"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </TooltipProvider>
            </div>
            {!userId && onRequestLogin && (
              <p className="mt-1 text-center text-[11px]">
                <button type="button" onClick={onRequestLogin}
                  className="cursor-pointer border-0 bg-transparent text-[11px] text-muted-foreground underline">
                  Log in to use favorites and notes
                </button>
              </p>
            )}
          </div>
        )}
      </div>

      {selectedNote && (
        <PublicNoteModal isOpen={!!selectedNote} onClose={() => setSelectedNote(null)}
          noteText={selectedNote.text} userId={selectedNote.userId} />
      )}

      {playingVideoUrl && (
        <VideoPlayerModal videoUrl={playingVideoUrl} onClose={() => setPlayingVideoUrl(null)} />
      )}
    </article>
  );
};
