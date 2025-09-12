-- Create favorite_spots table
CREATE TABLE IF NOT EXISTS favorite_spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(200) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_favorite_spots_user_id ON favorite_spots(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_spots_created_at ON favorite_spots(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE favorite_spots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own favorite spots
CREATE POLICY "Users can view their own favorite spots" ON favorite_spots
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own favorite spots
CREATE POLICY "Users can insert their own favorite spots" ON favorite_spots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own favorite spots
CREATE POLICY "Users can update their own favorite spots" ON favorite_spots
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own favorite spots
CREATE POLICY "Users can delete their own favorite spots" ON favorite_spots
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_favorite_spots_updated_at
  BEFORE UPDATE ON favorite_spots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON favorite_spots TO authenticated;
GRANT ALL ON favorite_spots TO service_role;

-- Add comments for documentation
COMMENT ON TABLE favorite_spots IS 'Stores users favorite hiking spots with location and optional images';
COMMENT ON COLUMN favorite_spots.name IS 'Name of the favorite hiking spot';
COMMENT ON COLUMN favorite_spots.location IS 'Location description or address';
COMMENT ON COLUMN favorite_spots.latitude IS 'GPS latitude coordinate';
COMMENT ON COLUMN favorite_spots.longitude IS 'GPS longitude coordinate';
COMMENT ON COLUMN favorite_spots.image_url IS 'URL to uploaded image of the spot';
COMMENT ON COLUMN favorite_spots.notes IS 'User notes about the spot';