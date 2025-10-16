-- Setup Favorites and Notes Tables
-- Run this in your Supabase SQL Editor

-- 1. Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Users can only see their own favorites
CREATE POLICY "Users can view own favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add their own favorites
CREATE POLICY "Users can insert own favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete own favorites"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_article_id ON public.favorites(article_id);

-- 2. Create article_notes table
CREATE TABLE IF NOT EXISTS public.article_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- Enable RLS
ALTER TABLE public.article_notes ENABLE ROW LEVEL SECURITY;

-- Users can see their own notes
CREATE POLICY "Users can view own notes"
  ON public.article_notes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can see public notes from others
CREATE POLICY "Users can view public notes"
  ON public.article_notes FOR SELECT
  USING (is_public = true);

-- Users can insert their own notes
CREATE POLICY "Users can insert own notes"
  ON public.article_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update own notes"
  ON public.article_notes FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete own notes"
  ON public.article_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_notes_user_id ON public.article_notes(user_id);
CREATE INDEX idx_notes_article_id ON public.article_notes(article_id);
CREATE INDEX idx_notes_public ON public.article_notes(is_public);

-- Verify tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('favorites', 'article_notes');
