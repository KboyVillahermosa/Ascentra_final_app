-- =====================================================
-- FIX DATABASE SCHEMA - CREATE MISSING TABLES
-- =====================================================
-- This script creates the missing tables that are causing errors

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CREATE FAVORITES TABLE
-- =====================================================

-- Create favorites table for hiking spots
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    spot_id UUID NOT NULL, -- References hiking_spots.id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, spot_id)
);

-- =====================================================
-- CREATE HIKING_SPOT_VOTES TABLE
-- =====================================================

-- Create hiking_spot_votes table for voting system
CREATE TABLE IF NOT EXISTS public.hiking_spot_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    spot_id UUID NOT NULL, -- References hiking_spots.id
    vote_type TEXT CHECK (vote_type IN ('upvote', 'downvote')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, spot_id) -- One vote per user per spot
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiking_spot_votes ENABLE ROW LEVEL SECURITY;

-- Favorites policies
DROP POLICY IF EXISTS "Users can view all favorites" ON public.favorites;
CREATE POLICY "Users can view all favorites" ON public.favorites FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorites;
CREATE POLICY "Users can insert own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Voting policies
DROP POLICY IF EXISTS "Users can view all votes" ON public.hiking_spot_votes;
CREATE POLICY "Users can view all votes" ON public.hiking_spot_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own votes" ON public.hiking_spot_votes;
CREATE POLICY "Users can insert own votes" ON public.hiking_spot_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own votes" ON public.hiking_spot_votes;
CREATE POLICY "Users can update own votes" ON public.hiking_spot_votes FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own votes" ON public.hiking_spot_votes;
DROP POLICY IF EXISTS "Users can delete own votes" ON public.hiking_spot_votes;
CREATE POLICY "Users can delete own votes" ON public.hiking_spot_votes FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_spot_id ON public.favorites(spot_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_spot ON public.favorites(user_id, spot_id);

-- Voting indexes
CREATE INDEX IF NOT EXISTS idx_hiking_spot_votes_user_id ON public.hiking_spot_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_hiking_spot_votes_spot_id ON public.hiking_spot_votes(spot_id);
CREATE INDEX IF NOT EXISTS idx_hiking_spot_votes_vote_type ON public.hiking_spot_votes(vote_type);

-- =====================================================
-- CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has favorited a spot
CREATE OR REPLACE FUNCTION is_favorited(spot_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
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

-- Create a view for vote counts per spot
CREATE OR REPLACE VIEW public.hiking_spot_vote_counts AS
SELECT 
    spot_id,
    COUNT(CASE WHEN vote_type = 'upvote' THEN 1 END) as upvotes,
    COUNT(CASE WHEN vote_type = 'downvote' THEN 1 END) as downvotes,
    COUNT(CASE WHEN vote_type = 'upvote' THEN 1 END) - COUNT(CASE WHEN vote_type = 'downvote' THEN 1 END) as net_votes
FROM public.hiking_spot_votes
GROUP BY spot_id;

SELECT 'Database schema fixed successfully! Created favorites and hiking_spot_votes tables.' as status;