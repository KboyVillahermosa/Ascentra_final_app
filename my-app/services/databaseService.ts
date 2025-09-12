import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isUserLoggedIn } from './supabaseClient';
import { sanitizeRouteCoordinates } from '../utils/mapHelpers';

// Enhanced cache management
const hikesCache: { [userId: string]: SavedHike[] } = {};
const cacheTimestamps: { [userId: string]: number } = {};
const queryCache: Map<string, { data: any; timestamp: number }> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const QUERY_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for query results
const MAX_CACHE_SIZE = 50; // Maximum number of cached queries

// Type definitions
export interface HikeStats {
  distance: number;
  duration: number;
  pace: number;
  elevation: number;
}

export interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  name: string;
}

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
  timestamp?: number;
}

export interface HikeData {
  id?: string;
  title?: string;
  description?: string;
  activityType?: string;
  feeling?: string;
  privateNotes?: string;
  date: string;
  stats: HikeStats;
  distance?: number;
  duration?: number;
  pace?: number;
  elevation?: number;
  routeCoordinates: RouteCoordinate[];
  media: MediaItem[];
  synced?: boolean;
}

export interface SavedHike {
  id: string;
  title: string;
  description: string;
  activityType: string;
  feeling: string;
  privateNotes: string;
  date: string;
  distance: number;
  duration: number;
  pace: number;
  elevation: number;
  routeCoordinates: RouteCoordinate[];
  media: MediaItem[];
  synced: boolean;
  stats?: HikeStats; // Optional for backward compatibility
}

export interface SyncResult {
  success: boolean;
  synced?: number;
  total?: number;
  imported?: number;
  errors?: Array<{ hikeId: string; error: string }>;
  reason?: string;
  error?: string;
}

// Helper function to get current user ID - improved version
export const getCurrentUserId = async (): Promise<string> => {
  try {
    // First check if a user is logged in using the isUserLoggedIn utility
    const loggedIn = await isUserLoggedIn();

    if (loggedIn) {
      // Get current session from Supabase
      const { data } = await supabase.auth.getSession();
      const userId = data?.session?.user?.id;

      if (userId) {
        return userId;
      }
    }

    // If no user is logged in or session retrieval failed, use 'guest'
    return 'guest';
  } catch (error) {
    return 'guest';
  }
};

// Helper to get user-specific storage key
const getUserHikesKey = async (): Promise<string> => {
  const userId = await getCurrentUserId();
  return `@ascentra_hikes_${userId}`;
};

// Cache management functions
const isCacheValid = (userId: string): boolean => {
  const timestamp = cacheTimestamps[userId];
  if (!timestamp) {
    return false;
  }
  return Date.now() - timestamp < CACHE_DURATION;
};

const getCachedHikes = (userId: string): SavedHike[] | null => {
  if (isCacheValid(userId) && hikesCache[userId]) {
    return hikesCache[userId];
  }
  return null;
};

const setCacheHikes = (userId: string, hikes: SavedHike[]): void => {
  hikesCache[userId] = hikes;
  cacheTimestamps[userId] = Date.now();
};

const invalidateCache = (userId: string): void => {
  delete hikesCache[userId];
  delete cacheTimestamps[userId];
};

// Enhanced query caching functions
const getCachedQuery = (key: string): any | null => {
  const cached = queryCache.get(key);
  if (!cached) {
    return null;
  }

  const isExpired = Date.now() - cached.timestamp > QUERY_CACHE_DURATION;
  if (isExpired) {
    queryCache.delete(key);
    return null;
  }

  return cached.data;
};

const setCachedQuery = (key: string, data: any): void => {
  // Implement LRU cache by removing oldest entries when cache is full
  if (queryCache.size >= MAX_CACHE_SIZE) {
    const firstKey = queryCache.keys().next().value;
    if (firstKey) {
      queryCache.delete(firstKey);
    }
  }

  queryCache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

const clearQueryCache = (): void => {
  queryCache.clear();
};

// Batch operations for better performance
const batchAsyncOperations = async <T>(
  operations: (() => Promise<T>)[],
  batchSize: number = 3,
): Promise<T[]> => {
  const results: T[] = [];

  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(op => op()));
    results.push(...batchResults);
  }

  return results;
};

// Debug function
export const debugStorage = async (): Promise<boolean> => {
  try {
    const keys = await AsyncStorage.getAllKeys();

    // Show which users have hike data
    const hikeKeys = keys.filter(key => key.startsWith('@ascentra_hikes_'));

    return true;
  } catch (error) {
    return false;
  }
};

