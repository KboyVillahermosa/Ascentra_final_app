-- Create friendships table for social features
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure users can't friend themselves
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id),
  
  -- Ensure unique friendship pairs (prevent duplicates)
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_created_at ON friendships(created_at);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status ON friendships(friend_id, status);

-- Enable Row Level Security
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users can view friendships where they are either the user or the friend
CREATE POLICY "Users can view their own friendships" ON friendships
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can create friendship requests (send friend requests)
CREATE POLICY "Users can send friend requests" ON friendships
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Users can update friendship status (accept/decline requests)
CREATE POLICY "Users can respond to friend requests" ON friendships
  FOR UPDATE
  USING (auth.uid() = friend_id OR auth.uid() = user_id)
  WITH CHECK (auth.uid() = friend_id OR auth.uid() = user_id);

-- Users can delete friendships (remove friends or cancel requests)
CREATE POLICY "Users can delete their friendships" ON friendships
  FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_friendships_updated_at_trigger
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friendships_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON friendships TO authenticated;
GRANT USAGE ON SEQUENCE friendships_id_seq TO authenticated;

-- Add helpful comments
COMMENT ON TABLE friendships IS 'Stores friendship relationships between users';
COMMENT ON COLUMN friendships.user_id IS 'The user who initiated the friendship/request';
COMMENT ON COLUMN friendships.friend_id IS 'The user who received the friendship/request';
COMMENT ON COLUMN friendships.status IS 'Status of the friendship: pending, accepted, or blocked';
COMMENT ON CONSTRAINT no_self_friendship ON friendships IS 'Prevents users from friending themselves';
COMMENT ON CONSTRAINT unique_friendship ON friendships IS 'Ensures each friendship pair is unique';

-- Create a view for easier querying of mutual friendships
CREATE OR REPLACE VIEW mutual_friendships AS
SELECT 
  f1.user_id,
  f1.friend_id,
  f1.status,
  f1.created_at,
  f1.updated_at,
  CASE 
    WHEN f2.id IS NOT NULL THEN true 
    ELSE false 
  END AS is_mutual
FROM friendships f1
LEFT JOIN friendships f2 ON f1.user_id = f2.friend_id AND f1.friend_id = f2.user_id
WHERE f1.status = 'accepted';

COMMENT ON VIEW mutual_friendships IS 'View showing friendships with mutual relationship status';

-- Grant permissions on the view
GRANT SELECT ON mutual_friendships TO authenticated;