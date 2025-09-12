-- =====================================================
-- VOTING SYSTEM FOR HIKING SPOTS
-- =====================================================

-- Hiking spot votes table for upvote/downvote functionality
CREATE TABLE hiking_spot_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hiking_spot_id UUID REFERENCES hiking_spots(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    vote_type TEXT CHECK (vote_type IN ('upvote', 'downvote')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hiking_spot_id, user_id)
);

-- Index for performance
CREATE INDEX idx_hiking_spot_votes_spot_id ON hiking_spot_votes(hiking_spot_id);
CREATE INDEX idx_hiking_spot_votes_user_id ON hiking_spot_votes(user_id);
CREATE INDEX idx_hiking_spot_votes_type ON hiking_spot_votes(vote_type);

-- Add vote counts to hiking_spots table
ALTER TABLE hiking_spots ADD COLUMN upvotes INTEGER DEFAULT 0;
ALTER TABLE hiking_spots ADD COLUMN downvotes INTEGER DEFAULT 0;
ALTER TABLE hiking_spots ADD COLUMN vote_score INTEGER DEFAULT 0; -- upvotes - downvotes

-- Function to update vote counts
CREATE OR REPLACE FUNCTION update_hiking_spot_votes()
RETURNS TRIGGER AS $$
BEGIN
    -- Update vote counts for the hiking spot
    UPDATE hiking_spots 
    SET 
        upvotes = (
            SELECT COUNT(*) 
            FROM hiking_spot_votes 
            WHERE hiking_spot_id = COALESCE(NEW.hiking_spot_id, OLD.hiking_spot_id) 
            AND vote_type = 'upvote'
        ),
        downvotes = (
            SELECT COUNT(*) 
            FROM hiking_spot_votes 
            WHERE hiking_spot_id = COALESCE(NEW.hiking_spot_id, OLD.hiking_spot_id) 
            AND vote_type = 'downvote'
        )
    WHERE id = COALESCE(NEW.hiking_spot_id, OLD.hiking_spot_id);
    
    -- Update vote score
    UPDATE hiking_spots 
    SET vote_score = upvotes - downvotes
    WHERE id = COALESCE(NEW.hiking_spot_id, OLD.hiking_spot_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update vote counts
CREATE TRIGGER trigger_update_hiking_spot_votes
    AFTER INSERT OR UPDATE OR DELETE ON hiking_spot_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_hiking_spot_votes();

-- Trigger for updated_at timestamp
CREATE TRIGGER trigger_hiking_spot_votes_updated_at
    BEFORE UPDATE ON hiking_spot_votes
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Enable RLS on voting table
ALTER TABLE hiking_spot_votes ENABLE ROW LEVEL SECURITY;

-- RLS policies for voting
CREATE POLICY "Votes are viewable by everyone" ON hiking_spot_votes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own votes" ON hiking_spot_votes
    FOR ALL USING (auth.uid() = user_id);

-- Updated view for hiking spot details with vote counts
DROP VIEW IF EXISTS hiking_spot_details;
CREATE VIEW hiking_spot_details AS
SELECT 
    hs.*,
    p.username as created_by_username,
    (
        SELECT AVG(rating)::DECIMAL(3,2) 
        FROM hiking_spot_comments hsc 
        WHERE hsc.hiking_spot_id = hs.id AND hsc.rating IS NOT NULL
    ) as avg_rating,
    (
        SELECT COUNT(*) 
        FROM hiking_spot_comments hsc 
        WHERE hsc.hiking_spot_id = hs.id
    ) as total_reviews,
    hs.upvotes,
    hs.downvotes,
    hs.vote_score
FROM hiking_spots hs
LEFT JOIN profiles p ON hs.created_by = p.user_id;

-- View for top rated spots (combining rating and vote score)
CREATE VIEW top_rated_hiking_spots AS
SELECT 
    *,
    -- Combined score: average rating (0-5) * 20 + vote_score to get a 0-100+ scale
    (COALESCE(avg_rating, 0) * 20 + COALESCE(vote_score, 0)) as combined_score
FROM hiking_spot_details
WHERE is_verified = true
ORDER BY combined_score DESC, avg_rating DESC, total_reviews DESC;

SELECT 'Voting system for hiking spots created successfully!' as status;