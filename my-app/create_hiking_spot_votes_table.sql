-- Create hiking_spot_votes table for voting system
-- Run this script in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.hiking_spot_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    spot_id UUID NOT NULL, -- References hiking_spots.id
    vote_type TEXT CHECK (vote_type IN ('upvote', 'downvote')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, spot_id) -- One vote per user per spot
);

-- Enable RLS
ALTER TABLE public.hiking_spot_votes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all votes" ON public.hiking_spot_votes FOR SELECT USING (true);
CREATE POLICY "Users can insert own votes" ON public.hiking_spot_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own votes" ON public.hiking_spot_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON public.hiking_spot_votes FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hiking_spot_votes_user_id ON public.hiking_spot_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_hiking_spot_votes_spot_id ON public.hiking_spot_votes(spot_id);
CREATE INDEX IF NOT EXISTS idx_hiking_spot_votes_vote_type ON public.hiking_spot_votes(vote_type);

-- Create a view for vote counts per spot
CREATE OR REPLACE VIEW public.hiking_spot_vote_counts AS
SELECT 
    spot_id,
    COUNT(CASE WHEN vote_type = 'upvote' THEN 1 END) as upvotes,
    COUNT(CASE WHEN vote_type = 'downvote' THEN 1 END) as downvotes,
    COUNT(CASE WHEN vote_type = 'upvote' THEN 1 END) - COUNT(CASE WHEN vote_type = 'downvote' THEN 1 END) as net_votes
FROM public.hiking_spot_votes
GROUP BY spot_id;

SELECT 'hiking_spot_votes table created successfully!' as status;