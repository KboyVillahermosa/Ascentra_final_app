import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createVotesTable() {
  try {
    console.log('Creating hiking_spot_votes table...');

    // First, let's check if the table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('hiking_spot_votes')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ hiking_spot_votes table already exists!');
      return;
    }

    console.log('Table does not exist, attempting to create it...');
    console.log(
      'Note: This requires database admin privileges. If this fails, the table needs to be created through Supabase dashboard.',
    );

    // Try to create a simple test record to see if we can access the table
    const { error: testError } = await supabase
      .from('hiking_spot_votes')
      .insert({
        hiking_spot_id: '00000000-0000-0000-0000-000000000000',
        user_id: '00000000-0000-0000-0000-000000000000',
        vote_type: 'upvote',
      });

    if (testError) {
      console.error(
        '❌ hiking_spot_votes table does not exist and cannot be created via client.',
      );
      console.log(
        '\n🔧 SOLUTION: Please create the table manually in Supabase dashboard:',
      );
      console.log(
        '1. Go to https://drcgjiadevrzxgwziemq.supabase.co/project/default/editor',
      );
      console.log('2. Run this SQL in the SQL editor:');
      console.log(`
CREATE TABLE IF NOT EXISTS hiking_spot_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hiking_spot_id UUID REFERENCES hiking_spots(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    vote_type TEXT CHECK (vote_type IN ('upvote', 'downvote')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hiking_spot_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hiking_spot_votes_spot_id ON hiking_spot_votes(hiking_spot_id);
CREATE INDEX IF NOT EXISTS idx_hiking_spot_votes_user_id ON hiking_spot_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_hiking_spot_votes_type ON hiking_spot_votes(vote_type);

ALTER TABLE hiking_spot_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes are viewable by everyone" ON hiking_spot_votes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own votes" ON hiking_spot_votes
    FOR ALL USING (auth.uid() = user_id);`);
      console.log('\n3. Click "Run" to execute the SQL');
    } else {
      console.log('✅ hiking_spot_votes table created successfully!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

createVotesTable();
