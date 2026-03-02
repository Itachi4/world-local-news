import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

// Priority news sources for Asia region (higher number = higher priority)
// These sources will be displayed first
// Key can be source name or domain
const asiaPrioritySources: Record<string, number> = {
  // Domains - Dawn.com is highest priority for Pakistan, Times of India highest for India
  'dawn.com': 150, // Highest priority for Pakistan
  'timesofindia.com': 150, // Highest priority for India
  'timesofindia.indiatimes.com': 150, // Highest priority for India
  'dailyindependent.com.pk': 100,
  'hindustantimes.com': 90,
  'thehindu.com': 85,
  'indianexpress.com': 80,
  'deccanherald.com': 75,
  'tribuneindia.com': 70,
  'thenews.com.pk': 60,
  'scmp.com': 55,
  'chinadaily.com.cn': 50,
  'japantimes.co.jp': 45,
  'straitstimes.com': 40,
  'arabnews.com': 35,
  'koreatimes.co.kr': 30,
  'koreaherald.com': 25,
  // Source names (for RSS feed source tags)
  'dawn': 150, // Highest priority for Pakistan
  'times of india': 150, // Highest priority for India
  'the times of india': 150, // Highest priority for India
  'toi': 150, // Times of India abbreviation
  'hindustan times': 90,
  'the hindu': 85,
  'indian express': 80,
  'deccan herald': 75,
  'the tribune': 70,
  'the news international': 60,
  'south china morning post': 55,
  'china daily': 50,
  'japan times': 45,
  'straits times': 40,
  'arab news': 35,
  'korea times': 30,
  'korea herald': 25,
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
      console.log(`   ✅ Priority match (variation): "${sourceName}" -> Times of India (priority: 150)`);
      return 150;
    }
    // Hindustan Times variations
    if (sourceLower.includes('ht ') || sourceLower.includes('hindustantimes') || sourceLower.includes('hindustan times')) {
      console.log(`   ✅ Priority match (variation): "${sourceName}" -> Hindustan Times (priority: 90)`);
      return 90;
    }
    // The Hindu variations
    if (sourceLower.includes('thehindu') || sourceLower.includes('the hindu')) {
      console.log(`   ✅ Priority match (variation): "${sourceName}" -> The Hindu (priority: 85)`);
      return 85;
    }
    // Indian Express variations
    if (sourceLower.includes('indianexpress') || sourceLower.includes('indian express')) {
      console.log(`   ✅ Priority match (variation): "${sourceName}" -> Indian Express (priority: 80)`);
      return 80;
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
  'IN': 'Asia', 'CN': 'Asia', 'JP': 'Asia', 'SG': 'Asia', 'SA': 'Asia', 'KR': 'Asia', 'PK': 'Asia', 'NP': 'Asia', 'IR': 'Asia', 'SY': 'Asia', 'BD': 'Asia', 'IL': 'Asia', 'LK': 'Asia', 'AE': 'Asia',
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
  '.in': 'IN', '.cn': 'CN', '.jp': 'JP', '.sg': 'SG', '.sa': 'SA', '.kr': 'KR', '.pk': 'PK', '.np': 'NP', '.ir': 'IR', '.sy': 'SY', '.bd': 'BD', '.il': 'IL', '.lk': 'LK', '.ae': 'AE',
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

      // Special handling for Pakistan and India: Use direct RSS feeds
      const urls: string[] = [];

      if (country.code === 'PK') {
        // Pakistan: Use Dawn.com RSS feeds directly
        if (!category || category === 'general') {
          // General news from Dawn.com
          urls.push('https://www.dawn.com/feeds/');
          console.log(`🔗 Dawn.com RSS URL [General]: https://www.dawn.com/feeds/`);
        } else if (category === 'tech-ai') {
          // Tech news from Dawn.com
          urls.push('https://www.dawn.com/feeds/tech');
          console.log(`🔗 Dawn.com RSS URL [Tech]: https://www.dawn.com/feeds/tech`);
        } else if (category === 'sports-games') {
          // Sports news from Dawn.com
          urls.push('https://www.dawn.com/feeds/sport');
          console.log(`🔗 Dawn.com RSS URL [Sports]: https://www.dawn.com/feeds/sport`);
        } else if (category === 'business-finance') {
          // Business news from Dawn.com
          urls.push('https://www.dawn.com/feeds/business');
          console.log(`🔗 Dawn.com RSS URL [Business]: https://www.dawn.com/feeds/business`);
        }

        // For other categories, still use Google News as fallback
        if (category && category !== 'general' && category !== 'tech-ai' && category !== 'sports-games' && category !== 'business-finance') {
          const categoryQuery = categoryQueries[category];
          const queryString = buildGoogleNewsQuery(categoryQuery, country.name);
          const locale = getLocaleForCountry(country.code);
          urls.push(`${GOOGLE_NEWS_RSS_BASE}/search?q=${queryString}&gl=${country.code}&hl=${locale}&ceid=${country.code}:en`);
          console.log(`🔗 Google News RSS URL [${category}]: ${urls[urls.length - 1]}`);
        }
      } else if (country.code === 'IN') {
        // India: Use Times of India RSS feeds directly
        if (!category || category === 'general') {
          // General news from Times of India
          urls.push('https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms');
          console.log(`🔗 Times of India RSS URL [General]: https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms`);
        } else if (category === 'arts-entertainment-fashion') {
          // Entertainment from Times of India
          urls.push('https://timesofindia.indiatimes.com/rssfeedsvideo/3812908.cms');
          console.log(`🔗 Times of India RSS URL [Entertainment]: https://timesofindia.indiatimes.com/rssfeedsvideo/3812908.cms`);
        } else if (category === 'business-finance') {
          // Business from Times of India
          urls.push('https://timesofindia.indiatimes.com/rssfeedsvideo/3813458.cms');
          console.log(`🔗 Times of India RSS URL [Business]: https://timesofindia.indiatimes.com/rssfeedsvideo/3813458.cms`);
        } else if (category === 'sports-games') {
          // Sports from Times of India
          urls.push('https://timesofindia.indiatimes.com/rssfeedsvideo/3813456.cms');
          console.log(`🔗 Times of India RSS URL [Sports]: https://timesofindia.indiatimes.com/rssfeedsvideo/3813456.cms`);
        }

        // For other categories, still use Google News as fallback
        if (category && category !== 'general' && category !== 'arts-entertainment-fashion' && category !== 'business-finance' && category !== 'sports-games') {
          const categoryQuery = categoryQueries[category];
          const queryString = buildGoogleNewsQuery(categoryQuery, country.name);
          const locale = getLocaleForCountry(country.code);
          urls.push(`${GOOGLE_NEWS_RSS_BASE}/search?q=${queryString}&gl=${country.code}&hl=${locale}&ceid=${country.code}:en`);
          console.log(`🔗 Google News RSS URL [${category}]: ${urls[urls.length - 1]}`);
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

  // Extract channel title to determine feed type (Dawn.com or Times of India)
  const channelTitleMatch = xml.match(/<channel>[\s\S]*?<title>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/);
  const channelTitle = channelTitleMatch ? decode((channelTitleMatch[1] ?? channelTitleMatch[2]) || '') : '';
  const isDawnFeed = channelTitle.toLowerCase().includes('dawn') || xml.includes('dawn.com');
  const isTOIFeed = channelTitle.toLowerCase().includes('times of india') || xml.includes('timesofindia.indiatimes.com');
  const defaultSourceName = isDawnFeed ? 'Dawn' : (isTOIFeed ? 'Times of India' : `News from ${countryName}`);

  const feedType = isDawnFeed ? 'Dawn.com' : (isTOIFeed ? 'Times of India' : 'Google News/Other');
  console.log(`📰 RSS Feed type: ${feedType}, Channel: "${channelTitle}"`);
  if (isDawnFeed) {
    console.log(`   ✅ Detected Dawn.com feed for ${countryName}`);
  }

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

    if (isDawnFeed && articles.length < 5) {
      console.log(`   📅 Published: ${itemPublishedAt.toISOString()}`);
    }

    // Extract article URL (supports CDATA or plain text, similar to title)
    // For Dawn.com RSS feeds, use the direct link
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
    if (url.includes('dawn.com')) {
      console.log(`🔗 Using Dawn.com direct URL: ${url.substring(0, 100)}...`);
    } else if (url.includes('timesofindia.indiatimes.com')) {
      console.log(`🔗 Using Times of India direct URL: ${url.substring(0, 100)}...`);
    } else {
      console.log(`🔗 Using RSS feed URL: ${url.substring(0, 100)}...`);
    }

    // Extract description/snippet
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/)
    const rawDesc = descMatch ? (descMatch[1] ?? descMatch[2]) : ''
    const decodedDesc = decode(rawDesc);
    const snippet = decodedDesc.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);

    // Extract source
    // For Dawn.com feeds, use "Dawn" as source name
    // For Times of India feeds, use "Times of India" as source name
    // For other feeds, try to extract from <source> tag or use default
    let sourceName: string;
    if (isDawnFeed) {
      sourceName = 'Dawn';
    } else if (isTOIFeed) {
      sourceName = 'Times of India';
    } else {
      const sourceMatch = itemXml.match(/<source[^>]*>(.*?)<\/source>/);
      sourceName = decode(sourceMatch ? sourceMatch[1] : defaultSourceName);
    }

    // Use the date we already extracted during sorting
    const publishedAt = itemPublishedAt;
    const publishedTime = publishedAt.getTime();

    // Filter out stale items (older than ~3 days to prioritize recent news)
    // For Dawn.com and Times of India, use a longer window (14 days) since they're trusted sources
    // Google News feeds also get a wider window (7 days) to catch up after periods of inactivity
    const daysAgo = isDawnFeed || isTOIFeed ? 14 : 7;
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
    // 4. For trusted sources (Dawn.com, Times of India), always trust RSS feed country
    // Skip articles if:
    // - Detected region is known and doesn't match expected region AND detected country doesn't match RSS feed country
    // - For Google News feeds, be more strict: if detected country is clearly different (not just mentioned), skip it
    const isTrustedSource = isDawnFeed || isTOIFeed;

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
    };

    articles.push(article);

    if (isDawnFeed) {
      console.log(`   ✅ Dawn.com article ${articles.length}: "${title.substring(0, 60)}..."`);
      console.log(`      Category: "${articleCategory}", Country: "${finalCountry}", Region: "${finalRegion}", Date: ${publishedAt.toISOString()}`);
    }

    if (isTOIFeed && articles.length <= 3) {
      console.log(`   ✅ Times of India article ${articles.length}: "${title.substring(0, 60)}..."`);
      console.log(`      Category: "${articleCategory}", Country: "${finalCountry}", Region: "${finalRegion}"`);
    }

    // Don't break early - parse ALL articles from RSS feed
    // We'll limit later when saving to database
  }

  console.log(`📊 parseRSSFeed completed: Parsed ${articles.length} articles from ${itemSegments.length} RSS items`);
  if (isDawnFeed && articles.length === 0 && itemSegments.length > 0) {
    console.warn(`⚠️ Dawn.com feed had ${itemSegments.length} items but 0 articles were parsed. This might indicate a parsing issue.`);
    console.log(`   First item preview: ${itemSegments[0]?.substring(0, 300)}...`);
  }

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

    const { category, region, country, limit } = requestBody || { category: null, region: null, country: null, limit: 12 };

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
    for (const regionConfig of regionsToSearch) {
      // Fetch ALL articles from each country (no maxArticles limit)
      const articles = await fetchNewsFromRegion(regionConfig, category, false, 9999); // Large number to get all
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

    // Sort articles: Priority sources first, then by date (newest first)
    // For Asia region, prioritize trusted sources like Times of India, Hindustan Times, etc.
    const currentRegion = region || 'all';

    // Add priority scores to articles for sorting
    const articlesWithPriority = uniqueArticles.map(article => ({
      ...article,
      _priority: getSourcePriority(article.source_name, article.source_region, article.url)
    }));

    // Log some sample source names for debugging
    if (currentRegion === 'Asia' && articlesWithPriority.length > 0) {
      console.log(`📊 Sample source names from RSS feeds (first 20):`);
      const sampleSources = [...new Set(articlesWithPriority.slice(0, 20).map(a => ({ name: a.source_name, url: a.url })))];
      sampleSources.forEach(({ name, url }) => {
        const priority = getSourcePriority(name, 'Asia', url);
        const domain = extractDomainFromUrl(url);
        console.log(`   "${name}" (${domain}) -> priority: ${priority}`);
      });

      // Show all unique sources with their priorities
      const allUniqueSources = new Map<string, { name: string; url: string; priority: number }>();
      articlesWithPriority.forEach(a => {
        const key = a.source_name.toLowerCase();
        if (!allUniqueSources.has(key)) {
          allUniqueSources.set(key, {
            name: a.source_name,
            url: a.url,
            priority: getSourcePriority(a.source_name, 'Asia', a.url)
          });
        }
      });

      console.log(`📊 All unique sources (${allUniqueSources.size} total):`);
      Array.from(allUniqueSources.values())
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 30)
        .forEach(({ name, url, priority }) => {
          const domain = extractDomainFromUrl(url);
          console.log(`   [Priority ${priority}] "${name}" (${domain})`);
        });
    }

    // Sort by priority first, then by date
    articlesWithPriority.sort((a, b) => {
      // First sort by priority (higher priority first)
      if (a._priority !== b._priority) {
        return b._priority - a._priority;
      }

      // If same priority, sort by date (newest first)
      const dateA = new Date(a.published_at).getTime();
      const dateB = new Date(b.published_at).getTime();
      return dateB - dateA;
    });

    // Remove the temporary _priority field
    const sortedArticles = articlesWithPriority.map(({ _priority, ...article }) => article);

    console.log(`📊 Sorted articles: Priority sources first, then by date`);
    if (currentRegion === 'Asia' && sortedArticles.length > 0) {
      const priorityCount = sortedArticles.filter(a => getSourcePriority(a.source_name, a.source_region, a.url) > 0).length;
      console.log(`   ${priorityCount} articles from priority sources for Asia`);
      if (priorityCount > 0) {
        const topPriority = sortedArticles.slice(0, Math.min(5, priorityCount));
        console.log(`   Top priority articles:`);
        topPriority.forEach((a, i) => {
          const p = getSourcePriority(a.source_name, a.source_region, a.url);
          const domain = extractDomainFromUrl(a.url);
          console.log(`     ${i + 1}. [Priority ${p}] ${a.source_name} (${domain}): "${a.title.substring(0, 50)}..."`);
        });
      }
    }

    // Use sorted articles
    const articlesToSave = sortedArticles.slice(0, targetLimit);

    console.log(`📊 Saving ${articlesToSave.length} articles (limited from ${sortedArticles.length})`);

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
