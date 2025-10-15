import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// News sources with RSS feeds
const newsSources = [
  {
    name: "BBC News",
    country: "GB",
    region: "Europe",
    rssUrl: "http://feeds.bbci.co.uk/news/rss.xml"
  },
  {
    name: "CNN",
    country: "US", 
    region: "North America",
    rssUrl: "http://rss.cnn.com/rss/edition.rss"
  },
  {
    name: "Reuters",
    country: "US",
    region: "North America", 
    rssUrl: "https://feeds.reuters.com/reuters/topNews"
  },
  {
    name: "Al Jazeera",
    country: "QA",
    region: "Asia",
    rssUrl: "https://www.aljazeera.com/xml/rss/all.xml"
  },
  {
    name: "The Guardian",
    country: "GB",
    region: "Europe",
    rssUrl: "https://www.theguardian.com/world/rss"
  },
  {
    name: "Associated Press",
    country: "US",
    region: "North America",
    rssUrl: "https://feeds.apnews.com/apnews/topnews"
  }
];

// Function to resolve Google News redirects and get real URLs
async function resolveUrl(url: string): Promise<string> {
  try {
    // If it's already a direct URL, return it
    if (!url.includes('news.google.com') && !url.includes('google.com/url')) {
      return url;
    }

    // For Google News redirects, try to extract the real URL
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Check for redirect location
    const location = response.headers.get('location');
    if (location) {
      return location;
    }

    // If no redirect, try to parse the URL for embedded URLs
    const urlObj = new URL(url);
    const urlParam = urlObj.searchParams.get('url');
    if (urlParam) {
      return decodeURIComponent(urlParam);
    }

    return url;
  } catch (error) {
    console.error('Error resolving URL:', error);
    return url; // Return original URL if resolution fails
  }
}

// Function to parse RSS feed
async function parseRSSFeed(feedUrl: string, source: any): Promise<any[]> {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }

    const xmlText = await response.text();
    const articles: any[] = [];

    // Simple XML parsing for RSS feeds
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null && articles.length < 10) {
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
          // Resolve the URL to get the real article link
          const resolvedUrl = await resolveUrl(url);
          
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

    // Get request body for search query and region filter
    const body = await req.json().catch(() => ({}));
    const { searchQuery, region } = body;

    let allArticles: any[] = [];

    // Fetch articles from all news sources
    for (const source of newsSources) {
      // Skip sources that don't match region filter
      if (region && region !== 'all' && source.region !== region) {
        continue;
      }

      try {
        const articles = await parseRSSFeed(source.rssUrl, source);
        allArticles = allArticles.concat(articles);
      } catch (error) {
        console.error(`Failed to fetch from ${source.name}:`, error);
      }
    }

    // Filter by search query if provided
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
        message: `Successfully scraped ${limitedArticles.length} articles from RSS feeds`,
        sources: newsSources.length
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
