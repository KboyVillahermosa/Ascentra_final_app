-- Fix Database Issues Migration
-- This migration addresses the specific errors we're encountering

-- =============================================
-- FIX PROFILES TABLE ISSUES
-- =============================================

-- Ensure profiles table has correct structure
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    skill_level TEXT DEFAULT 'rookie_rambler',
    bio TEXT DEFAULT '',
    total_km_traveled DECIMAL(10,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
        -- Update any records that might have user_id set but not id
        UPDATE public.profiles 
        SET id = user_id 
        WHERE id IS NULL AND user_id IS NOT NULL;
        
        -- Drop the user_id column after migration
        ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_id;
    END IF;
END $$;

-- =============================================
-- FIX FAVORITES TABLE ISSUES
-- =============================================

-- Create hiking_spots table if it doesn't exist (needed for foreign key)
CREATE TABLE IF NOT EXISTS public.hiking_spots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    difficulty TEXT,
    distance DECIMAL(5,2),
    elevation_gain INTEGER,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create favorites table with proper foreign key relationships
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

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiking_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiking_spot_votes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREATE RLS POLICIES
-- =============================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view all profiles" ON public.profiles 
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles 
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles 
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Favorites policies
DROP POLICY IF EXISTS "Users can view all favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can manage own favorites" ON public.favorites;

CREATE POLICY "Users can view all favorites" ON public.favorites 
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own favorites" ON public.favorites 
    FOR ALL USING (auth.uid() = user_id);

-- Hiking spots policies
DROP POLICY IF EXISTS "Users can view all hiking spots" ON public.hiking_spots;
DROP POLICY IF EXISTS "Users can manage hiking spots" ON public.hiking_spots;

CREATE POLICY "Users can view all hiking spots" ON public.hiking_spots 
    FOR SELECT USING (true);

CREATE POLICY "Users can manage hiking spots" ON public.hiking_spots 
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Hiking spot votes policies
DROP POLICY IF EXISTS "Users can view all votes" ON public.hiking_spot_votes;
DROP POLICY IF EXISTS "Users can manage own votes" ON public.hiking_spot_votes;

CREATE POLICY "Users can view all votes" ON public.hiking_spot_votes 
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own votes" ON public.hiking_spot_votes 
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- CREATE TRIGGERS
-- =============================================

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
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

DROP TRIGGER IF EXISTS handle_hiking_spot_votes_updated_at ON public.hiking_spot_votes;
CREATE TRIGGER handle_hiking_spot_votes_updated_at
    BEFORE UPDATE ON public.hiking_spot_votes
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Success message
SELECT '✅ Database schema fixed successfully! All foreign key relationships and constraints are now properly configured.' as status;