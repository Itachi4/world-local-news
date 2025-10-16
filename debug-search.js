// Debug script to test the search functionality
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zrofxxvmsaaoaztorpyt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyb2Z4eHZtc2Fhb2F6dG9ycHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDI3NDksImV4cCI6MjA3NjA3ODc0OX0.S7E4HytCd17Kzqjnf4hcxbmZxRcDTAWKM8dnFHmRWVU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch() {
  console.log('🔍 Testing search functionality...');
  
  try {
    // Test 1: Check current articles
    console.log('\n1. Checking current articles in database...');
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('*')
      .limit(5);
    
    if (articlesError) {
      console.error('❌ Database error:', articlesError);
    } else {
      console.log('✅ Current articles count:', articles?.length || 0);
      if (articles && articles.length > 0) {
        console.log('📰 Sample article:', articles[0]);
      }
    }
    
    // Test 2: Call the function with search query
    console.log('\n2. Testing function call with search query "tariffs"...');
    const { data, error } = await supabase.functions.invoke('scrape-news', {
      body: { searchQuery: 'tariffs', region: 'all' }
    });
    
    if (error) {
      console.error('❌ Function error:', error);
      console.log('Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText
      });
    } else {
      console.log('✅ Function call successful!');
      console.log('📊 Response:', data);
    }
    
    // Test 3: Check articles after function call
    console.log('\n3. Checking articles after function call...');
    const { data: newArticles, error: newArticlesError } = await supabase
      .from('articles')
      .select('*')
      .limit(10);
    
    if (newArticlesError) {
      console.error('❌ New articles error:', newArticlesError);
    } else {
      console.log('✅ Articles after function call:', newArticles?.length || 0);
      if (newArticles && newArticles.length > 0) {
        console.log('📰 Sample articles:');
        newArticles.slice(0, 3).forEach((article, index) => {
          console.log(`  ${index + 1}. ${article.title} (${article.source_name})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSearch();
