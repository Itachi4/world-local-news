-- Fix digest_subscriptions RLS: allow SELECT so upsert conflict resolution works.
-- The previous policy USING (false) blocked all selects which caused the upsert
-- from the frontend to always fail (PostgREST needs SELECT to detect conflicts).
-- Email + preference data here is not sensitive enough to warrant blocking all reads.

DROP POLICY IF EXISTS "Digest subscriptions are selectable by service role only" ON public.digest_subscriptions;

CREATE POLICY "Digest subscriptions are selectable by anyone"
ON public.digest_subscriptions
FOR SELECT
USING (true);
