import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import nodemailer from 'npm:nodemailer';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Using Google News RSS feeds for different regions
const GOOGLE_NEWS_RSS_BASE = 'https://news.google.com/rss';

// Helper function to get locale code for Google News (hl parameter)
// Returns country-specific locale like "en-PK" for Pakistan, "en-IN" for India, etc.
function getLocaleForCountry(countryCode: string): string {
  const localeMap: Record<string, string> = {
    // Asia
    'PK': 'en-PK', // Pakistan
    'IN': 'en-IN', // India
    'CN': 'en-CN', // China
    'JP': 'en-JP', // Japan
    'SG': 'en-SG', // Singapore
    'SA': 'en-SA', // Saudi Arabia
    'KR': 'en-KR', // South Korea
    'NP': 'en-NP', // Nepal
    'IR': 'en-US', // Iran (use US edition for English results)
    'SY': 'en-US', // Syria (use US edition for English results)
    'BD': 'en-BD', // Bangladesh
    'IL': 'en-IL', // Israel
    'LK': 'en-LK', // Sri Lanka
    'AF': 'en-US', // Afghanistan (use US edition for English results)
    'QA': 'en-QA', // Qatar
    'JO': 'en-US', // Jordan (use US edition for English results)
    'OM': 'en-US', // Oman (use US edition for English results)
    'YE': 'en-US', // Yemen (use US edition for English results)
    'AE': 'en-AE', // UAE
    // North America
    'US': 'en-US', // United States
    'CA': 'en-CA', // Canada
    'MX': 'es-MX', // Mexico
    // Europe
    'GB': 'en-GB', // United Kingdom
    'FR': 'fr-FR', // France
    'DE': 'de-DE', // Germany
    'IT': 'it-IT', // Italy
    'ES': 'es-ES', // Spain
    'NL': 'nl-NL', // Netherlands
    'SE': 'sv-SE', // Sweden
    'PL': 'pl-PL', // Poland
    // South America — intentionally using 'en' (via fallback) to get English articles
    // Removed Spanish/Portuguese locales: Google News returns English results when hl=en
    // Africa
    'ZA': 'en-ZA', // South Africa
    'NG': 'en-NG', // Nigeria
    'EG': 'ar-EG', // Egypt
    'KE': 'en-KE', // Kenya
    'GH': 'en-GH', // Ghana
    'MA': 'ar-MA', // Morocco
    'ET': 'en-ET', // Ethiopia
    'TZ': 'en-TZ', // Tanzania
    // Oceania
    'AU': 'en-AU', // Australia
    'NZ': 'en-NZ', // New Zealand
    'FJ': 'en-FJ', // Fiji
    'PG': 'en-PG', // Papua New Guinea
  };

  return localeMap[countryCode] || 'en'; // Default to 'en' if country not in map
}

// Helper function to build Google News query with country name for better relevance
function buildGoogleNewsQuery(categoryQuery: string, countryName: string): string {
  // 1. Get the base query (e.g., "politics OR government")
  const baseQuery = categoryQuery.replace(/\s+/g, '+');

  // 2. Force the country name into the query with AND logic
  // Result: "(politics+OR+government)+AND+Pakistan"
  const countryNameEncoded = countryName.replace(/\s+/g, '+');
  const strictQuery = `(${baseQuery})+AND+${countryNameEncoded}`;

  return strictQuery;
}

// Category to search query mapping for Google News RSS
const categoryQueries: Record<string, string> = {
  "tech-ai": "technology OR AI OR artificial intelligence OR tech OR software OR innovation",
  "business-finance": "business OR finance OR economy OR stock market OR trading OR investment",
  "politics": "politics OR political OR government OR election OR policy OR legislation",
  "arts-entertainment-fashion": "arts OR entertainment OR fashion OR movies OR music OR celebrity OR culture",
  "sports-games": "sports OR games OR football OR basketball OR soccer OR cricket OR Olympics",
  "travel-leisure": "travel OR tourism OR vacation OR leisure OR hotel OR destination",
  "religion-spirituality": "religion OR spirituality OR faith OR religious OR church OR temple",
};

type AlertMetrics = {
  totalArticlesFetched: number;
  enrichmentCandidates: number;
  decodeAttempts: number;
  decodeSuccesses: number;
  decodeFailures: number;
  metadataFetchAttempts: number;
  metadataFetchSuccesses: number;
  metadataFetchFailures: number;
  imagesResolvedFromEnrichment: number;
  decodeFailureSamples: Array<{ url: string; reason: string }>;
  renderApiAttempts: number;
  renderApiSuccesses: number;
  renderApiFailures: number;
};

// Helper: simple fetch with retry for transient errors like 429/503
async function fetchWithRetry(url: string, init: RequestInit = {}, retries = 3, backoffMs = 1000): Promise<Response> {
  let lastErr: any
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init)
      if (res.ok) return res
      // Retry on common transient statuses
      if (![429, 502, 503, 504].includes(res.status)) {
        console.error(`❌ Non-retryable status ${res.status} for URL: ${url.substring(0, 100)}...`);
        return res
      }
      console.log(`⚠️ Retryable error ${res.status}, attempt ${attempt + 1}/${retries + 1}`);
    } catch (e) {
      lastErr = e
      console.log(`⚠️ Fetch error on attempt ${attempt + 1}/${retries + 1}: ${e}`);
      if (attempt === retries) throw e
    }
    if (attempt < retries) {
      const delay = backoffMs * (attempt + 1);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr ?? new Error('Failed to fetch after retries')
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeEscapedUrl(input: string): string {
  return input
    .replace(/\\u003d/g, "=")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .trim();
}

async function getGoogleDecodeParams(articleId: string): Promise<{ signature?: string; timestamp?: string; previewImage?: string } | null> {
  const candidates = [
    `https://news.google.com/articles/${articleId}`,
    `https://news.google.com/rss/articles/${articleId}`,
  ];

  let bestPreviewImage: string | undefined;

  for (const url of candidates) {
    try {
      const response = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache',
          // Consent cookie bypasses Google's GDPR consent interstitial on datacenter IPs,
          // which would otherwise return a cookie-gate page with no decode tokens.
          'Cookie': 'CONSENT=YES+cb; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpX3YyMRAdGgJlbiACIgQiAggBOAEqAggB',
        },
      }, 4000);

      if (!response.ok) continue;
      const html = await response.text();
      const signature = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
      const timestamp = html.match(/data-n-a-ts="([^"]+)"/)?.[1];

      // Opportunistically extract a preview image from the same HTML response.
      // Reject gstatic, news.google.com branding, AND lh3.googleusercontent.com thumbnails —
      // lh3 thumbnails are the generic Google News "G" logo (single fixed hash), not real article images.
      // Keep blogger.googleusercontent.com and other real publisher-hosted images.
      if (!bestPreviewImage) {
        const pageImage = extractImageFromHtml(html, url);
        if (pageImage) {
          try {
            const imgHostname = new URL(pageImage).hostname.toLowerCase();
            const isGoogleBranding = imgHostname.includes('gstatic') ||
              imgHostname === 'lh3.googleusercontent.com' ||
              (imgHostname.includes('google') && !imgHostname.includes('googleusercontent'));
            if (!isGoogleBranding) bestPreviewImage = pageImage;
          } catch {
            bestPreviewImage = pageImage;
          }
        }
      }

      if (signature && timestamp) {
        return { signature, timestamp, previewImage: bestPreviewImage };
      }
    } catch {
      // Try next candidate URL.
    }
  }

  // Return with preview image even if decode tokens were not found.
  return bestPreviewImage ? { previewImage: bestPreviewImage } : null;
}

function parseDecodedUrlFromBatchExecute(text: string): string | null {
  try {
    const parts = text.split('\n\n');
    const payload = parts.length > 1 ? parts[1] : '';
    if (!payload) return null;
    const parsedOuter = JSON.parse(payload);
    if (!Array.isArray(parsedOuter) || parsedOuter.length === 0) return null;
    const encodedInner = parsedOuter[0]?.[2];
    if (!encodedInner || typeof encodedInner !== 'string') return null;
    const parsedInner = JSON.parse(encodedInner);
    const candidate = parsedInner?.[1];
    if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) {
      return candidate;
    }
    return null;
  } catch {
    return null;
  }
}

async function decodeGoogleNewsUrl(googleUrl: string): Promise<{ url: string | null; error?: string; previewImage?: string }> {
  if (!googleUrl.includes('news.google.com/rss/articles/')) {
    return { url: googleUrl };
  }

  const articleIdMatch = googleUrl.match(/\/rss\/articles\/([^/?]+)/);
  const articleId = articleIdMatch?.[1];
  if (!articleId) {
    return { url: null, error: 'missing_article_id' };
  }

  try {
    const decodeParams = await getGoogleDecodeParams(articleId);
    if (!decodeParams) {
      return { url: null, error: 'missing_decode_tokens' };
    }

    // If we retrieved a preview image but no decode tokens, return early with the image.
    if (!decodeParams.signature || !decodeParams.timestamp) {
      return { url: null, error: 'missing_decode_tokens', previewImage: decodeParams.previewImage };
    }

    const rpcPayload = [
      "Fbv4je",
      `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${articleId}",${decodeParams.timestamp},"${decodeParams.signature}"]`,
      null,
      "generic",
    ];

    const body = `f.req=${encodeURIComponent(JSON.stringify([[rpcPayload]]))}`;
    const decodeResponse = await fetchWithTimeout(
      'https://news.google.com/_/DotsSplashUi/data/batchexecute',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
        },
        body,
      },
      4000
    );

    if (!decodeResponse.ok) {
      return { url: null, error: `batchexecute_status_${decodeResponse.status}`, previewImage: decodeParams.previewImage };
    }

    const decodeText = await decodeResponse.text();
    const decodedUrl = parseDecodedUrlFromBatchExecute(decodeText);
    if (!decodedUrl) {
      return { url: null, error: 'decoded_url_not_found', previewImage: decodeParams.previewImage };
    }

    return { url: normalizeEscapedUrl(decodedUrl), previewImage: decodeParams.previewImage };
  } catch (error: any) {
    return { url: null, error: error?.name === 'AbortError' ? 'decode_timeout' : (error?.message || 'decode_exception') };
  }
}

function normalizeCandidateImageUrl(candidate: string, baseUrl: string): string | null {
  const cleaned = candidate.trim();
  if (!cleaned || cleaned.startsWith('data:')) return null;
  try {
    return new URL(cleaned, baseUrl).toString();
  } catch {
    return null;
  }
}

function looksLikeContentImage(url: string): boolean {
  const lower = url.toLowerCase();
  const blockedHints = [
    'logo',
    'icon',
    'sprite',
    'favicon',
    'avatar',
    'placeholder',
    'ads',
    'doubleclick',
    'googleads',
    '.svg',
    'pixel',
    'lh3.googleusercontent.com',
  ];
  return !blockedHints.some((hint) => lower.includes(hint));
}

function pickBestUrlFromSrcset(srcset: string): string | null {
  const candidates = srcset
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [url, descriptor] = entry.split(/\s+/, 2);
      const width = descriptor?.endsWith('w') ? Number(descriptor.slice(0, -1)) : 0;
      return {
        url: url?.trim() || '',
        width: Number.isFinite(width) ? width : 0,
      };
    })
    .filter((entry) => entry.url.length > 0);

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.width - a.width);
  return candidates[0].url;
}

function extractImageFromHtml(html: string, pageUrl: string): string | null {
  const imagePatterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
  ];

  for (const pattern of imagePatterns) {
    const match = html.match(pattern);
    const imageUrl = match?.[1] ? normalizeCandidateImageUrl(match[1], pageUrl) : null;
    if (imageUrl && looksLikeContentImage(imageUrl)) {
      return imageUrl;
    }
  }

  // JSON-LD image fallback (many publishers provide image here).
  // Handle all common shapes: "image":"url", "image":{"url":"..."}, "image":["url"],
  // "image":[{"url":"..."}] — the original single-pattern only caught the first form.
  const jsonLdMatches = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  const jsonLdImagePatterns = [
    /"image"\s*:\s*"([^"]+)"/gi,
    /"image"\s*:\s*\{[^{}]*?"url"\s*:\s*"([^"]+)"/gi,
    /"image"\s*:\s*\[\s*"([^"]+)"/gi,
    /"image"\s*:\s*\[\s*\{[^{}]*?"url"\s*:\s*"([^"]+)"/gi,
  ];
  for (const m of jsonLdMatches) {
    const payload = m[1];
    for (const pat of jsonLdImagePatterns) {
      pat.lastIndex = 0;
      for (const hit of payload.matchAll(pat)) {
        const candidate = hit[1];
        if (!candidate) continue;
        const imageUrl = normalizeCandidateImageUrl(candidate, pageUrl);
        if (imageUrl && looksLikeContentImage(imageUrl)) return imageUrl;
      }
    }
  }

  // Fallback to body <img src="..."> candidates when metadata is missing.
  const imgTagMatches = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi));
  for (const m of imgTagMatches) {
    const imageUrl = normalizeCandidateImageUrl(m[1], pageUrl);
    if (imageUrl && looksLikeContentImage(imageUrl)) {
      return imageUrl;
    }
  }

  // Lazy-loaded image attributes often contain the actual content image.
  const lazyAttrMatches = Array.from(
    html.matchAll(/<(?:img|source)[^>]+(?:data-src|data-original|data-lazy-src|data-image|data-actualsrc)=["']([^"']+)["'][^>]*>/gi),
  );
  for (const m of lazyAttrMatches) {
    const imageUrl = normalizeCandidateImageUrl(m[1], pageUrl);
    if (imageUrl && looksLikeContentImage(imageUrl)) {
      return imageUrl;
    }
  }

  // Fallback to srcset candidates for responsive/lazy loading layouts.
  const srcsetMatches = Array.from(
    html.matchAll(/<(?:img|source)[^>]+srcset=["']([^"']+)["'][^>]*>/gi),
  );
  for (const m of srcsetMatches) {
    const bestSrcsetUrl = pickBestUrlFromSrcset(m[1]);
    const imageUrl = bestSrcsetUrl ? normalizeCandidateImageUrl(bestSrcsetUrl, pageUrl) : null;
    if (imageUrl && looksLikeContentImage(imageUrl)) {
      return imageUrl;
    }
  }

  return null;
}

