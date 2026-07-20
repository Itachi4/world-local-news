-- Add a second post-scrape backfill round 30 min after scraping (covers articles
-- that failed Together.ai rate limits in the first round at 13:05-13:20).
-- Also replace the 4h cycle with 2h so daytime articles never wait more than 2h.

-- Second round: 13:35-13:50 UTC (one per region, staggered 3 min apart)
SELECT cron.schedule(
  'backfill-post-scrape-africa-r2',
  '35 13 * * *',
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
  'backfill-post-scrape-asia-r2',
  '38 13 * * *',
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
  'backfill-post-scrape-europe-r2',
  '41 13 * * *',
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
  'backfill-post-scrape-na-r2',
  '44 13 * * *',
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
  'backfill-post-scrape-oceania-r2',
  '47 13 * * *',
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
  'backfill-post-scrape-sa-r2',
  '50 13 * * *',
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

-- Replace 4h cycle with 2h (00:30, 02:30, 04:30 ... 22:30 UTC)
SELECT cron.unschedule('backfill-images-4h');

SELECT cron.schedule(
  'backfill-images-2h',
  '30 */2 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"backfillImages":true,"perTableLimit":10}'::jsonb
    );
  $$
);
