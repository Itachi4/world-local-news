import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsSource {
  name: string;
  url: string;
  country: string;
  region: string;
}

const newsSources: NewsSource[] = [
  // Africa
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com', country: 'QA', region: 'Africa' },
  { name: 'Mail & Guardian', url: 'https://mg.co.za', country: 'ZA', region: 'Africa' },
  { name: 'The Guardian Nigeria', url: 'https://guardian.ng', country: 'NG', region: 'Africa' },
  
  // Asia
  { name: 'South China Morning Post', url: 'https://www.scmp.com', country: 'HK', region: 'Asia' },
  { name: 'The Times of India', url: 'https://timesofindia.indiatimes.com', country: 'IN', region: 'Asia' },
  { name: 'The Straits Times', url: 'https://www.straitstimes.com', country: 'SG', region: 'Asia' },
  
  // Europe
  { name: 'BBC News', url: 'https://www.bbc.com/news', country: 'GB', region: 'Europe' },
  { name: 'Le Monde', url: 'https://www.lemonde.fr', country: 'FR', region: 'Europe' },
  { name: 'Der Spiegel', url: 'https://www.spiegel.de', country: 'DE', region: 'Europe' },
  
  // North America
  { name: 'The New York Times', url: 'https://www.nytimes.com', country: 'US', region: 'North America' },
  { name: 'The Globe and Mail', url: 'https://www.theglobeandmail.com', country: 'CA', region: 'North America' },
  { name: 'El Universal', url: 'https://www.eluniversal.com.mx', country: 'MX', region: 'North America' },
  
  // Oceania
  { name: 'ABC News Australia', url: 'https://www.abc.net.au/news', country: 'AU', region: 'Oceania' },
  { name: 'The Sydney Morning Herald', url: 'https://www.smh.com.au', country: 'AU', region: 'Oceania' },
  { name: 'The New Zealand Herald', url: 'https://www.nzherald.co.nz', country: 'NZ', region: 'Oceania' },
  
  // South America
  { name: 'Folha de S.Paulo', url: 'https://www.folha.uol.com.br', country: 'BR', region: 'South America' },
  { name: 'Clarín', url: 'https://www.clarin.com', country: 'AR', region: 'South America' },
  { name: 'El Mercurio', url: 'https://www.elmercurio.com', country: 'CL', region: 'South America' },
];

async function scrapeWebsite(source: NewsSource): Promise<any[]> {
  try {
    console.log(`Scraping ${source.name}...`);
    
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${source.name}: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const articles = parseArticles(html, source);
    
    console.log(`Scraped ${articles.length} articles from ${source.name}`);
    return articles;
  } catch (error) {
    console.error(`Error scraping ${source.name}:`, error);
    return [];
  }
}

function parseArticles(html: string, source: NewsSource): any[] {
  const articles: any[] = [];
  
  // Simple regex patterns to extract headlines and links
  const titlePattern = /<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi;
  const linkPattern = /<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi;
  
  const titles = new Set<string>();
  let match;
  
  // Extract article links with titles
  while ((match = linkPattern.exec(html)) !== null && articles.length < 20) {
    const url = match[1];
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    
    // Filter for news-like URLs and meaningful titles
    if (text.length > 20 && text.length < 200 && 
        !titles.has(text) &&
        !url.includes('javascript:') &&
        (url.startsWith('http') || url.startsWith('/'))) {
      
      titles.add(text);
      
      const fullUrl = url.startsWith('http') ? url : `${source.url}${url}`;
      
      articles.push({
        title: text,
        snippet: text.substring(0, 150),
        url: fullUrl,
        source_name: source.name,
        source_country: source.country,
        source_region: source.region,
      });
    }
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

    console.log('Starting news scraping...');
    
    // Scrape all sources
    const allArticles: any[] = [];
    
    for (const source of newsSources) {
      const articles = await scrapeWebsite(source);
      allArticles.push(...articles);
    }

    console.log(`Total articles scraped: ${allArticles.length}`);

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
