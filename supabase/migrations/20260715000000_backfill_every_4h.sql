-- Replace the once-daily backfill with a run every 4 hours.
-- This ensures newly scraped articles get AI illustrations within ~4 hours
-- instead of waiting up to 24 hours.
--
-- perTableLimit kept at 10 to stay well under the 150s edge function timeout.
-- 6 regions × 10 articles × ~8s per Together.ai call ≈ 80s worst case.
-- 6 runs/day × 10 articles = 60 AI images generated per table per day max.

SELECT cron.unschedule('backfill-images-daily');

SELECT cron.schedule(
  'backfill-images-4h',
  '30 */4 * * *',   -- 00:30, 04:30, 08:30, 12:30, 16:30, 20:30 UTC
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
