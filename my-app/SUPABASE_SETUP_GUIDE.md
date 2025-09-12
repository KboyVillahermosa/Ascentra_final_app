# Complete Supabase Setup Guide for Ascentra Hiking App

## Step 1: Create New Supabase Project

### 1.1 Go to Supabase Dashboard

1. Visit https://supabase.com
2. Click "Start your project" or "Sign In"
3. Sign up/Sign in with GitHub, Google, or email

### 1.2 Create New Project

1. Click "New Project" button
2. Select your organization (or create one)
3. Fill in project details:
   - **Project Name**: `Ascentra Hiking App`
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Start with Free tier
4. Click "Create new project"
5. Wait 2-3 minutes for project initialization

### 1.3 Get Your Project Credentials

1. Go to **Settings** > **API** in the left sidebar
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (long string starting with `eyJ`)

## Step 2: Update Environment Configuration

### 2.1 Update .env File

Replace the content in your `.env` file with:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL_HERE
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

**Replace the placeholder values with your actual Supabase credentials!**

## Step 3: Deploy Database Schema

### 3.1 Access SQL Editor

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"

### 3.2 Run Database Schema

Copy and paste the entire content from `database_schema.sql` into the SQL editor and click "Run".

Alternatively, you can run the schema in sections:

#### Section 1: Core Tables

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    activity_type TEXT NOT NULL DEFAULT 'hike',
    distance DECIMAL(10,2),
    duration INTEGER,
    elevation_gain DECIMAL(10,2),
    difficulty_level TEXT,
    location_name TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    photos TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Section 2: Social Features

```sql
-- Create activity_likes table
CREATE TABLE IF NOT EXISTS public.activity_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_id)
);

-- Create activity_comments table
CREATE TABLE IF NOT EXISTS public.activity_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Section 3: Forum and Community

```sql
-- Create forum_posts table
CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create forum_comments table
CREATE TABLE IF NOT EXISTS public.forum_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Section 4: Enable Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view all activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Users can insert own activities" ON public.activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activities" ON public.activities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own activities" ON public.activities FOR DELETE USING (auth.uid() = user_id);
```

## Step 4: Test the Setup

### 4.1 Restart Development Server

1. Stop the current server (Ctrl+C in terminal)
2. Run `npm start` again
3. The app should now load the new Supabase configuration

### 4.2 Test Registration

1. Open the app in browser or mobile
2. Go to Registration screen
3. Fill in the form and submit
4. Check for success message or errors in console

### 4.3 Verify Database

1. Go to Supabase Dashboard > **Table Editor**
2. You should see all the tables created
3. After successful registration, check the `auth.users` and `profiles` tables for new entries

## Step 5: Configure Authentication (Optional)

### 5.1 Email Settings

1. Go to **Authentication** > **Settings**
2. Configure email templates if needed
3. Set up custom SMTP (optional)

### 5.2 URL Configuration

1. Go to **Authentication** > **URL Configuration**
2. Add your app's URL schemes:
   - Site URL: `http://localhost:8081`
   - Redirect URLs: `ascentra://`, `http://localhost:8081`

## Troubleshooting

### Common Issues:

1. **"Invalid API key"**: Double-check you copied the anon key correctly
2. **"Project not found"**: Verify the project URL is correct
3. **"Network error"**: Check internet connection and Supabase project status
4. **"Schema errors"**: Run the SQL commands one section at a time

### Verification Steps:

1. Check Supabase project is active (not paused)
2. Verify .env file has no extra spaces or quotes
3. Restart development server after .env changes
4. Check browser console for detailed error messages

## Security Notes

- Never commit your `.env` file to version control
- The anon key is safe to use in client-side code
- Row Level Security (RLS) protects your data
- Consider upgrading to Pro plan for production use

## Next Steps

Once setup is complete:

1. Test all app features (registration, login, posting activities)
2. Customize the database schema if needed
3. Set up proper email templates
4. Configure production environment variables
5. Deploy to app stores when ready

---

**Need Help?** Check the console logs for specific error messages, or refer to the Supabase documentation at https://supabase.com/docs
