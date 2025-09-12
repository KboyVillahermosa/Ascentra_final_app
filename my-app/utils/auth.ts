import { supabase } from '../services/supabaseClient';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, Session, User } from '@supabase/supabase-js';

interface SessionData {
  user: User | null;
  session: Session | null;
}

// Register for redirect
WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<SessionData | undefined> {
  try {
    // Generate a random state for CSRF protection
    const randomState = Math.random().toString(36).substring(2, 15);
    await AsyncStorage.setItem('oauth_state', randomState);

    // Create redirect URI
    const redirectUri = makeRedirectUri({
      scheme: 'my-app', // Must match scheme in app.json
      path: 'auth/callback',
    });

    // Start the OAuth flow with Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
        queryParams: {
          state: randomState,
        },
      },
    });

    if (error) {
      throw error;
    }

    // Open auth URL and wait for result
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

    if (result.type === 'success' && result.url) {
      const url = result.url;
      const parsedUrl = new URL(url);
      const params = new URLSearchParams(parsedUrl.hash.substring(1));

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token') || '';

      if (accessToken) {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

        if (sessionError) {
          throw sessionError;
        }

        return sessionData;
      }
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}

// Utility function for manual token testing
export async function testWithToken(
  tokenUrl: string,
): Promise<SessionData | null> {
  try {
    // Extract access token from URL
    const url = new URL(tokenUrl);
    const params = new URLSearchParams(url.hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token') || '';

    if (accessToken) {
      // Set session with token
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        return null;
      }

      return data;
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Profile creation and management functions
export interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  skill_level?: string;
  total_km_traveled?: number;
  created_at: string;
  updated_at: string;
}

// Create user profile after successful registration
export async function createUserProfile(
  userId: string,
  username: string,
  fullName?: string,
  skillLevel?: string,
): Promise<{ data: UserProfile | null; error: any }> {
  try {
    const profileData = {
      user_id: userId, // Use user_id that references auth.users.id
      username,
      full_name: fullName || username,
      bio: '', // Default empty bio
      skill_level: skillLevel || 'rookie_rambler',
      total_km_traveled: 0,
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Check if user profile exists
export async function getUserProfile(
  userId: string,
): Promise<{ data: UserProfile | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId) // Use user_id to reference auth.users.id
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error
      return { data: null, error };
    }

    return { data: data || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Handle post-authentication profile setup
export async function handlePostAuthProfile(
  user: User,
  loginMethod: 'email' | 'google',
  username?: string,
  skillLevel?: string,
): Promise<{ success: boolean; error?: any }> {
  try {
    // Check if profile already exists
    const { data: existingProfile } = await getUserProfile(user.id);

    if (existingProfile) {
      return { success: true };
    }

    // Extract username from email if not provided
    const finalUsername = username || user.email?.split('@')[0] || 'user';

    // Extract full name from user metadata (for Google OAuth)
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name;

    // Create new profile
    const { error } = await createUserProfile(
      user.id,
      finalUsername,
      fullName,
      skillLevel,
    );

    if (error) {
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}