/**
 * Domain-specific image extractors, keyed by hostname (www-stripped, lowercase).
 * Consulted ONLY inside fetchPublisherImage — never during Google News HTML decoding —
 * so these patterns cannot affect the decode timeout path.
 *
 * Adding a new site: one entry here. Keep patterns single-line safe (no [\s\S] / dotall).
 */
/** Shared WordPress featured-image extractor for sites that use class="attachment-full". */
function extractWordPressFeaturedImage(html: string, pageUrl: string): string | null {
  const patterns = [
    /<img[^>]+class="[^"]*attachment-full[^"]*"[^>]+src="([^"]+)"/i,
    /<img[^>]+src="([^"]+)"[^>]+class="[^"]*attachment-full[^"]*"/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const url = normalizeCandidateImageUrl(m[1], pageUrl);
      if (url && looksLikeContentImage(url)) return url;
    }
  }
  return null;
}

const domainImageExtractors: Record<string, (html: string, pageUrl: string) => string | null> = {
  'newsonair.gov.in': extractWordPressFeaturedImage,
  'ddindia.co.in': extractWordPressFeaturedImage,
};

async function fetchPublisherImage(publisherUrl: string): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(publisherUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    }, 5000);

    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;
    const html = await response.text();

    // Try domain-specific extractor before the generic fallback.
    try {
      const hostname = new URL(publisherUrl).hostname.toLowerCase().replace(/^www\./, '');
      const domainExtractor = domainImageExtractors[hostname];
      if (domainExtractor) {
        const domainImage = domainExtractor(html, publisherUrl);
        if (domainImage) return domainImage;
        // Domain extractor returned null — fall through to generic logic.
      }
    } catch {
      // URL parse failed; continue to generic extractor.
    }

    return extractImageFromHtml(html, publisherUrl);
  } catch (_error) {
    return null;
  }
}

/**
 * Jina Reader render-API fallback: fetches a URL via r.jina.ai which renders
 * JavaScript and bypasses bot-blocking, then extracts an image from the returned HTML.
 * Only called for recent articles (today + yesterday) to stay within the free tier.
 * Set env secret JINA_API_KEY to raise rate limits; keyless works on the free tier.
 */
