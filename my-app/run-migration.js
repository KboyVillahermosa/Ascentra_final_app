import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'database', 'migrations', 'fix_database_issues.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log('⚠️  Note: This script will attempt to run SQL commands through Supabase client.');
    console.log('   Some commands may require database admin privileges.');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.includes('SELECT \'\''));
    
    console.log(`\n📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.includes('CREATE TABLE') || statement.includes('ALTER TABLE') || statement.includes('CREATE POLICY')) {
        console.log(`\n⚙️  Executing statement ${i + 1}/${statements.length}:`);
        console.log(`   ${statement.substring(0, 60)}${statement.length > 60 ? '...' : ''}`);
        
        try {
          // For table operations, we'll use the rpc function if available
          // or try direct SQL execution
          const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.log(`⚠️  Statement ${i + 1} failed (this may be expected):`, error.message);
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.log(`⚠️  Statement ${i + 1} failed (this may be expected):`, err.message);
        }
      }
    }
    
    console.log('\n🔍 Verifying database structure...');
    
    // Test if we can access the tables
    const tests = [
      { table: 'profiles', description: 'Profiles table' },
      { table: 'hiking_spots', description: 'Hiking spots table' },
      { table: 'favorites', description: 'Favorites table' },
      { table: 'hiking_spot_votes', description: 'Hiking spot votes table' }
    ];
    
    for (const test of tests) {
      try {
        const { data, error } = await supabase
          .from(test.table)
          .select('*')
          .limit(1);
          
        if (error) {
          console.log(`❌ ${test.description}: ${error.message}`);
        } else {
          console.log(`✅ ${test.description}: Accessible`);
        }
      } catch (err) {
        console.log(`❌ ${test.description}: ${err.message}`);
      }
    }
    
    console.log('\n🎉 Migration process completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. If any tables failed to create, you may need to create them manually in Supabase dashboard');
    console.log('   2. Test the application to ensure all functionality works correctly');
    console.log('   3. Check the application logs for any remaining errors');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration();