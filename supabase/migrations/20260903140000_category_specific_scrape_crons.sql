-- Category-specific scrape crons — 42 jobs (6 regions x 7 non-general categories).
--
-- Context: the daily general scrapes (20260713000000_scrape_news_cron.sql) never pass a
-- category param, so every article lands as category='general'. Non-general feed tabs then
-- keyword-search that general pool client-side (see CATEGORY_KEYWORDS in src/pages/Index.tsx),
-- which collapses to near-zero results once also narrowed to one country — 53% of
-- country x category combos had 0 articles as of this audit (2026-09-03).
--
-- The scraper (supabase/functions/scrape-news/index.ts) already builds category-specific
-- Google News queries for every country — 13 have hand-tuned queries, the rest use the
-- generic buildGoogleNewsQuery() + categoryQueries map fallback — it was just never invoked
-- with a category param on a schedule. This migration is purely additive: it does not touch
-- the 18 existing jobs from prior migrations.
--
-- Schedule: staggered 3 minutes apart, starting 14:00 UTC (after the 13:00-13:55 UTC general
-- scrape + backfill window from earlier migrations finishes), through ~16:03 UTC. Each job uses
-- limit:60 (vs. 150 for general) to bound Together.ai image-generation spend, since only one
-- category is being scraped per call. Job names follow scrape-<region-slug>-<category> so they
-- can be individually rolled back with cron.unschedule('scrape-<region-slug>-<category>').

-- scrape-africa-tech-ai
SELECT cron.schedule(
  'scrape-africa-tech-ai',
  '0 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Africa","category":"tech-ai","limit":60}'::jsonb
    );
  $$
);

-- scrape-africa-business-finance
SELECT cron.schedule(
  'scrape-africa-business-finance',
  '3 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Africa","category":"business-finance","limit":60}'::jsonb
    );
  $$
);

-- scrape-africa-politics
SELECT cron.schedule(
  'scrape-africa-politics',
  '6 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Africa","category":"politics","limit":60}'::jsonb
    );
  $$
);

-- scrape-africa-arts-entertainment-fashion
SELECT cron.schedule(
  'scrape-africa-arts-entertainment-fashion',
  '9 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Africa","category":"arts-entertainment-fashion","limit":60}'::jsonb
    );
  $$
);

-- scrape-africa-sports-games
SELECT cron.schedule(
  'scrape-africa-sports-games',
  '12 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Africa","category":"sports-games","limit":60}'::jsonb
    );
  $$
);

-- scrape-africa-travel-leisure
SELECT cron.schedule(
  'scrape-africa-travel-leisure',
  '15 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Africa","category":"travel-leisure","limit":60}'::jsonb
    );
  $$
);

-- scrape-africa-religion-spirituality
SELECT cron.schedule(
  'scrape-africa-religion-spirituality',
  '18 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Africa","category":"religion-spirituality","limit":60}'::jsonb
    );
  $$
);

-- scrape-asia-tech-ai
SELECT cron.schedule(
  'scrape-asia-tech-ai',
  '21 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Asia","category":"tech-ai","limit":60}'::jsonb
    );
  $$
);

-- scrape-asia-business-finance
SELECT cron.schedule(
  'scrape-asia-business-finance',
  '24 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Asia","category":"business-finance","limit":60}'::jsonb
    );
  $$
);

-- scrape-asia-politics
SELECT cron.schedule(
  'scrape-asia-politics',
  '27 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Asia","category":"politics","limit":60}'::jsonb
    );
  $$
);

-- scrape-asia-arts-entertainment-fashion
SELECT cron.schedule(
  'scrape-asia-arts-entertainment-fashion',
  '30 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Asia","category":"arts-entertainment-fashion","limit":60}'::jsonb
    );
  $$
);

-- scrape-asia-sports-games
SELECT cron.schedule(
  'scrape-asia-sports-games',
  '33 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Asia","category":"sports-games","limit":60}'::jsonb
    );
  $$
);

-- scrape-asia-travel-leisure
SELECT cron.schedule(
  'scrape-asia-travel-leisure',
  '36 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Asia","category":"travel-leisure","limit":60}'::jsonb
    );
  $$
);

-- scrape-asia-religion-spirituality
SELECT cron.schedule(
  'scrape-asia-religion-spirituality',
  '39 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Asia","category":"religion-spirituality","limit":60}'::jsonb
    );
  $$
);

-- scrape-europe-tech-ai
SELECT cron.schedule(
  'scrape-europe-tech-ai',
  '42 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Europe","category":"tech-ai","limit":60}'::jsonb
    );
  $$
);

-- scrape-europe-business-finance
SELECT cron.schedule(
  'scrape-europe-business-finance',
  '45 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Europe","category":"business-finance","limit":60}'::jsonb
    );
  $$
);

-- scrape-europe-politics
SELECT cron.schedule(
  'scrape-europe-politics',
  '48 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Europe","category":"politics","limit":60}'::jsonb
    );
  $$
);

-- scrape-europe-arts-entertainment-fashion
SELECT cron.schedule(
  'scrape-europe-arts-entertainment-fashion',
  '51 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Europe","category":"arts-entertainment-fashion","limit":60}'::jsonb
    );
  $$
);