async function fetchImageViaRenderApi(targetUrl: string): Promise<string | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(targetUrl)}`;
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
      'X-Return-Format': 'html',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };
    const jinaApiKey = Deno.env.get('JINA_API_KEY');
    if (jinaApiKey) headers['Authorization'] = `Bearer ${jinaApiKey}`;

    const response = await fetchWithTimeout(jinaUrl, { headers }, 9000);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;
    const html = await response.text();
    return extractImageFromHtml(html, targetUrl);
  } catch {
    return null;
  }
}

async function enrichImagesForArticles(
  articles: any[],
  metrics: AlertMetrics,
  maxCandidatesOverride?: number,
): Promise<void> {
  const envMaxCandidates = Number(Deno.env.get('IMAGE_ENRICH_MAX_CANDIDATES') || '0');
  const fallbackMaxCandidates = 150;
  const overrideMaxCandidates = typeof maxCandidatesOverride === 'number' && Number.isFinite(maxCandidatesOverride) && maxCandidatesOverride > 0
    ? Math.floor(maxCandidatesOverride)
    : null;
  const maxCandidates = overrideMaxCandidates !== null
    ? overrideMaxCandidates
    : (Number.isFinite(envMaxCandidates) && envMaxCandidates > 0 ? envMaxCandidates : fallbackMaxCandidates);
  const concurrency = Number(Deno.env.get('IMAGE_ENRICH_CONCURRENCY') || '4');

  // Gate image enrichment to articles within the same 7-day window the feed displays.
  // Widened from 48 h so all displayed articles get a real image when the proxy is set.
  const RECENT_IMAGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const recentCutoff = Date.now() - RECENT_IMAGE_WINDOW_MS;
  const isRecent = (a: any) => {
    const t = Date.parse(a.published_at ?? '');
    return Number.isFinite(t) && t >= recentCutoff;
  };

  const candidates = articles
    .slice(0, Math.min(articles.length, maxCandidates))
    .filter((article) =>
      !article.image_url &&
      typeof article.url === 'string' &&
      article.url.length > 0 &&
      isRecent(article)
    );

  metrics.enrichmentCandidates = candidates.length;
  if (candidates.length === 0) return;

  console.log(`🖼️ Image enrichment: ${candidates.length} recent candidate articles (max candidates: ${maxCandidates}, concurrency: ${concurrency})`);
  const decodeFailureByReason = new Map<string, number>();

  let cursor = 0;
  const workers = new Array(Math.max(1, concurrency)).fill(null).map(async () => {
    while (cursor < candidates.length) {
      const idx = cursor++;
      const article = candidates[idx];

      metrics.decodeAttempts += 1;
      const decodeResult = await decodeGoogleNewsUrl(article.url);
      if (!decodeResult.url) {
        metrics.decodeFailures += 1;
        const reason = decodeResult.error || 'decode_failed';
        decodeFailureByReason.set(reason, (decodeFailureByReason.get(reason) || 0) + 1);
        if (metrics.decodeFailureSamples.length < 10) {
          metrics.decodeFailureSamples.push({ url: article.url, reason });
        }
        // Use the preview image extracted from the Google News page as a fallback.
        if (decodeResult.previewImage) {
          article.image_url = decodeResult.previewImage;
          metrics.imagesResolvedFromEnrichment += 1;
          continue;
        }
        // Decode failed AND no preview — try Jina render API on the original Google News URL.
        // Jina follows the Google redirect, renders JS, and returns the publisher page.
        metrics.renderApiAttempts += 1;
        const jinaImage = await fetchImageViaRenderApi(article.url);
        if (jinaImage) {
          article.image_url = jinaImage;
          metrics.imagesResolvedFromEnrichment += 1;
          metrics.renderApiSuccesses += 1;
        } else {
          metrics.renderApiFailures += 1;
        }
        continue;
      }

      metrics.decodeSuccesses += 1;
      article.url = decodeResult.url;
      metrics.metadataFetchAttempts += 1;
      const extractedImage = await fetchPublisherImage(decodeResult.url);
      if (extractedImage) {
        article.image_url = extractedImage;
        metrics.metadataFetchSuccesses += 1;
        metrics.imagesResolvedFromEnrichment += 1;
      } else {
        metrics.metadataFetchFailures += 1;
        if (decodeResult.previewImage) {
          // Publisher direct-fetch failed — use the Google News page preview as fallback.
          article.image_url = decodeResult.previewImage;
          metrics.imagesResolvedFromEnrichment += 1;
        } else {
          // Publisher fetch failed AND no preview — try Jina on the decoded publisher URL.
          metrics.renderApiAttempts += 1;
          const jinaImage = await fetchImageViaRenderApi(decodeResult.url);
          if (jinaImage) {
            article.image_url = jinaImage;
            metrics.imagesResolvedFromEnrichment += 1;
            metrics.renderApiSuccesses += 1;
          } else {
            metrics.renderApiFailures += 1;
          }
        }
      }
    }
  });

  await Promise.all(workers);
  if (decodeFailureByReason.size > 0) {
    const summary = Array.from(decodeFailureByReason.entries())
      .map(([reason, count]) => `${reason}:${count}`)
      .join(', ');
    console.log(`⚠️ Decode failure summary: ${summary}`);
  }
  console.log(`🖼️ Enrichment results: decode ${metrics.decodeSuccesses}/${metrics.decodeAttempts}, images ${metrics.metadataFetchSuccesses}/${metrics.metadataFetchAttempts}, renderApi ${metrics.renderApiSuccesses}/${metrics.renderApiAttempts}`);
}

async function backfillImagesForExistingRows(supabase: any, tableName: string, rows: any[]): Promise<void> {
  const withImages = rows.filter((row) => typeof row.image_url === 'string' && row.image_url.length > 0);
  if (withImages.length === 0) return;

  const concurrency = Number(Deno.env.get('IMAGE_BACKFILL_CONCURRENCY') || '5');
  let cursor = 0;
  const workers = new Array(Math.max(1, concurrency)).fill(null).map(async () => {
    while (cursor < withImages.length) {
      const idx = cursor++;
      const article = withImages[idx];
      const { error } = await (supabase.from(tableName as any) as any)
        .update({ image_url: article.image_url })
        .eq('url', article.url)
        .is('image_url', null);

      if (error) {
        console.warn(`⚠️ Image backfill failed for ${tableName} (${article.url.substring(0, 80)}...):`, error.message || error);
      }
    }
  });

  await Promise.all(workers);
}

function shouldSendDecodeAlert(metrics: AlertMetrics): boolean {
  if (metrics.enrichmentCandidates < 20) return false;
  const decodeFailureRate = metrics.decodeAttempts > 0 ? metrics.decodeFailures / metrics.decodeAttempts : 0;
  const imageSuccessRate = metrics.metadataFetchAttempts > 0
    ? metrics.metadataFetchSuccesses / metrics.metadataFetchAttempts
    : 0;
  return decodeFailureRate > 0.4 || imageSuccessRate < 0.3;
}

async function sendDecodeAlertEmail(metrics: AlertMetrics): Promise<void> {
  const smtpUser = Deno.env.get('ALERT_SMTP_USER');
  const smtpPass = Deno.env.get('ALERT_SMTP_PASS');
  const smtpHost = Deno.env.get('ALERT_SMTP_HOST') || 'smtp.gmail.com';
  const smtpPort = Number(Deno.env.get('ALERT_SMTP_PORT') || '587');
  const alertTo = Deno.env.get('ALERT_EMAIL_TO') || 'faizuddinm@myb-site.com';

  if (!smtpUser || !smtpPass) {
    console.warn('⚠️ Alert email skipped: ALERT_SMTP_USER/ALERT_SMTP_PASS not configured');
    return;
  }

  const decodeFailureRate = metrics.decodeAttempts > 0
    ? ((metrics.decodeFailures / metrics.decodeAttempts) * 100).toFixed(1)
    : '0.0';
  const imageSuccessRate = metrics.metadataFetchAttempts > 0
    ? ((metrics.metadataFetchSuccesses / metrics.metadataFetchAttempts) * 100).toFixed(1)
    : '0.0';

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const sampleFailures = metrics.decodeFailureSamples
    .map((sample, i) => `${i + 1}. ${sample.reason} :: ${sample.url}`)
    .join('\n');

  const subject = `[snewweb] Image decode alert (${decodeFailureRate}% decode failures)`;
  const textBody = [
    'Image enrichment quality alert from scrape-news edge function.',
    '',
    `Total fetched: ${metrics.totalArticlesFetched}`,
    `Enrichment candidates: ${metrics.enrichmentCandidates}`,
    `Decode attempts: ${metrics.decodeAttempts}`,
    `Decode successes: ${metrics.decodeSuccesses}`,
    `Decode failures: ${metrics.decodeFailures}`,
    `Decode failure rate: ${decodeFailureRate}%`,
    `Metadata fetch attempts: ${metrics.metadataFetchAttempts}`,
    `Metadata fetch successes: ${metrics.metadataFetchSuccesses}`,
    `Metadata fetch failures: ${metrics.metadataFetchFailures}`,
    `Image success rate: ${imageSuccessRate}%`,
    `Images resolved from enrichment: ${metrics.imagesResolvedFromEnrichment}`,
    '',
    'Sample decode failures:',
    sampleFailures || 'None collected',
  ].join('\n');

  await transporter.sendMail({
    from: smtpUser,
    to: alertTo,
    subject,
    text: textBody,
  });

  console.log(`📧 Decode alert email sent to ${alertTo}`);
}

function sourceKey(article: any): string {
  return (article.source_name || 'unknown').toLowerCase().trim();
}

function applyDiversityRulesNewestFirst(
  articles: any[],
  targetLimit: number,
  maxPerSourcePercent = 0.25,
  maxConsecutiveFromSameSource = 2
): any[] {
  const sorted = [...articles].sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

  if (sorted.length === 0) return [];

  const perSourceCap = Math.max(1, Math.floor(sorted.length * maxPerSourcePercent));
  const countsBySource = new Map<string, number>();
  const selected: any[] = [];
  const remaining = [...sorted];

  while (remaining.length > 0 && selected.length < targetLimit) {
    let chosenIndex = -1;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const key = sourceKey(candidate);
      const count = countsBySource.get(key) || 0;
      if (count >= perSourceCap) continue;

      const recent = selected.slice(-maxConsecutiveFromSameSource);
      if (
        recent.length === maxConsecutiveFromSameSource &&
        recent.every((item) => sourceKey(item) === key)
      ) {
        continue;
      }

      // remaining is already newest-first, so first valid candidate preserves recency.
      chosenIndex = i;
      break;
    }

    if (chosenIndex === -1) {
      break;
    }

    const [chosen] = remaining.splice(chosenIndex, 1);
    const key = sourceKey(chosen);
    countsBySource.set(key, (countsBySource.get(key) || 0) + 1);
    selected.push(chosen);
  }

  if (selected.length < targetLimit && remaining.length > 0) {
    for (const fallback of remaining) {
      if (selected.length >= targetLimit) break;
      const key = sourceKey(fallback);
      const recent = selected.slice(-maxConsecutiveFromSameSource);
      if (
        recent.length === maxConsecutiveFromSameSource &&
        recent.every((item) => sourceKey(item) === key)
      ) {
        continue;
      }
      selected.push(fallback);
    }
  }

  console.log(`📊 Diversity output: selected ${selected.length}/${Math.min(targetLimit, sorted.length)} (source cap ${Math.round(maxPerSourcePercent * 100)}%, streak max ${maxConsecutiveFromSameSource})`);
  return selected;
}

// Note: We're using Google News URLs directly - no need for redirect resolution
// Google News RSS article URLs work fine when clicked

interface RegionConfig {
  region: string;
  countries: { code: string; name: string }[];
}

// Priority news sources for Asia region (higher number = higher priority)
// These sources will be displayed first
// Key can be source name or domain
const asiaPrioritySources: Record<string, number> = {
  // Domains - priority boosts (Dawn and TOI removed to avoid dominance)
  // 'dawn.com': 10,                    // Commented out - no longer fetching Dawn directly
  // 'timesofindia.com': 10,            // Commented out - avoid TOI dominance
  // 'timesofindia.indiatimes.com': 10, // Commented out - avoid TOI dominance
  'dailyindependent.com.pk': 5,
  'hindustantimes.com': 5,
  'thehindu.com': 5,
  'indianexpress.com': 5,
  'deccanherald.com': 5,
  'tribuneindia.com': 5,
  'thenews.com.pk': 5,
  'scmp.com': 5,
  'chinadaily.com.cn': 5,
  'japantimes.co.jp': 5,
  'straitstimes.com': 5,
  'arabnews.com': 5,
  'koreatimes.co.kr': 5,
  'koreaherald.com': 5,
  // Source names (for RSS feed source tags)
  // 'dawn': 10,           // Commented out - no longer fetching Dawn directly
  // 'times of india': 10,     // Commented out - avoid TOI dominance
  // 'the times of india': 10, // Commented out - avoid TOI dominance
  // 'toi': 10,                // Commented out - avoid TOI dominance
  'hindustan times': 5,
  'the hindu': 5,
  'indian express': 5,
  'deccan herald': 5,
  'the tribune': 5,
  'the news international': 5,
  'south china morning post': 5,
  'china daily': 5,
  'japan times': 5,
  'straits times': 5,
  'arab news': 5,
  'korea times': 5,
  'korea herald': 5,
  // Add more trusted sources as needed
};

function extractDomainFromUrl(url: string): string {
  try {
    // Extract domain from URL
    // For Dawn.com direct URLs, extract the domain
    // For Google News URLs, we can't extract the real domain easily
    const urlObj = new URL(url);
    let hostname = urlObj.hostname.toLowerCase().replace('www.', '');

    // If it's a Google News URL, we can't extract the real domain easily
    // The source_name from RSS is more reliable
    if (hostname.includes('news.google.com')) {
      return ''; // Can't extract from Google News redirect
    }

    return hostname;
  } catch (e) {
    return '';
  }
}

function getSourcePriority(sourceName: string, region: string, url?: string): number {
  if (region === 'Asia') {
    const sourceLower = sourceName.toLowerCase().trim();

    // First check source name - try both exact and partial matches
    for (const [source, priority] of Object.entries(asiaPrioritySources)) {
      const sourceKey = source.toLowerCase();
      // Check if source name contains the key, or key contains source name
      if (sourceLower.includes(sourceKey) || sourceKey.includes(sourceLower)) {
        console.log(`   ✅ Priority match (source name): "${sourceName}" matches "${source}" (priority: ${priority})`);
        return priority;
      }
    }

    // Also check for common variations and abbreviations
    // Times of India variations
    if (sourceLower.includes('toi') || sourceLower.includes('timesofindia') || sourceLower.includes('times of india')) {
      console.log(`   ✅ Priority match (variation): "${sourceName}" -> Times of India (priority: 10)`);
      return 10;
    }
    // Hindustan Times variations
    if (sourceLower.includes('ht ') || sourceLower.includes('hindustantimes') || sourceLower.includes('hindustan times')) {
      console.log(`   ✅ Priority match (variation): "${sourceName}" -> Hindustan Times (priority: 5)`);
      return 5;
    }
    // The Hindu variations
    if (sourceLower.includes('thehindu') || sourceLower.includes('the hindu')) {
      console.log(`   ✅ Priority match (variation): "${sourceName}" -> The Hindu (priority: 5)`);
      return 5;
    }
    // Indian Express variations
    if (sourceLower.includes('indianexpress') || sourceLower.includes('indian express')) {
      console.log(`   ✅ Priority match (variation): "${sourceName}" -> Indian Express (priority: 5)`);
      return 5;
    }

    // Then check URL domain if available (for non-Google News URLs)
    if (url) {
      const domain = extractDomainFromUrl(url);
      if (domain) {
        for (const [source, priority] of Object.entries(asiaPrioritySources)) {
          const sourceKey = source.toLowerCase();
          if (domain.includes(sourceKey) || sourceKey.includes(domain)) {
            console.log(`   ✅ Priority match (domain): "${domain}" matches "${source}" (priority: ${priority})`);
            return priority;
          }
        }
      }
    }
  }
  return 0; // Default priority for non-priority sources
}

// Non-English country codes — we use gl=US for these to get English-language results
// (their native Google News editions serve articles in the local language)
const nonEnglishCountries = new Set([
  // South America
  'BR', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'UY',
  // Europe (non-English)
  'FR', 'DE', 'IT', 'ES', 'NL', 'SE', 'PL',
  // North America
  'MX',
]);

// Helper: get the gl/ceid country code to use for Google News RSS
// Non-English countries use US edition so results are in English
function getGoogleNewsGl(countryCode: string): { gl: string; ceid: string } {
  if (nonEnglishCountries.has(countryCode)) {
    return { gl: 'US', ceid: 'US:en' };
  }
  return { gl: countryCode, ceid: `${countryCode}:en` };
}

// Country code to region mapping
const countryToRegion: Record<string, string> = {
  // Africa
  'ZA': 'Africa', 'NG': 'Africa', 'EG': 'Africa', 'KE': 'Africa', 'GH': 'Africa', 'MA': 'Africa', 'ET': 'Africa', 'TZ': 'Africa',
  // Asia
  'IN': 'Asia', 'CN': 'Asia', 'JP': 'Asia', 'SG': 'Asia', 'SA': 'Asia', 'KR': 'Asia', 'PK': 'Asia', 'NP': 'Asia', 'IR': 'Asia', 'SY': 'Asia', 'BD': 'Asia', 'IL': 'Asia', 'LK': 'Asia', 'AF': 'Asia', 'QA': 'Asia', 'JO': 'Asia', 'OM': 'Asia', 'YE': 'Asia', 'AE': 'Asia',
  // Europe
  'GB': 'Europe', 'FR': 'Europe', 'DE': 'Europe', 'IT': 'Europe', 'ES': 'Europe', 'NL': 'Europe', 'SE': 'Europe', 'PL': 'Europe',
  // North America
  'US': 'North America', 'CA': 'North America', 'MX': 'North America',
  // Oceania
  'AU': 'Oceania', 'NZ': 'Oceania', 'FJ': 'Oceania', 'PG': 'Oceania',
  // South America
  'BR': 'South America', 'AR': 'South America', 'CO': 'South America', 'CL': 'South America', 'PE': 'South America', 'VE': 'South America', 'EC': 'South America', 'UY': 'South America',
};

// Country name keywords (for detecting country from article content)
const countryKeywords: Record<string, string[]> = {
  'US': ['united states', 'usa', 'america', 'american', 'tennessee', 'texas', 'california', 'new york', 'washington', 'florida'],
  'CA': ['canada', 'canadian', 'quebec', 'ontario', 'toronto', 'vancouver', 'montreal'],
  'MX': ['mexico', 'mexican'],
  'BR': ['brazil', 'brazilian', 'brasil', 'são paulo', 'rio de janeiro'],
  'AR': ['argentina', 'argentine', 'buenos aires'],
  'IN': ['india', 'indian', 'delhi', 'mumbai', 'bangalore', 'kolkata'],
  'NP': ['nepal', 'nepali', 'nepalese', 'kathmandu', 'pokhara'],
  'IR': ['iran', 'iranian', 'tehran', 'persian'],
  'SY': ['syria', 'syrian', 'damascus', 'aleppo'],
  'BD': ['bangladesh', 'bangladeshi', 'dhaka', 'chittagong'],
  'IL': ['israel', 'israeli', 'tel aviv', 'jerusalem'],
  'LK': ['sri lanka', 'sri lankan', 'colombo', 'sinhala', 'sinhalese'],
  'AF': ['afghanistan', 'afghan', 'kabul', 'taliban'],
  'QA': ['qatar', 'qatari', 'doha'],
  'JO': ['jordan', 'jordanian', 'amman'],
  'OM': ['oman', 'omani', 'muscat'],
  'YE': ['yemen', 'yemeni', 'sanaa', 'aden', 'houthi'],
  'CN': ['china', 'chinese', 'beijing', 'shanghai', 'hong kong'],
  'JP': ['japan', 'japanese', 'tokyo', 'osaka'],
  'GB': ['united kingdom', 'uk', 'britain', 'british', 'london', 'england', 'scotland'],
  'FR': ['france', 'french', 'paris'],
  'DE': ['germany', 'german', 'berlin'],
  'AU': ['australia', 'australian', 'sydney', 'melbourne'],
  'NZ': ['new zealand', 'zealand', 'auckland', 'wellington'],
};

// TLD to country code mapping
// Note: .co is ambiguous (used by Colombia but also by many international companies)
// We'll only use it if it's clearly a Colombian domain (ends with .co and not .co.XX)
const tldToCountry: Record<string, string> = {
  '.us': 'US', '.ca': 'CA', '.mx': 'MX', '.br': 'BR', '.ar': 'AR', '.cl': 'CL', '.pe': 'PE', '.ve': 'VE', '.ec': 'EC', '.uy': 'UY',
  '.in': 'IN', '.cn': 'CN', '.jp': 'JP', '.sg': 'SG', '.sa': 'SA', '.kr': 'KR', '.pk': 'PK', '.np': 'NP', '.ir': 'IR', '.sy': 'SY', '.bd': 'BD', '.il': 'IL', '.lk': 'LK', '.af': 'AF', '.qa': 'QA', '.jo': 'JO', '.om': 'OM', '.ye': 'YE', '.ae': 'AE',
  '.uk': 'GB', '.fr': 'FR', '.de': 'DE', '.it': 'IT', '.es': 'ES', '.nl': 'NL', '.se': 'SE', '.pl': 'PL',
  '.za': 'ZA', '.ng': 'NG', '.eg': 'EG', '.ke': 'KE', '.gh': 'GH', '.ma': 'MA', '.et': 'ET', '.tz': 'TZ',
  '.au': 'AU', '.nz': 'NZ', '.fj': 'FJ', '.pg': 'PG',
  // Colombia - only match if it's .co and NOT .co.XX (which would be a subdomain)
  // We'll handle .co specially in the detection function
};

function getRegionFromCountry(countryCode: string): string {
  return countryToRegion[countryCode] || 'Unknown';
}

function detectArticleCountry(title: string, snippet: string, url: string, sourceName: string, defaultCountry: string): string {
  const text = `${title} ${snippet} ${sourceName}`.toLowerCase();

  // Check URL TLD (but be careful with ambiguous TLDs like .co)
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Special handling for .co - only match if it's clearly Colombia (.co at the end, not .co.XX)
    // Many international sites use .co (like google.co.in, which is India, not Colombia)
    if (hostname.endsWith('.co') && !hostname.match(/\.co\.[a-z]{2,}$/)) {
      // Check if it's actually a Colombian domain by looking for Colombian keywords
      if (text.includes('colombia') || text.includes('colombian') || text.includes('bogota') || text.includes('medellin')) {
        console.log(`   Detected country from TLD: CO (.co) with Colombian context`);
        return 'CO';
      }
      // Otherwise, .co is ambiguous - don't use it, continue to other detection methods
    }

    // Check other TLDs
    for (const [tld, country] of Object.entries(tldToCountry)) {
      // Match if hostname ends with the TLD (exact match or as part of a longer TLD)
      if (hostname.endsWith(tld)) {
        console.log(`   Detected country from TLD: ${country} (${tld})`);
        return country;
      }
    }
  } catch (e) {
    // URL parsing failed, continue with other methods
  }

  // Check for country keywords in title/snippet
  for (const [countryCode, keywords] of Object.entries(countryKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        console.log(`   Detected country from keywords: ${countryCode} (keyword: "${keyword}")`);
        return countryCode;
      }
    }
  }

  // Default to the RSS feed's country if we can't detect
  console.log(`   Using default country from RSS feed: ${defaultCountry}`);
  return defaultCountry;
}

const regionConfigs: RegionConfig[] = [
  {
    region: 'Africa',
    countries: [
      { code: 'ZA', name: 'South Africa' },
      { code: 'NG', name: 'Nigeria' },
      { code: 'EG', name: 'Egypt' },
      { code: 'KE', name: 'Kenya' },
      { code: 'GH', name: 'Ghana' },
      { code: 'MA', name: 'Morocco' },
      { code: 'ET', name: 'Ethiopia' },
      { code: 'TZ', name: 'Tanzania' },
    ]
  },
  {
    region: 'Asia',
    countries: [
      { code: 'IN', name: 'India' },
      { code: 'CN', name: 'China' },
      { code: 'JP', name: 'Japan' },
      { code: 'SG', name: 'Singapore' },
      { code: 'SA', name: 'Saudi Arabia' },
      { code: 'KR', name: 'South Korea' },
      { code: 'PK', name: 'Pakistan' },
      { code: 'NP', name: 'Nepal' },
      { code: 'IR', name: 'Iran' },
      { code: 'SY', name: 'Syria' },
      { code: 'BD', name: 'Bangladesh' },
      { code: 'IL', name: 'Israel' },
      { code: 'LK', name: 'Sri Lanka' },
      { code: 'AF', name: 'Afghanistan' },
      { code: 'QA', name: 'Qatar' },
      { code: 'JO', name: 'Jordan' },
      { code: 'OM', name: 'Oman' },
      { code: 'YE', name: 'Yemen' },
      { code: 'AE', name: 'United Arab Emirates' },
    ]
  },
  {
    region: 'Europe',
    countries: [
      { code: 'GB', name: 'United Kingdom' },
      { code: 'FR', name: 'France' },
      { code: 'DE', name: 'Germany' },
      { code: 'IT', name: 'Italy' },
      { code: 'ES', name: 'Spain' },
      { code: 'NL', name: 'Netherlands' },
      { code: 'SE', name: 'Sweden' },
      { code: 'PL', name: 'Poland' },
    ]
  },
  {
    region: 'North America',
    countries: [
      { code: 'US', name: 'United States' },
      { code: 'CA', name: 'Canada' },
      { code: 'MX', name: 'Mexico' },
    ]
  },
  {
    region: 'Oceania',
    countries: [
      { code: 'AU', name: 'Australia' },
      { code: 'NZ', name: 'New Zealand' },
      { code: 'FJ', name: 'Fiji' },
      { code: 'PG', name: 'Papua New Guinea' },
    ]
  },
  {
    region: 'South America',
    countries: [
      { code: 'BR', name: 'Brazil' },
      { code: 'AR', name: 'Argentina' },
      { code: 'CO', name: 'Colombia' },
      { code: 'CL', name: 'Chile' },
      { code: 'PE', name: 'Peru' },
      { code: 'VE', name: 'Venezuela' },
      { code: 'EC', name: 'Ecuador' },
      { code: 'UY', name: 'Uruguay' },
    ]
  },
];

async function fetchNewsFromRegion(region: RegionConfig, category: string | null, limitCountries = false, maxArticles = 9999): Promise<any[]> {
  // For faster initial results, fetch from first 3 countries per region
  // For full fetch, get all countries
  const countriesToFetch = limitCountries ? region.countries.slice(0, 3) : region.countries;

  const countryPromises = countriesToFetch.map(async (country) => {
    try {
      const categoryLabel = category ? ` [${category}]` : '';
      console.log(`Fetching news from ${country.name} (${region.region})${categoryLabel}...`)

      const urls: string[] = [];

      if (country.code === 'PK') {
        // Pakistan: Use Google News RSS with PK locale and when:4d filter for source variety
        const pkBase = `${GOOGLE_NEWS_RSS_BASE}/search`;
        if (!category || category === 'general') {
          urls.push(`${pkBase}?q=Pakistan+when:4d&hl=en-PK&gl=PK&ceid=PK:en`);
          console.log(`🔗 Pakistan RSS URL [General]: ${urls[urls.length - 1]}`);
        } else if (category === 'tech-ai') {
          urls.push(`${pkBase}?q=Pakistan+Technology+OR+AI+when:4d&hl=en-PK&gl=PK&ceid=PK:en`);
          console.log(`🔗 Pakistan RSS URL [Tech & AI]: ${urls[urls.length - 1]}`);
        } else if (category === 'business-finance') {
          urls.push(`${pkBase}?q=Pakistan+Business+OR+Economy+when:4d&hl=en-PK&gl=PK&ceid=PK:en`);
          console.log(`🔗 Pakistan RSS URL [Business]: ${urls[urls.length - 1]}`);
        } else if (category === 'politics') {
          urls.push(`${pkBase}?q=Pakistan+Politics+when:4d&hl=en-PK&gl=PK&ceid=PK:en`);
          console.log(`🔗 Pakistan RSS URL [Politics]: ${urls[urls.length - 1]}`);
        } else if (category === 'arts-entertainment-fashion') {
          urls.push(`${pkBase}?q=Pakistan+Arts+OR+Entertainment+OR+Fashion+when:4d&hl=en-PK&gl=PK&ceid=PK:en`);
          console.log(`🔗 Pakistan RSS URL [Arts/Entertainment]: ${urls[urls.length - 1]}`);
        } else if (category === 'sports-games') {
          urls.push(`${pkBase}?q=Pakistan+Sports+OR+Gaming+when:4d&hl=en-PK&gl=PK&ceid=PK:en`);
          console.log(`🔗 Pakistan RSS URL [Sports]: ${urls[urls.length - 1]}`);
        } else if (category === 'travel-leisure') {
          urls.push(`${pkBase}?q=Pakistan+Travel+OR+Leisure+when:4d&hl=en-PK&gl=PK&ceid=PK:en`);
          console.log(`🔗 Pakistan RSS URL [Travel]: ${urls[urls.length - 1]}`);
        } else if (category === 'religion-spirituality') {
          urls.push(`${pkBase}?q=Pakistan+Religion+OR+Spirituality+when:4d&hl=en-PK&gl=PK&ceid=PK:en`);
          console.log(`🔗 Pakistan RSS URL [Religion]: ${urls[urls.length - 1]}`);
        }
      } else if (country.code === 'IN') {
        // India: Use Google News RSS with IN locale and when:4d filter for source variety
        const inBase = `${GOOGLE_NEWS_RSS_BASE}/search`;
        if (!category || category === 'general') {
          urls.push(`${inBase}?q=India+when:4d&hl=en-IN&gl=IN&ceid=IN:en`);
          console.log(`🔗 India RSS URL [General]: ${urls[urls.length - 1]}`);
        } else if (category === 'tech-ai') {
          urls.push(`${inBase}?q=India+Technology+OR+AI+when:4d&hl=en-IN&gl=IN&ceid=IN:en`);
          console.log(`🔗 India RSS URL [Tech & AI]: ${urls[urls.length - 1]}`);
        } else if (category === 'business-finance') {
          urls.push(`${inBase}?q=India+Business+OR+Economy+when:4d&hl=en-IN&gl=IN&ceid=IN:en`);
          console.log(`🔗 India RSS URL [Business]: ${urls[urls.length - 1]}`);
        } else if (category === 'politics') {
          urls.push(`${inBase}?q=India+Politics+when:4d&hl=en-IN&gl=IN&ceid=IN:en`);
          console.log(`🔗 India RSS URL [Politics]: ${urls[urls.length - 1]}`);
        } else if (category === 'arts-entertainment-fashion') {
          urls.push(`${inBase}?q=India+Arts+OR+Entertainment+OR+Fashion+when:4d&hl=en-IN&gl=IN&ceid=IN:en`);
          console.log(`🔗 India RSS URL [Arts/Entertainment]: ${urls[urls.length - 1]}`);
        } else if (category === 'sports-games') {
          urls.push(`${inBase}?q=India+Sports+OR+Gaming+when:4d&hl=en-IN&gl=IN&ceid=IN:en`);
          console.log(`🔗 India RSS URL [Sports]: ${urls[urls.length - 1]}`);
        } else if (category === 'travel-leisure') {
          urls.push(`${inBase}?q=India+Travel+OR+Leisure+when:4d&hl=en-IN&gl=IN&ceid=IN:en`);
          console.log(`🔗 India RSS URL [Travel]: ${urls[urls.length - 1]}`);
        } else if (category === 'religion-spirituality') {
          urls.push(`${inBase}?q=India+Religion+OR+Spirituality+when:4d&hl=en-IN&gl=IN&ceid=IN:en`);
          console.log(`🔗 India RSS URL [Religion]: ${urls[urls.length - 1]}`);
        }
      } else if (country.code === 'NP') {
        // Nepal: Use specific Google News RSS URLs with when:4d time filter
        const nepalBase = `${GOOGLE_NEWS_RSS_BASE}/search`;
        if (!category || category === 'general') {
          urls.push(`${nepalBase}?q=Nepal+when:4d&hl=en-NP&gl=NP&ceid=NP:en`);
          console.log(`🔗 Nepal RSS URL [General]: ${urls[urls.length - 1]}`);
        } else if (category === 'tech-ai') {
          urls.push(`${nepalBase}?q=Nepal+Technology+OR+AI+when:4d&hl=en-NP&gl=NP&ceid=NP:en`);
          console.log(`🔗 Nepal RSS URL [Tech & AI]: ${urls[urls.length - 1]}`);
        } else if (category === 'business-finance') {
          urls.push(`${nepalBase}?q=Nepal+Business+OR+Economy+when:4d&hl=en-NP&gl=NP&ceid=NP:en`);
          console.log(`🔗 Nepal RSS URL [Business]: ${urls[urls.length - 1]}`);
        } else if (category === 'politics') {
          urls.push(`${nepalBase}?q=Nepal+Politics+when:4d&hl=en-NP&gl=NP&ceid=NP:en`);
          console.log(`🔗 Nepal RSS URL [Politics]: ${urls[urls.length - 1]}`);
        } else if (category === 'arts-entertainment-fashion') {
          urls.push(`${nepalBase}?q=Nepal+Arts+OR+Entertainment+OR+Fashion+when:4d&hl=en-NP&gl=NP&ceid=NP:en`);
          console.log(`🔗 Nepal RSS URL [Arts/Entertainment]: ${urls[urls.length - 1]}`);
        } else if (category === 'sports-games') {
          urls.push(`${nepalBase}?q=Nepal+Sports+OR+Gaming+when:4d&hl=en-NP&gl=NP&ceid=NP:en`);
          console.log(`🔗 Nepal RSS URL [Sports]: ${urls[urls.length - 1]}`);
        } else if (category === 'travel-leisure') {
          urls.push(`${nepalBase}?q=Nepal+Travel+OR+Leisure+when:4d&hl=en-NP&gl=NP&ceid=NP:en`);
          console.log(`🔗 Nepal RSS URL [Travel]: ${urls[urls.length - 1]}`);
        } else if (category === 'religion-spirituality') {
          urls.push(`${nepalBase}?q=Nepal+Religion+OR+Spirituality+when:4d&hl=en-NP&gl=NP&ceid=NP:en`);
          console.log(`🔗 Nepal RSS URL [Religion]: ${urls[urls.length - 1]}`);
        }
      } else if (country.code === 'IR') {
        // Iran: Use Google News RSS with US edition for English results and when:4d filter
        const iranBase = `${GOOGLE_NEWS_RSS_BASE}/search`;
        if (!category || category === 'general') {
          urls.push(`${iranBase}?q=Iran+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Iran RSS URL [General]: ${urls[urls.length - 1]}`);
        } else if (category === 'tech-ai') {
          urls.push(`${iranBase}?q=Iran+Technology+OR+AI+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Iran RSS URL [Tech & AI]: ${urls[urls.length - 1]}`);
        } else if (category === 'business-finance') {
          urls.push(`${iranBase}?q=Iran+Business+OR+Economy+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Iran RSS URL [Business]: ${urls[urls.length - 1]}`);
        } else if (category === 'politics') {
          urls.push(`${iranBase}?q=Iran+Politics+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Iran RSS URL [Politics]: ${urls[urls.length - 1]}`);
        } else if (category === 'arts-entertainment-fashion') {
          urls.push(`${iranBase}?q=Iran+Arts+OR+Entertainment+OR+Fashion+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Iran RSS URL [Arts/Entertainment]: ${urls[urls.length - 1]}`);
        } else if (category === 'sports-games') {
          urls.push(`${iranBase}?q=Iran+Sports+OR+Gaming+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Iran RSS URL [Sports]: ${urls[urls.length - 1]}`);
        } else if (category === 'travel-leisure') {
          urls.push(`${iranBase}?q=Iran+Travel+OR+Leisure+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Iran RSS URL [Travel]: ${urls[urls.length - 1]}`);
        } else if (category === 'religion-spirituality') {
          urls.push(`${iranBase}?q=Iran+Religion+OR+Spirituality+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Iran RSS URL [Religion]: ${urls[urls.length - 1]}`);
        }
      } else if (country.code === 'SY') {
        // Syria: Use Google News RSS with US edition for English results and when:4d filter
        const syriaBase = `${GOOGLE_NEWS_RSS_BASE}/search`;
        if (!category || category === 'general') {
          urls.push(`${syriaBase}?q=Syria+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Syria RSS URL [General]: ${urls[urls.length - 1]}`);
        } else if (category === 'tech-ai') {
          urls.push(`${syriaBase}?q=Syria+Technology+OR+AI+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Syria RSS URL [Tech & AI]: ${urls[urls.length - 1]}`);
        } else if (category === 'business-finance') {
          urls.push(`${syriaBase}?q=Syria+Business+OR+Economy+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Syria RSS URL [Business]: ${urls[urls.length - 1]}`);
        } else if (category === 'politics') {
          urls.push(`${syriaBase}?q=Syria+Politics+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Syria RSS URL [Politics]: ${urls[urls.length - 1]}`);
        } else if (category === 'arts-entertainment-fashion') {
          urls.push(`${syriaBase}?q=Syria+Arts+OR+Entertainment+OR+Fashion+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Syria RSS URL [Arts/Entertainment]: ${urls[urls.length - 1]}`);
        } else if (category === 'sports-games') {
          urls.push(`${syriaBase}?q=Syria+Sports+OR+Gaming+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Syria RSS URL [Sports]: ${urls[urls.length - 1]}`);
        } else if (category === 'travel-leisure') {
          urls.push(`${syriaBase}?q=Syria+Travel+OR+Leisure+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Syria RSS URL [Travel]: ${urls[urls.length - 1]}`);
        } else if (category === 'religion-spirituality') {
          urls.push(`${syriaBase}?q=Syria+Religion+OR+Spirituality+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Syria RSS URL [Religion]: ${urls[urls.length - 1]}`);
        }
      } else if (country.code === 'BD') {
        // Bangladesh: Use Google News RSS with BD locale and when:4d filter
        const bdBase = `${GOOGLE_NEWS_RSS_BASE}/search`;
        if (!category || category === 'general') {
          urls.push(`${bdBase}?q=Bangladesh+when:4d&hl=en-BD&gl=BD&ceid=BD:en`);
          console.log(`🔗 Bangladesh RSS URL [General]: ${urls[urls.length - 1]}`);
        } else if (category === 'tech-ai') {
          urls.push(`${bdBase}?q=Bangladesh+Technology+OR+AI+when:4d&hl=en-BD&gl=BD&ceid=BD:en`);
          console.log(`🔗 Bangladesh RSS URL [Tech & AI]: ${urls[urls.length - 1]}`);
        } else if (category === 'business-finance') {
          urls.push(`${bdBase}?q=Bangladesh+Business+OR+Economy+when:4d&hl=en-BD&gl=BD&ceid=BD:en`);
          console.log(`🔗 Bangladesh RSS URL [Business]: ${urls[urls.length - 1]}`);
        } else if (category === 'politics') {
          urls.push(`${bdBase}?q=Bangladesh+Politics+when:4d&hl=en-BD&gl=BD&ceid=BD:en`);
          console.log(`🔗 Bangladesh RSS URL [Politics]: ${urls[urls.length - 1]}`);
        } else if (category === 'arts-entertainment-fashion') {
          urls.push(`${bdBase}?q=Bangladesh+Arts+OR+Entertainment+OR+Fashion+when:4d&hl=en-BD&gl=BD&ceid=BD:en`);
          console.log(`🔗 Bangladesh RSS URL [Arts/Entertainment]: ${urls[urls.length - 1]}`);
        } else if (category === 'sports-games') {
          urls.push(`${bdBase}?q=Bangladesh+Sports+OR+Gaming+when:4d&hl=en-BD&gl=BD&ceid=BD:en`);
          console.log(`🔗 Bangladesh RSS URL [Sports]: ${urls[urls.length - 1]}`);
        } else if (category === 'travel-leisure') {
          urls.push(`${bdBase}?q=Bangladesh+Travel+OR+Leisure+when:4d&hl=en-BD&gl=BD&ceid=BD:en`);
          console.log(`🔗 Bangladesh RSS URL [Travel]: ${urls[urls.length - 1]}`);
        } else if (category === 'religion-spirituality') {
          urls.push(`${bdBase}?q=Bangladesh+Religion+OR+Spirituality+when:4d&hl=en-BD&gl=BD&ceid=BD:en`);
          console.log(`🔗 Bangladesh RSS URL [Religion]: ${urls[urls.length - 1]}`);
        }
      } else if (country.code === 'IL') {
        // Israel: Use Google News RSS with IL locale and when:4d filter
        const ilBase = `${GOOGLE_NEWS_RSS_BASE}/search`;
        if (!category || category === 'general') {
          urls.push(`${ilBase}?q=Israel+when:4d&hl=en-IL&gl=IL&ceid=IL:en`);
          console.log(`🔗 Israel RSS URL [General]: ${urls[urls.length - 1]}`);
        } else if (category === 'tech-ai') {
          urls.push(`${ilBase}?q=Israel+Technology+OR+AI+when:4d&hl=en-IL&gl=IL&ceid=IL:en`);
          console.log(`🔗 Israel RSS URL [Tech & AI]: ${urls[urls.length - 1]}`);
        } else if (category === 'business-finance') {
          urls.push(`${ilBase}?q=Israel+Business+OR+Economy+when:4d&hl=en-IL&gl=IL&ceid=IL:en`);
          console.log(`🔗 Israel RSS URL [Business]: ${urls[urls.length - 1]}`);
        } else if (category === 'politics') {
          urls.push(`${ilBase}?q=Israel+Politics+when:4d&hl=en-IL&gl=IL&ceid=IL:en`);
          console.log(`🔗 Israel RSS URL [Politics]: ${urls[urls.length - 1]}`);
        } else if (category === 'arts-entertainment-fashion') {
          urls.push(`${ilBase}?q=Israel+Arts+OR+Entertainment+OR+Fashion+when:4d&hl=en-IL&gl=IL&ceid=IL:en`);
          console.log(`🔗 Israel RSS URL [Arts/Entertainment]: ${urls[urls.length - 1]}`);
        } else if (category === 'sports-games') {
          urls.push(`${ilBase}?q=Israel+Sports+OR+Gaming+when:4d&hl=en-IL&gl=IL&ceid=IL:en`);
          console.log(`🔗 Israel RSS URL [Sports]: ${urls[urls.length - 1]}`);
        } else if (category === 'travel-leisure') {
          urls.push(`${ilBase}?q=Israel+Travel+OR+Leisure+when:4d&hl=en-IL&gl=IL&ceid=IL:en`);
          console.log(`🔗 Israel RSS URL [Travel]: ${urls[urls.length - 1]}`);
        } else if (category === 'religion-spirituality') {
          urls.push(`${ilBase}?q=Israel+Religion+OR+Spirituality+when:4d&hl=en-IL&gl=IL&ceid=IL:en`);
          console.log(`🔗 Israel RSS URL [Religion]: ${urls[urls.length - 1]}`);
        }
      } else if (country.code === 'LK') {
        // Sri Lanka: Use Google News RSS with LK locale and when:4d filter
        const lkBase = `${GOOGLE_NEWS_RSS_BASE}/search`;
        if (!category || category === 'general') {
          urls.push(`${lkBase}?q=Sri+Lanka+when:4d&hl=en-LK&gl=LK&ceid=LK:en`);
          console.log(`🔗 Sri Lanka RSS URL [General]: ${urls[urls.length - 1]}`);
        } else if (category === 'tech-ai') {
          urls.push(`${lkBase}?q=Sri+Lanka+Technology+OR+AI+when:4d&hl=en-LK&gl=LK&ceid=LK:en`);
          console.log(`🔗 Sri Lanka RSS URL [Tech & AI]: ${urls[urls.length - 1]}`);
        } else if (category === 'business-finance') {
          urls.push(`${lkBase}?q=Sri+Lanka+Business+OR+Economy+when:4d&hl=en-LK&gl=LK&ceid=LK:en`);
          console.log(`🔗 Sri Lanka RSS URL [Business]: ${urls[urls.length - 1]}`);
        } else if (category === 'politics') {
          urls.push(`${lkBase}?q=Sri+Lanka+Politics+when:4d&hl=en-LK&gl=LK&ceid=LK:en`);
          console.log(`🔗 Sri Lanka RSS URL [Politics]: ${urls[urls.length - 1]}`);
        } else if (category === 'arts-entertainment-fashion') {
          urls.push(`${lkBase}?q=Sri+Lanka+Arts+OR+Entertainment+OR+Fashion+when:4d&hl=en-LK&gl=LK&ceid=LK:en`);
          console.log(`🔗 Sri Lanka RSS URL [Arts/Entertainment]: ${urls[urls.length - 1]}`);
        } else if (category === 'sports-games') {
          urls.push(`${lkBase}?q=Sri+Lanka+Sports+OR+Gaming+when:4d&hl=en-LK&gl=LK&ceid=LK:en`);
          console.log(`🔗 Sri Lanka RSS URL [Sports]: ${urls[urls.length - 1]}`);
        } else if (category === 'travel-leisure') {
          urls.push(`${lkBase}?q=Sri+Lanka+Travel+OR+Leisure+when:4d&hl=en-LK&gl=LK&ceid=LK:en`);
          console.log(`🔗 Sri Lanka RSS URL [Travel]: ${urls[urls.length - 1]}`);
        } else if (category === 'religion-spirituality') {
          urls.push(`${lkBase}?q=Sri+Lanka+Religion+OR+Spirituality+when:4d&hl=en-LK&gl=LK&ceid=LK:en`);
          console.log(`🔗 Sri Lanka RSS URL [Religion]: ${urls[urls.length - 1]}`);
        }
      } else if (country.code === 'AF') {
        // Afghanistan: Use Google News RSS with US edition for English results and when:4d filter
        const afBase = `${GOOGLE_NEWS_RSS_BASE}/search`;
        if (!category || category === 'general') {
          urls.push(`${afBase}?q=Afghanistan+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Afghanistan RSS URL [General]: ${urls[urls.length - 1]}`);
        } else if (category === 'tech-ai') {
          urls.push(`${afBase}?q=Afghanistan+Technology+OR+AI+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Afghanistan RSS URL [Tech & AI]: ${urls[urls.length - 1]}`);
        } else if (category === 'business-finance') {
          urls.push(`${afBase}?q=Afghanistan+Business+OR+Economy+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Afghanistan RSS URL [Business]: ${urls[urls.length - 1]}`);
        } else if (category === 'politics') {
          urls.push(`${afBase}?q=Afghanistan+Politics+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Afghanistan RSS URL [Politics]: ${urls[urls.length - 1]}`);
        } else if (category === 'arts-entertainment-fashion') {
          urls.push(`${afBase}?q=Afghanistan+Arts+OR+Entertainment+OR+Fashion+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Afghanistan RSS URL [Arts/Entertainment]: ${urls[urls.length - 1]}`);
        } else if (category === 'sports-games') {
          urls.push(`${afBase}?q=Afghanistan+Sports+OR+Gaming+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Afghanistan RSS URL [Sports]: ${urls[urls.length - 1]}`);
        } else if (category === 'travel-leisure') {
          urls.push(`${afBase}?q=Afghanistan+Travel+OR+Leisure+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Afghanistan RSS URL [Travel]: ${urls[urls.length - 1]}`);
        } else if (category === 'religion-spirituality') {
          urls.push(`${afBase}?q=Afghanistan+Religion+OR+Spirituality+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Afghanistan RSS URL [Religion]: ${urls[urls.length - 1]}`);
        }
      } else if (country.code === 'QA') {
        // Qatar: Use Google News RSS with QA locale and when:4d filter
        const qaBase = `${GOOGLE_NEWS_RSS_BASE}/search`;
        if (!category || category === 'general') {
          urls.push(`${qaBase}?q=Qatar+when:4d&hl=en-QA&gl=QA&ceid=QA:en`);
          console.log(`🔗 Qatar RSS URL [General]: ${urls[urls.length - 1]}`);
        } else if (category === 'tech-ai') {
          urls.push(`${qaBase}?q=Qatar+Technology+OR+AI+when:4d&hl=en-QA&gl=QA&ceid=QA:en`);
          console.log(`🔗 Qatar RSS URL [Tech & AI]: ${urls[urls.length - 1]}`);
        } else if (category === 'business-finance') {
          urls.push(`${qaBase}?q=Qatar+Business+OR+Economy+when:4d&hl=en-QA&gl=QA&ceid=QA:en`);
          console.log(`🔗 Qatar RSS URL [Business]: ${urls[urls.length - 1]}`);
        } else if (category === 'politics') {
          urls.push(`${qaBase}?q=Qatar+Politics+when:4d&hl=en-QA&gl=QA&ceid=QA:en`);
          console.log(`🔗 Qatar RSS URL [Politics]: ${urls[urls.length - 1]}`);
        } else if (category === 'arts-entertainment-fashion') {
          urls.push(`${qaBase}?q=Qatar+Arts+OR+Entertainment+OR+Fashion+when:4d&hl=en-QA&gl=QA&ceid=QA:en`);
          console.log(`🔗 Qatar RSS URL [Arts/Entertainment]: ${urls[urls.length - 1]}`);
        } else if (category === 'sports-games') {
          urls.push(`${qaBase}?q=Qatar+Sports+OR+Gaming+when:4d&hl=en-QA&gl=QA&ceid=QA:en`);
          console.log(`🔗 Qatar RSS URL [Sports]: ${urls[urls.length - 1]}`);
        } else if (category === 'travel-leisure') {
          urls.push(`${qaBase}?q=Qatar+Travel+OR+Leisure+when:4d&hl=en-QA&gl=QA&ceid=QA:en`);
          console.log(`🔗 Qatar RSS URL [Travel]: ${urls[urls.length - 1]}`);
        } else if (category === 'religion-spirituality') {
          urls.push(`${qaBase}?q=Qatar+Religion+OR+Spirituality+when:4d&hl=en-QA&gl=QA&ceid=QA:en`);
          console.log(`🔗 Qatar RSS URL [Religion]: ${urls[urls.length - 1]}`);
        }
      } else if (country.code === 'JO') {
        // Jordan: Use Google News RSS with US edition for English results and when:4d filter
        const joBase = `${GOOGLE_NEWS_RSS_BASE}/search`;
        if (!category || category === 'general') {
          urls.push(`${joBase}?q=Jordan+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Jordan RSS URL [General]: ${urls[urls.length - 1]}`);
        } else if (category === 'tech-ai') {
          urls.push(`${joBase}?q=Jordan+Technology+OR+AI+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Jordan RSS URL [Tech & AI]: ${urls[urls.length - 1]}`);
        } else if (category === 'business-finance') {
          urls.push(`${joBase}?q=Jordan+Business+OR+Economy+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Jordan RSS URL [Business]: ${urls[urls.length - 1]}`);
        } else if (category === 'politics') {
          urls.push(`${joBase}?q=Jordan+Politics+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Jordan RSS URL [Politics]: ${urls[urls.length - 1]}`);
        } else if (category === 'arts-entertainment-fashion') {
          urls.push(`${joBase}?q=Jordan+Arts+OR+Entertainment+OR+Fashion+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Jordan RSS URL [Arts/Entertainment]: ${urls[urls.length - 1]}`);
        } else if (category === 'sports-games') {
          urls.push(`${joBase}?q=Jordan+Sports+OR+Gaming+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Jordan RSS URL [Sports]: ${urls[urls.length - 1]}`);
        } else if (category === 'travel-leisure') {
          urls.push(`${joBase}?q=Jordan+Travel+OR+Leisure+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Jordan RSS URL [Travel]: ${urls[urls.length - 1]}`);
        } else if (category === 'religion-spirituality') {
          urls.push(`${joBase}?q=Jordan+Religion+OR+Spirituality+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Jordan RSS URL [Religion]: ${urls[urls.length - 1]}`);
        }
      } else if (country.code === 'OM') {
        // Oman: Use Google News RSS with US edition for English results and when:4d filter
        const omBase = `${GOOGLE_NEWS_RSS_BASE}/search`;
        if (!category || category === 'general') {
          urls.push(`${omBase}?q=Oman+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Oman RSS URL [General]: ${urls[urls.length - 1]}`);
        } else if (category === 'tech-ai') {
          urls.push(`${omBase}?q=Oman+Technology+OR+AI+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Oman RSS URL [Tech & AI]: ${urls[urls.length - 1]}`);
        } else if (category === 'business-finance') {
          urls.push(`${omBase}?q=Oman+Business+OR+Economy+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Oman RSS URL [Business]: ${urls[urls.length - 1]}`);
        } else if (category === 'politics') {
          urls.push(`${omBase}?q=Oman+Politics+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Oman RSS URL [Politics]: ${urls[urls.length - 1]}`);
        } else if (category === 'arts-entertainment-fashion') {
          urls.push(`${omBase}?q=Oman+Arts+OR+Entertainment+OR+Fashion+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Oman RSS URL [Arts/Entertainment]: ${urls[urls.length - 1]}`);
        } else if (category === 'sports-games') {
          urls.push(`${omBase}?q=Oman+Sports+OR+Gaming+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Oman RSS URL [Sports]: ${urls[urls.length - 1]}`);
        } else if (category === 'travel-leisure') {
          urls.push(`${omBase}?q=Oman+Travel+OR+Leisure+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Oman RSS URL [Travel]: ${urls[urls.length - 1]}`);
        } else if (category === 'religion-spirituality') {
          urls.push(`${omBase}?q=Oman+Religion+OR+Spirituality+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Oman RSS URL [Religion]: ${urls[urls.length - 1]}`);
        }
      } else if (country.code === 'YE') {
        // Yemen: Use Google News RSS with US edition for English results and when:4d filter
        const yeBase = `${GOOGLE_NEWS_RSS_BASE}/search`;
        if (!category || category === 'general') {
          urls.push(`${yeBase}?q=Yemen+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Yemen RSS URL [General]: ${urls[urls.length - 1]}`);
        } else if (category === 'tech-ai') {
          urls.push(`${yeBase}?q=Yemen+Technology+OR+AI+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Yemen RSS URL [Tech & AI]: ${urls[urls.length - 1]}`);
        } else if (category === 'business-finance') {
          urls.push(`${yeBase}?q=Yemen+Business+OR+Economy+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Yemen RSS URL [Business]: ${urls[urls.length - 1]}`);
        } else if (category === 'politics') {
          urls.push(`${yeBase}?q=Yemen+Politics+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Yemen RSS URL [Politics]: ${urls[urls.length - 1]}`);
        } else if (category === 'arts-entertainment-fashion') {
          urls.push(`${yeBase}?q=Yemen+Arts+OR+Entertainment+OR+Fashion+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Yemen RSS URL [Arts/Entertainment]: ${urls[urls.length - 1]}`);
        } else if (category === 'sports-games') {
          urls.push(`${yeBase}?q=Yemen+Sports+OR+Gaming+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Yemen RSS URL [Sports]: ${urls[urls.length - 1]}`);
        } else if (category === 'travel-leisure') {
          urls.push(`${yeBase}?q=Yemen+Travel+OR+Leisure+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Yemen RSS URL [Travel]: ${urls[urls.length - 1]}`);
        } else if (category === 'religion-spirituality') {
          urls.push(`${yeBase}?q=Yemen+Religion+OR+Spirituality+when:4d&hl=en-US&gl=US&ceid=US:en`);
          console.log(`🔗 Yemen RSS URL [Religion]: ${urls[urls.length - 1]}`);
        }
      } else {
        // Other countries: Use Google News RSS
        // South American countries use gl=US so results are in English
        const { gl, ceid } = getGoogleNewsGl(country.code);
        const locale = getLocaleForCountry(country.code); // 'en' for SA, native for others
        if (category && categoryQueries[category]) {
          // Category-specific search
          const categoryQuery = categoryQueries[category];
          const queryString = buildGoogleNewsQuery(categoryQuery, country.name);
          urls.push(`${GOOGLE_NEWS_RSS_BASE}/search?q=${queryString}&gl=${gl}&hl=${locale}&ceid=${ceid}`);
          console.log(`🔗 RSS URL [${category}]: ${urls[0]}`);
        } else {
          // General news
          const generalQuery = buildGoogleNewsQuery('general', country.name);
          urls.push(`${GOOGLE_NEWS_RSS_BASE}/search?q=${generalQuery}&gl=${gl}&hl=${locale}&ceid=${ceid}`);
          console.log(`🔗 RSS URL [General]: ${urls[0]}`);
        }
        console.log(`   Country: ${country.name} (${country.code}), Region: ${region.region}, gl: ${gl}`);
      }

      // Fetch from all URLs and combine results
      const allArticles: any[] = [];

      for (const url of urls) {
        try {
          const response = await fetchWithRetry(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
              'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
              'Cache-Control': 'no-cache'
            }
          }, 2)

          if (!response.ok) {
            console.error(`Failed to fetch news from ${url}: ${response.status}`)
            continue
          }

          const xmlText = await response.text()
          console.log(`📥 RSS feed response length: ${xmlText.length} characters`);
          console.log(`📥 First 500 chars of RSS: ${xmlText.substring(0, 500)}`);

          const parsedArticles = await parseRSSFeed(xmlText, country.name, country.code, region.region, category, maxArticles)
          console.log(`✅ Fetched ${parsedArticles.length} articles from ${url}`);

          allArticles.push(...parsedArticles);
        } catch (error) {
          console.error(`Error fetching from ${url}:`, error);
          // Continue to next URL
        }
      }

      console.log(`✅ Total fetched ${allArticles.length} articles from ${country.name} (${country.code})`);

      // Log country codes of parsed articles to verify they're correct
      if (allArticles.length > 0) {
        const countryCodes = allArticles.map(a => a.source_country);
        console.log(`   Country codes in articles: ${[...new Set(countryCodes)].join(', ')}`);
      }

      return allArticles;
    } catch (error) {
      console.error(`Error fetching news from ${country.name}:`, error)
      return []
    }
  })

  // Run all country fetches in parallel to speed up scraping
  const results = await Promise.allSettled(countryPromises)

  // Log results for each country
  results.forEach((result, index) => {
    const country = countriesToFetch[index];
    if (result.status === 'fulfilled') {
      const articles = result.value;
      console.log(`✅ ${country.name}: Successfully fetched ${articles.length} articles`);
    } else {
      console.error(`❌ ${country.name}: Failed to fetch - ${result.reason}`);
    }
  });

  const articles = results.flatMap((res) => (res.status === 'fulfilled' ? res.value : []))
  console.log(`📊 Total articles from ${region.region}: ${articles.length} from ${results.filter(r => r.status === 'fulfilled').length}/${countriesToFetch.length} countries`);
  return articles
}

async function parseRSSFeed(xml: string, countryName: string, countryCode: string, region: string, category: string | null = null, maxArticles = 6): Promise<any[]> {
  const articles: any[] = [];
  console.log(`parseRSSFeed called with category: "${category}" for ${countryName}, maxArticles: ${maxArticles}`);
  console.log(`📥 XML length: ${xml.length} characters`);

  const decode = (str: string) =>
    (str || '')
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&quot;/g, '"')
      .replace(/&apos;|&#x27;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

  // Extract channel title to determine feed type
  const channelTitleMatch = xml.match(/<channel>[\s\S]*?<title>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/);
  const channelTitle = channelTitleMatch ? decode((channelTitleMatch[1] ?? channelTitleMatch[2]) || '') : '';
  // const isDawnFeed = channelTitle.toLowerCase().includes('dawn') || xml.includes('dawn.com'); // Dawn feeds no longer used
  const isDawnFeed = false; // Dawn.com feeds disabled
  // Only detect as TOI feed if the channel title says "Times of India".
  // Do NOT check xml.includes('timesofindia.indiatimes.com') — Google News India feeds
  // contain TOI article links, which would falsely flag the whole feed as TOI and
  // label every article "Times of India" regardless of actual source.
  const isTOIFeed = channelTitle.toLowerCase().includes('times of india');
  const defaultSourceName = isTOIFeed ? 'Times of India' : `News from ${countryName}`;

  const feedType = isTOIFeed ? 'Times of India' : 'Google News/Other';
  console.log(`📰 RSS Feed type: ${feedType}, Channel: "${channelTitle}"`);

  // Parse RSS items - use split approach to handle various tag formats
  // Dawn.com uses <item> tags, but some feeds use <item ...> with attributes or trailing whitespace
  // Split on opening item tags (handles <item>, <item >, <item\n>, etc.)
  const rawItems = xml.split(/<item[\s>]/);
  // The first segment is before any <item>, so skip it
  const itemSegments = rawItems.slice(1).map(seg => {
    // Each segment is the content after <item ...> up to </item>
    const endIdx = seg.indexOf('</item>');
    return endIdx !== -1 ? seg.substring(0, endIdx) : seg;
  }).filter(seg => seg.trim().length > 0);

  console.log(`Found ${itemSegments.length} RSS items in feed`);

  if (itemSegments.length === 0) {
    console.warn(`⚠️ No <item> tags found in RSS feed. XML preview: ${xml.substring(0, 500)}...`);
    return articles;
  }

  // Extract and sort items by publish date (newest first) to prioritize recent articles
  const itemsWithDates: Array<{ itemXml: string; publishedAt: Date }> = [];

  for (const itemXml of itemSegments) {
    // Extract pubDate (supports CDATA or plain text)
    const pubDateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/pubDate>/);
    const rawPubDate = pubDateMatch ? (pubDateMatch[1] ?? pubDateMatch[2]) : null;
    const publishedAt = rawPubDate ? new Date(decode(rawPubDate)) : new Date(0); // Use epoch if no date

    if (!isNaN(publishedAt.getTime())) {
      itemsWithDates.push({ itemXml, publishedAt });
    } else if (rawPubDate) {
      console.log(`⚠️ Could not parse date: "${rawPubDate}"`);
    }
  }

  // Sort by date descending (newest first)
  itemsWithDates.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  console.log(`Sorted ${itemsWithDates.length} items by date (newest first)`);

  for (const { itemXml, publishedAt: itemPublishedAt } of itemsWithDates) {

    // Extract title (supports CDATA or plain text)
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/);
    const rawTitle = titleMatch ? (titleMatch[1] ?? titleMatch[2]) : null;
    if (!rawTitle) {
      console.log('⚠️ Skipping item: No title found');
      console.log(`   Item XML preview: ${itemXml.substring(0, 200)}...`);
      continue;
    }
    const title = decode(rawTitle);
    if (!title || title.trim().length === 0) {
      console.log('⚠️ Skipping item: Empty title after decoding');
      continue;
    }
    console.log(`📰 Processing article: "${title.substring(0, 50)}..."`);

    // Extract article URL (supports CDATA or plain text, similar to title)
    // For Google News RSS feeds, use the Google News redirect URL
    const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/link>/);
    if (!linkMatch || (!linkMatch[1] && !linkMatch[2])) {
      console.log('⚠️ Skipping item: No link found');
      continue;
    }

    const rawLink = linkMatch[1] ?? linkMatch[2];
    let url = decode(rawLink).trim();

    if (!url || url.length === 0) {
      console.log('⚠️ Skipping item: Empty link after decoding');
      continue;
    }

    // Check feed type for logging
    // if (url.includes('dawn.com')) {
    //   console.log(`🔗 Using Dawn.com direct URL: ${url.substring(0, 100)}...`);
    // } else
    if (url.includes('timesofindia.indiatimes.com')) {
      console.log(`🔗 Using Times of India direct URL: ${url.substring(0, 100)}...`);
    } else {
      console.log(`🔗 Using RSS feed URL: ${url.substring(0, 100)}...`);
    }

    // Extract description/snippet
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/)
    const rawDesc = descMatch ? (descMatch[1] ?? descMatch[2]) : ''
    const decodedDesc = decode(rawDesc);
    const snippet = decodedDesc.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);

    // Extract thumbnail image URL from description HTML or media tags
    // Google News RSS embeds <img src="..."> in the description CDATA
    let imageUrl: string | null = null;
    const imgMatch = rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i)
      ?? rawDesc.match(/<img[^>]+(?:data-src|data-original|data-lazy-src)=["']([^"']+)["']/i)
      ?? rawDesc.match(/<(?:img|source)[^>]+srcset=["']([^"']+)["']/i)
      ?? itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)
      ?? itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i)
      ?? itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image[^"']*["']/i);
    if (imgMatch) {
      const rawImageCandidate = imgMatch[1];
      imageUrl = rawImageCandidate.includes(',')
        ? (pickBestUrlFromSrcset(rawImageCandidate) || rawImageCandidate)
        : rawImageCandidate;
    }

    // Extract source
    // For Dawn.com feeds, use "Dawn" as source name
    // For Times of India feeds, use "Times of India" as source name
    // For other feeds, try to extract from <source> tag or use default
    let sourceName: string;
    if (isTOIFeed) {
      sourceName = 'Times of India';
    } else {
      const sourceMatch = itemXml.match(/<source[^>]*>(.*?)<\/source>/);
      sourceName = decode(sourceMatch ? sourceMatch[1] : defaultSourceName);
    }

    // Use the date we already extracted during sorting
    const publishedAt = itemPublishedAt;
    const publishedTime = publishedAt.getTime();

    // Filter out stale items (older than ~3 days to prioritize recent news)
    // For Times of India, use a longer window (14 days) since it's a trusted source
    // Google News feeds also get a wider window (7 days) to catch up after periods of inactivity
    const daysAgo = isTOIFeed ? 14 : 7;
    const cutoffTime = Date.now() - 1000 * 60 * 60 * 24 * daysAgo;

    if (isNaN(publishedTime)) {
      console.log(`⚠️ Skipping article: Invalid publish date`);
      console.log(`   Title: "${title.substring(0, 60)}..."`);
      continue;
    }

    if (publishedTime < cutoffTime) {
      const daysOld = Math.floor((Date.now() - publishedTime) / (1000 * 60 * 60 * 24));
      console.log(`⚠️ Skipping article: Too old (published: ${publishedAt.toISOString()}, ${daysOld} days ago, cutoff: ${daysAgo} days)`);
      console.log(`   Title: "${title.substring(0, 60)}..."`);
      continue;
    }

    console.log(`✅ Article date OK: ${publishedAt.toISOString()} (${Math.floor((Date.now() - publishedTime) / (1000 * 60 * 60 * 24))} days old)`);

    // Try to detect the actual country/region from the article
    // Google News RSS feeds can include international news, so we need to filter
    // For Dawn.com and Times of India feeds, trust the RSS feed country code
    const detectedCountry = detectArticleCountry(title, snippet, url, sourceName, countryCode);
    const detectedRegion = getRegionFromCountry(detectedCountry);

    // Filter logic: Only skip articles that are CLEARLY from a different region
    // Keep articles if:
    // 1. Detected country matches RSS feed country (default case - most articles)
    // 2. Detected region matches expected region
    // 3. Detected region is "Unknown" (can't determine, so trust RSS feed)
    // 4. For Times of India, always trust RSS feed country
    // Skip articles if:
    // - Detected region is known and doesn't match expected region AND detected country doesn't match RSS feed country
    // - For Google News feeds, be more strict: if detected country is clearly different (not just mentioned), skip it
    const isTrustedSource = isTOIFeed; // Dawn feeds disabled; only TOI is trusted source now

    // For Google News feeds, check if the detected country is clearly from a different region
    // and the article doesn't seem to be about the RSS feed's country
    let shouldSkip = false;
    if (!isTrustedSource) {
      // If detected country is from a different region and doesn't match RSS feed country
      if (detectedRegion !== 'Unknown' &&
        detectedRegion !== region &&
        detectedCountry !== countryCode) {
        // Additional check: if the article title/snippet doesn't contain the RSS feed country name,
        // it's likely not relevant to that country
        const countryNameLower = countryName.toLowerCase();
        const articleText = `${title} ${snippet}`.toLowerCase();
        const mentionsCountry = articleText.includes(countryNameLower);

        if (!mentionsCountry) {
          shouldSkip = true;
        }
      }
    }

    if (shouldSkip) {
      console.log(`⚠️ Skipping article: Detected country "${detectedCountry}" (region: "${detectedRegion}") doesn't match expected region "${region}" and doesn't mention "${countryName}"`);
      console.log(`   Article: "${title.substring(0, 60)}..."`);
      continue;
    }

    const articleCategory = category || 'general';
    console.log(`✅ Keeping article: Detected country "${detectedCountry}", region "${detectedRegion}", expected region "${region}"`);

    // For trusted sources (Dawn.com, Times of India), always use RSS feed country code
    // For Google News feeds, only use detected country if it matches the RSS feed country or region
    // Otherwise, use RSS feed country code to avoid misclassification
    let finalCountry: string;
    let finalRegion: string;

    if (isTrustedSource) {
      // Trusted sources: always use RSS feed country
      finalCountry = countryCode;
      finalRegion = region;
    } else {
      // Google News: Use detected country only if it matches RSS feed country or is in the same region
      // Otherwise, trust the RSS feed country code (since we're querying that country's edition)
      if (detectedCountry === countryCode || (detectedRegion === region && detectedCountry !== 'Unknown')) {
        finalCountry = detectedCountry;
        finalRegion = detectedRegion !== 'Unknown' ? detectedRegion : region;
      } else {
        // Detected country doesn't match, use RSS feed country
        finalCountry = countryCode;
        finalRegion = region;
      }
    }

    console.log(`   📍 Final country: "${finalCountry}", Final region: "${finalRegion}" (trusted source: ${isTrustedSource})`);

    const article = {
      title: title.trim(),
      snippet: snippet.trim(),
      url: url.trim(),
      source_name: sourceName.trim(),
      source_country: finalCountry,
      source_region: finalRegion,
      published_at: publishedAt.toISOString(),
      category: articleCategory,
      image_url: imageUrl,
    };

    articles.push(article);

    if (isTOIFeed && articles.length <= 3) {
      console.log(`   ✅ Times of India article ${articles.length}: "${title.substring(0, 60)}..."`);
      console.log(`      Category: "${articleCategory}", Country: "${finalCountry}", Region: "${finalRegion}"`);
    }

    // Respect per-feed cap to avoid edge runtime timeouts on broad fetches.
    if (articles.length >= maxArticles) {
      break;
    }
  }

  console.log(`📊 parseRSSFeed completed: Parsed ${articles.length} articles from ${itemSegments.length} RSS items`);
  console.log(`✅ Parsed ${articles.length} total articles from ${countryName} RSS feed`);
  return articles;
}

// Helper function to get table name for a region
function getTableNameForRegion(region: string): string | null {
  const regionToTable: Record<string, string> = {
    'Africa': 'articles_africa',
    'Asia': 'articles_asia',
    'Europe': 'articles_europe',
    'North America': 'articles_north_america',
    'Oceania': 'articles_oceania',
    'South America': 'articles_south_america',
  };
  return regionToTable[region] || null;
}

async function processBackfillTable(
  supabase: any,
  tableName: string,
  perTableLimit: number,
  dateStart?: string,
  dateEnd?: string,
) {
  const result = {
    table: tableName,
    scanned: 0,
    updatedImages: 0,
    updatedUrls: 0,
    failures: 0,
    decodeSuccess: 0,
    decodeFail: 0,
    imageFromPublisher: 0,
    imageFromJina: 0,
    imageFromPreview: 0,
    imageFromGnJina: 0,
  };

  const defaultCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let query = (supabase.from(tableName as any) as any)
    .select('id,url,image_url,published_at')
    .is('image_url', null)
    .gte('published_at', dateStart || defaultCutoff)
    .order('published_at', { ascending: false })
    .limit(perTableLimit);
  if (dateEnd) query = query.lt('published_at', dateEnd);
  const { data: rows, error } = await query;

  if (error) {
    console.error(`❌ Backfill select failed for ${tableName}:`, error);
    result.failures += 1;
    return result;
  }

  const candidates = rows || [];
  result.scanned = candidates.length;
  if (candidates.length === 0) return result;

  console.log(`🛠️ Backfill ${tableName}: scanning ${candidates.length} rows`);

  for (const row of candidates) {
    try {
      let decodedUrl: string;
      let previewImageFallback: string | null = null;
      if (row.url.startsWith('https://news.google.com/')) {
        const decodeResult = await decodeGoogleNewsUrl(row.url);
        previewImageFallback = decodeResult.previewImage || null;
        if (!decodeResult.url) {
          result.decodeFail += 1;
          // Decode failed — use lh3 preview thumbnail if available, else try Jina on the GN URL.
          let gnImage: string | null = previewImageFallback;
          let gnImageSource: 'preview' | 'gnJina' | null = gnImage ? 'preview' : null;
          if (!gnImage) {
            gnImage = await fetchImageViaRenderApi(row.url);
            if (gnImage) gnImageSource = 'gnJina';
          }
          if (gnImage) {
            const { error: imgErr } = await (supabase.from(tableName as any) as any)
              .update({ image_url: gnImage })
              .eq('id', row.id);
            if (!imgErr) {
              result.updatedImages += 1;
              if (gnImageSource === 'preview') result.imageFromPreview += 1;
              else result.imageFromGnJina += 1;
            }
          }
          continue;
        }
        result.decodeSuccess += 1;
        decodedUrl = decodeResult.url;
      } else {
        decodedUrl = row.url;
      }

      // Try publisher direct fetch → Jina → previewImage fallback.
      let imageUrl: string | null = null;
      let imageSource: 'publisher' | 'jina' | 'preview' | null = null;
      const directImg = await fetchPublisherImage(decodedUrl);
      if (directImg) {
        imageUrl = directImg; imageSource = 'publisher';
      } else {
        const jinaImg = await fetchImageViaRenderApi(decodedUrl);
        if (jinaImg) {
          imageUrl = jinaImg; imageSource = 'jina';
        } else if (previewImageFallback) {
          imageUrl = previewImageFallback; imageSource = 'preview';
        }
      }

      if (imageUrl) {
        const { error: imageUpdateError } = await (supabase.from(tableName as any) as any)
          .update({ image_url: imageUrl })
          .eq('id', row.id);
        if (!imageUpdateError) {
          result.updatedImages += 1;
          if (imageSource === 'publisher') result.imageFromPublisher += 1;
          else if (imageSource === 'jina') result.imageFromJina += 1;
          else result.imageFromPreview += 1;
        }
      }

      // Try to move URL from Google redirect to publisher URL when unique-safe.
      if (decodedUrl !== row.url) {
        const { data: existingDecoded } = await (supabase.from(tableName as any) as any)
          .select('id,image_url')
          .eq('url', decodedUrl)
          .limit(1);

        if (existingDecoded && existingDecoded.length > 0) {
          // If decoded row exists and has no image, backfill it too.
          if (imageUrl && !existingDecoded[0].image_url) {
            await (supabase.from(tableName as any) as any)
              .update({ image_url: imageUrl })
              .eq('id', existingDecoded[0].id);
          }
        } else {
          const { error: urlUpdateError } = await (supabase.from(tableName as any) as any)
            .update({ url: decodedUrl })
            .eq('id', row.id);
          if (!urlUpdateError) {
            result.updatedUrls += 1;
          }
        }
      }
    } catch (backfillError) {
      result.failures += 1;
      console.warn(`⚠️ Backfill failed for ${tableName} row ${row.id}:`, backfillError);
    }
  }

  return result;
}

async function runBackfillImagesMode(supabase: any, requestBody: any): Promise<Response> {
  const perTableLimit = Number(requestBody?.perTableLimit || 20);
  const targetRegion = requestBody?.region && typeof requestBody.region === 'string'
    ? requestBody.region.trim()
    : null;
  const dateStart = requestBody?.dateStart || undefined;
  const dateEnd = requestBody?.dateEnd || undefined;

  const allRegionTables = [
    'articles_africa',
    'articles_asia',
    'articles_europe',
    'articles_north_america',
    'articles_oceania',
    'articles_south_america',
  ];

  const tablesToProcess = targetRegion
    ? [getTableNameForRegion(targetRegion)].filter(Boolean) as string[]
    : allRegionTables;

  const summaries = [];
  for (const tableName of tablesToProcess) {
    const summary = await processBackfillTable(supabase, tableName, perTableLimit, dateStart, dateEnd);
    summaries.push(summary);
  }

  const totals = summaries.reduce(
    (acc, s) => ({
      scanned: acc.scanned + s.scanned,
      updatedImages: acc.updatedImages + s.updatedImages,
      updatedUrls: acc.updatedUrls + s.updatedUrls,
      failures: acc.failures + s.failures,
      decodeSuccess: acc.decodeSuccess + s.decodeSuccess,
      decodeFail: acc.decodeFail + s.decodeFail,
      imageFromPublisher: acc.imageFromPublisher + s.imageFromPublisher,
      imageFromJina: acc.imageFromJina + s.imageFromJina,
      imageFromPreview: acc.imageFromPreview + s.imageFromPreview,
      imageFromGnJina: acc.imageFromGnJina + s.imageFromGnJina,
    }),
    { scanned: 0, updatedImages: 0, updatedUrls: 0, failures: 0,
      decodeSuccess: 0, decodeFail: 0,
      imageFromPublisher: 0, imageFromJina: 0, imageFromPreview: 0, imageFromGnJina: 0 }
  );

  console.log(`✅ Backfill complete: scanned=${totals.scanned}, images=${totals.updatedImages} (publisher=${totals.imageFromPublisher} jina=${totals.imageFromJina} preview=${totals.imageFromPreview} gnJina=${totals.imageFromGnJina}), decode ok/fail=${totals.decodeSuccess}/${totals.decodeFail}, urls=${totals.updatedUrls}, failures=${totals.failures}`);

  return new Response(
    JSON.stringify({
      success: true,
      mode: 'backfillImages',
      perTableLimit,
      tablesProcessed: tablesToProcess,
      totals,
      summaries,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request body for category, region, and limit
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      console.log('No JSON body provided, using defaults');
      requestBody = {};
    }

    // Debug: Log raw request body
    console.log('📥 Raw request body:', JSON.stringify(requestBody));

    const { category, region, country, limit, backfillImages, clearGoogleImages } = requestBody || { category: null, region: null, country: null, limit: 12, backfillImages: false, clearGoogleImages: false };

    if (clearGoogleImages === true) {
      const tables = ['articles_africa','articles_asia','articles_europe','articles_north_america','articles_oceania','articles_south_america'];
      const results: Record<string, number> = {};
      for (const table of tables) {
        // Null out Google branding/logo images — gstatic, news.google.com, and the generic Google
        // News "G" logo served from lh3.googleusercontent.com (single known hash, 144 rows DB-wide).
        const { count, error } = await (supabase.from(table as any) as any)
          .update({ image_url: null }, { count: 'exact' })
          .or('image_url.ilike.%gstatic.com%,image_url.ilike.%news.google.com%,image_url.ilike.%lh3.googleusercontent.com%');
        if (error) console.error(`❌ clearGoogleImages failed for ${table}:`, error);
        results[table] = count || 0;
      }
      return new Response(JSON.stringify({ success: true, mode: 'clearGoogleImages', cleared: results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    if (backfillImages === true) {
      return await runBackfillImagesMode(supabase, requestBody);
    }


    console.log('Starting news scraping from Google News RSS feeds...');
    console.log(`📊 Parsed parameters: category="${category}", region="${region}", country="${country}", limit=${limit}`);
    console.log(`📊 Region type: ${typeof region}, value: ${JSON.stringify(region)}`);

    if (category) {
      console.log(`Category: "${category}"`);
    }
    if (region) {
      console.log(`Region: "${region}"`);
    }

    // Debug: Log all available regions
    console.log(`Available regions in config: ${regionConfigs.map(r => `"${r.region}"`).join(', ')}`);

    // Fetch news from specified region or all regions
    const allArticles: any[] = [];

    // Limit regions when "all" is selected to prevent timeout
    let regionsToSearch: RegionConfig[] = [];
    if (region && typeof region === 'string' && region.trim().length > 0) {
      // Normalize region name (trim whitespace, case-insensitive comparison)
      const normalizedRegion = region.trim();
      regionsToSearch = regionConfigs.filter(r => r.region.trim().toLowerCase() === normalizedRegion.toLowerCase());
      console.log(`Filtering for region "${region}" (normalized: "${normalizedRegion}")`);
      console.log(`Found ${regionsToSearch.length} matching region(s)`);
      if (regionsToSearch.length === 0) {
        console.error(`❌ No matching region found for "${region}". Available regions: ${regionConfigs.map(r => r.region).join(', ')}`);
        // Return error response if region not found
        return new Response(
          JSON.stringify({
            success: false,
            error: `Region "${region}" not found. Available regions: ${regionConfigs.map(r => r.region).join(', ')}`,
            articlesScraped: 0
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
    } else {
      // Only fetch from first 3 regions when "all" is selected to prevent timeout
      regionsToSearch = regionConfigs.slice(0, 3);
      console.log(`No specific region requested (region="${region}"), using first 3 regions (to prevent timeout)`);
    }

    // If a specific country is requested, restrict each region's country list to that country only
    if (country && typeof country === 'string' && country.trim().length > 0) {
      const normalizedCountry = country.trim().toUpperCase();
      console.log(`Filtering countries to: "${normalizedCountry}"`);
      regionsToSearch = regionsToSearch.map(r => ({
        ...r,
        countries: r.countries.filter(c => c.code.toUpperCase() === normalizedCountry),
      })).filter(r => r.countries.length > 0);

      if (regionsToSearch.length === 0) {
        console.error(`❌ Country "${country}" not found in any of the selected regions`);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Country "${country}" not found. Check that it belongs to the selected region.`,
            articlesScraped: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      console.log(`After country filter: ${regionsToSearch.length} region(s), ${regionsToSearch.reduce((s, r) => s + r.countries.length, 0)} country/countries`);
    }

    console.log(`Searching ${regionsToSearch.length} region(s): ${regionsToSearch.map(r => r.region).join(', ')}`);

    // Strategy: Fetch ALL articles from RSS feeds, then save in batches
    // First batch (30 articles) for immediate display, then continue with the rest
    const initialBatchSize = 30; // Quick first batch for users to see
    const targetLimit = limit || 200; // Fetch more articles total

    console.log(`Fetching ALL articles from RSS feeds (no per-country limit), then saving in batches...`);
    console.log(`Initial batch: ${initialBatchSize} articles, then continue fetching up to ${targetLimit} total`);

    // Fetch from all countries in the region - parse ALL articles from RSS feeds
    const shouldLimitCountries = !(region && typeof region === 'string' && region.trim().length > 0);
    const perCountryMaxArticles = shouldLimitCountries ? 30 : 100;

    for (const regionConfig of regionsToSearch) {
      // For broad "all regions" fetches, use fewer countries per region and cap items per feed.
      const articles = await fetchNewsFromRegion(
        regionConfig,
        category,
        shouldLimitCountries,
        perCountryMaxArticles
      );
      console.log(`Got ${articles.length} articles from ${regionConfig.region}`);
      allArticles.push(...articles);
    }

    // Remove duplicates based on URL (keep first occurrence)
    const seenUrls = new Set<string>();
    const uniqueArticles = allArticles.filter(article => {
      if (seenUrls.has(article.url)) {
        return false;
      }
      seenUrls.add(article.url);
      return true;
    });

    console.log(`📊 Total unique articles fetched: ${uniqueArticles.length} (removed ${allArticles.length - uniqueArticles.length} duplicates)`);

    // Sort by recency first, then enrich missing images for the newest candidates.
    const newestFirstArticles = [...uniqueArticles].sort(
      (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );

    const alertMetrics: AlertMetrics = {
      totalArticlesFetched: newestFirstArticles.length,
      enrichmentCandidates: 0,
      decodeAttempts: 0,
      decodeSuccesses: 0,
      decodeFailures: 0,
      metadataFetchAttempts: 0,
      metadataFetchSuccesses: 0,
      metadataFetchFailures: 0,
      imagesResolvedFromEnrichment: 0,
      decodeFailureSamples: [],
      renderApiAttempts: 0,
      renderApiSuccesses: 0,
      renderApiFailures: 0,
    };

    // Keep newest-first ordering while enforcing source diversity constraints.
    const articlesToSave = applyDiversityRulesNewestFirst(
      newestFirstArticles,
      targetLimit,
      0.25, // max 25% per source
      2 // max 2 consecutive from same source
    );

    // Enrich only selected feed candidates so compute budget goes to visible cards.
    const isAllRegionsRequest = !(region && typeof region === 'string' && region.trim().length > 0);
    const dynamicMaxCandidates = isAllRegionsRequest ? 72 : 60;
    await enrichImagesForArticles(articlesToSave, alertMetrics, dynamicMaxCandidates);

    if (shouldSendDecodeAlert(alertMetrics)) {
      try {
        await sendDecodeAlertEmail(alertMetrics);
      } catch (emailError) {
        console.error('❌ Failed to send decode alert email:', emailError);
      }
    }

    console.log(`📊 Saving ${articlesToSave.length} articles (limited from ${newestFirstArticles.length})`);
    const selectedWithImages = articlesToSave.filter((article) => article.image_url).length;
    console.log(`📊 Selected feed image coverage: ${selectedWithImages}/${articlesToSave.length}`);

    // Log article breakdown by country
    if (articlesToSave.length > 0) {
      const countryBreakdown: Record<string, number> = {};
      articlesToSave.forEach(article => {
        const country = article.source_country || 'unknown';
        countryBreakdown[country] = (countryBreakdown[country] || 0) + 1;
      });

      console.log('📊 Articles by country:', countryBreakdown);
      console.log('Sample articles:', articlesToSave.slice(0, 5).map(a => ({
        title: a.title?.substring(0, 50),
        category: a.category,
        region: a.source_region,
        country: a.source_country
      })));
    } else {
      console.warn('⚠️ No articles fetched! Check RSS feeds and parsing logic.');
    }

    // Save articles in batches: first batch immediately, then the rest
    // Group articles by region to save to appropriate tables
    let totalInserted = 0;

    if (articlesToSave.length > 0) {
      // Group articles by region
      const articlesByRegion = new Map<string, any[]>();
      articlesToSave.forEach(article => {
        const region = article.source_region;
        if (!articlesByRegion.has(region)) {
          articlesByRegion.set(region, []);
        }
        articlesByRegion.get(region)!.push(article);
      });

      console.log(`💾 Grouped articles by region: ${Array.from(articlesByRegion.keys()).join(', ')}`);

      // Save articles to their respective region tables
      for (const [region, regionArticles] of articlesByRegion.entries()) {
        const tableName = getTableNameForRegion(region);
        if (!tableName) {
          console.warn(`⚠️ No table found for region "${region}", skipping ${regionArticles.length} articles`);
          continue;
        }

        console.log(`💾 Saving ${regionArticles.length} articles to ${tableName}...`);

        // Phase 1: Save initial batch quickly (for immediate user display)
        const initialBatch = regionArticles.slice(0, Math.min(initialBatchSize, regionArticles.length));
        console.log(`💾 Phase 1: Saving initial batch of ${initialBatch.length} articles to ${tableName}...`);

        const initialResult = await (supabase.from(tableName as any) as any)
          .upsert(initialBatch, { onConflict: 'url', ignoreDuplicates: true });

        if (initialResult?.error) {
          console.error(`❌ Error inserting initial batch to ${tableName}:`, initialResult.error);
        } else {
          await backfillImagesForExistingRows(supabase, tableName, initialBatch);
          totalInserted += initialBatch.length;
          console.log(`✅ Phase 1: Successfully inserted ${initialBatch.length} articles to ${tableName}`);
        }

        // Phase 2: Save remaining articles in batches
        if (regionArticles.length > initialBatch.length) {
          const remainingArticles = regionArticles.slice(initialBatch.length);
          const batchSize = 50; // Save in batches of 50

          console.log(`💾 Phase 2: Saving remaining ${remainingArticles.length} articles to ${tableName} in batches of ${batchSize}...`);

          for (let i = 0; i < remainingArticles.length; i += batchSize) {
            const batch = remainingArticles.slice(i, i + batchSize);
            const batchResult = await (supabase.from(tableName as any) as any)
              .upsert(batch, { onConflict: 'url', ignoreDuplicates: true });

            if (batchResult?.error) {
              console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1} to ${tableName}:`, batchResult.error);
            } else {
              await backfillImagesForExistingRows(supabase, tableName, batch);
              totalInserted += batch.length;
              console.log(`✅ Phase 2: Batch ${Math.floor(i / batchSize) + 1} - Inserted ${batch.length} articles to ${tableName} (total: ${totalInserted})`);
            }

            // Small delay between batches to avoid overwhelming the database
            if (i + batchSize < remainingArticles.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }
      }

      console.log(`✅ Successfully inserted ${totalInserted} total articles into region-specific tables`);
    } else {
      console.warn('⚠️ No articles to insert - function completed but found 0 articles');
    }

    return new Response(
      JSON.stringify({
        success: true,
        articlesScraped: totalInserted || articlesToSave.length || 0,
        totalFetched: uniqueArticles.length,
        message: `News scraping completed: ${totalInserted || articlesToSave.length || 0} articles saved`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in scrape-news function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
