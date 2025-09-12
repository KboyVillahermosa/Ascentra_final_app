-- Database Schema Updates for Profile & Favorites Features
-- Run this script in Supabase SQL Editor to add required fields and tables

-- =============================================
-- UPDATE PROFILES TABLE
-- =============================================

-- Add skill_level column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'rookie_rambler';

-- Add bio column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

-- Ensure profiles table uses 'id' as primary key (matching auth.users.id)
-- This should already be the case, but let's make sure
ALTER TABLE public.profiles 
ADD CONSTRAINT IF NOT EXISTS profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =============================================
-- CREATE FAVORITES TABLE
-- =============================================

-- Create favorites table for hiking spots
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    spot_id UUID NOT NULL, -- References hiking_spots.id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, spot_id)
);

-- =============================================
-- CREATE HIKING SPOTS TABLE (if not exists)
-- =============================================

-- Create hiking_spots table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.hiking_spots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'moderate', 'hard', 'expert')),
    distance DECIMAL(10,2),
    elevation_gain DECIMAL(10,2),
    location_name TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    photos TEXT[], -- array of photo URLs
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint to favorites table
ALTER TABLE public.favorites 
ADD CONSTRAINT IF NOT EXISTS fk_favorites_spot_id 
FOREIGN KEY (spot_id) REFERENCES public.hiking_spots(id) ON DELETE CASCADE;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiking_spots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can view all hiking spots" ON public.hiking_spots;
DROP POLICY IF EXISTS "Users can insert hiking spots" ON public.hiking_spots;
DROP POLICY IF EXISTS "Users can update own hiking spots" ON public.hiking_spots;
DROP POLICY IF EXISTS "Users can delete own hiking spots" ON public.hiking_spots;

-- Favorites policies
CREATE POLICY "Users can view all favorites" ON public.favorites FOR SELECT USING (true);
CREATE POLICY "Users can insert own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Hiking spots policies
CREATE POLICY "Users can view all hiking spots" ON public.hiking_spots FOR SELECT USING (true);
CREATE POLICY "Users can insert hiking spots" ON public.hiking_spots FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own hiking spots" ON public.hiking_spots FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own hiking spots" ON public.hiking_spots FOR DELETE USING (auth.uid() = created_by);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Index for favorites lookups
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_spot_id ON public.favorites(spot_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_spot ON public.favorites(user_id, spot_id);

-- Index for hiking spots
CREATE INDEX IF NOT EXISTS idx_hiking_spots_location ON public.hiking_spots(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_hiking_spots_difficulty ON public.hiking_spots(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_hiking_spots_created_by ON public.hiking_spots(created_by);

-- Index for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_skill_level ON public.profiles(skill_level);

-- =============================================
-- FUNCTIONS FOR FAVORITES
-- =============================================

-- Function to check if a spot is favorited by a user
CREATE OR REPLACE FUNCTION is_spot_favorited(spot_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.favorites 
        WHERE spot_id = spot_uuid AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle favorite status
CREATE OR REPLACE FUNCTION toggle_favorite(spot_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$ -- Returns true if added, false if removed
DECLARE
    favorite_exists BOOLEAN;
BEGIN
    -- Check if favorite already exists
    SELECT EXISTS(
        SELECT 1 FROM public.favorites 
        WHERE spot_id = spot_uuid AND user_id = user_uuid
    ) INTO favorite_exists;
    
    IF favorite_exists THEN
        -- Remove favorite
        DELETE FROM public.favorites 
        WHERE spot_id = spot_uuid AND user_id = user_uuid;
        RETURN false;
    ELSE
        -- Add favorite
        INSERT INTO public.favorites (user_id, spot_id) 
        VALUES (user_uuid, spot_uuid);
        RETURN true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Database schema updated successfully! Added skill_level and bio to profiles, created favorites system.' as status;