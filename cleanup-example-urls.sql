-- Clean up example.com URLs from the database
-- Run this in your Supabase SQL Editor

-- Delete all articles with example.com URLs
DELETE FROM articles 
WHERE url LIKE '%example.com%' 
   OR url LIKE 'https://example.com%' 
   OR url LIKE 'http://example.com%';

-- Show how many articles were deleted
SELECT COUNT(*) as deleted_articles 
FROM articles 
WHERE url LIKE '%example.com%';

-- Show remaining articles count
SELECT COUNT(*) as remaining_articles FROM articles;
