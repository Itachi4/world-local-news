-- Spread the daily scrape over 7:00-9:00 America/New_York instead of 9:00-9:47.
--
-- Same 48 jobs as 20261027090000_daily_9am_all_categories.sql (6 regions x 8 categories, same
-- names and bodies) — only the timing changes. Spacing is 2.5 minutes (offset = floor(i * 2.5)),
-- so the last job starts at 8:57. The wider gap also eases the per-IP Google News throttling.
--
-- DST: same trick as before. A job at New York local hour H runs in UTC hour H+4 (EDT) or H+5
-- (EST); it's scheduled in both and the command only fires when the local hour is really H.
-- Post-scrape backfills (10:00) and the translate sweep (11:00) are unchanged.

DO $$
DECLARE
  regions    text[] := ARRAY['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'];
  slugs      text[] := ARRAY['africa', 'asia', 'europe', 'north-america', 'oceania', 'south-america'];
  categories text[] := ARRAY['general', 'politics', 'business-finance', 'tech-ai', 'sports-games',
                             'arts-entertainment-fashion', 'travel-leisure', 'religion-spirituality'];
  job record;
  i int;
  r int;
  c int;
  offset_min int;
  local_hour int;
  body text;
  job_name text;
BEGIN
  FOR job IN SELECT jobname FROM cron.job WHERE jobname LIKE 'scrape-%' LOOP
    PERFORM cron.unschedule(job.jobname);
  END LOOP;

  FOR i IN 0..47 LOOP
    c := i / 6 + 1;
    r := i % 6 + 1;
    offset_min := (i * 5) / 2;          -- 0, 2, 5, 7, 10, ... 117
    local_hour := 7 + offset_min / 60;  -- 7 or 8

    IF categories[c] = 'general' THEN
      job_name := 'scrape-' || slugs[r];
      body := format('{"region":"%s","limit":150}', regions[r]);
    ELSE
      job_name := 'scrape-' || slugs[r] || '-' || categories[c];
      body := format('{"region":"%s","category":"%s","limit":100}', regions[r], categories[c]);
    END IF;

    PERFORM cron.schedule(
      job_name,
      format('%s %s,%s * * *', offset_min % 60, local_hour + 4, local_hour + 5),
      format($cmd$
        SELECT net.http_post(
          url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
          ),
          body    := %L::jsonb
        )
        WHERE extract(hour FROM now() AT TIME ZONE 'America/New_York') = %s;
      $cmd$, body, local_hour)
    );
  END LOOP;
END $$;
