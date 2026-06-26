// ── brandImage.ts ─────────────────────────────────────────────────────────────
// Utilities to identify Google branding images (that should be hidden) and
// AI-generated images (that should carry an "AI illustration" label).

const BRANDING_HOSTS = [
  'lh3.googleusercontent.com', // Google News generic "G" logo — NOT real article images
  'gstatic.com',
  'news.google.com',
];

/**
 * Returns true if `url` is a known Google branding/logo image that should NOT
 * be shown on article cards. Does NOT reject real publisher-hosted images.
 * Keeps `blogger.googleusercontent.com` and other legitimate publishers.
 */
export function isBrandingImage(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
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
