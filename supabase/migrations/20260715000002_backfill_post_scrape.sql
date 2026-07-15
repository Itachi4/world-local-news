-- Post-scrape backfill: fire one per-region job 5–20 min after the daily scraper (13:00 UTC).
-- Each job processes only one table so it stays well under the 150s edge function timeout.
-- perTableLimit=15 → ~120s worst case (15 articles × ~8s Together.ai call).
--
-- Schedule:
--   13:05  Africa
--   13:08  Asia
--   13:11  Europe
--   13:14  North America
--   13:17  Oceania  (10 limit — fewer articles due to rate limiting)
--   13:20  South America

SELECT cron.schedule(
  'backfill-post-scrape-africa',
  '5 13 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"backfillImages":true,"region":"Africa","perTableLimit":15}'::jsonb
    );
  $$
);

SELECT cron.schedule(
  'backfill-post-scrape-asia',
  '8 13 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"backfillImages":true,"region":"Asia","perTableLimit":15}'::jsonb
    );
  $$
);

SELECT cron.schedule(
  'backfill-post-scrape-europe',
  '11 13 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"backfillImages":true,"region":"Europe","perTableLimit":15}'::jsonb
    );
  $$
);

SELECT cron.schedule(
  'backfill-post-scrape-na',
  '14 13 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"backfillImages":true,"region":"North America","perTableLimit":15}'::jsonb
    );
  $$
);

SELECT cron.schedule(
  'backfill-post-scrape-oceania',
  '17 13 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"backfillImages":true,"region":"Oceania","perTableLimit":10}'::jsonb
    );
  $$
);

SELECT cron.schedule(
  'backfill-post-scrape-sa',
  '20 13 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"backfillImages":true,"region":"South America","perTableLimit":15}'::jsonb
    );
  $$
);
