-- Create progression_logs table to track user skill level and distance progression
CREATE TABLE IF NOT EXISTS progression_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    previous_total_km DECIMAL(10,2) NOT NULL DEFAULT 0,
    new_total_km DECIMAL(10,2) NOT NULL DEFAULT 0,
    previous_skill_level TEXT NOT NULL,
    new_skill_level TEXT NOT NULL,
    hike_distance DECIMAL(10,2) NOT NULL DEFAULT 0,
    leveled_up BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_progression_logs_user_id ON progression_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_progression_logs_created_at ON progression_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_progression_logs_leveled_up ON progression_logs(leveled_up);

-- Enable Row Level Security
ALTER TABLE progression_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only view their own progression logs
CREATE POLICY "Users can view own progression logs" ON progression_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Only the system can insert progression logs (through service functions)
CREATE POLICY "System can insert progression logs" ON progression_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No updates or deletes allowed on progression logs (audit trail)
CREATE POLICY "No updates on progression logs" ON progression_logs
    FOR UPDATE USING (false);

CREATE POLICY "No deletes on progression logs" ON progression_logs
    FOR DELETE USING (false);

-- Grant permissions
GRANT SELECT ON progression_logs TO authenticated;
GRANT INSERT ON progression_logs TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE progression_logs IS 'Tracks user skill level progression and distance milestones';
COMMENT ON COLUMN progression_logs.user_id IS 'Reference to the user who achieved the progression';
COMMENT ON COLUMN progression_logs.previous_total_km IS 'Total kilometers before this update';
COMMENT ON COLUMN progression_logs.new_total_km IS 'Total kilometers after this update';
COMMENT ON COLUMN progression_logs.previous_skill_level IS 'Skill level before this update';
COMMENT ON COLUMN progression_logs.new_skill_level IS 'Skill level after this update';
COMMENT ON COLUMN progression_logs.hike_distance IS 'Distance of the hike that triggered this progression';
COMMENT ON COLUMN progression_logs.leveled_up IS 'Whether this update resulted in a skill level increase';
COMMENT ON COLUMN progression_logs.created_at IS 'When this progression update occurred';

-- Create a view for recent level ups (useful for achievements/notifications)
CREATE OR REPLACE VIEW recent_level_ups AS
SELECT 
    pl.*,
    p.username,
    p.full_name
FROM progression_logs pl
JOIN profiles p ON pl.user_id = p.user_id
WHERE pl.leveled_up = true
ORDER BY pl.created_at DESC;

-- Grant access to the view
GRANT SELECT ON recent_level_ups TO authenticated;

COMMENT ON VIEW recent_level_ups IS 'Shows recent skill level progressions with user information';