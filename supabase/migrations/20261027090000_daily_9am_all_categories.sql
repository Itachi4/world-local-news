-- Daily 9am (America/New_York) scrape of every category for every region.
--
-- Replaces the old schedule (6 general scrapes at 13:00 UTC + 42 category scrapes staggered
-- 14:00-16:03 UTC, NA/Oceania only every 2 days) with one daily run of all 48
-- region x category combinations (6 regions x 8 categories incl. general), every day.
-- Every country in a region is covered because scrape-news now gives each country an equal
-- share of the region's article limit (balanceAcrossCountries).
--
-- Timing: jobs start at 9:00 New York time and are staggered one minute apart (9:00-9:47) so
-- Google News isn't hit with ~600 feed requests at once — that kind of burst is what pushed
-- North America past the 150s edge-function limit in September.
--
-- DST: pg_cron runs in UTC, and 9am New York is 13:00 UTC in summer and 14:00 UTC in winter.
-- Each job is scheduled in both UTC hours and its command only fires when the New York local
-- hour is actually 9, so the run stays at 9am local year-round.
--
-- The post-scrape image backfills are moved to 10:00-10:55 New York time (same guard trick),
-- after the scrape window instead of overlapping the old 13:00 UTC one. A per-region
-- translate-existing sweep runs at 11:00-11:25 New York time.

DO $$
DECLARE
  regions    text[] := ARRAY['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'];
  slugs      text[] := ARRAY['africa', 'asia', 'europe', 'north-america', 'oceania', 'south-america'];
  categories text[] := ARRAY['general', 'politics', 'business-finance', 'tech-ai', 'sports-games',
                             'arts-entertainment-fashion', 'travel-leisure', 'religion-spirituality'];
  backfill_slugs text[] := ARRAY['africa', 'asia', 'europe', 'na', 'oceania', 'sa'];
  job record;
  i int;
  r int;
  c int;
  body text;
  job_name text;
BEGIN
  -- 1. Remove every existing scrape and post-scrape backfill job.
  FOR job IN
    SELECT jobname FROM cron.job
    WHERE jobname LIKE 'scrape-%' OR jobname LIKE 'backfill-post-scrape-%'
  LOOP
    PERFORM cron.unschedule(job.jobname);
  END LOOP;

  -- 2. 48 scrape jobs, minute i = 0..47. Categories outer, regions inner, so consecutive
  --    minutes hit different regions.
  FOR i IN 0..47 LOOP
    c := i / 6 + 1;
    r := i % 6 + 1;
    IF categories[c] = 'general' THEN
      job_name := 'scrape-' || slugs[r];
      body := format('{"region":"%s","limit":150}', regions[r]);
    ELSE
      job_name := 'scrape-' || slugs[r] || '-' || categories[c];
      body := format('{"region":"%s","category":"%s","limit":100}', regions[r], categories[c]);
    END IF;

    PERFORM cron.schedule(
      job_name,
      format('%s 13,14 * * *', i),
      format($cmd$
        SELECT net.http_post(
          url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
          ),
          body    := %L::jsonb
        )
        WHERE extract(hour FROM now() AT TIME ZONE 'America/New_York') = 9;
      $cmd$, body)
    );
  END LOOP;

  -- 3. Post-scrape image backfills: two rounds per region, 10:00-10:55 New York time.
  FOR r IN 1..6 LOOP
    FOR i IN 0..1 LOOP
      job_name := 'backfill-post-scrape-' || backfill_slugs[r] || CASE WHEN i = 1 THEN '-r2' ELSE '' END;
      body := format('{"backfillImages":true,"region":"%s","perTableLimit":15}', regions[r]);
      PERFORM cron.schedule(
        job_name,
        format('%s 14,15 * * *', (r - 1) * 5 + i * 30),
        format($cmd$
          SELECT net.http_post(
            url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
            headers := jsonb_build_object(
              'Content-Type',  'application/json',
              'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
            ),
            body    := %L::jsonb
          )
          WHERE extract(hour FROM now() AT TIME ZONE 'America/New_York') = 10;
        $cmd$, body)
      );
    END LOOP;
  END LOOP;

  -- 4. Translation sweep, 11:00-11:25 New York time: re-translates any stored non-English rows
  --    (e.g. when the translate endpoint was unavailable during the scrape — upserts use
  --    ignoreDuplicates, so a re-scrape alone would never fix them).
  FOR job IN SELECT jobname FROM cron.job WHERE jobname LIKE 'translate-existing-%' LOOP
    PERFORM cron.unschedule(job.jobname);
  END LOOP;
  FOR r IN 1..6 LOOP
    body := format('{"translateExisting":true,"region":"%s","perTableLimit":40}', regions[r]);
    PERFORM cron.schedule(
      'translate-existing-' || slugs[r],
      format('%s 15,16 * * *', (r - 1) * 5),
      format($cmd$
        SELECT net.http_post(
          url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/scrape-news',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
          ),
          body    := %L::jsonb
        )
        WHERE extract(hour FROM now() AT TIME ZONE 'America/New_York') = 11;
      $cmd$, body)
    );
  END LOOP;
END $$;
