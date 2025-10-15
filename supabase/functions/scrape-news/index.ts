import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Using Google News RSS feeds for different regions
const GOOGLE_NEWS_RSS_BASE = 'https://news.google.com/rss';

// Helper: simple fetch with retry for transient errors like 429/503
async function fetchWithRetry(url: string, init: RequestInit = {}, retries = 2, backoffMs = 500): Promise<Response> {
  let lastErr: any
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init)
      if (res.ok) return res
      // Retry on common transient statuses
      if (![429, 502, 503, 504].includes(res.status)) return res
    } catch (e) {
      lastErr = e
      if (attempt === retries) throw e
    }
    await new Promise(r => setTimeout(r, backoffMs * (attempt + 1)))
  }
  throw lastErr ?? new Error('Failed to fetch after retries')
}

// Helper: try to resolve Google News redirect to final URL quickly
async function resolveRedirect(maybeRedirectUrl: string, timeoutMs = 3000): Promise<string | null> {
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), timeoutMs)
    const res = await fetch(maybeRedirectUrl, { redirect: 'follow', signal: ac.signal })
    clearTimeout(t)
    const finalUrl = res.url
    if (finalUrl && !finalUrl.includes('news.google.com')) return finalUrl
  } catch {}
  return null
}

interface RegionConfig {
  region: string;
  countries: { code: string; name: string }[];
}

const regionConfigs: RegionConfig[] = [
  {
    region: 'Africa',
    countries: [
      { code: 'ZA', name: 'South Africa' },
      { code: 'NG', name: 'Nigeria' },
      { code: 'EG', name: 'Egypt' },
      { code: 'KE', name: 'Kenya' },
    ]
  },
  {
    region: 'Asia',
    countries: [
      { code: 'IN', name: 'India' },
      { code: 'CN', name: 'China' },
      { code: 'JP', name: 'Japan' },
      { code: 'SG', name: 'Singapore' },
    ]
  },
  {
    region: 'Europe',
    countries: [
      { code: 'GB', name: 'United Kingdom' },
      { code: 'FR', name: 'France' },
      { code: 'DE', name: 'Germany' },
      { code: 'IT', name: 'Italy' },
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
    ]
  },
  {
    region: 'South America',
    countries: [
      { code: 'BR', name: 'Brazil' },
      { code: 'AR', name: 'Argentina' },
      { code: 'CL', name: 'Chile' },
    ]
  },
];

async function fetchNewsFromRegion(region: RegionConfig, searchQuery?: string): Promise<any[]> {
  const countryPromises = region.countries.map(async (country) => {
    try {
      console.log(`Fetching news from ${country.name} (${region.region})...`)

      // Build URL with optional search query
      let url = `${GOOGLE_NEWS_RSS_BASE}`
      if (searchQuery) {
        url += `/search?q=${encodeURIComponent(searchQuery)}&gl=${country.code}&hl=en&ceid=${country.code}:en`
      } else {
        url += `?gl=${country.code}&hl=en&ceid=${country.code}:en`
      }

      const response = await fetchWithRetry(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
          'Cache-Control': 'no-cache'
        }
      }, 2)

      if (!response.ok) {
        console.error(`Failed to fetch news for ${country.name}: ${response.status}`)
        return []
      }

      const xmlText = await response.text()
      const parsedArticles = await parseRSSFeed(xmlText, country.name, country.code, region.region)
      console.log(`Fetched ${parsedArticles.length} articles from ${country.name}`)
    } catch (error) {
      console.error(`Error fetching news from ${country.name}:`, error)
      return []
    }
  })

  // Run all country fetches in parallel to speed up scraping
  const results = await Promise.allSettled(countryPromises)
  const articles = results.flatMap((res) => (res.status === 'fulfilled' ? res.value : []))
  return articles
}

