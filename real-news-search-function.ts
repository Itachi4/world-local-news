import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reliable news sources with working RSS feeds
const newsSources = [
  // North America
  {
    name: "CNN",
    country: "US",
    region: "North America",
    rssUrl: "http://rss.cnn.com/rss/edition.rss"
  },
  {
    name: "BBC News",
    country: "US",
    region: "North America",
    rssUrl: "http://feeds.bbci.co.uk/news/rss.xml"
  },
  {
    name: "Reuters",
    country: "US",
    region: "North America",
    rssUrl: "https://feeds.reuters.com/reuters/topNews"
  },
  {
    name: "Associated Press",
    country: "US",
    region: "North America",
    rssUrl: "https://feeds.apnews.com/apnews/topnews"
  },

  // Europe
  {
    name: "The Guardian",
    country: "GB",
    region: "Europe",
    rssUrl: "https://www.theguardian.com/world/rss"
  },
  {
    name: "BBC News UK",
    country: "GB",
    region: "Europe",
    rssUrl: "http://feeds.bbci.co.uk/news/uk/rss.xml"
  },
  {
    name: "Deutsche Welle",
    country: "DE",
    region: "Europe",
    rssUrl: "https://rss.dw.com/rdf/rss-en-all"
  },

  // Asia
  {
    name: "Al Jazeera",
    country: "QA",
    region: "Asia",
    rssUrl: "https://www.aljazeera.com/xml/rss/all.xml"
  },
  {
    name: "Times of India",
    country: "IN",
    region: "Asia",
    rssUrl: "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms"
  },
  {
    name: "China Daily",
    country: "CN",
    region: "Asia",
    rssUrl: "https://www.chinadaily.com.cn/rss/world.xml"
  },
  {
    name: "Japan Times",
    country: "JP",
    region: "Asia",
    rssUrl: "https://www.japantimes.co.jp/rss/news/"
  },

  // Africa
  {
    name: "BBC Africa",
    country: "GB",
    region: "Africa",
    rssUrl: "http://feeds.bbci.co.uk/news/world/africa/rss.xml"
  },
  {
    name: "Al Jazeera Africa",
    country: "QA",
    region: "Africa",
    rssUrl: "https://www.aljazeera.com/xml/rss/all.xml"
  },

  // South America
  {
    name: "BBC Latin America",
    country: "GB",
    region: "South America",
    rssUrl: "http://feeds.bbci.co.uk/news/world/latin_america/rss.xml"
  },
  {
    name: "Al Jazeera Americas",
    country: "QA",
    region: "South America",
    rssUrl: "https://www.aljazeera.com/xml/rss/all.xml"
  },

  // Oceania
  {
    name: "ABC News Australia",
    country: "AU",
    region: "Oceania",
    rssUrl: "https://www.abc.net.au/news/feed/51120/rss.xml"
  },
  {
    name: "BBC Australia",
    country: "GB",
    region: "Oceania",
    rssUrl: "http://feeds.bbci.co.uk/news/world/australia/rss.xml"
  }
];

// Function to resolve URLs and get real article links
async function resolveUrl(url: string): Promise<string> {
  try {
    if (!url.includes('news.google.com') && !url.includes('google.com/url')) {
      return url;
    }

    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const location = response.headers.get('location');
    if (location) {
      return location;
    }

    const urlObj = new URL(url);
    const urlParam = urlObj.searchParams.get('url');
    if (urlParam) {
      return decodeURIComponent(urlParam);
    }

    return url;
  } catch (error) {
    console.error('Error resolving URL:', error);
    return url;
  }
}

