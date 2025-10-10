-- Create articles table for storing scraped news
CREATE TABLE public.articles (
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

-- Create index for better search performance
CREATE INDEX idx_articles_title ON public.articles USING gin(to_tsvector('english', title));
CREATE INDEX idx_articles_snippet ON public.articles USING gin(to_tsvector('english', snippet));
CREATE INDEX idx_articles_region ON public.articles(source_region);
CREATE INDEX idx_articles_country ON public.articles(source_country);
CREATE INDEX idx_articles_scraped_at ON public.articles(scraped_at DESC);

-- Enable Row Level Security
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (no auth required)
CREATE POLICY "Articles are publicly readable" 
ON public.articles 
FOR SELECT 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.scraped_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;