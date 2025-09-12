-- =====================================================
-- FAVORITES FUNCTIONALITY SCHEMA
-- =====================================================
-- This script creates the favorites table and related functionality
-- for the Ascentra hiking app

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- FAVORITES TABLE
-- =====================================================

-- User favorites for hiking spots
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    hiking_spot_id UUID REFERENCES hiking_spots(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a user can only favorite a spot once
    UNIQUE(user_id, hiking_spot_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for user's favorites lookup
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id, created_at DESC);

-- Index for hiking spot favorites count
CREATE INDEX idx_user_favorites_hiking_spot_id ON user_favorites(hiking_spot_id);

-- Composite index for checking if user favorited a spot
CREATE INDEX idx_user_favorites_user_spot ON user_favorites(user_id, hiking_spot_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on the favorites table
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view all favorites (for public favorite counts)
CREATE POLICY "Favorites viewable by all" ON user_favorites
    FOR SELECT USING (true);

-- Users can only manage their own favorites
CREATE POLICY "Users can manage their own favorites" ON user_favorites
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =====================================================

-- Function to automatically update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to favorites table
CREATE TRIGGER trigger_user_favorites_updated_at
    BEFORE UPDATE ON user_favorites
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- =====================================================
-- HELPFUL VIEWS FOR FAVORITES
-- =====================================================

-- View for user's favorite hiking spots with details
CREATE VIEW user_favorites_with_details AS
SELECT 
    uf.id as favorite_id,
    uf.user_id,
    uf.created_at as favorited_at,
    hs.id as hiking_spot_id,
    hs.name,
    hs.description,
    hs.latitude,
    hs.longitude,
    hs.difficulty,
    hs.elevation,
    hs.trail_length,
    hs.estimated_duration,
    hs.image_url,
    hs.images,
    hs.rating,
    hs.review_count,
    (
        SELECT COUNT(*) 
        FROM user_favorites uf2 
        WHERE uf2.hiking_spot_id = hs.id
    ) as total_favorites
FROM user_favorites uf
JOIN hiking_spots hs ON uf.hiking_spot_id = hs.id
ORDER BY uf.created_at DESC;

-- View for hiking spots with favorite counts
CREATE VIEW hiking_spots_with_favorites AS
SELECT 
    hs.*,
    COALESCE(fav_counts.favorite_count, 0) as favorite_count
FROM hiking_spots hs
LEFT JOIN (
    SELECT 
        hiking_spot_id,
        COUNT(*) as favorite_count
    FROM user_favorites
    GROUP BY hiking_spot_id
) fav_counts ON hs.id = fav_counts.hiking_spot_id;

-- =====================================================
-- FUNCTIONS FOR FAVORITES MANAGEMENT
-- =====================================================

-- Function to toggle favorite status
CREATE OR REPLACE FUNCTION toggle_favorite(
    p_user_id UUID,
    p_hiking_spot_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    favorite_exists BOOLEAN;
BEGIN
    -- Check if favorite already exists
    SELECT EXISTS(
        SELECT 1 FROM user_favorites 
        WHERE user_id = p_user_id AND hiking_spot_id = p_hiking_spot_id
    ) INTO favorite_exists;
    
    IF favorite_exists THEN
        -- Remove favorite
        DELETE FROM user_favorites 
        WHERE user_id = p_user_id AND hiking_spot_id = p_hiking_spot_id;
        RETURN FALSE; -- Unfavorited
    ELSE
        -- Add favorite
        INSERT INTO user_favorites (user_id, hiking_spot_id)
        VALUES (p_user_id, p_hiking_spot_id);
        RETURN TRUE; -- Favorited
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has favorited a spot
CREATE OR REPLACE FUNCTION is_favorited(
    p_user_id UUID,
    p_hiking_spot_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM user_favorites 
        WHERE user_id = p_user_id AND hiking_spot_id = p_hiking_spot_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Favorites schema created successfully!' as status;