# Analysis Feature Setup Instructions

This document provides step-by-step instructions to set up the Analysis feature in your application.

## Overview

The Analysis feature allows users to:
- Create expert analyses with text content
- Upload videos (optional) with automatic thumbnail generation
- Make analyses public or private
- Browse other users' public analyses via a sidebar
- View videos in a popup player

## Prerequisites

- Supabase project set up and running
- Access to Supabase Dashboard
- Database admin access

---

## Step 1: Database Setup

### 1.1 Create the `user_analyses` Table

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Open the file `setup-analysis-feature.sql` from your project
4. Copy the entire contents of the file
5. Paste it into the SQL Editor
6. Click **Run** to execute the SQL script

This will create:
- `user_analyses` table with all necessary columns
- Row Level Security (RLS) policies
- Indexes for performance
- Trigger for updating `updated_at` timestamp

### 1.2 Verify Table Creation

1. Go to **Table Editor** in Supabase Dashboard
2. You should see `user_analyses` table listed
3. Verify the columns are:
   - `id` (UUID, primary key)
   - `user_id` (UUID, foreign key to auth.users)
   - `title` (TEXT)
   - `content` (TEXT)
   - `video_url` (TEXT, nullable)
   - `thumbnail_url` (TEXT, nullable)
   - `video_duration` (INTEGER, nullable)
   - `is_public` (BOOLEAN, default false)
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

---

## Step 2: Storage Bucket Setup

### 2.1 Create Storage Bucket

1. Go to **Storage** in your Supabase Dashboard
2. Click **New bucket**
3. Configure the bucket:
   - **Name**: `analysis-videos`
   - **Public bucket**: ✅ **Enable this** (checked)
   - **File size limit**: `500` MB (or your preferred limit)
   - **Allowed MIME types**: Leave empty or add `video/*` for videos and `image/jpeg,image/png` for thumbnails
4. Click **Create bucket**

### 2.2 Set Up Storage Policies

1. In the **Storage** section, click on the `analysis-videos` bucket
2. Go to the **Policies** tab
3. Click **New Policy**

#### Policy 1: Allow Authenticated Users to Upload Videos

1. Click **New Policy**
2. Select **For full customization**
3. Policy name: `Users can upload their own videos`
4. Allowed operation: **INSERT**
5. Policy definition:
   ```sql
   (bucket_id = 'analysis-videos' AND (storage.foldername(name))[1] = auth.uid()::text)
   ```
6. Click **Review** then **Save policy**

#### Policy 2: Allow Users to Update Their Own Videos

1. Click **New Policy**
2. Select **For full customization**
3. Policy name: `Users can update their own videos`
4. Allowed operation: **UPDATE**
5. Policy definition:
   ```sql
   (bucket_id = 'analysis-videos' AND (storage.foldername(name))[1] = auth.uid()::text)
   ```
6. Click **Review** then **Save policy**

#### Policy 3: Allow Public Read Access

1. Click **New Policy**
2. Select **For full customization**
3. Policy name: `Public can view videos`
4. Allowed operation: **SELECT**
5. Target roles: **public**
6. Policy definition:
   ```sql
   (bucket_id = 'analysis-videos')
   ```
7. Click **Review** then **Save policy**

#### Policy 4: Allow Users to Delete Their Own Videos

1. Click **New Policy**
2. Select **For full customization**
3. Policy name: `Users can delete their own videos`
4. Allowed operation: **DELETE**
5. Policy definition:
   ```sql
   (bucket_id = 'analysis-videos' AND (storage.foldername(name))[1] = auth.uid()::text)
   ```
6. Click **Review** then **Save policy**

---

## Step 3: Update Supabase Types (Optional but Recommended)

If you're using TypeScript and want type safety, you should regenerate your Supabase types:

