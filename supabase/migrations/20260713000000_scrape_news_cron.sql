-- Schedule per-region scrape jobs using pg_cron + pg_net.
--
-- SETUP REQUIRED before running this migration (same as digest_cron_schedule):
--   1. Enable pg_cron and pg_net extensions in the Supabase dashboard
--      (Database → Extensions → search "cron" and "net", toggle on).
--   2. Store the service role key in Vault:
--        SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');
--
-- Schedules:
--   6 region scrapes → every day at 13:00 UTC (08:00 EST / 09:00 EDT)
--   backfill-images  → every day at 13:30 UTC (30 min after scraping)

-- scrape-africa
SELECT cron.schedule(
  'scrape-africa',
  '0 13 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Africa","limit":150}'::jsonb
    );
  $$
);

-- scrape-asia
SELECT cron.schedule(
  'scrape-asia',
  '0 13 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Asia","limit":150}'::jsonb
    );
  $$
);

-- scrape-europe
SELECT cron.schedule(
  'scrape-europe',
  '0 13 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Europe","limit":150}'::jsonb
    );
  $$
);

-- scrape-north-america
SELECT cron.schedule(
  'scrape-north-america',
  '0 13 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"North America","limit":150}'::jsonb
    );
  $$
);

-- scrape-oceania
SELECT cron.schedule(
  'scrape-oceania',
  '0 13 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"Oceania","limit":150}'::jsonb
    );
  $$
);

-- scrape-south-america
SELECT cron.schedule(
  'scrape-south-america',
  '0 13 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"region":"South America","limit":150}'::jsonb
    );
  $$
);

-- backfill-images-daily (runs 30 min after scraping to enrich missing images)
SELECT cron.schedule(
  'backfill-images-daily',
  '30 13 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"backfillImages":true,"perTableLimit":30}'::jsonb
    );
  $$
);