// Function to parse RSS feed and extract real articles
async function parseRSSFeed(feedUrl: string, source: any, searchQuery?: string): Promise<any[]> {
  try {
    console.log(`Fetching RSS feed: ${source.name} (${feedUrl})`);
    
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }

    const xmlText = await response.text();
    const articles: any[] = [];

    // Parse RSS XML
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null && articles.length < 20) {
      const itemXml = match[1];
      
      const titleMatch = itemXml.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/i);
      const linkMatch = itemXml.match(/<link[^>]*><!\[CDATA\[(.*?)\]\]><\/link>|<link[^>]*>(.*?)<\/link>/i);
      const descriptionMatch = itemXml.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/i);
      const pubDateMatch = itemXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i);

      if (titleMatch && linkMatch) {
        const title = (titleMatch[1] || titleMatch[2] || '').trim();
        let url = (linkMatch[1] || linkMatch[2] || '').trim();
        const description = (descriptionMatch?.[1] || descriptionMatch?.[2] || '').trim();
        const pubDate = pubDateMatch?.[1] || new Date().toISOString();

        // Clean up title and description
        const cleanTitle = title.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
        const cleanDescription = description.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();

        if (cleanTitle && url) {
          // Skip example.com URLs
          if (url.includes('example.com') || url.startsWith('https://example.com') || url.startsWith('http://example.com')) {
            console.log(`Skipping example.com URL: ${url}`);
            continue;
          }

          // If search query is provided, filter articles
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const titleMatch = cleanTitle.toLowerCase().includes(query);
            const descMatch = cleanDescription.toLowerCase().includes(query);
            
            // Skip articles that don't match the search query
            if (!titleMatch && !descMatch) {
              continue;
            }
          }

          // Resolve the URL to get the real article link
          const resolvedUrl = await resolveUrl(url);
          
          // Double-check resolved URL is not example.com
          if (resolvedUrl.includes('example.com') || resolvedUrl.startsWith('https://example.com') || resolvedUrl.startsWith('http://example.com')) {
            console.log(`Skipping resolved example.com URL: ${resolvedUrl}`);
            continue;
          }
          
          articles.push({
            title: cleanTitle,
            snippet: cleanDescription || cleanTitle.substring(0, 200) + '...',
            url: resolvedUrl,
            source_name: source.name,
            source_country: source.country,
            source_region: source.region,
            published_at: new Date(pubDate).toISOString()
          });
        }
      }
    }

    console.log(`Found ${articles.length} articles from ${source.name}`);
    return articles;
  } catch (error) {
    console.error(`Error parsing RSS feed ${feedUrl}:`, error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = 'https://zrofxxvmsaaoaztorpyt.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyb2Z4eHZtc2Fhb2F6dG9ycHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDI3NDksImV4cCI6MjA3NjA3ODc0OX0.S7E4HytCd17Kzqjnf4hcxbmZxRcDTAWKM8dnFHmRWVU';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { searchQuery, region } = body;

    console.log('🔍 Function called with:', { searchQuery, region });

    let allArticles: any[] = [];
    let sourcesProcessed = 0;
    let sourcesSucceeded = 0;

    // Fetch articles from all news sources
    for (const source of newsSources) {
      // Skip sources that don't match region filter
      if (region && region !== 'all' && source.region !== region) {
        continue;
      }

      sourcesProcessed++;
      try {
        const articles = await parseRSSFeed(source.rssUrl, source, searchQuery);
        allArticles = allArticles.concat(articles);
        sourcesSucceeded++;
        console.log(`✅ Successfully fetched ${articles.length} articles from ${source.name}`);
      } catch (error) {
        console.error(`❌ Failed to fetch from ${source.name}:`, error);
      }
    }

    // Filter out example.com URLs
    allArticles = allArticles.filter(article => 
      !article.url.includes('example.com') && 
      !article.url.startsWith('https://example.com') && 
      !article.url.startsWith('http://example.com')
    );

    // Additional filtering by search query (as backup)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allArticles = allArticles.filter(article => 
        article.title.toLowerCase().includes(query) ||
        article.snippet.toLowerCase().includes(query)
      );
    }

    // Remove duplicates based on URL
    const uniqueArticles = allArticles.filter((article, index, self) => 
      index === self.findIndex(a => a.url === article.url)
    );

    // Limit to 50 articles max
    const limitedArticles = uniqueArticles.slice(0, 50);

    console.log(`📰 Found ${limitedArticles.length} real articles for search: "${searchQuery}" in region: "${region}"`);

    if (limitedArticles.length > 0) {
      // Insert articles into database
      const { error } = await supabase
        .from('articles')
        .upsert(limitedArticles, { onConflict: 'url', ignoreDuplicates: true });

      if (error) {
        console.error('Error inserting articles:', error);
        throw error;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        articlesScraped: limitedArticles.length,
        message: `Successfully scraped ${limitedArticles.length} REAL articles for "${searchQuery || 'general news'}" from ${sourcesSucceeded}/${sourcesProcessed} sources`,
        sourcesProcessed,
        sourcesSucceeded,
        region: region || 'all',
        searchQuery: searchQuery || null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
