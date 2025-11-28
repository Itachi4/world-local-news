import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Using Google News RSS feeds for different regions
const GOOGLE_NEWS_RSS_BASE = 'https://news.google.com/rss';

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

// Note: We're using Google News URLs directly - no need for redirect resolution
// Google News RSS article URLs work fine when clicked

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

      // Build RSS URL in the format: https://news.google.com/rss/search?q=<QUERY>&gl=<COUNTRY_CODE>&hl=en&ceid=<COUNTRY_CODE>:en
      // For general: q=general
      // For categories: q=category+OR+terms
      // Example: https://news.google.com/rss/search?q=general&gl=AR&hl=en&ceid=AR:en
      // Example: https://news.google.com/rss/search?q=sports+OR+games&gl=AR&hl=en&ceid=AR:en
      let url: string;
      
      if (category && categoryQueries[category]) {
        // Category-specific search: /search?q=CATEGORY_QUERY&gl=COUNTRY&hl=en&ceid=COUNTRY:en
        const categoryQuery = categoryQueries[category];
        // Use + instead of %20 for OR operators in the query (Google News format)
        const queryString = categoryQuery.replace(/\s+/g, '+');
        url = `${GOOGLE_NEWS_RSS_BASE}/search?q=${queryString}&gl=${country.code}&hl=en&ceid=${country.code}:en`;
        console.log(`🔗 RSS URL [${category}]: ${url}`);
        console.log(`   Country: ${country.name} (${country.code}), Region: ${region.region}`);
      } else {
        // General news: /search?q=general&gl=COUNTRY&hl=en&ceid=COUNTRY:en
        url = `${GOOGLE_NEWS_RSS_BASE}/search?q=general&gl=${country.code}&hl=en&ceid=${country.code}:en`;
        console.log(`🔗 RSS URL [General]: ${url}`);
        console.log(`   Country: ${country.name} (${country.code}), Region: ${region.region}`);
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
      console.log(`📥 RSS feed response length: ${xmlText.length} characters`);
      console.log(`📥 First 500 chars of RSS: ${xmlText.substring(0, 500)}`);
      
      const parsedArticles = await parseRSSFeed(xmlText, country.name, country.code, region.region, category, maxArticles)
      console.log(`✅ Fetched ${parsedArticles.length} articles from ${country.name} (${country.code})`);
      
      // Log country codes of parsed articles to verify they're correct
      if (parsedArticles.length > 0) {
        const countryCodes = parsedArticles.map(a => a.source_country);
        console.log(`   Country codes in articles: ${[...new Set(countryCodes)].join(', ')}`);
      }
      
      return parsedArticles;
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
  const itemArray = Array.from(itemMatches);
  console.log(`Found ${itemArray.length} RSS items in feed`);

  // Extract and sort items by publish date (newest first) to prioritize recent articles
  const itemsWithDates: Array<{ itemXml: string; publishedAt: Date }> = [];
  
  for (const itemMatch of itemArray) {
    const itemXml = itemMatch[1];
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
    const publishedAt = pubDateMatch ? new Date(pubDateMatch[1]) : new Date(0); // Use epoch if no date
    
    if (!isNaN(publishedAt.getTime())) {
      itemsWithDates.push({ itemXml, publishedAt });
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
      continue;
    }
    const title = decode(rawTitle);
    console.log(`📰 Processing article: "${title.substring(0, 50)}..."`);

    // Extract article URL from Google News RSS
    // Use the <link> tag directly - Google News URLs work fine for linking
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/)
    if (!linkMatch || !linkMatch[1] || linkMatch[1].trim().length === 0) {
      console.log('⚠️ Skipping item: No link found');
      continue;
    }
    
    // Use the Google News RSS article URL directly - it works fine
    let url = linkMatch[1].trim()
    console.log(`🔗 Using Google News URL: ${url.substring(0, 100)}...`);

    // Extract description/snippet
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/)
    const rawDesc = descMatch ? (descMatch[1] ?? descMatch[2]) : ''
    const decodedDesc = decode(rawDesc);
    const snippet = decodedDesc.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);

    // Extract source
    const sourceMatch = itemXml.match(/<source[^>]*>(.*?)<\/source>/);
    const sourceName = decode(sourceMatch ? sourceMatch[1] : `News from ${countryName}`);

    // Use the date we already extracted during sorting
    const publishedAt = itemPublishedAt;
    const publishedTime = publishedAt.getTime();
    
    // Filter out stale items (older than ~3 days to prioritize recent news)
    const threeDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 3;
    
    if (isNaN(publishedTime)) {
      console.log(`⚠️ Skipping article: Invalid publish date`);
      continue;
    }
    
    if (publishedTime < threeDaysAgo) {
      console.log(`⚠️ Skipping article: Too old (published: ${publishedAt.toISOString()}, more than 3 days ago)`);
      continue;
    }
    
    console.log(`✅ Article date OK: ${publishedAt.toISOString()}`);

    const articleCategory = category || 'general';
    console.log(`Storing article with category: "${articleCategory}" (received: "${category}")`);
    
    articles.push({
      title: title.trim(),
      snippet: snippet.trim(),
      url: url.trim(),
      source_name: sourceName.trim(),
      source_country: countryCode,
      source_region: region,
      published_at: publishedAt.toISOString(),
      category: articleCategory,
    })

    // Don't break early - parse ALL articles from RSS feed
    // We'll limit later when saving to database
  }

  console.log(`✅ Parsed ${articles.length} total articles from ${countryName} RSS feed`);
  return articles;
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
    
    const { category, region, limit } = requestBody || { category: null, region: null, limit: 12 };

    console.log('Starting news scraping from Google News RSS feeds...');
    console.log(`📊 Parsed parameters: category="${category}", region="${region}", limit=${limit}`);
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
    
    console.log(`Searching ${regionsToSearch.length} region(s): ${regionsToSearch.map(r => r.region).join(', ')}`);
    
    // Strategy: Fetch ALL articles from RSS feeds, then save in batches
    // First batch (30 articles) for immediate display, then continue with the rest
    const initialBatchSize = 30; // Quick first batch for users to see
    const targetLimit = limit || 200; // Fetch more articles total
    
    console.log(`Fetching ALL articles from RSS feeds (no per-country limit), then saving in batches...`);
    console.log(`Initial batch: ${initialBatchSize} articles, then continue fetching up to ${targetLimit} total`);
    
    // Fetch from all countries in the region - parse ALL articles from RSS feeds
    for (const regionConfig of regionsToSearch) {
      // Fetch ALL articles from each country (no maxArticles limit)
      const articles = await fetchNewsFromRegion(regionConfig, category, false, 9999); // Large number to get all
      console.log(`Got ${articles.length} articles from ${regionConfig.region}`);
      allArticles.push(...articles);
    }
    
    // Sort all articles by date (newest first)
    allArticles.sort((a, b) => {
      const dateA = new Date(a.published_at).getTime();
      const dateB = new Date(b.published_at).getTime();
      return dateB - dateA;
    });
    
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
    
    // Limit to target if we have too many
    const articlesToSave = uniqueArticles.slice(0, targetLimit);
    console.log(`📊 Saving ${articlesToSave.length} articles (limited from ${uniqueArticles.length})`);
    
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
    let totalInserted = 0;
    
    if (articlesToSave.length > 0) {
      // Phase 1: Save initial batch quickly (for immediate user display)
      const initialBatch = articlesToSave.slice(0, initialBatchSize);
      console.log(`💾 Phase 1: Saving initial batch of ${initialBatch.length} articles...`);
      
      const initialResult = await supabase
        .from('articles')
        .upsert(initialBatch, { onConflict: 'url', ignoreDuplicates: true });

      if (initialResult?.error) {
        console.error('❌ Error inserting initial batch:', initialResult.error);
      } else {
        totalInserted += initialBatch.length;
        console.log(`✅ Phase 1: Successfully inserted ${initialBatch.length} articles (users can see these now)`);
      }
      
      // Phase 2: Save remaining articles in batches
      if (articlesToSave.length > initialBatchSize) {
        const remainingArticles = articlesToSave.slice(initialBatchSize);
        const batchSize = 50; // Save in batches of 50
        
        console.log(`💾 Phase 2: Saving remaining ${remainingArticles.length} articles in batches of ${batchSize}...`);
        
        for (let i = 0; i < remainingArticles.length; i += batchSize) {
          const batch = remainingArticles.slice(i, i + batchSize);
          const batchResult = await supabase
            .from('articles')
            .upsert(batch, { onConflict: 'url', ignoreDuplicates: true });

          if (batchResult?.error) {
            console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, batchResult.error);
          } else {
            totalInserted += batch.length;
            console.log(`✅ Phase 2: Batch ${Math.floor(i / batchSize) + 1} - Inserted ${batch.length} articles (total: ${totalInserted})`);
          }
          
          // Small delay between batches to avoid overwhelming the database
          if (i + batchSize < remainingArticles.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
      
      console.log(`✅ Successfully inserted ${totalInserted} total articles into database`);
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
