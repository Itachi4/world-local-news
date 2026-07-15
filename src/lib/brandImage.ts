// ── brandImage.ts ─────────────────────────────────────────────────────────────
// Utilities to identify Google branding images (that should be hidden) and
// AI-generated images (that should carry an "AI illustration" label).

const BRANDING_HOSTS = [
  'gstatic.com',               // Google static assets (G logo, icons)
  'lh3.googleusercontent.com', // Generic Google "G" logo placeholder
];

/**
 * Returns true if `url` is a known Google branding/logo image that should NOT
 * be shown on article cards. Does NOT reject real publisher-hosted images.
 *
 * news.google.com/api/attachments/ URLs are REAL article thumbnails embedded
 * in the RSS feed — those are allowed through. Only the generic logo hosts
 * (gstatic.com, lh3.googleusercontent.com) are suppressed.
 */
export function isBrandingImage(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    // Google News article thumbnails — legitimate preview images, not branding
    if (host === 'news.google.com' && parsed.pathname.startsWith('/api/attachments/')) return false;
    return BRANDING_HOSTS.some((b) => host === b || host.endsWith('.' + b));
  } catch {
    return false;
  }
}

/**
 * Returns true if `url` points to an AI-generated image in our Supabase
 * Storage lead-images bucket (so the frontend can add an "AI illustration" label).
 */
export function isAiImage(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('/storage/v1/object/public/lead-images/');
}