1. Install Supabase CLI (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. Generate types:
   ```bash
   supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
   ```

   **Note**: The types have already been updated in the codebase, but regenerating ensures they match your database exactly.

---

## Step 4: Test the Feature

### 4.1 Test Analysis Creation

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Log in to your application
3. Navigate to the **Analysis** tab
4. Fill in the form:
   - Enter a title
   - Write some analysis content
   - (Optional) Upload a video file
   - Toggle public/private
5. Click **Save Analysis**
6. Verify the analysis appears in "My Analyses"

### 4.2 Test Public Analysis Viewing

1. Create a public analysis (toggle "Make this analysis public")
2. Log in with a different user account (or ask someone else to)
3. Go to the **Analysis** tab
4. Check the sidebar - you should see the first user listed
5. Click on the user's name
6. Verify their public analysis appears

### 4.3 Test Video Playback

1. Create an analysis with a video
2. Wait for the video to upload (check browser console for errors)
3. View the analysis in the list
4. If viewing another user's public analysis, click on the video thumbnail
5. Verify the video player modal opens and plays the video

---

## Step 5: Troubleshooting

### Issue: "Failed to save analysis" error

**Possible causes:**
- Database table not created
- RLS policies not set up correctly
- User not authenticated

**Solutions:**
1. Verify the `user_analyses` table exists in Table Editor
2. Check RLS policies in the table's Policies tab
3. Ensure user is logged in

### Issue: Video upload fails

**Possible causes:**
- Storage bucket not created
- Storage policies not configured
- File too large
- Network issues

**Solutions:**
1. Verify `analysis-videos` bucket exists in Storage
2. Check storage policies allow INSERT for authenticated users
3. Verify file size is under the bucket limit (500MB default)
4. Check browser console for specific error messages

### Issue: Can't see other users' public analyses

**Possible causes:**
- RLS policy for public analyses not working
- No public analyses exist
- User sidebar query issue

**Solutions:**
1. Verify RLS policy "Users can view public analyses" exists
2. Ensure at least one analysis is marked as public
3. Check browser console for errors
4. Verify the user_analyses table has data with `is_public = true`

### Issue: Video thumbnail not generating

**Possible causes:**
- Video file format not supported
- Browser security restrictions
- Canvas API not available

**Solutions:**
1. Try a different video format (MP4 recommended)
2. Check browser console for errors
3. The thumbnail generation happens client-side, so ensure the browser supports the Canvas API

---

## Step 6: Production Considerations

### 6.1 Storage Costs

- Videos can be large files
- Monitor your Supabase storage usage
- Consider implementing video compression
- Set appropriate file size limits

### 6.2 Performance

- Large videos may take time to upload
- Consider implementing upload progress indicators
- Use CDN for video delivery (Supabase Storage provides this)
- Consider video transcoding for multiple quality levels

### 6.3 Security

- RLS policies ensure users can only manage their own analyses
- Public analyses are visible to all authenticated users
- Consider adding moderation features for public content
- Implement content filtering if needed

### 6.4 User Experience

- Add loading states for video uploads
- Show upload progress
- Add error handling for failed uploads
- Consider adding video duration display
- Add ability to edit/delete analyses

---

## Additional Features You Can Add

1. **Analysis Categories/Tags**: Add categorization to analyses
2. **Comments**: Allow users to comment on public analyses
3. **Likes/Reactions**: Add engagement features
4. **Search**: Search analyses by title/content
5. **Filtering**: Filter by date, user, etc.
6. **Analytics**: Track views, engagement
7. **Export**: Allow users to export their analyses
8. **Sharing**: Add social sharing features

---

## File Structure

The following files were created/modified:

### New Files:
- `setup-analysis-feature.sql` - Database schema
- `src/components/AnalysisEditor.tsx` - Component for creating analyses
- `src/components/UserSidebar.tsx` - Sidebar showing users with public analyses
- `src/components/UserContentViewer.tsx` - Component for viewing user's public content
- `src/components/VideoPlayerModal.tsx` - Modal for video playback

### Modified Files:
- `src/pages/Index.tsx` - Added Analysis tab and integration
- `src/integrations/supabase/types.ts` - Added user_analyses table types

---

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check Supabase Dashboard logs
3. Verify all steps were completed correctly
4. Review the troubleshooting section above

---

## Summary Checklist

- [ ] Database table `user_analyses` created
- [ ] RLS policies configured for `user_analyses` table
- [ ] Storage bucket `analysis-videos` created
- [ ] Storage policies configured (INSERT, UPDATE, SELECT, DELETE)
- [ ] Tested creating an analysis
- [ ] Tested making an analysis public
- [ ] Tested viewing other users' public analyses
- [ ] Tested video upload
- [ ] Tested video playback
- [ ] Verified thumbnails are generated
- [ ] Checked for any console errors

Once all items are checked, your Analysis feature is ready to use! 🎉

