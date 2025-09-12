# Forum Posting Fix Instructions

## Problem

Users cannot create forum posts with media because the Supabase storage bucket for forum content is not configured, resulting in the error "Failed Publish to post, please try again."

## Solution

Run the provided SQL script to create the forum storage bucket and configure proper permissions.

## Steps to Fix

### 1. Access Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### 2. Run the Setup Script

1. Open the file `setup_forum_storage.sql` in this project
2. Copy the entire content
3. Paste it into the SQL Editor
4. Click **Run** to execute the script

### 3. Verify Setup

After running the script, you should see:

- A new bucket named 'forum' in **Storage** > **Buckets**
- New policies listed in the query results
- Confirmation that the bucket was created successfully

### 4. Test Forum Posting

1. Restart your Expo development server:
   ```bash
   cd my-app
   npm start
   ```
2. Open the app and navigate to the Forum section
3. Try creating a new post with text and/or media
4. You should see a success message if everything works

## What the Script Does

### Creates Storage Bucket

- Creates a 'forum' bucket for storing forum post media (images and videos)
- Makes the bucket publicly readable (for displaying media in posts)

### Sets Up Security Policies

- **Upload Policy**: Users can only upload to their own folder (user_id/filename)
- **Update Policy**: Users can update their own media files
- **Delete Policy**: Users can delete their own media files
- **Read Policy**: Anyone can view forum media (for public posts)

### File Organization

Forum media is stored with this structure:

```
forum/
├── user-id-1/
│   ├── timestamp_randomid.jpg
│   ├── timestamp_randomid.mp4
│   └── thumb_timestamp_randomid.jpg
├── user-id-2/
│   ├── timestamp_randomid.png
│   └── ...
└── ...
```

## Enhanced Error Handling

The forum posting function now provides specific error messages for:

- **Storage errors**: When the forum bucket doesn't exist
- **Permission errors**: When storage policies aren't configured
- **File upload errors**: When there are issues uploading media
- **Network errors**: When there's no internet connection

## Troubleshooting

### "Failed Publish to post" Message

- The forum bucket wasn't created properly
- Re-run the SQL script in Supabase
- Check that you're logged in to the app

### "Storage Error" Message

- Storage policies aren't configured correctly
- Check that RLS policies were created successfully
- Verify the bucket exists in Supabase Storage

### "Permission Error" Message

- Try logging out and back in
- Ensure you're using an authenticated account (not guest)

### Still Having Issues?

1. Check the browser console for detailed error messages
2. Verify your Supabase project is active (not paused)
3. Ensure you're logged in to the app
4. Try posting without media first, then with media
5. Check that the forum_posts and forum_post_media tables exist in your database

## File Size Limits

- Maximum file size: 50MB (Supabase default)
- Supported image formats: JPG, PNG, WebP
- Supported video formats: MP4
- Recommended image size: 1920x1080 pixels or smaller for best performance

## Database Tables Required

Ensure these tables exist in your Supabase database:

1. **forum_posts** - Stores post content and metadata
2. **forum_post_media** - Stores media file references

If these tables don't exist, you'll need to create them using your database schema.

---

**Note**: After running the SQL script, forum posting should work immediately. The enhanced error messages will help identify any remaining issues.