// Save hike with user-specific key and caching
export const saveHikeToLocalDB = async (
  hikeData: HikeData,
): Promise<string> => {
  try {
    // Generate ID if not provided
    const hikeId = hikeData.id || Date.now().toString();

    // Sanitize route coordinates before saving
    const sanitizedCoordinates = sanitizeRouteCoordinates(
      hikeData.routeCoordinates,
    );
    console.log(
      `Sanitized ${hikeData.routeCoordinates?.length || 0} coordinates to ${sanitizedCoordinates.length} valid points`,
    );

    // Prepare data object with all fields
    const hikeToSave = {
      id: hikeId,
      title: hikeData.title || 'Hiking Activity',
      description: hikeData.description || '',
      activityType: hikeData.activityType || 'Hiking',
      feeling: hikeData.feeling || '',
      privateNotes: hikeData.privateNotes || '',
      date: hikeData.date,
      distance: hikeData.stats.distance,
      duration: hikeData.stats.duration,
      pace: hikeData.stats.pace,
      elevation: hikeData.stats.elevation,
      // Make sure route coordinates are saved in the correct format
      routeCoordinates: sanitizedCoordinates,
      // Media
      media: Array.isArray(hikeData.media)
        ? hikeData.media.map(item => ({
            uri: item.uri,
            type:
              item.type ||
              (item.uri && item.uri.endsWith('.mp4') ? 'video' : 'image'),
            name: item.name || item.uri.split('/').pop() || 'unknown',
          }))
        : [],
      synced: false, // Track sync status with Supabase
    };

    // Get user-specific key
    const userId = await getCurrentUserId();
    const storageKey = `@ascentra_hikes_${userId}`;

    // Get existing hikes from cache or AsyncStorage
    let hikes = getCachedHikes(userId);
    if (!hikes) {
      const hikesStr = await AsyncStorage.getItem(storageKey);
      hikes = hikesStr ? JSON.parse(hikesStr) : [];
    }

    // Ensure hikes is not null
    if (!hikes) {
      hikes = [];
    }

    // Add new hike or update existing
    const existingIndex = hikes.findIndex((h: SavedHike) => h.id === hikeId);
    if (existingIndex >= 0) {
      hikes[existingIndex] = hikeToSave;
    } else {
      hikes.push(hikeToSave);
    }

    // Update cache
    setCacheHikes(userId, hikes);

    // Save back to AsyncStorage (debounced)
    await AsyncStorage.setItem(storageKey, JSON.stringify(hikes));

    // Try to sync with Supabase
    if (userId !== 'guest') {
      try {
        await syncHikeToSupabase(hikeToSave, userId);

        // Mark as synced locally after successful sync
        hikeToSave.synced = true;

        // Update the list with synced status
        if (hikes && existingIndex >= 0) {
          hikes[existingIndex] = hikeToSave;
        } else if (hikes) {
          // Find the recently added hike
          const newIndex = hikes.findIndex((h: SavedHike) => h.id === hikeId);
          if (newIndex >= 0) {
            hikes[newIndex].synced = true;
          }
        }

        // Update cache and storage
        if (hikes) {
          setCacheHikes(userId, hikes);
          await AsyncStorage.setItem(storageKey, JSON.stringify(hikes));
        }
      } catch (syncError) {
        console.error('Failed to sync with Supabase:', syncError);
        // We still saved locally, so no need to throw
      }
    }

    console.log(
      `Hike saved locally with ID: ${hikeId}, includes ${hikeToSave.routeCoordinates.length} route points and ${hikeToSave.media.length} media items`,
    );
    return hikeId;
  } catch (error) {
    console.error('Error saving hike to local DB:', error);
    throw error;
  }
};