async function parseRSSFeed(xml: string, countryName: string, countryCode: string, region: string): Promise<any[]> {
  const articles: any[] = [];

  const decode = (str: string) =>
    (str || '')
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&quot;/g, '"')
      .replace(/&apos;|&#x27;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

  // Parse RSS items
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const itemMatch of itemMatches) {
    const itemXml = itemMatch[1];

    // Extract title (supports CDATA or plain text)
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/);
    const rawTitle = titleMatch ? (titleMatch[1] ?? titleMatch[2]) : null;
    if (!rawTitle) continue;
    const title = decode(rawTitle);

    // Extract actual article URL from Google News RSS
    // Google News provides a redirect URL in <link>, we need to extract the actual article URL
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/)
    if (!linkMatch) continue
    
    let url = linkMatch[1].trim()
    
    // Try to extract canonical URL from description first
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/description>/)
    const rawDesc = descMatch ? (descMatch[1] ?? descMatch[2]) : ''
    
    // Look for the first external link in the description (usually the article link)
    const descLinkMatch = rawDesc.match(/href=["']([^"']+)["']/)
    if (descLinkMatch) {
      const descUrl = decode(descLinkMatch[1])
      if (descUrl && !descUrl.includes('news.google.com')) {
        url = descUrl
      }
    }
    
    // If we still have a Google News redirect, try to extract the url parameter
    if (url.includes('news.google.com')) {
      const urlParamMatch = url.match(/[?&]url=([^&]+)/)
      if (urlParamMatch) {
        try {
          const decodedUrl = decodeURIComponent(urlParamMatch[1])
          if (decodedUrl && !decodedUrl.includes('news.google.com')) {
            url = decodedUrl
          }
        } catch {}
      }
    }

    // Last resort: try to follow redirect quickly to get final URL
    if (url.includes('news.google.com')) {
      const resolved = await resolveRedirect(url)
      if (resolved) url = resolved
    }

    // Skip if we still don't have a valid external URL
    if (!url || url.includes('news.google.com/rss/articles/') || url.includes('news.google.com')) {
      continue
    }

    // Extract description/snippet (we already have rawDesc from above)
    // Decode first, then strip HTML tags to handle encoded tags like &lt;a&gt;
    const decodedDesc = decode(rawDesc);
    const snippet = decodedDesc.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);

    // Extract source
    const sourceMatch = itemXml.match(/<source[^>]*>(.*?)<\/source>/);
    const sourceName = decode(sourceMatch ? sourceMatch[1] : `News from ${countryName}`);

    // Extract publish date and filter out stale items (older than ~3 days)
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)
    const publishedAt = pubDateMatch ? new Date(pubDateMatch[1]) : new Date()
    const threeDaysAgo = Date.now() - 1000 * 60 * 60 * 72
    if (publishedAt.getTime() < threeDaysAgo) {
      continue
    }

    articles.push({
      title: title.trim(),
      snippet: snippet.trim(),
      url: url.trim(),
      source_name: sourceName.trim(),
      source_country: countryCode,
      source_region: region,
      published_at: publishedAt.toISOString(),
    })

    if (articles.length >= 10) break // Limit per country
  }

  return articles;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request body for search query
    const { searchQuery, region } = await req.json().catch(() => ({ searchQuery: null, region: null }));

    console.log('Starting news scraping from Google News RSS feeds...');
    if (searchQuery) {
      console.log(`Search query: "${searchQuery}"`);
    }
    
    // Fetch news from specified region or all regions
    const allArticles: any[] = [];
    
    const regionsToSearch = region 
      ? regionConfigs.filter(r => r.region === region)
      : regionConfigs;
    
    for (const regionConfig of regionsToSearch) {
      const articles = await fetchNewsFromRegion(regionConfig, searchQuery);
      allArticles.push(...articles);
    }

    console.log(`Total articles fetched: ${allArticles.length}`);

    // Insert articles into database (ignore duplicates)
    if (allArticles.length > 0) {
      const { data, error } = await supabase
        .from('articles')
        .upsert(allArticles, { onConflict: 'url', ignoreDuplicates: true });

      if (error) {
        console.error('Error inserting articles:', error);
        throw error;
      }

      console.log('Articles inserted successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        articlesScraped: allArticles.length,
        message: 'News scraping completed successfully'
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
