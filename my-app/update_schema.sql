-- Database Schema Updates for Profile & Favorites Features
-- Run this script in Supabase SQL Editor to add required fields and tables

-- =============================================
-- UPDATE PROFILES TABLE
-- =============================================

-- Add skill_level column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'rookie_rambler';

-- Update the profiles table to use user_id instead of id for consistency
-- Note: The current schema uses 'id' but the app code expects 'user_id'
-- We'll keep both for compatibility but ensure user_id is populated
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing records to populate user_id from id
UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;

-- =============================================
-- CREATE FAVORITES TABLE
-- =============================================

-- Create favorites table for hiking spots
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    spot_id UUID NOT NULL, -- References hiking_spots.id when that table exists
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
ADD CONSTRAINT fk_favorites_spot_id 
FOREIGN KEY (spot_id) REFERENCES public.hiking_spots(id) ON DELETE CASCADE;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiking_spots ENABLE ROW LEVEL SECURITY;

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
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

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

-- =============================================
-- SAMPLE DATA (Optional)
-- =============================================

-- Insert some sample hiking spots for testing
INSERT INTO public.hiking_spots (name, description, difficulty_level, distance, elevation_gain, location_name, latitude, longitude) VALUES
('Mount Washington Trail', 'Challenging hike with spectacular views of the White Mountains', 'hard', 8.5, 1200.0, 'New Hampshire, USA', 44.2706, -71.3033),
('Blue Ridge Parkway', 'Scenic trail through the Appalachian Mountains', 'moderate', 5.2, 800.0, 'Virginia, USA', 37.5407, -79.1910),
('Cascade Falls Trail', 'Easy family-friendly hike to beautiful waterfall', 'easy', 2.1, 200.0, 'Oregon, USA', 45.3311, -121.7113),
('Rocky Mountain Peak', 'Expert level climb with technical sections', 'expert', 12.3, 2100.0, 'Colorado, USA', 40.3428, -105.6836)
ON CONFLICT DO NOTHING;

SELECT 'Database schema updated successfully! Added skill_level to profiles and created favorites system.' as status;