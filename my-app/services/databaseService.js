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
      routeCoordinates: hikeData.routeCoordinates,
      // Explicitly include media with proper object structure
      media: Array.isArray(hikeData.media) ? hikeData.media.map(item => ({
        uri: item.uri,
        type: item.type || (item.uri && item.uri.endsWith('.mp4') ? 'video' : 'image'),
        name: item.name || item.fileName || item.uri.split('/').pop()
      })) : [],
      synced: 1, // Mark as synced to remove badge
    };
    
    // Get user-specific key
    const storageKey = await getUserHikesKey();
    
    // Get existing hikes from AsyncStorage
    const hikesStr = await AsyncStorage.getItem(storageKey);
    let hikes = [];
    if (hikesStr) {
      hikes = JSON.parse(hikesStr);
    }
    
    // Add new hike
    hikes.push(hikeToSave);
    
    // Save back to AsyncStorage with user-specific key
    await AsyncStorage.setItem(storageKey, JSON.stringify(hikes));
    
    console.log(`Hike saved locally with ID: ${hikeId} for user`);
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