-- scrape-europe-sports-games
SELECT cron.schedule(
  'scrape-europe-sports-games',
  '54 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Europe","category":"sports-games","limit":60}'::jsonb
    );
  $$
);

-- scrape-europe-travel-leisure
SELECT cron.schedule(
  'scrape-europe-travel-leisure',
  '57 14 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Europe","category":"travel-leisure","limit":60}'::jsonb
    );
  $$
);

-- scrape-europe-religion-spirituality
SELECT cron.schedule(
  'scrape-europe-religion-spirituality',
  '0 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Europe","category":"religion-spirituality","limit":60}'::jsonb
    );
  $$
);

-- scrape-north-america-tech-ai
SELECT cron.schedule(
  'scrape-north-america-tech-ai',
  '3 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"North America","category":"tech-ai","limit":60}'::jsonb
    );
  $$
);

-- scrape-north-america-business-finance
SELECT cron.schedule(
  'scrape-north-america-business-finance',
  '6 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"North America","category":"business-finance","limit":60}'::jsonb
    );
  $$
);

-- scrape-north-america-politics
SELECT cron.schedule(
  'scrape-north-america-politics',
  '9 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"North America","category":"politics","limit":60}'::jsonb
    );
  $$
);

-- scrape-north-america-arts-entertainment-fashion
SELECT cron.schedule(
  'scrape-north-america-arts-entertainment-fashion',
  '12 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"North America","category":"arts-entertainment-fashion","limit":60}'::jsonb
    );
  $$
);

-- scrape-north-america-sports-games
SELECT cron.schedule(
  'scrape-north-america-sports-games',
  '15 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"North America","category":"sports-games","limit":60}'::jsonb
    );
  $$
);

-- scrape-north-america-travel-leisure
SELECT cron.schedule(
  'scrape-north-america-travel-leisure',
  '18 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"North America","category":"travel-leisure","limit":60}'::jsonb
    );
  $$
);

-- scrape-north-america-religion-spirituality
SELECT cron.schedule(
  'scrape-north-america-religion-spirituality',
  '21 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"North America","category":"religion-spirituality","limit":60}'::jsonb
    );
  $$
);

-- scrape-oceania-tech-ai
SELECT cron.schedule(
  'scrape-oceania-tech-ai',
  '24 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Oceania","category":"tech-ai","limit":60}'::jsonb
    );
  $$
);

-- scrape-oceania-business-finance
SELECT cron.schedule(
  'scrape-oceania-business-finance',
  '27 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Oceania","category":"business-finance","limit":60}'::jsonb
    );
  $$
);

-- scrape-oceania-politics
SELECT cron.schedule(
  'scrape-oceania-politics',
  '30 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Oceania","category":"politics","limit":60}'::jsonb
    );
  $$
);

-- scrape-oceania-arts-entertainment-fashion
SELECT cron.schedule(
  'scrape-oceania-arts-entertainment-fashion',
  '33 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Oceania","category":"arts-entertainment-fashion","limit":60}'::jsonb
    );
  $$
);

-- scrape-oceania-sports-games
SELECT cron.schedule(
  'scrape-oceania-sports-games',
  '36 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Oceania","category":"sports-games","limit":60}'::jsonb
    );
  $$
);

-- scrape-oceania-travel-leisure
SELECT cron.schedule(
  'scrape-oceania-travel-leisure',
  '39 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Oceania","category":"travel-leisure","limit":60}'::jsonb
    );
  $$
);

-- scrape-oceania-religion-spirituality
SELECT cron.schedule(
  'scrape-oceania-religion-spirituality',
  '42 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Oceania","category":"religion-spirituality","limit":60}'::jsonb
    );
  $$
);

-- scrape-south-america-tech-ai
SELECT cron.schedule(
  'scrape-south-america-tech-ai',
  '45 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"South America","category":"tech-ai","limit":60}'::jsonb
    );
  $$
);

-- scrape-south-america-business-finance
SELECT cron.schedule(
  'scrape-south-america-business-finance',
  '48 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"South America","category":"business-finance","limit":60}'::jsonb
    );
  $$
);

-- scrape-south-america-politics
SELECT cron.schedule(
  'scrape-south-america-politics',
  '51 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"South America","category":"politics","limit":60}'::jsonb
    );
  $$
);

-- scrape-south-america-arts-entertainment-fashion
SELECT cron.schedule(
  'scrape-south-america-arts-entertainment-fashion',
  '54 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"South America","category":"arts-entertainment-fashion","limit":60}'::jsonb
    );
  $$
);

-- scrape-south-america-sports-games
SELECT cron.schedule(
  'scrape-south-america-sports-games',
  '57 15 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"South America","category":"sports-games","limit":60}'::jsonb
    );
  $$
);

-- scrape-south-america-travel-leisure
SELECT cron.schedule(
  'scrape-south-america-travel-leisure',
  '0 16 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"South America","category":"travel-leisure","limit":60}'::jsonb
    );
  $$
);

-- scrape-south-america-religion-spirituality
SELECT cron.schedule(
  'scrape-south-america-religion-spirituality',
  '3 16 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"South America","category":"religion-spirituality","limit":60}'::jsonb
    );
  $$
);

