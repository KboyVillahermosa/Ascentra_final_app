// Validation script to test Supabase setup and database connectivity
import { supabase } from '../services/supabaseClient';

export interface ValidationResult {
  step: string;
  success: boolean;
  message: string;
  details?: any;
}

export const validateSupabaseSetup = async (): Promise<ValidationResult[]> => {
  const results: ValidationResult[] = [];

  // Step 1: Check environment variables
  console.log('🔍 Starting Supabase setup validation...');
  
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  results.push({
    step: 'Environment Variables',
    success: !!(supabaseUrl && supabaseKey),
    message: supabaseUrl && supabaseKey 
      ? 'Environment variables are configured' 
      : 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY',
    details: {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlFormat: supabaseUrl?.startsWith('https://') ? 'Valid' : 'Invalid (should start with https://)',
      keyFormat: supabaseKey?.startsWith('eyJ') ? 'Valid' : 'Invalid (should start with eyJ)'
    }
  });

  // Step 2: Test basic Supabase connection
  try {
    const { data, error } = await supabase.auth.getSession();
    results.push({
      step: 'Supabase Connection',
      success: !error,
      message: error ? `Connection failed: ${error.message}` : 'Successfully connected to Supabase',
      details: { error: error?.message }
    });
  } catch (error) {
    results.push({
      step: 'Supabase Connection',
      success: false,
      message: `Network error: ${(error as Error).message}`,
      details: { error: (error as Error).message }
    });
  }

  // Step 3: Test database schema
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    results.push({
      step: 'Database Schema',
      success: !error,
      message: error 
        ? `Schema validation failed: ${error.message}` 
        : 'Database schema is properly deployed',
      details: { error: error?.message, hint: error?.hint }
    });
  } catch (error) {
    results.push({
      step: 'Database Schema',
      success: false,
      message: `Database query failed: ${(error as Error).message}`,
      details: { error: (error as Error).message }
    });
  }

  // Step 4: Test authentication functionality
  try {
    // Test if auth is properly configured by checking auth settings
    const { data: { user }, error } = await supabase.auth.getUser();
    results.push({
      step: 'Authentication Setup',
      success: !error || error.message.includes('session_not_found'),
      message: error && !error.message.includes('session_not_found')
        ? `Auth configuration issue: ${error.message}`
        : 'Authentication is properly configured',
      details: { 
        error: error?.message,
        userExists: !!user,
        authReady: true
      }
    });
  } catch (error) {
    results.push({
      step: 'Authentication Setup',
      success: false,
      message: `Auth test failed: ${(error as Error).message}`,
      details: { error: (error as Error).message }
    });
  }

  // Step 5: Test table existence
  const tablesToCheck = ['profiles', 'activities', 'hikes', 'forum_posts', 'hiking_spots'];
  for (const table of tablesToCheck) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      results.push({
        step: `Table: ${table}`,
        success: !error,
        message: error 
          ? `Table '${table}' issue: ${error.message}` 
          : `Table '${table}' exists and accessible`,
        details: { table, error: error?.message }
      });
    } catch (error) {
      results.push({
        step: `Table: ${table}`,
        success: false,
        message: `Failed to check table '${table}': ${(error as Error).message}`,
        details: { table, error: (error as Error).message }
      });
    }
  }

  return results;
};

export const printValidationResults = (results: ValidationResult[]): void => {
  console.log('\n📋 Supabase Setup Validation Results:');
  console.log('=' .repeat(50));
  
  let successCount = 0;
  
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.step}: ${result.message}`);
    
    if (result.details && !result.success) {
      console.log(`   Details:`, result.details);
    }
    
    if (result.success) successCount++;
  });
  
  console.log('=' .repeat(50));
  console.log(`📊 Summary: ${successCount}/${results.length} checks passed`);
  
  if (successCount === results.length) {
    console.log('🎉 All validations passed! Your Supabase setup is ready.');
  } else {
    console.log('⚠️  Some validations failed. Please check the issues above.');
    console.log('💡 Refer to QUICK_SETUP.md for troubleshooting steps.');
  }
};

// Function to run validation and log results
export const runValidation = async (): Promise<boolean> => {
  try {
    const results = await validateSupabaseSetup();
    printValidationResults(results);
    return results.every(r => r.success);
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    return false;
  }
};

// Export for use in components
export default {
  validateSupabaseSetup,
  printValidationResults,
  runValidation
};