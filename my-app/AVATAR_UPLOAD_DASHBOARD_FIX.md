# Avatar Upload Fix - Dashboard Method

## Problem

The SQL script requires owner privileges that you don't have. Here's how to fix it using the Supabase Dashboard interface.

## Solution: Use Supabase Dashboard

### Step 1: Create Storage Bucket

1. **Go to your Supabase Dashboard**
   - Open your project dashboard
   - Navigate to **Storage** in the left sidebar
   - Click **Create a new bucket**

2. **Create the Avatars Bucket**
   - Bucket name: `avatars`
   - Make it **Public** (check the public checkbox)
   - Click **Create bucket**

### Step 2: Set Up Storage Policies

1. **Go to Storage Policies**
   - In the Storage section, click on **Policies**
   - You should see the `objects` table

2. **Create Upload Policy**
   - Click **New Policy** on the `objects` table
   - Choose **Custom** policy
   - Policy name: `Users can upload their own avatars`
   - Allowed operation: **INSERT**
   - Target roles: `authenticated`
   - USING expression:

   ```sql
   bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
   ```

   - Click **Review** then **Save policy**

3. **Create Update Policy**
   - Click **New Policy** again
   - Policy name: `Users can update their own avatars`
   - Allowed operation: **UPDATE**
   - Target roles: `authenticated`
   - USING expression:

   ```sql
   bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
   ```

   - WITH CHECK expression:

   ```sql
   bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
   ```

   - Click **Review** then **Save policy**

4. **Create Delete Policy**
   - Click **New Policy** again
   - Policy name: `Users can delete their own avatars`
   - Allowed operation: **DELETE**
   - Target roles: `authenticated`
   - USING expression:

   ```sql
   bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
   ```

   - Click **Review** then **Save policy**

5. **Create Read Policy**
   - Click **New Policy** again
   - Policy name: `Anyone can view avatars`
   - Allowed operation: **SELECT**
   - Target roles: `public`
   - USING expression:

   ```sql
   bucket_id = 'avatars'
   ```

   - Click **Review** then **Save policy**

### Step 3: Verify Setup

1. **Check the Bucket**
   - Go back to **Storage** > **Buckets**
   - You should see the `avatars` bucket listed
   - It should show as **Public**

2. **Check Policies**
   - Go to **Storage** > **Policies**
   - You should see 4 new policies for the `objects` table

### Step 4: Test Avatar Upload

1. **Open your app** (the Expo server should still be running)
2. **Navigate to Edit Profile**
3. **Try uploading an avatar**
4. **You should see a success message**

## Alternative: Quick SQL Method (if you have access)

If you have project owner access or admin privileges, you can try this simpler SQL script:

```sql
-- Simple bucket creation (run in SQL Editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
```

Then create the policies through the Dashboard as described above.

## Troubleshooting

### Still Getting "Bucket Not Found"?

- Double-check the bucket name is exactly `avatars`
- Ensure the bucket is marked as **Public**
- Try refreshing your app

### Permission Errors?

- Verify all 4 policies were created successfully
- Check that you're logged in to the app
- Try logging out and back in

### Need Help?

- Check the browser console for detailed error messages
- Verify your Supabase project is active (not paused)
- Ensure you're using the correct project URL and anon key

---

**Note**: The dashboard method is more reliable than SQL scripts when you don't have full admin privileges.
