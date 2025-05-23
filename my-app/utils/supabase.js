import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store'
import * as FileSystem from 'expo-file-system'

// SecureStore adapter for Supabase storage
const ExpoSecureStoreAdapter = {
  getItem: (key) => {
    return SecureStore.getItemAsync(key)
  },
  setItem: (key, value) => {
    SecureStore.setItemAsync(key, value)
  },
  removeItem: (key) => {
    SecureStore.deleteItemAsync(key)
  },
}

// Replace these with your actual Supabase credentials from your dashboard
const supabaseUrl = 'https://rtiiyfvvfwtozmbedazb.supabase.co'  // ⚠️ UPDATE THIS with your Supabase URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0aWl5ZnZ2Znd0b3ptYmVkYXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzOTI5MTEsImV4cCI6MjA2MDk2ODkxMX0.HS-bjg7Ov4NXSA5KTOs12kahneLdRUOpxtzaf498jwI'  // ⚠️ UPDATE THIS with your Supabase anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  debug: __DEV__,  // Enable debug logging in development
})

// Utility function to check authentication status
export const isUserLoggedIn = async () => {
  try {
    // Get current session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error checking login status:', error.message);
      return false;
    }
    
    // Log session data in development for debugging
    if (__DEV__) {
      console.log('Auth session data:', 
        data?.session 
          ? { 
              user_id: data.session.user.id,
              email: data.session.user.email,
              expires_at: new Date(data.session.expires_at * 1000).toISOString() 
            } 
          : 'No active session'
      );
    }
    
    return !!data?.session?.user?.id;
  } catch (error) {
    console.error('Error in isUserLoggedIn:', error);
    return false;
  }
};

// Improved upload function with auth token handling
export async function uploadFileToSupabase(bucketName, filePath, uri, contentType, maxRetries = 3) {
  let retries = 0;
  let lastError;
  
  // First check if the file exists
  try {
    const netInfo = await FileSystem.getInfoAsync(uri);
    console.log('File info:', netInfo);
    
    if (!netInfo.exists) {
      throw new Error(`File does not exist: ${uri}`);
    }
  } catch (error) {
    console.error('File check error:', error);
    throw new Error(`Cannot access file: ${error.message}`);
  }
  
  // Get user's session for auth token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('Authentication error:', sessionError);
    throw new Error('You must be logged in to upload files');
  }
  
  const accessToken = session.access_token;
  console.log('Got auth token, length:', accessToken.length);
  
  while (retries < maxRetries) {
    try {
      console.log(`Upload attempt ${retries + 1}/${maxRetries} for ${filePath}`);
      
      // Try direct upload using FormData and fetch
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        name: filePath.split('/').pop(),
        type: contentType
      });
      
      const uploadResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`, // Use the user's session token
            'x-upsert': 'true'
          },
          body: formData
        }
      );
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload response error:', errorText);
        throw new Error(`Upload failed with status: ${uploadResponse.status}`);
      }
      
      console.log('Upload successful via fetch API');
      
      // Construct URL directly
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
      return { url: publicUrl };
      
    } catch (error) {
      lastError = error;
      console.error(`Upload attempt ${retries + 1} failed:`, error.message);
      retries++;
      
      if (retries < maxRetries) {
        // Wait before retry with exponential backoff
        const delay = 1000 * Math.pow(2, retries);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  throw lastError || new Error('Upload failed after multiple attempts');
}

