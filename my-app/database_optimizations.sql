-- =====================================================
-- DATABASE PERFORMANCE OPTIMIZATIONS
-- =====================================================
-- This script adds indexes and optimizations to improve
-- query performance for the Ascentra hiking app

-- =====================================================
-- INDEXES FOR HIKING SPOTS
-- =====================================================

-- Index for combined_score ordering (most common query)
CREATE INDEX IF NOT EXISTS idx_hiking_spots_combined_score 
ON hiking_spots (combined_score DESC);

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_hiking_spots_location 
ON hiking_spots (location);

-- Index for difficulty filtering
CREATE INDEX IF NOT EXISTS idx_hiking_spots_difficulty 
ON hiking_spots (difficulty);

-- Composite index for common filtering combinations
CREATE INDEX IF NOT EXISTS idx_hiking_spots_difficulty_location 
ON hiking_spots (difficulty, location, combined_score DESC);

-- =====================================================
-- INDEXES FOR VOTING SYSTEM
-- =====================================================

-- Index for user votes lookup (critical for performance)
CREATE INDEX IF NOT EXISTS idx_hiking_spot_votes_user_spot 
ON hiking_spot_votes (user_id, hiking_spot_id);

-- Index for spot vote aggregation
CREATE INDEX IF NOT EXISTS idx_hiking_spot_votes_spot_type 
ON hiking_spot_votes (hiking_spot_id, vote_type);

-- =====================================================
-- INDEXES FOR COMMENTS AND RATINGS
-- =====================================================

-- Index for spot comments
CREATE INDEX IF NOT EXISTS idx_hiking_spot_comments_spot 
ON hiking_spot_comments (hiking_spot_id, created_at DESC);

-- Index for user comments
CREATE INDEX IF NOT EXISTS idx_hiking_spot_comments_user 
ON hiking_spot_comments (user_id, created_at DESC);

-- Index for rating calculations
CREATE INDEX IF NOT EXISTS idx_hiking_spot_comments_rating 
ON hiking_spot_comments (hiking_spot_id, rating) 
WHERE rating IS NOT NULL;

-- =====================================================
-- INDEXES FOR USER ACTIVITIES
-- =====================================================

-- Index for user's activities
CREATE INDEX IF NOT EXISTS idx_saveactivity_user_date 
ON saveactivity (user_id, date DESC);

-- Index for activity feed
CREATE INDEX IF NOT EXISTS idx_saveactivity_public_date 
ON saveactivity (is_public, created_at DESC) 
WHERE is_public = true;

-- =====================================================
-- INDEXES FOR PROFILES
-- =====================================================

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username 
ON profiles (username);

-- Index for user_id lookups (foreign key)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles (user_id);

-- =====================================================
-- MATERIALIZED VIEW FOR TOP RATED SPOTS
-- =====================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS top_rated_hiking_spots;

-- Create materialized view for better performance
CREATE MATERIALIZED VIEW top_rated_hiking_spots AS
SELECT 
    hs.id,
    hs.name,
    hs.description,
    hs.difficulty,
    hs.location,
    hs.image_url,
    hs.latitude,
    hs.longitude,
    hs.elevation,
    hs.trail_length,
    hs.estimated_duration,
    hs.created_at,
    hs.updated_at,
    COALESCE(vote_stats.upvotes, 0) as upvotes,
    COALESCE(vote_stats.downvotes, 0) as downvotes,
    COALESCE(vote_stats.upvotes, 0) - COALESCE(vote_stats.downvotes, 0) as vote_score,
    COALESCE(rating_stats.avg_rating, 0) as avg_rating,
    COALESCE(rating_stats.total_reviews, 0) as total_reviews,
    -- Combined score: vote score + (avg_rating * review_count_weight)
    (COALESCE(vote_stats.upvotes, 0) - COALESCE(vote_stats.downvotes, 0)) + 
    (COALESCE(rating_stats.avg_rating, 0) * LEAST(COALESCE(rating_stats.total_reviews, 0), 10) * 0.5) as combined_score
FROM hiking_spots hs
LEFT JOIN (
    SELECT 
        hiking_spot_id,
        COUNT(CASE WHEN vote_type = 'upvote' THEN 1 END) as upvotes,
        COUNT(CASE WHEN vote_type = 'downvote' THEN 1 END) as downvotes
    FROM hiking_spot_votes 
    GROUP BY hiking_spot_id
) vote_stats ON hs.id = vote_stats.hiking_spot_id
LEFT JOIN (
    SELECT 
        hiking_spot_id,
        AVG(rating)::DECIMAL(3,2) as avg_rating,
        COUNT(*) as total_reviews
    FROM hiking_spot_comments 
    WHERE rating IS NOT NULL
    GROUP BY hiking_spot_id
) rating_stats ON hs.id = rating_stats.hiking_spot_id;

-- Index on the materialized view
CREATE INDEX idx_top_rated_hiking_spots_combined_score 
ON top_rated_hiking_spots (combined_score DESC);

CREATE INDEX idx_top_rated_hiking_spots_location 
ON top_rated_hiking_spots (location, combined_score DESC);

-- =====================================================
-- REFRESH FUNCTION FOR MATERIALIZED VIEW
-- =====================================================

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_top_rated_spots()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY top_rated_hiking_spots;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS TO AUTO-REFRESH MATERIALIZED VIEW
-- =====================================================

-- Function to handle materialized view refresh
CREATE OR REPLACE FUNCTION trigger_refresh_top_rated_spots()
RETURNS trigger AS $$
BEGIN
    -- Refresh the materialized view after changes
    PERFORM refresh_top_rated_spots();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers to refresh when data changes
CREATE TRIGGER trigger_hiking_spot_votes_refresh
    AFTER INSERT OR UPDATE OR DELETE ON hiking_spot_votes
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_top_rated_spots();

CREATE TRIGGER trigger_hiking_spot_comments_refresh
    AFTER INSERT OR UPDATE OR DELETE ON hiking_spot_comments
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_top_rated_spots();

CREATE TRIGGER trigger_hiking_spots_refresh
    AFTER INSERT OR UPDATE OR DELETE ON hiking_spots
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_top_rated_spots();

-- =====================================================
-- QUERY OPTIMIZATION SETTINGS
-- =====================================================

-- Update table statistics for better query planning
ANALYZE hiking_spots;
ANALYZE hiking_spot_votes;
ANALYZE hiking_spot_comments;
ANALYZE saveactivity;
ANALYZE profiles;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Database optimizations completed successfully!' as status;