# Email Verification Redirect Setup

This guide will help you configure Supabase to redirect users to your website after email verification.

## Problem
When users click the email verification link, they see an error page instead of being redirected to your website.

## Solution

You need to configure the redirect URL in two places:

### 1. Supabase Dashboard Configuration

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. In the **Site URL** field, enter:
   ```
   https://nsewspace.com
   ```
5. In the **Redirect URLs** section, add:
   ```
   https://nsewspace.com/
   https://nsewspace.com/*
   ```
6. Click **Save**

### 2. Email Templates (Optional but Recommended)

1. Go to **Authentication** → **Email Templates**
2. Click on **Confirm signup** template
3. Update the redirect URL in the template to:
   ```
   {{ .SiteURL }}/#access_token={{ .Token }}&type=email
   ```
   Or simply:
   ```
   {{ .SiteURL }}/
   ```
4. Click **Save**

### 3. Code Already Updated

The code has been updated to include `emailRedirectTo: 'https://nsewspace.com/'` in the signup function. This ensures the redirect URL is passed when users register.

## Testing

1. Register a new account
2. Check your email for the verification link
3. Click the link
4. You should be redirected to https://nsewspace.com/ and automatically logged in

## Additional Notes

- The redirect URL must be added to the **Redirect URLs** whitelist in Supabase
- Make sure your production URL is exactly `https://nsewspace.com/` (with or without trailing slash, but be consistent)
- If you have a development environment, you can also add `http://localhost:5173/` to the redirect URLs for testing

## Troubleshooting

If redirects still don't work:
1. Verify the URL is exactly correct in Supabase dashboard (no typos)
2. Check that the URL is in the Redirect URLs whitelist
3. Clear browser cache and try again
4. Check browser console for any errors

