-- Reduce North America and Oceania category-scrape crons from daily to every 2 days.
--
-- Context: the 42 category-specific crons added in 20260903140000_category_specific_scrape_crons.sql
-- caused North America and Oceania to start timing out. Confirmed via Supabase Edge Function logs
-- (2026-09-08): North America's category-scrape invocations are hitting the platform's hard 150s
-- execution limit and getting killed with 504 IDLE_TIMEOUT before any articles get saved — e.g.
-- scrape-north-america-tech-ai ran for exactly 150385ms then was killed. Article volume for both
-- regions declined day-over-day since the crons launched (NA: 34->17->6->0->0 over 09-04..09-08;
-- Oceania: 23->18->4->2->13), consistent with Google News responding progressively slower to
-- Supabase's IP for the en-US edition under the added load, eventually pushing total request time
-- past the 150s ceiling.
--
-- Fix: unschedule the 14 daily NA/Oceania category jobs and reschedule them at 1/2 the frequency
-- (every 2 days, via day-of-month `*/2`) to relieve load and let response times recover. Same
-- time-of-day slots and job names as before — this is a frequency change, not a redesign. The other
-- 4 regions (Africa, Asia, Europe, South America) are unaffected and remain daily.

DO $$
DECLARE
  job_name text;
BEGIN
  FOREACH job_name IN ARRAY ARRAY[
    'scrape-north-america-tech-ai',
    'scrape-north-america-business-finance',
    'scrape-north-america-politics',
    'scrape-north-america-arts-entertainment-fashion',
    'scrape-north-america-sports-games',
    'scrape-north-america-travel-leisure',
    'scrape-north-america-religion-spirituality',
    'scrape-oceania-tech-ai',
    'scrape-oceania-business-finance',
    'scrape-oceania-politics',
    'scrape-oceania-arts-entertainment-fashion',
    'scrape-oceania-sports-games',
    'scrape-oceania-travel-leisure',
    'scrape-oceania-religion-spirituality'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE cron.job.jobname = job_name) THEN
      PERFORM cron.unschedule(job_name);
    END IF;
  END LOOP;
END $$;

-- North America (every 2 days, 15:03-15:21 UTC, same stagger as before)
SELECT cron.schedule('scrape-north-america-tech-ai', '3 15 */2 * *', $$
  SELECT net.http_post(
    url := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body := '{"region":"North America","category":"tech-ai","limit":60}'::jsonb
  );
$$);
SELECT cron.schedule('scrape-north-america-business-finance', '6 15 */2 * *', $$
  SELECT net.http_post(
    url := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body := '{"region":"North America","category":"business-finance","limit":60}'::jsonb
  );
$$);
SELECT cron.schedule('scrape-north-america-politics', '9 15 */2 * *', $$
  SELECT net.http_post(
    url := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body := '{"region":"North America","category":"politics","limit":60}'::jsonb
  );
$$);
SELECT cron.schedule('scrape-north-america-arts-entertainment-fashion', '12 15 */2 * *', $$
  SELECT net.http_post(
    url := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body := '{"region":"North America","category":"arts-entertainment-fashion","limit":60}'::jsonb
  );
$$);
SELECT cron.schedule('scrape-north-america-sports-games', '15 15 */2 * *', $$
  SELECT net.http_post(
    url := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body := '{"region":"North America","category":"sports-games","limit":60}'::jsonb
  );
$$);
SELECT cron.schedule('scrape-north-america-travel-leisure', '18 15 */2 * *', $$
  SELECT net.http_post(
    url := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body := '{"region":"North America","category":"travel-leisure","limit":60}'::jsonb
  );
$$);
SELECT cron.schedule('scrape-north-america-religion-spirituality', '21 15 */2 * *', $$
  SELECT net.http_post(
    url := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body := '{"region":"North America","category":"religion-spirituality","limit":60}'::jsonb
  );
$$);

-- Oceania (every 2 days, 15:24-15:42 UTC, same stagger as before)
SELECT cron.schedule('scrape-oceania-tech-ai', '24 15 */2 * *', $$
  SELECT net.http_post(
    url := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body := '{"region":"Oceania","category":"tech-ai","limit":60}'::jsonb
  );
$$);
SELECT cron.schedule('scrape-oceania-business-finance', '27 15 */2 * *', $$
  SELECT net.http_post(
    url := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body := '{"region":"Oceania","category":"business-finance","limit":60}'::jsonb
  );
$$);
SELECT cron.schedule('scrape-oceania-politics', '30 15 */2 * *', $$
  SELECT net.http_post(
    url := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body := '{"region":"Oceania","category":"politics","limit":60}'::jsonb
  );
$$);
SELECT cron.schedule('scrape-oceania-arts-entertainment-fashion', '33 15 */2 * *', $$
  SELECT net.http_post(
    url := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body := '{"region":"Oceania","category":"arts-entertainment-fashion","limit":60}'::jsonb
  );
$$);
SELECT cron.schedule('scrape-oceania-sports-games', '36 15 */2 * *', $$
  SELECT net.http_post(
    url := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body := '{"region":"Oceania","category":"sports-games","limit":60}'::jsonb
  );
$$);
SELECT cron.schedule('scrape-oceania-travel-leisure', '39 15 */2 * *', $$
  SELECT net.http_post(
    url := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body := '{"region":"Oceania","category":"travel-leisure","limit":60}'::jsonb
  );
$$);
SELECT cron.schedule('scrape-oceania-religion-spirituality', '42 15 */2 * *', $$
  SELECT net.http_post(
    url := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body := '{"region":"Oceania","category":"religion-spirituality","limit":60}'::jsonb
  );
$$);
