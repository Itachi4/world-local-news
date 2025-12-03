-- Create Region-Specific Article Tables
-- Run this in your Supabase SQL Editor
--
-- This creates 6 separate tables for articles by region:
-- - articles_africa
-- - articles_asia
-- - articles_europe
-- - articles_north_america
-- - articles_oceania
-- - articles_south_america
--
-- Each table has the same schema as the existing articles table.
-- The existing articles table remains untouched as a read-only archive.

-- Helper function to create a region-specific articles table
CREATE OR REPLACE FUNCTION create_region_articles_table(table_name TEXT, region_name TEXT)
RETURNS void AS $$
DECLARE
  idx_title_name TEXT;
  idx_snippet_name TEXT;
  idx_category_name TEXT;
  idx_published_at_name TEXT;
  idx_scraped_at_name TEXT;
  idx_country_name TEXT;
  policy_read_name TEXT;
  policy_insert_name TEXT;
  policy_update_name TEXT;
BEGIN
  -- Set index names
  idx_title_name := 'idx_' || table_name || '_title';
  idx_snippet_name := 'idx_' || table_name || '_snippet';
  idx_category_name := 'idx_' || table_name || '_category';
  idx_published_at_name := 'idx_' || table_name || '_published_at';
  idx_scraped_at_name := 'idx_' || table_name || '_scraped_at';
  idx_country_name := 'idx_' || table_name || '_country';
  policy_read_name := table_name || ' are publicly readable';
  policy_insert_name := table_name || ' can be inserted';
  policy_update_name := table_name || ' can be updated';
  
  -- Create table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS public.%I (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      title TEXT NOT NULL,
      snippet TEXT,
      url TEXT NOT NULL UNIQUE,
      source_name TEXT NOT NULL,
      source_country TEXT NOT NULL,
      source_region TEXT NOT NULL DEFAULT %L,
      published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      category TEXT NOT NULL DEFAULT ''general''
    )',
    table_name,
    region_name
  );

  -- Create indexes
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I USING gin(to_tsvector(''english'', title))', idx_title_name, table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I USING gin(to_tsvector(''english'', snippet))', idx_snippet_name, table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(category)', idx_category_name, table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(published_at DESC)', idx_published_at_name, table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(scraped_at DESC)', idx_scraped_at_name, table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(source_country)', idx_country_name, table_name);

  -- Enable Row Level Security
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

  -- Create policies
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_read_name, table_name);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', policy_read_name, table_name);
  
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_insert_name, table_name);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (true)', policy_insert_name, table_name);
  
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_update_name, table_name);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (true)', policy_update_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Create all 6 region-specific tables
SELECT create_region_articles_table('articles_africa', 'Africa');
SELECT create_region_articles_table('articles_asia', 'Asia');
SELECT create_region_articles_table('articles_europe', 'Europe');
SELECT create_region_articles_table('articles_north_america', 'North America');
SELECT create_region_articles_table('articles_oceania', 'Oceania');
SELECT create_region_articles_table('articles_south_america', 'South America');

-- Create triggers for updating scraped_at (same as articles table)
CREATE OR REPLACE FUNCTION public.update_scraped_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.scraped_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers to all region tables
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN 
    SELECT unnest(ARRAY['articles_africa', 'articles_asia', 'articles_europe', 
                        'articles_north_america', 'articles_oceania', 'articles_south_america'])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%s_scraped_at ON public.%I;
      CREATE TRIGGER update_%s_scraped_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION public.update_scraped_at_column();
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'articles_africa', 
  'articles_asia', 
  'articles_europe', 
  'articles_north_america', 
  'articles_oceania', 
  'articles_south_america'
)
ORDER BY table_name;

