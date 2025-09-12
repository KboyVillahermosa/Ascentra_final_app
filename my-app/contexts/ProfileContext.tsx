import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  bio?: string;
  avatar_url?: string;
  skill_level: string;
  cover_photo_url?: string;
  total_km_traveled?: number;
  created_at?: string;
  updated_at?: string;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  clearProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const PROFILE_STORAGE_KEY = 'user_profile_cache';

// Skill levels definition
export const SKILL_LEVELS = {
  rookie_rambler: { emoji: '🌱', name: 'Rookie Rambler', color: '#4CAF50' },
  climb_chaser: { emoji: '🌄', name: 'Climb Chaser', color: '#FF9800' },
  rock_scrambler: { emoji: '🔗', name: 'Rock Scrambler', color: '#795548' },
  summit_strider: { emoji: '🧗', name: 'Summit Strider', color: '#9C27B0' },
  earth_roamer: { emoji: '🌍', name: 'Earth Roamer', color: '#2196F3' },
};

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load profile from cache on mount
  useEffect(() => {
    loadProfileFromCache();
  }, []);

  // Fetch profile when user changes
  useEffect(() => {
    if (!authLoading && user) {
      fetchProfile(user.id);
    } else if (!authLoading && !user) {
      clearProfile();
    }
  }, [user, authLoading]);

  const loadProfileFromCache = async () => {
    try {
      const cachedProfile = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      if (cachedProfile) {
        const parsedProfile = JSON.parse(cachedProfile);
        setProfile(parsedProfile);
      }
    } catch (error) {
      console.error('Error loading profile from cache:', error);
    }
  };

  const saveProfileToCache = async (profileData: Profile) => {
    try {
      await AsyncStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify(profileData),
      );
    } catch (error) {
      console.error('Error saving profile to cache:', error);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data) {
        const profileData: Profile = {
          id: data.id,
          user_id: data.user_id,
          username: data.username || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url,
          skill_level: data.skill_level || 'rookie_rambler',
          cover_photo_url: data.cover_photo_url,
          total_km_traveled: data.total_km_traveled || 0,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };

        setProfile(profileData);
        await saveProfileToCache(profileData);
      } else {
        // Create default profile if none exists
        const defaultProfile: Partial<Profile> = {
          user_id: userId,
          username: '',
          bio: '',
          skill_level: 'rookie_rambler',
        };

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([defaultProfile])
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        if (newProfile) {
          const profileData: Profile = {
            id: newProfile.id,
            user_id: newProfile.user_id,
            username: newProfile.username || '',
            bio: newProfile.bio || '',
            avatar_url: newProfile.avatar_url,
            skill_level: newProfile.skill_level || 'rookie_rambler',
            cover_photo_url: newProfile.cover_photo_url,
            total_km_traveled: newProfile.total_km_traveled || 0,
            created_at: newProfile.created_at,
            updated_at: newProfile.updated_at,
          };

          setProfile(profileData);
          await saveProfileToCache(profileData);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to fetch profile',
      );
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<boolean> => {
      if (!user || !profile) {
        setError('No user or profile found');
        return false;
      }

      try {
        setError(null);

        // Optimistically update local state
        const updatedProfile = {
          ...profile,
          ...updates,
          updated_at: new Date().toISOString(),
        };
        setProfile(updatedProfile);
        await saveProfileToCache(updatedProfile);

        // Update in database
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (updateError) {
          // Revert optimistic update on error
          setProfile(profile);
          await saveProfileToCache(profile);
          throw updateError;
        }

        return true;
      } catch (error) {
        console.error('Error updating profile:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to update profile',
        );
        return false;
      }
    },
    [user, profile],
  );

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user]);

  const clearProfile = useCallback(() => {
    setProfile(null);
    setError(null);
    setLoading(false);
    AsyncStorage.removeItem(PROFILE_STORAGE_KEY).catch(console.error);
  }, []);

  const value: ProfileContextType = {
    profile,
    loading,
    error,
    updateProfile,
    refreshProfile,
    fetchProfile: () => fetchProfile(user?.id || ''),
    clearProfile,
  };

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

export default ProfileContext;