// Export the sync function so it can be used by other components
export const syncHikeToSupabase = async (
  hike: SavedHike,
  userId: string,
): Promise<boolean> => {
  try {
    console.log('Starting direct Supabase sync for hike:', hike.id);

    // Check if userId is guest, if so, we can't sync
    if (!userId || userId === 'guest') {
      console.error('Cannot sync with guest account');
      return false;
    }

    // First verify the user is actually logged in
    const isLoggedIn = await isUserLoggedIn();
    if (!isLoggedIn) {
      console.error('User appears to be logged out, cannot sync');
      return false;
    }

    // Prepare data for Supabase
    const supabaseHike = {
      id: hike.id,
      user_id: userId,
      title: hike.title,
      description: hike.description,
      activity_type: hike.activityType,
      feeling: hike.feeling,
      private_notes: hike.privateNotes,
      date: hike.date,
      distance:
        typeof hike.distance === 'number'
          ? hike.distance
          : hike.stats?.distance,
      duration:
        typeof hike.duration === 'number'
          ? hike.duration
          : hike.stats?.duration,
      pace: typeof hike.pace === 'number' ? hike.pace : hike.stats?.pace,
      elevation:
        typeof hike.elevation === 'number'
          ? hike.elevation
          : hike.stats?.elevation,
      route_coordinates: hike.routeCoordinates,
      media: hike.media,
    };

    console.log('Prepared Supabase data:', {
      id: supabaseHike.id,
      user_id: supabaseHike.user_id,
      title: supabaseHike.title,
    });

    // Verify the table exists
    try {
      const { error: tableError } = await supabase
        .from('saveactivity')
        .select('id')
        .limit(1);

      if (tableError) {
        console.error('Table verification error:', tableError.message);
        if (tableError.message.includes('does not exist')) {
          throw new Error(
            'The "saveactivity" table does not exist in your Supabase database',
          );
        }
      }
    } catch (verifyError) {
      console.error('Table verification error:', verifyError);
      throw verifyError;
    }

    // Do the upsert operation
    const { data, error } = await supabase
      .from('saveactivity')
      .upsert(supabaseHike);

    if (error) {
      console.error('Supabase sync error:', error);
      throw new Error(`Supabase sync error: ${error.message}`);
    }

    console.log('Supabase sync successful');

    // Update local storage to mark as synced
    const storageKey = `@ascentra_hikes_${userId}`;
    const hikesStr = await AsyncStorage.getItem(storageKey);
    if (hikesStr) {
      const hikes = JSON.parse(hikesStr);
      const updatedHikes = hikes.map((h: SavedHike) => {
        if (h.id === hike.id) {
          return { ...h, synced: true };
        }
        return h;
      });

      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedHikes));
    }

    console.log(`Successfully synced hike ${hike.id} to Supabase`);
    return true;
  } catch (error) {
    console.error('Error syncing to Supabase:', error);
    throw error;
  }
};

