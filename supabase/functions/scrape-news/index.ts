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
  const articles: any[] = [];
  
  for (const country of region.countries) {
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
        continue;
      }
      
      const xmlText = await response.text();
      const parsedArticles = parseRSSFeed(xmlText, country.name, country.code, region.region);
      
      articles.push(...parsedArticles);
      console.log(`Fetched ${parsedArticles.length} articles from ${country.name}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`Error fetching news from ${country.name}:`, error);
    }
  }
  
  return articles;
}

function parseRSSFeed(xml: string, countryName: string, countryCode: string, region: string): any[] {
  const articles: any[] = [];
  
  // Parse RSS items
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  
  for (const itemMatch of itemMatches) {
    const itemXml = itemMatch[1];
    
    // Extract title
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    if (!titleMatch) continue;
    const title = titleMatch[1];
    
    // Extract link
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
    if (!linkMatch) continue;
    const url = linkMatch[1];
    
    // Extract description/snippet
    const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
    const snippet = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').substring(0, 200) : title.substring(0, 200);
    
    // Extract source
    const sourceMatch = itemXml.match(/<source[^>]*>(.*?)<\/source>/);
    const sourceName = sourceMatch ? sourceMatch[1] : `News from ${countryName}`;
    
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
