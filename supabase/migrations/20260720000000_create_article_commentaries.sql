-- Per-article video commentary: users link a YouTube/Vimeo video to a specific
-- article, with a public/private toggle so other readers can discover it.

CREATE TABLE IF NOT EXISTS public.article_commentaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  title TEXT,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

ALTER TABLE public.article_commentaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own commentaries"
  ON public.article_commentaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public commentaries"
  ON public.article_commentaries FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can insert own commentaries"
  ON public.article_commentaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own commentaries"
  ON public.article_commentaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own commentaries"
  ON public.article_commentaries FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_article_commentaries_user_id ON public.article_commentaries(user_id);
CREATE INDEX idx_article_commentaries_article_id ON public.article_commentaries(article_id);
CREATE INDEX idx_article_commentaries_public ON public.article_commentaries(is_public);

CREATE OR REPLACE FUNCTION update_article_commentaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_article_commentaries_updated_at_trigger
  BEFORE UPDATE ON public.article_commentaries
  FOR EACH ROW
  EXECUTE FUNCTION update_article_commentaries_updated_at();
