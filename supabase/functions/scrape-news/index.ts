import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Using Google News RSS feeds for different regions
const GOOGLE_NEWS_RSS_BASE = 'https://news.google.com/rss';

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
      console.log(`Fetching news from ${country.name} (${region.region})...`);

      // Build URL with optional search query
      let url = `${GOOGLE_NEWS_RSS_BASE}`;
      if (searchQuery) {
        url += `/search?q=${encodeURIComponent(searchQuery)}&gl=${country.code}&hl=en&ceid=${country.code}:en`;
      } else {
        url += `?gl=${country.code}&hl=en&ceid=${country.code}:en`;
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        console.error(`Failed to fetch news for ${country.name}: ${response.status}`);
        return [];
      }

      const xmlText = await response.text();
      const parsedArticles = parseRSSFeed(xmlText, country.name, country.code, region.region);
      console.log(`Fetched ${parsedArticles.length} articles from ${country.name}`);
      return parsedArticles;
    } catch (error) {
      console.error(`Error fetching news from ${country.name}:`, error);
      return [];
    }
  });

  // Run all country fetches in parallel to speed up scraping
  const results = await Promise.allSettled(countryPromises);
  const articles = results.flatMap((res) => (res.status === 'fulfilled' ? res.value : []));
  return articles;
}

function parseRSSFeed(xml: string, countryName: string, countryCode: string, region: string): any[] {
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

    // Extract actual article URL - Google News RSS provides redirect URLs
    // First try to get URL from source tag's url attribute (most reliable)
    const sourceUrlMatch = itemXml.match(/<source[^>]*url="([^"]+)"/);
    let url = '';
    
    if (sourceUrlMatch) {
      url = decode(sourceUrlMatch[1]);
    } else {
      // Fallback to link tag
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
      if (!linkMatch) continue;
      url = linkMatch[1].trim();
      
      // Try to extract canonical URL from Google News redirect
      const urlParamMatch = url.match(/[?&]url=([^&]+)/);
      if (urlParamMatch) {
        try { url = decodeURIComponent(urlParamMatch[1]); } catch {}
      }
    }
    
    // Skip if still a Google News redirect URL
    if (!url || url.includes('news.google.com/rss/articles/')) {
      continue;
    }

    // Extract description/snippet (supports CDATA or plain)
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/description>/);
    const rawDesc = descMatch ? (descMatch[1] ?? descMatch[2]) : '';
    const snippet = decode(rawDesc.replace(/<[^>]*>/g, '')).slice(0, 200);

    // Extract source
    const sourceMatch = itemXml.match(/<source[^>]*>(.*?)<\/source>/);
    const sourceName = decode(sourceMatch ? sourceMatch[1] : `News from ${countryName}`);

    // Extract publish date
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
    const publishedAt = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString();

    articles.push({
      title: title.trim(),
      snippet: snippet.trim(),
      url: url.trim(),
      source_name: sourceName.trim(),
      source_country: countryCode,
      source_region: region,
      published_at: publishedAt,
    });

    if (articles.length >= 10) break; // Limit per country
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
