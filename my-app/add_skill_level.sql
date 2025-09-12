-- Add skill_level column to profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'rookie_rambler';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'skill_level';

-- Success message
SELECT 'skill_level column added successfully!' as status;