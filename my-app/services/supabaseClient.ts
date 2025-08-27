import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { validateSupabaseConfig } from '../utils/validateSupabaseConfig';

// Get Supabase credentials from environment variables
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Check for demo mode
const isDemoMode = supabaseUrl === 'demo' || supabaseAnonKey === 'demo';

if (isDemoMode) {
  console.log('🎭 DEMO MODE ENABLED - No real database connection');
  console.log('📝 To use real database, update .env with valid Supabase credentials');
  console.log('📖 See FIX_REGISTRATION_NOW.md for setup instructions');
} else {
  console.log('Supabase URL:', supabaseUrl ? 'Configured' : 'Missing');
  console.log('Supabase Anon Key:', supabaseAnonKey ? 'Configured' : 'Missing');
  
  // Validate configuration only in non-demo mode
  const validation = validateSupabaseConfig();
  if (!validation.isValid) {
    console.error('Supabase configuration issues detected:');
    validation.errors.forEach(error => console.error(`❌ ${error}`));
  }
}

// Handle missing credentials
if (!isDemoMode && (!supabaseUrl || !supabaseAnonKey)) {
  const errorMsg = 'Missing Supabase environment variables. Please check your .env file or use demo mode.';
  console.error(errorMsg);
  throw new Error(errorMsg);
}

// Validate URL format (skip in demo mode)
if (!isDemoMode) {
  try {
    new URL(supabaseUrl);
  } catch (error) {
    const errorMsg = 'Invalid Supabase URL format. Please check your .env file.';
    console.error(errorMsg, supabaseUrl);
    throw new Error(errorMsg);
  }
}

// Create Supabase client (use dummy values in demo mode)
const clientUrl = isDemoMode ? 'https://demo.supabase.co' : supabaseUrl;
const clientKey = isDemoMode ? 'demo-key' : supabaseAnonKey;

export const supabase: SupabaseClient = createClient(clientUrl, clientKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: !isDemoMode,
    persistSession: !isDemoMode,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'hiking-app-react-native',
      'X-Demo-Mode': isDemoMode ? 'true' : 'false',
    },
  },
});

// Export demo mode flag
export const isInDemoMode = isDemoMode;

// Helper function to check if user is logged in
export const isUserLoggedIn = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch (error) {
    console.error('Error checking login status:', error);
    return false;
  }
};

export { supabaseUrl, supabaseAnonKey };
