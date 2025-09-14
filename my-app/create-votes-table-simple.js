import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createVotesTableSimple() {
  try {
    console.log('🚀 Creating hiking_spot_votes table...');
    
    // First check if the table exists
    const { data: existingTable, error: checkError } = await supabase
      .from('hiking_spot_votes')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ hiking_spot_votes table already exists!');
      return;
    }

    console.log('❌ Table does not exist. This needs to be created manually in Supabase dashboard.');
    console.log('\n🔧 MANUAL STEPS REQUIRED:');
    console.log('\n1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Run the following SQL command:');
    console.log('\n```sql');
    console.log('-- Create hiking_spot_votes table');
    console.log('CREATE TABLE IF NOT EXISTS public.hiking_spot_votes (');
    console.log('    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,');
    console.log('    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,');
    console.log('    spot_id UUID REFERENCES public.hiking_spots(id) ON DELETE CASCADE NOT NULL,');
    console.log('    vote_type TEXT CHECK (vote_type IN (\'upvote\', \'downvote\')) NOT NULL,');
    console.log('    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
    console.log('    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
    console.log('    UNIQUE(user_id, spot_id)');
    console.log(');');
    console.log('');
    console.log('-- Enable RLS');
    console.log('ALTER TABLE public.hiking_spot_votes ENABLE ROW LEVEL SECURITY;');
    console.log('');
    console.log('-- Create policies');
    console.log('CREATE POLICY "Users can view all votes" ON public.hiking_spot_votes');
    console.log('    FOR SELECT USING (true);');
    console.log('');
    console.log('CREATE POLICY "Users can manage own votes" ON public.hiking_spot_votes');
    console.log('    FOR ALL USING (auth.uid() = user_id);');
    console.log('');
    console.log('-- Create trigger for updated_at');
    console.log('CREATE OR REPLACE FUNCTION handle_updated_at()');
    console.log('RETURNS TRIGGER AS $$');
    console.log('BEGIN');
    console.log('    NEW.updated_at = NOW();');
    console.log('    RETURN NEW;');
    console.log('END;');
    console.log('$$ LANGUAGE plpgsql;');
    console.log('');
    console.log('CREATE TRIGGER handle_hiking_spot_votes_updated_at');
    console.log('    BEFORE UPDATE ON public.hiking_spot_votes');
    console.log('    FOR EACH ROW');
    console.log('    EXECUTE FUNCTION handle_updated_at();');
    console.log('```');
    console.log('\n4. After running the SQL, the table should be created successfully.');
    
    // For now, let's try to test if we can insert a dummy record to see if the table structure works
    console.log('\n🧪 Testing table access after manual creation...');
    
    // Wait a moment and test again
    setTimeout(async () => {
      const { data: testTable, error: testError } = await supabase
        .from('hiking_spot_votes')
        .select('id')
        .limit(1);

      if (!testError) {
        console.log('✅ hiking_spot_votes table is now accessible!');
      } else {
        console.log('⚠️  Table still not accessible. Please create it manually using the SQL above.');
      }
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the function
createVotesTableSimple();