# Registration Error Fix Guide

## Problem
The registration functionality is failing because the Supabase URL in your `.env` file is pointing to a non-existent Supabase project.

## Current Configuration Issue
Your `.env` file contains:
```
EXPO_PUBLIC_SUPABASE_URL=https://igzlopjmcbovgpmngcml.supabase.com
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The URL `https://igzlopjmcbovgpmngcml.supabase.com` does not exist, which causes all authentication requests to fail.

## Solution Options

### Option 1: Create a New Supabase Project (Recommended)

1. **Go to Supabase Dashboard**
   - Visit https://supabase.com
   - Sign in or create an account

2. **Create New Project**
   - Click "New Project"
   - Choose your organization
   - Enter project name: "Ascentra Hiking App"
   - Enter database password (save this!)
   - Select region closest to you
   - Click "Create new project"

3. **Get Your Credentials**
   - Go to Settings > API
   - Copy the "Project URL"
   - Copy the "anon public" key

4. **Update Your .env File**
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_actual_project_url_here
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
   ```

5. **Set Up Database Schema**
   - Go to SQL Editor in Supabase dashboard
   - Run the SQL from `database_schema.sql` to create all tables

### Option 2: Use Demo/Mock Mode (For Testing)

If you want to test the app without setting up Supabase:

1. **Create Mock Supabase Service**
   - Modify `services/supabaseClient.ts` to use mock responses
   - This allows UI testing without backend

### Option 3: Use Local Supabase (Advanced)

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Initialize Local Project**
   ```bash
   supabase init
   supabase start
   ```

3. **Update .env with Local URLs**
   ```
   EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
   EXPO_PUBLIC_SUPABASE_ANON_KEY=local_anon_key_from_supabase_start
   ```

## Quick Test Steps

1. **After updating .env file:**
   - Stop the development server (Ctrl+C)
   - Restart with `npm start`
   - Try registration again

2. **Check Console Logs:**
   - Open browser developer tools
   - Look for network errors or Supabase connection messages
   - The app includes diagnostic logging to help identify issues

## Expected Behavior After Fix

- Registration should work without connection errors
- Users will receive email confirmation (if email auth is enabled)
- Console should show "Supabase connection test successful"
- No more "Unable to connect to server" alerts

## Need Help?

If you continue experiencing issues:
1. Check the browser console for specific error messages
2. Verify your internet connection
3. Ensure the Supabase project is active and not paused
4. Double-check that the URL and key are copied correctly (no extra spaces)

## Database Schema

Once you have a working Supabase project, make sure to run the SQL from `database_schema.sql` to create all the necessary tables for the hiking app functionality.