// Sync all local hikes to Supabase
export const syncAllHikesToSupabase = async (): Promise<SyncResult> => {
  try {
    const userId = await getCurrentUserId();

    // Only sync for logged in users
    if (userId === 'guest') {
      console.log('Cannot sync for guest users');
      return { success: false, reason: 'Not logged in' };
    }

    // Get local hikes
    const storageKey = `@ascentra_hikes_${userId}`;
    const hikesStr = await AsyncStorage.getItem(storageKey);

    if (!hikesStr) {
      console.log('No local hikes to sync');
      return { success: true, synced: 0 };
    }

    const hikes = JSON.parse(hikesStr);
    let syncedCount = 0;
    const errors = [];

    // Sync each hike
    for (const hike of hikes) {
      try {
        await syncHikeToSupabase(hike, userId);

        // Mark as synced
        hike.synced = true;
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync hike ${hike.id}:`, error);
        errors.push({ hikeId: hike.id, error: (error as Error).message });
      }
    }

    // Save updated sync status
    await AsyncStorage.setItem(storageKey, JSON.stringify(hikes));

    return {
      success: errors.length === 0,
      synced: syncedCount,
      total: hikes.length,
      errors: errors,
    };
  } catch (error) {
    console.error('Error in bulk sync to Supabase:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Fetch hikes from Supabase (useful when user logs in on a new device)
export const fetchHikesFromSupabase = async (): Promise<SyncResult> => {
  try {
    const userId = await getCurrentUserId();

    // Only fetch for logged in users
    if (userId === 'guest') {
      console.log('Cannot fetch from Supabase for guest users');
      return { success: false, reason: 'Not logged in' };
    }

    // Fetch from Supabase using saveactivity table
    const { data, error } = await supabase
      .from('saveactivity')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Supabase fetch error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('No hikes found in Supabase');
      return { success: true, imported: 0 };
    }

    // Convert Supabase format to app format
    const appHikes: SavedHike[] = data.map((h: any) => ({
      id: h.id,
      title: h.title,
      description: h.description,
      activityType: h.activity_type,
      feeling: h.feeling,
      privateNotes: h.private_notes,
      date: h.date,
      distance: h.distance,
      duration: h.duration,
      pace: h.pace,
      elevation: h.elevation,
      routeCoordinates: h.route_coordinates || [],
      media: h.media || [],
      synced: true,
    }));

    // Merge with local hikes
    const storageKey = `@ascentra_hikes_${userId}`;
    const hikesStr = await AsyncStorage.getItem(storageKey);
    const localHikes = hikesStr ? JSON.parse(hikesStr) : [];

    // Create a map of existing hike IDs
    const existingHikeIds = new Set(localHikes.map((h: SavedHike) => h.id));

    // Add only new hikes from Supabase
    let importedCount = 0;
    for (const hike of appHikes) {
      if (!existingHikeIds.has(hike.id)) {
        localHikes.push(hike);
        importedCount++;
      }
    }

    // Save merged hikes
    await AsyncStorage.setItem(storageKey, JSON.stringify(localHikes));

    return {
      success: true,
      imported: importedCount,
      total: appHikes.length,
    };
  } catch (error: any) {
    console.error('Error fetching from Supabase:', error);
    return { success: false, error: error.message };
  }
};

// Update the delete function to also delete from Supabase with cache invalidation
export const deleteHike = async (hikeId: string): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    const storageKey = `@ascentra_hikes_${userId}`;

    // Get hikes from cache or storage
    let hikes = getCachedHikes(userId);
    if (!hikes) {
      const hikesStr = await AsyncStorage.getItem(storageKey);
      if (!hikesStr) {
        throw new Error('No hikes found in storage');
      }
      hikes = JSON.parse(hikesStr);
    }

    // Ensure hikes is not null
    if (!hikes) {
      throw new Error('No hikes found');
    }

    // Filter out the one to delete
    const updatedHikes = hikes.filter((hike: SavedHike) => hike.id !== hikeId);

    // Update cache and storage
    setCacheHikes(userId, updatedHikes);
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedHikes));

    // Also delete from Supabase if user is logged in
    if (userId !== 'guest') {
      try {
        const { error } = await supabase
          .from('saveactivity')
          .delete()
          .eq('id', hikeId)
          .eq('user_id', userId);

        if (error) {
          console.error('Error deleting from Supabase:', error);
          // Continue anyway since local delete succeeded
        }
      } catch (supabaseError) {
        console.error('Failed to delete from Supabase:', supabaseError);
        // Continue anyway since local delete succeeded
      }
    }

    return true;
  } catch (error) {
    console.error('Error deleting hike:', error);
    throw error;
  }
};

// Clear all hikes for current user with cache invalidation
export const clearAllHikes = async (): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    const storageKey = await getUserHikesKey();

    // Clear cache and storage
    invalidateCache(userId);
    await AsyncStorage.removeItem(storageKey);

    return true;
  } catch (error) {
    console.error('Error clearing hikes:', error);
    return false;
  }
};

// Get hikes for a specific user (for profile viewing)
export const getHikesForUser = async (
  userId?: string,
): Promise<SavedHike[]> => {
  try {
    // Fall back to current user if no ID provided
    const targetUserId = userId || (await getCurrentUserId());
    const storageKey = `@ascentra_hikes_${targetUserId}`;

    console.log('Fetching hikes for user with key:', storageKey);

    // Get hikes with user-specific key
    const hikesStr = await AsyncStorage.getItem(storageKey);

    if (!hikesStr) {
      console.log('No hikes found for this user');
      return [];
    }

    const hikes = JSON.parse(hikesStr);
    console.log(`Found ${hikes.length} hikes for user ${targetUserId}`);
    return hikes;
  } catch (error) {
    console.error('Error getting hikes for user:', error);
    return [];
  }
};

// Get a specific hike by its ID
export const getHikeById = async (
  hikeId: string,
): Promise<SavedHike | null> => {
  try {
    // Get user-specific key
    const userId = await getCurrentUserId();
    const storageKey = `@ascentra_hikes_${userId}`;

    // Get all hikes from storage
    const hikesStr = await AsyncStorage.getItem(storageKey);
    if (!hikesStr) {
      console.log(`No hikes found for user ${userId}`);
      return null;
    }

    // Parse hikes and find the one with matching ID
    const hikes: SavedHike[] = JSON.parse(hikesStr);
    const hike = hikes.find(
      (h: SavedHike) => h.id.toString() === hikeId.toString(),
    );

    if (!hike) {
      console.log(`Hike with ID ${hikeId} not found`);
      return null;
    }

    // Make sure route coordinates are valid
    if (hike.routeCoordinates && Array.isArray(hike.routeCoordinates)) {
      // Use our sanitization utility
      hike.routeCoordinates = sanitizeRouteCoordinates(hike.routeCoordinates);

      console.log(
        `Retrieved hike "${hike.title}" (ID: ${hikeId}) with ${hike.routeCoordinates.length} valid route points`,
      );

      // If we have less than 2 points, log a warning
      if (hike.routeCoordinates.length < 2) {
        console.warn(
          `Warning: Hike ${hikeId} has less than 2 valid coordinates for map display`,
        );
      }
    }

    return hike;
  } catch (error) {
    console.error('Error getting hike by ID:', error);
    throw error;
  }
};

// Get all saved hikes for current user with caching
export const getSavedHikes = async (): Promise<SavedHike[]> => {
  try {
    const userId = await getCurrentUserId();

    // Check cache first
    const cachedHikes = getCachedHikes(userId);
    if (cachedHikes) {
      return cachedHikes;
    }

    // Load from AsyncStorage if not in cache
    const storageKey = await getUserHikesKey();
    const hikesStr = await AsyncStorage.getItem(storageKey);

    const hikes = hikesStr ? JSON.parse(hikesStr) : [];
    const validHikes = Array.isArray(hikes) ? hikes : [];

    // Update cache
    setCacheHikes(userId, validHikes);

    return validHikes;
  } catch (error) {
    console.error('Error getting saved hikes:', error);
    return [];
  }
};

// Get all hikes for current user only
export const getAllHikes = async (): Promise<SavedHike[]> => {
  try {
    // Get user-specific key
    const userId = await getCurrentUserId();

    // Check cache first
    const cachedHikes = getCachedHikes(userId);
    if (cachedHikes) {
      console.log(
        `Found ${cachedHikes.length} hikes in cache for current user`,
      );
      return cachedHikes;
    }

    const storageKey = `@ascentra_hikes_${userId}`;
    console.log('Fetching all hikes with key:', storageKey);

    // Get hikes with user-specific key
    const hikesStr = await AsyncStorage.getItem(storageKey);

    if (!hikesStr) {
      console.log('No hikes found for current user');
      setCacheHikes(userId, []);
      return [];
    }

    const hikes = JSON.parse(hikesStr);
    console.log(`Found ${hikes.length} hikes for current user`);

    // Update cache
    setCacheHikes(userId, hikes);

    // If user is logged in, also try to fetch from Supabase to ensure data is in sync
    if (userId !== 'guest') {
      try {
        // Try to sync down from Supabase if we're online
        await fetchHikesFromSupabase();

        // Re-fetch local data after sync
        const updatedHikesStr = await AsyncStorage.getItem(storageKey);
        if (updatedHikesStr) {
          const updatedHikes = JSON.parse(updatedHikesStr);
          console.log(`After sync, found ${updatedHikes.length} hikes`);
          setCacheHikes(userId, updatedHikes);
          return updatedHikes;
        }
      } catch (syncError) {
        console.warn(
          'Could not sync with Supabase, using local data only:',
          syncError,
        );
        // Continue with local data if sync fails
      }
    }

    return hikes;
  } catch (error) {
    console.error('Error getting hikes from local DB:', error);
    return [];
  }
};

// =====================================================
// FAVORITES FUNCTIONALITY
// =====================================================

export interface HikingSpot {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  difficulty: string;
  elevation: number;
  trail_length: number;
  estimated_duration: number;
  image_url: string;
  images: string[];
  rating: number;
  review_count: number;
  favorite_count?: number;
  is_favorited?: boolean;
}

export interface UserFavorite {
  id: string;
  user_id: string;
  hiking_spot_id: string;
  created_at: string;
  hiking_spot?: HikingSpot;
}

// Toggle favorite status for a hiking spot
export const toggleFavorite = async (
  hikingSpotId: string,
): Promise<boolean> => {
  try {
    const loggedIn = await isUserLoggedIn();
    if (!loggedIn) {
      throw new Error('User must be logged in to manage favorites');
    }

    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;

    if (!userId) {
      throw new Error('Unable to get user ID');
    }

    // Use the toggle_favorite function from the database
    const { data, error } = await supabase.rpc('toggle_favorite', {
      p_user_id: userId,
      p_hiking_spot_id: hikingSpotId,
    });

    if (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }

    console.log('Favorite toggled successfully:', data);
    return data; // Returns true if favorited, false if unfavorited
  } catch (error) {
    console.error('Error in toggleFavorite:', error);
    throw error;
  }
};

// Check if a hiking spot is favorited by the current user
export const isFavorited = async (hikingSpotId: string): Promise<boolean> => {
  try {
    const loggedIn = await isUserLoggedIn();
    if (!loggedIn) {
      return false;
    }

    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;

    if (!userId) {
      return false;
    }

    // Use the is_favorited function from the database
    const { data, error } = await supabase.rpc('is_favorited', {
      p_user_id: userId,
      p_hiking_spot_id: hikingSpotId,
    });

    if (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error in isFavorited:', error);
    return false;
  }
};

// Get all favorite hiking spots for the current user
export const getUserFavorites = async (): Promise<HikingSpot[]> => {
  try {
    const loggedIn = await isUserLoggedIn();
    if (!loggedIn) {
      return [];
    }

    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;

    if (!userId) {
      return [];
    }

    // Use the view to get favorites with hiking spot details
    const { data, error } = await supabase
      .from('user_favorites_with_details')
      .select('*')
      .eq('user_id', userId)
      .order('favorited_at', { ascending: false });

    if (error) {
      console.error('Error fetching user favorites:', error);
      throw error;
    }

    // Transform the data to match HikingSpot interface
    const favorites: HikingSpot[] = (data || []).map(item => ({
      id: item.hiking_spot_id,
      name: item.name,
      description: item.description,
      latitude: item.latitude,
      longitude: item.longitude,
      difficulty: item.difficulty,
      elevation: item.elevation,
      trail_length: item.trail_length,
      estimated_duration: item.estimated_duration,
      image_url: item.image_url,
      images: item.images || [],
      rating: item.rating,
      review_count: item.review_count,
      favorite_count: item.total_favorites,
      is_favorited: true,
    }));

    console.log('Retrieved user favorites:', favorites.length);
    return favorites;
  } catch (error) {
    console.error('Error in getUserFavorites:', error);
    return [];
  }
};

// Get hiking spots with favorite status for the current user
export const getHikingSpotsWithFavorites = async (): Promise<HikingSpot[]> => {
  try {
    const loggedIn = await isUserLoggedIn();
    let userId = null;

    if (loggedIn) {
      const { data: session } = await supabase.auth.getSession();
      userId = session?.session?.user?.id;
    }

    // Get hiking spots with favorite counts
    const { data, error } = await supabase
      .from('hiking_spots_with_favorites')
      .select('*')
      .order('rating', { ascending: false });

    if (error) {
      console.error('Error fetching hiking spots:', error);
      throw error;
    }

    let hikingSpots: HikingSpot[] = (data || []).map(spot => ({
      id: spot.id,
      name: spot.name,
      description: spot.description,
      latitude: spot.latitude,
      longitude: spot.longitude,
      difficulty: spot.difficulty,
      elevation: spot.elevation,
      trail_length: spot.trail_length,
      estimated_duration: spot.estimated_duration,
      image_url: spot.image_url,
      images: spot.images || [],
      rating: spot.rating,
      review_count: spot.review_count,
      favorite_count: spot.favorite_count,
      is_favorited: false, // Will be updated below if user is logged in
    }));

    // If user is logged in, check which spots are favorited
    if (userId && hikingSpots.length > 0) {
      const spotIds = hikingSpots.map(spot => spot.id);

      const { data: favorites, error: favError } = await supabase
        .from('user_favorites')
        .select('hiking_spot_id')
        .eq('user_id', userId)
        .in('hiking_spot_id', spotIds);

      if (!favError && favorites) {
        const favoritedSpotIds = new Set(
          favorites.map(fav => fav.hiking_spot_id),
        );

        hikingSpots = hikingSpots.map(spot => ({
          ...spot,
          is_favorited: favoritedSpotIds.has(spot.id),
        }));
      }
    }

    console.log('Retrieved hiking spots with favorites:', hikingSpots.length);
    return hikingSpots;
  } catch (error) {
    console.error('Error in getHikingSpotsWithFavorites:', error);
    return [];
  }
};

// Remove a favorite (unfavorite a hiking spot)
export const removeFavorite = async (
  hikingSpotId: string,
): Promise<boolean> => {
  try {
    const loggedIn = await isUserLoggedIn();
    if (!loggedIn) {
      throw new Error('User must be logged in to manage favorites');
    }

    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;

    if (!userId) {
      throw new Error('Unable to get user ID');
    }

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('hiking_spot_id', hikingSpotId);

    if (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }

    console.log('Favorite removed successfully');
    return true;
  } catch (error) {
    console.error('Error in removeFavorite:', error);
    throw error;
  }
};
