-- Schedule digest emails using pg_cron + pg_net.
--
-- SETUP REQUIRED before running this migration:
--   1. Enable pg_cron and pg_net extensions in the Supabase dashboard
--      (Database → Extensions → search "cron" and "net", toggle on).
--   2. Store the service role key in Vault:
--        SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');
--      Then find its ID:
--        SELECT id FROM vault.secrets WHERE name = 'service_role_key';
--      Replace the placeholder ID below with the real UUID.
--   3. Replace <YOUR_PROJECT_REF> in the URL with your Supabase project ref
--      (e.g. zrofxxvmsaaoaztorpyt).
--
-- Schedules:
--   Daily digest  → every day at 08:00 UTC
--   Weekly digest → every Monday at 08:00 UTC

-- Daily digest
SELECT cron.schedule(
  'send-daily-digest',
  '0 8 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/send-digest',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"frequency":"daily"}'::jsonb
    );
  $$
);

-- Weekly digest (Mondays)
SELECT cron.schedule(
  'send-weekly-digest',
  '0 8 * * 1',
  $$
    SELECT net.http_post(
      url     := 'https://zrofxxvmsaaoaztorpyt.supabase.co/functions/v1/send-digest',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body    := '{"frequency":"weekly"}'::jsonb
    );
  $$
);
