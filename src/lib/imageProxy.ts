/**
 * Proxy an article image through images.weserv.nl.
 *
 * Benefits:
 *  - Fetched server-side → no Referer header → bypasses publisher 403s
 *  - Always returned over HTTPS → eliminates mixed-content blocks on http:// originals
 *  - Optionally resized + WebP-converted → faster card loads
 *
 * @param rawUrl  The raw image_url from the DB (may be http or https or null).
 * @param opts    Optional width/height for the rendering context.
 * @returns       A proxied https://images.weserv.nl/… URL, or null when rawUrl is empty.
 */
export function proxyImage(
  rawUrl: string | null | undefined,
  opts: { width?: number; height?: number } = {},
): string | null {
  if (!rawUrl || rawUrl.startsWith("data:")) return null;

  // weserv.nl expects the URL without a protocol prefix.
  const stripped = rawUrl.replace(/^https?:\/\//i, "");

  const params = new URLSearchParams({
    url: stripped,
    fit: "cover",
    output: "webp",
    q: "72",
    we: "1", // strip EXIF
  });
  if (opts.width)  params.set("w", String(opts.width));
  if (opts.height) params.set("h", String(opts.height));

  return `https://images.weserv.nl/?${params.toString()}`;
}
