-- Setup Analysis Feature Tables and Policies
-- Run this in your Supabase SQL Editor
-- Make sure you're running this in the SQL Editor, not the Table Editor

-- 1. Create user_analyses table
-- First, drop the table if it exists (only if you want to recreate it)
-- DROP TABLE IF EXISTS public.user_analyses CASCADE;

CREATE TABLE IF NOT EXISTS public.user_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  video_url TEXT, -- URL to video file in Supabase Storage
  thumbnail_url TEXT, -- URL to thumbnail image
  video_duration INTEGER, -- Duration in seconds (optional)
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verify table was created (you can run this separately to check)
-- SELECT * FROM public.user_analyses LIMIT 1;

-- Enable RLS
ALTER TABLE public.user_analyses ENABLE ROW LEVEL SECURITY;

-- Users can view their own analyses (both public and private)
CREATE POLICY "Users can view own analyses"
  ON public.user_analyses FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view public analyses from others
CREATE POLICY "Users can view public analyses"
  ON public.user_analyses FOR SELECT
  USING (is_public = true);

-- Users can insert their own analyses
CREATE POLICY "Users can insert own analyses"
  ON public.user_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own analyses
CREATE POLICY "Users can update own analyses"
  ON public.user_analyses FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own analyses
CREATE POLICY "Users can delete own analyses"
  ON public.user_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_analyses_user_id ON public.user_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analyses_is_public ON public.user_analyses(is_public);
CREATE INDEX IF NOT EXISTS idx_user_analyses_created_at ON public.user_analyses(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_analyses_updated_at_trigger ON public.user_analyses;
CREATE TRIGGER update_user_analyses_updated_at_trigger
  BEFORE UPDATE ON public.user_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_user_analyses_updated_at();

