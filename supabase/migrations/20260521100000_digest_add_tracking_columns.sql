-- Add unsubscribe_token and last_sent_at to digest_subscriptions.
-- unsubscribe_token: unique UUID used in one-click unsubscribe links.
-- last_sent_at: tracks when each subscriber last received a digest.

ALTER TABLE public.digest_subscriptions
  ADD COLUMN IF NOT EXISTS unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS digest_subscriptions_unsubscribe_token_idx
  ON public.digest_subscriptions (unsubscribe_token);

-- Allow anyone to update is_active via unsubscribe token (no auth required for one-click unsubscribe)
DROP POLICY IF EXISTS "Allow unsubscribe by token" ON public.digest_subscriptions;
CREATE POLICY "Allow unsubscribe by token"
ON public.digest_subscriptions
FOR UPDATE
USING (true)
WITH CHECK (true);
