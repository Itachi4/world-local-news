# Deploy scrape-news Function Manually

Since the Supabase CLI isn't available, here's how to deploy the function manually:

## Step 1: Go to Supabase Dashboard
1. Go to your Supabase project: https://supabase.com/dashboard/project/zrofxxvmsaaoaztorpyt/functions
2. Click "Deploy a new function" → "Via Editor"

## Step 2: Create the Function
1. **Function Name**: `scrape-news`
2. **Copy and paste the code below** into the editor

## Step 3: Function Code
Copy the entire code from the file: `supabase/functions/scrape-news/index.ts`

## Step 4: Deploy
1. Click "Deploy" button
2. Wait for deployment to complete

## Step 5: Set Environment Variables
In the function settings, add these environment variables:
- `SUPABASE_URL`: `https://zrofxxvmsaaoaztorpyt.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: [Get this from your project settings → API → service_role key]

## Step 6: Test the Function
Once deployed, you can test it by calling:
```javascript
const { data, error } = await supabase.functions.invoke('scrape-news', {
  body: { searchQuery: null, region: null }
});
```

## Alternative: Use the Supabase Dashboard
You can also create the function directly in the Supabase dashboard by:
1. Going to Functions → Create Function
2. Using the "Supabase Database Access" template
3. Replacing the template code with our scrape-news function code
