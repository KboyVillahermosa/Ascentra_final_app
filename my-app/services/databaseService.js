import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isUserLoggedIn } from '../utils/supabase';
import { sanitizeRouteCoordinates } from '../utils/mapHelpers';

// Helper function to get current user ID - improved version
export const getCurrentUserId = async () => {
  try {
    // First check if a user is logged in using the isUserLoggedIn utility
    const loggedIn = await isUserLoggedIn();
    
    if (loggedIn) {
      // Get current session from Supabase
      const { data } = await supabase.auth.getSession();
      const userId = data?.session?.user?.id;
      
      if (userId) {
        console.log('User is logged in with ID:', userId);
        return userId;
      }
    }
    
    // If no user is logged in or session retrieval failed, use 'guest'
    console.log('No user logged in, using guest ID');
    return 'guest';
  } catch (error) {
    console.error('Error getting current user:', error);
    return 'guest';
  }
};

// Helper to get user-specific storage key
const getUserHikesKey = async () => {
  const userId = await getCurrentUserId();
  return `@ascentra_hikes_${userId}`;
};

// Debug function
export const debugStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log('All AsyncStorage keys:', keys);
    
    // Show which users have hike data
    const hikeKeys = keys.filter(key => key.startsWith('@ascentra_hikes_'));
    console.log('User hike keys:', hikeKeys);
    
    return true;
  } catch (error) {
    console.error('Error debugging storage:', error);
    return false;
  }
};

// Save hike with user-specific key
export const saveHikeToLocalDB = async (hikeData) => {
  try {
    // Generate ID if not provided
    const hikeId = hikeData.id || Date.now().toString();
    
    // Sanitize route coordinates before saving
    const sanitizedCoordinates = sanitizeRouteCoordinates(hikeData.routeCoordinates);
    console.log(`Sanitized ${hikeData.routeCoordinates?.length || 0} coordinates to ${sanitizedCoordinates.length} valid points`);
    
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
      media: Array.isArray(hikeData.media) ? hikeData.media.map(item => ({
        uri: item.uri,
        type: item.type || (item.uri && item.uri.endsWith('.mp4') ? 'video' : 'image'),
        name: item.name || item.fileName || item.uri.split('/').pop()
      })) : [],
      synced: false, // Track sync status with Supabase
    };
    
    // Get user-specific key
    const userId = await getCurrentUserId();
    const storageKey = `@ascentra_hikes_${userId}`;
    
    // Get existing hikes from AsyncStorage
    const hikesStr = await AsyncStorage.getItem(storageKey);
    let hikes = [];
    if (hikesStr) {
      hikes = JSON.parse(hikesStr);
    }
    
    // Add new hike or update existing
    const existingIndex = hikes.findIndex(h => h.id === hikeId);
    if (existingIndex >= 0) {
      hikes[existingIndex] = hikeToSave;
    } else {
      hikes.push(hikeToSave);
    }
    
    // Save back to AsyncStorage
    await AsyncStorage.setItem(storageKey, JSON.stringify(hikes));
    
    // Try to sync with Supabase
    if (userId !== 'guest') {
      try {
        await syncHikeToSupabase(hikeToSave, userId);
        
        // Mark as synced locally after successful sync
        hikeToSave.synced = true;
        
        // Update the list with synced status
        if (existingIndex >= 0) {
          hikes[existingIndex] = hikeToSave;
        } else {
          // Find the recently added hike
          const newIndex = hikes.findIndex(h => h.id === hikeId);
          if (newIndex >= 0) {
            hikes[newIndex].synced = true;
          }
        }
        
        // Save updated sync status
        await AsyncStorage.setItem(storageKey, JSON.stringify(hikes));
      } catch (syncError) {
        console.error('Failed to sync with Supabase:', syncError);
        // We still saved locally, so no need to throw
      }
    }
    
    console.log(`Hike saved locally with ID: ${hikeId}, includes ${hikeToSave.routeCoordinates.length} route points and ${hikeToSave.media.length} media items`);
    return hikeId;
  } catch (error) {
    console.error('Error saving hike to local DB:', error);
    throw error;
  }
};

