-- Add category column to articles table
-- Run this in your Supabase SQL Editor
--
-- IMPORTANT NOTES:
-- 1. This migration sets all EXISTING articles to 'general' category
--    because we cannot retroactively determine their category.
-- 2. NEW articles fetched after this migration will be stored with
--    the correct category (tech-ai, sports-games, politics, etc.)
-- 3. RSS feeds are filtered by BOTH region AND category:
--    - Category: Uses Google News search query (e.g., "sports OR games...")
--    - Region: Uses country code (e.g., gl=IN for India, gl=CN for China)
--    Example URL: https://news.google.com/rss/search?q=sports%20OR%20games&gl=IN&hl=en&ceid=IN:en

-- Add category column (nullable for existing articles, default 'general')
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Update existing articles to have 'general' category
-- Note: These are old articles fetched before category filtering was implemented
UPDATE public.articles 
SET category = 'general' 
WHERE category IS NULL;

-- Make category NOT NULL after updating existing rows
ALTER TABLE public.articles 
ALTER COLUMN category SET NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles(category);

-- Create composite index for category + region queries (used when filtering by both)
CREATE INDEX IF NOT EXISTS idx_articles_category_region ON public.articles(category, source_region);

