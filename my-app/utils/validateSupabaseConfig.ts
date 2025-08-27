import Constants from 'expo-constants';

export const validateSupabaseConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Get environment variables
  const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Validating Supabase configuration...');
  console.log('Raw Supabase URL:', supabaseUrl);
  console.log('Raw Supabase Key length:', supabaseAnonKey?.length || 0);
  
  // Check if URL exists
  if (!supabaseUrl) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL is missing from environment variables');
  } else {
    // Check URL format
    if (supabaseUrl.includes('...')) {
      errors.push('Supabase URL appears to be truncated (contains "..."). Please provide the complete URL.');
    }
    
    // Check if URL is a valid Supabase URL format
    if (!supabaseUrl.includes('.supabase.co')) {
      errors.push('Supabase URL should contain ".supabase.co" domain');
    }
    
    // Check URL protocol
    if (!supabaseUrl.startsWith('https://')) {
      errors.push('Supabase URL should start with "https://"');
    }
    
    // Try to parse as URL
    try {
      const url = new URL(supabaseUrl);
      console.log('Parsed URL hostname:', url.hostname);
    } catch (error) {
      errors.push('Supabase URL is not a valid URL format');
    }
  }
  
  // Check if anon key exists
  if (!supabaseAnonKey) {
    errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is missing from environment variables');
  } else {
    // Check key format (should be a JWT)
    if (!supabaseAnonKey.startsWith('eyJ')) {
      errors.push('Supabase anon key should start with "eyJ" (JWT format)');
    }
    
    if (supabaseAnonKey.includes('...')) {
      errors.push('Supabase anon key appears to be truncated (contains "..."). Please provide the complete key.');
    }
    
    // Check minimum length
    if (supabaseAnonKey.length < 100) {
      errors.push('Supabase anon key appears to be too short. Please verify the complete key.');
    }
  }
  
  const isValid = errors.length === 0;
  
  if (isValid) {
    console.log('✅ Supabase configuration validation passed');
  } else {
    console.error('❌ Supabase configuration validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
  }
  
  return { isValid, errors };
};