import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabase';

// Helper function to get current user ID
const getCurrentUserId = async () => {
  try {
    // Get current session from Supabase
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    
    // If no user is logged in, use 'guest' as the ID
    return userId || 'guest';
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
      // Make sure route coordinates are saved
      routeCoordinates: hikeData.routeCoordinates || [],
      // Media
      media: Array.isArray(hikeData.media) ? hikeData.media.map(item => ({
        uri: item.uri,
        type: item.type || (item.uri && item.uri.endsWith('.mp4') ? 'video' : 'image'),
        name: item.name || item.fileName || item.uri.split('/').pop()
      })) : [],
      synced: 1, // Mark as synced to remove badge
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
    
    // Add new hike
    hikes.push(hikeToSave);
    
    // Save back to AsyncStorage
    await AsyncStorage.setItem(storageKey, JSON.stringify(hikes));
    
    console.log(`Hike saved locally with ID: ${hikeId}, includes ${hikeToSave.routeCoordinates.length} route points and ${hikeToSave.media.length} media items`);
    return hikeId;
  } catch (error) {
    console.error('Error saving hike to local DB:', error);
    throw error;
  }
};

// Get all hikes for current user only
export const getAllHikes = async () => {
  try {
    // Get user-specific key
    const storageKey = await getUserHikesKey();
    
    // Get hikes with user-specific key
    const hikesStr = await AsyncStorage.getItem(storageKey);
    
    if (!hikesStr) {
      return [];
    }
    
    return JSON.parse(hikesStr);
  } catch (error) {
    console.error('Error getting hikes from local DB:', error);
    return [];
  }
};

// Also update the delete function (used in HikeHistoryScreen)
export const deleteHike = async (hikeId) => {
  try {
    // Get user-specific key
    const storageKey = await getUserHikesKey();
    
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
      // Filter out any invalid coordinates
      hike.routeCoordinates = hike.routeCoordinates.filter(coord => {
        return coord && 
               typeof coord.latitude === 'number' && 
               typeof coord.longitude === 'number' &&
               !isNaN(coord.latitude) && 
               !isNaN(coord.longitude) &&
               Math.abs(coord.latitude) <= 90 &&
               Math.abs(coord.longitude) <= 180;
      });
      
      console.log(`Sanitized route coordinates: ${hike.routeCoordinates.length} valid points`);
    }

    // If we have coordinates, make sure to stringify and reparse to fix any odd data issues
    if (hike.routeCoordinates && hike.routeCoordinates.length > 0) {
      try {
        const temp = JSON.parse(JSON.stringify(hike.routeCoordinates));
        hike.routeCoordinates = temp;
      } catch (e) {
        console.error('Failed to sanitize coordinates:', e);
      }
    }
    
    console.log(`Retrieved hike: ${hike.title} with ${hike.routeCoordinates?.length || 0} route points`);
    return hike;
  } catch (error) {
    console.error('Error getting hike by ID:', error);
    throw error;
  }
};