# Avatar Upload Fix Instructions

## Problem

Users cannot upload profile pictures/avatars because the Supabase storage bucket and policies are not configured.

## Solution

Run the provided SQL script to create the avatars storage bucket and configure proper permissions.

## Steps to Fix

### 1. Access Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### 2. Run the Setup Script

1. Open the file `setup_avatar_storage.sql` in this project
2. Copy the entire content
3. Paste it into the SQL Editor
4. Click **Run** to execute the script

### 3. Verify Setup

After running the script, you should see:

- A new bucket named 'avatars' in **Storage** > **Buckets**
- New policies listed in the query results

### 4. Test Avatar Upload

1. Restart your Expo development server:
   ```bash
   cd my-app
   npm start
   ```
2. Open the app and navigate to Edit Profile
3. Try uploading an avatar image
4. You should see a success message if everything works

## What the Script Does

### Creates Storage Bucket

- Creates an 'avatars' bucket for storing profile pictures
- Makes the bucket publicly readable (for displaying avatars)

### Sets Up Security Policies

- **Upload Policy**: Users can only upload to their own folder (user_id/filename)
- **Update Policy**: Users can update their own avatar files
- **Delete Policy**: Users can delete their own avatar files
- **Read Policy**: Anyone can view avatar images (for public profiles)

### File Organization

Avatars are stored with this structure:

```
avatars/
├── user-id-1/
│   └── avatar-timestamp.jpg
├── user-id-2/
│   └── avatar-timestamp.png
└── ...
```

## Enhanced Error Handling

The upload function now provides specific error messages for:

- **Permission errors**: When storage policies aren't configured
- **File size errors**: When images are too large (>5MB)
- **Network errors**: When there's no internet connection
- **Storage errors**: When the bucket doesn't exist

## Troubleshooting

### "Storage Error" Message

- The avatars bucket wasn't created properly
- Re-run the SQL script in Supabase

### "Permission Error" Message

- Storage policies aren't configured correctly
- Check that RLS policies were created successfully
- Try logging out and back in

### "File Too Large" Message

- Select an image smaller than 5MB
- Consider compressing the image before upload

### Still Having Issues?

1. Check the browser console for detailed error messages
2. Verify your Supabase project is active (not paused)
3. Ensure you're logged in to the app
4. Try with a different image file

## File Size Limits

- Maximum file size: 5MB
- Supported formats: JPG, PNG, WebP
- Recommended size: 500x500 pixels or smaller for best performance

---

**Note**: After running the SQL script, avatar uploads should work immediately. The enhanced error messages will help identify any remaining issues.
