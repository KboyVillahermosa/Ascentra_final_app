-- Fix Profile Schema for Synchronization Issues
-- Run this script in Supabase SQL Editor to ensure proper field mapping

-- =============================================
-- ENSURE PROFILES TABLE CONSISTENCY
-- =============================================

-- The profiles table should use 'id' as primary key that references auth.users(id)
-- This ensures consistency with the application code

-- First, check current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ensure the profiles table has the correct structure
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    bio TEXT DEFAULT '',
    avatar_url TEXT,
    skill_level TEXT DEFAULT 'rookie_rambler',
    total_km_traveled DECIMAL(10,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'rookie_rambler';

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_km_traveled DECIMAL(10,2) DEFAULT 0.0;

-- Fix any existing profiles that might have user_id instead of id
-- This handles the migration from user_id to id field
DO $$
BEGIN
    -- Check if user_id column exists and migrate data
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        -- First drop any policies that might depend on user_id column
        DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
        DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
        DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
        
        -- Update any records that might have user_id set but not id
        UPDATE public.profiles 
        SET id = user_id 
        WHERE id IS NULL AND user_id IS NOT NULL;
        
        -- Drop the user_id column with CASCADE to handle dependencies
        ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_id CASCADE;
    END IF;
END $$;

-- =============================================
-- ENSURE FAVORITES TABLE EXISTS
-- =============================================

-- Create favorites table for hiking spots with proper foreign key
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    spot_id UUID REFERENCES public.hiking_spots(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, spot_id)
);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'favorites_spot_id_fkey' 
        AND table_name = 'favorites'
    ) THEN
        ALTER TABLE public.favorites 
        ADD CONSTRAINT favorites_spot_id_fkey 
        FOREIGN KEY (spot_id) REFERENCES public.hiking_spots(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =============================================
-- ENSURE HIKING SPOTS TABLE EXISTS
-- =============================================

-- Create hiking_spots table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.hiking_spots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    difficulty TEXT CHECK (difficulty IN ('Easy', 'Moderate', 'Hard', 'Expert')),
    distance DECIMAL(10,2),
    elevation_gain DECIMAL(10,2),
    location_name TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    image_url TEXT,
    rating DECIMAL(3,2) DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    amenities TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- UPDATE TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_hiking_spots_updated_at ON public.hiking_spots;
CREATE TRIGGER handle_hiking_spots_updated_at
    BEFORE UPDATE ON public.hiking_spots
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiking_spots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view all hiking spots" ON public.hiking_spots;
DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can manage own favorites" ON public.favorites;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles 
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles 
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles 
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for hiking spots
CREATE POLICY "Users can view all hiking spots" ON public.hiking_spots 
    FOR SELECT USING (true);

-- Create RLS policies for favorites
CREATE POLICY "Users can view own favorites" ON public.favorites 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites" ON public.favorites 
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify table structures
SELECT 'Profiles table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Favorites table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'favorites' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Hiking spots table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'hiking_spots' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================================
-- CREATE MISSING TABLES
-- =============================================

-- Create hiking_spot_votes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.hiking_spot_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    spot_id UUID REFERENCES public.hiking_spots(id) ON DELETE CASCADE NOT NULL,
    vote_type TEXT CHECK (vote_type IN ('upvote', 'downvote')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, spot_id)
);

-- Enable RLS on hiking_spot_votes
ALTER TABLE public.hiking_spot_votes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for hiking_spot_votes
DROP POLICY IF EXISTS "Users can view all votes" ON public.hiking_spot_votes;
DROP POLICY IF EXISTS "Users can manage own votes" ON public.hiking_spot_votes;

CREATE POLICY "Users can view all votes" ON public.hiking_spot_votes 
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own votes" ON public.hiking_spot_votes 
    FOR ALL USING (auth.uid() = user_id);

-- Create trigger for hiking_spot_votes updated_at
DROP TRIGGER IF EXISTS handle_hiking_spot_votes_updated_at ON public.hiking_spot_votes;
CREATE TRIGGER handle_hiking_spot_votes_updated_at
    BEFORE UPDATE ON public.hiking_spot_votes
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Success message
SELECT '✅ Database schema updated successfully! Profile synchronization should now work properly.' as status;