// Export the sync function so it can be used by other components
export const syncHikeToSupabase = async (hike, userId) => {
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
      distance: typeof hike.distance === 'number' ? hike.distance : hike.stats?.distance,
      duration: typeof hike.duration === 'number' ? hike.duration : hike.stats?.duration,
      pace: typeof hike.pace === 'number' ? hike.pace : hike.stats?.pace,
      elevation: typeof hike.elevation === 'number' ? hike.elevation : hike.stats?.elevation,
      route_coordinates: hike.routeCoordinates,
      media: hike.media
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
          throw new Error('The "saveactivity" table does not exist in your Supabase database');
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
      const updatedHikes = hikes.map(h => {
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
export const syncAllHikesToSupabase = async () => {
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
    let errors = [];
    
    // Sync each hike
    for (const hike of hikes) {
      try {
        await syncHikeToSupabase(hike, userId);
        
        // Mark as synced
        hike.synced = true;
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync hike ${hike.id}:`, error);
        errors.push({ hikeId: hike.id, error: error.message });
      }
    }
    
    // Save updated sync status
    await AsyncStorage.setItem(storageKey, JSON.stringify(hikes));
    
    return { 
      success: errors.length === 0, 
      synced: syncedCount, 
      total: hikes.length,
      errors: errors
    };
  } catch (error) {
    console.error('Error in bulk sync to Supabase:', error);
    return { success: false, error: error.message };
  }
};

// Fetch hikes from Supabase (useful when user logs in on a new device)
export const fetchHikesFromSupabase = async () => {
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
    const appHikes = data.map(h => ({
      id: h.id,
      title: h.title,
      description: h.description,
      activityType: h.activity_type,
      feeling: h.feeling,
      privateNotes: h.private_notes,
      date: h.date,
      stats: {
        distance: h.distance,
        duration: h.duration,
        pace: h.pace,
        elevation: h.elevation
      },
      routeCoordinates: h.route_coordinates,
      media: h.media,
      synced: true
    }));
    
    // Merge with local hikes
    const storageKey = `@ascentra_hikes_${userId}`;
    const hikesStr = await AsyncStorage.getItem(storageKey);
    let localHikes = hikesStr ? JSON.parse(hikesStr) : [];
    
    // Create a map of existing hike IDs
    const existingHikeIds = new Set(localHikes.map(h => h.id));
    
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
      total: appHikes.length 
    };
  } catch (error) {
    console.error('Error fetching from Supabase:', error);
    return { success: false, error: error.message };
  }
};

// Update the delete function to also delete from Supabase
export const deleteHike = async (hikeId) => {
  try {
    // Get user-specific key
    const userId = await getCurrentUserId();
    const storageKey = `@ascentra_hikes_${userId}`;
    
    // Get current hikes for this user
    const hikesStr = await AsyncStorage.getItem(storageKey);
    if (!hikesStr) {
      throw new Error('No hikes found in storage');
    }
    
    const hikes = JSON.parse(hikesStr);
    
    // Filter out the one to delete
    const updatedHikes = hikes.filter(hike => hike.id !== hikeId);
    
    // Save back to AsyncStorage
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

// Get hikes for a specific user (for profile viewing)
export const getHikesForUser = async (userId) => {
  try {
    // Fall back to current user if no ID provided
    const targetUserId = userId || await getCurrentUserId();
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
export const getHikeById = async (hikeId) => {
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
    const hikes = JSON.parse(hikesStr);
    const hike = hikes.find(h => h.id.toString() === hikeId.toString());
    
    if (!hike) {
      console.log(`Hike with ID ${hikeId} not found`);
      return null;
    }
    
    // Make sure route coordinates are valid
    if (hike.routeCoordinates && Array.isArray(hike.routeCoordinates)) {
      // Use our sanitization utility
      hike.routeCoordinates = sanitizeRouteCoordinates(hike.routeCoordinates);
      
      console.log(`Retrieved hike "${hike.title}" (ID: ${hikeId}) with ${hike.routeCoordinates.length} valid route points`);
      
      // If we have less than 2 points, log a warning
      if (hike.routeCoordinates.length < 2) {
        console.warn(`Warning: Hike ${hikeId} has less than 2 valid coordinates for map display`);
      }
    }
    
    return hike;
  } catch (error) {
    console.error('Error getting hike by ID:', error);
    throw error;
  }
};

// Get all hikes for current user only
export const getAllHikes = async () => {
  try {
    // Get user-specific key
    const userId = await getCurrentUserId();
    const storageKey = `@ascentra_hikes_${userId}`;
    
    console.log('Fetching all hikes with key:', storageKey);
    
    // Get hikes with user-specific key
    const hikesStr = await AsyncStorage.getItem(storageKey);
    
    if (!hikesStr) {
      console.log('No hikes found for current user');
      return [];
    }
    
    const hikes = JSON.parse(hikesStr);
    console.log(`Found ${hikes.length} hikes for current user`);
    
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
          return updatedHikes;
        }
      } catch (syncError) {
        console.warn('Could not sync with Supabase, using local data only:', syncError);
        // Continue with local data if sync fails
      }
    }
    
    return hikes;
  } catch (error) {
    console.error('Error getting hikes from local DB:', error);
    return [];
  }
};