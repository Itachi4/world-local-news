-- Simple database setup for Supabase
-- Copy and paste this into your Supabase SQL Editor

-- Create articles table
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  snippet TEXT,
  url TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  source_country TEXT NOT NULL,
  source_region TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_articles_title ON public.articles USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_articles_snippet ON public.articles USING gin(to_tsvector('english', snippet));
CREATE INDEX IF NOT EXISTS idx_articles_region ON public.articles(source_region);
CREATE INDEX IF NOT EXISTS idx_articles_country ON public.articles(source_country);
CREATE INDEX IF NOT EXISTS idx_articles_scraped_at ON public.articles(scraped_at DESC);

-- Enable Row Level Security
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
DROP POLICY IF EXISTS "Articles are publicly readable" ON public.articles;
CREATE POLICY "Articles are publicly readable" 
ON public.articles 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Articles can be inserted" ON public.articles;
CREATE POLICY "Articles can be inserted" 
ON public.articles 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Articles can be updated" ON public.articles;
CREATE POLICY "Articles can be updated" 
ON public.articles 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.scraped_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for updating scraped_at
DROP TRIGGER IF EXISTS update_articles_scraped_at ON public.articles;
CREATE TRIGGER update_articles_scraped_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
