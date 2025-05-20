import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
// Comment out or modify this import to avoid attempting to save to server
// import { saveHikeRecord } from './hikeRecordService';

const HIKES_STORAGE_KEY = '@ascentra_hikes';

// Initialize database (no-op for AsyncStorage)
export const initDatabase = async () => {
  console.log('AsyncStorage database initialized');
  return Promise.resolve();
};

// Save hike record to AsyncStorage
export const saveHikeToLocalDB = async (hikeData) => {
  try {
    console.log('Starting local save operation...');
    
    // Check that hikeData has required fields
    if (!hikeData || !hikeData.date || !hikeData.stats || !hikeData.routeCoordinates) {
      throw new Error('Invalid hike data: Missing required fields');
    }
    
    // Get existing hikes
    console.log('Fetching existing hikes from storage...');
    const existingHikesStr = await AsyncStorage.getItem(HIKES_STORAGE_KEY);
    const existingHikes = existingHikesStr ? JSON.parse(existingHikesStr) : [];
    console.log(`Found ${existingHikes.length} existing hikes in storage`);
    
    // Create new hike with ID and synced status
    const newHike = {
      id: Date.now(), // Use timestamp as ID
      date: hikeData.date,
      distance: hikeData.stats.distance,
      duration: hikeData.stats.duration,
      pace: hikeData.stats.pace,
      elevation: hikeData.stats.elevation,
      route_data: JSON.stringify(hikeData.routeCoordinates),
      synced: 0
    };
    
    console.log('Created new hike record with ID:', newHike.id);
    
    // Add to array and save back
    existingHikes.push(newHike);
    console.log('Saving updated hikes list to storage...');
    await AsyncStorage.setItem(HIKES_STORAGE_KEY, JSON.stringify(existingHikes));
    
    console.log('Successfully saved hike to local storage');
    return newHike.id;
  } catch (error) {
    console.error('Error details for local save:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
};

// Get all hikes (synced and unsynced)
export const getAllHikes = async () => {
  try {
    console.log('Getting all hikes from local storage only...');
    const hikesStr = await AsyncStorage.getItem(HIKES_STORAGE_KEY);
    const hikes = hikesStr ? JSON.parse(hikesStr) : [];
    console.log(`Retrieved ${hikes.length} hikes from local storage`);
    return hikes;
  } catch (error) {
    console.error('Error getting all hikes:', error);
    return [];
  }
};

// Get all unsynced hike records
export const getUnsyncedHikes = async () => {
  try {
    const hikesStr = await AsyncStorage.getItem(HIKES_STORAGE_KEY);
    const hikes = hikesStr ? JSON.parse(hikesStr) : [];
    return hikes.filter(hike => hike.synced === 0);
  } catch (error) {
    console.error('Error getting unsynced hikes:', error);
    return [];
  }
};

// Mark hike as synced
export const markHikeAsSynced = async (id) => {
  try {
    const hikesStr = await AsyncStorage.getItem(HIKES_STORAGE_KEY);
    const hikes = hikesStr ? JSON.parse(hikesStr) : [];
    
    const updatedHikes = hikes.map(hike => {
      if (hike.id === id) {
        return { ...hike, synced: 1 };
      }
      return hike;
    });
    
    await AsyncStorage.setItem(HIKES_STORAGE_KEY, JSON.stringify(updatedHikes));
    return true;
  } catch (error) {
    console.error('Error marking hike as synced:', error);
    throw error;
  }
};

// Sync unsynced hikes with server - DISABLED because server table doesn't exist yet
export const syncUnsentHikes = async () => {
  // For now, just report that sync is disabled until server is ready
  console.log('Server sync disabled - database not ready');
  return { 
    success: true, 
    message: 'Server sync is temporarily disabled (database not set up yet)' 
  };
  
  /* Original implementation - commented out
  try {
    const netInfo = await NetInfo.fetch();
    
    if (!netInfo.isConnected) {
      return { success: false, message: 'No internet connection' };
    }
    
    const unsyncedHikes = await getUnsyncedHikes();
    
    if (unsyncedHikes.length === 0) {
      return { success: true, message: 'No hikes to sync' };
    }
    
    let syncedCount = 0;
    let errors = [];
    
    for (const hike of unsyncedHikes) {
      try {
        // Convert from storage format to API format
        const hikeData = {
          date: hike.date,
          routeCoordinates: JSON.parse(hike.route_data),
          stats: {
            distance: hike.distance,
            duration: hike.duration,
            pace: hike.pace,
            elevation: hike.elevation
          }
        };
        
        // Try to save to server
        await saveHikeRecord(hikeData);
        await markHikeAsSynced(hike.id);
        syncedCount++;
      } catch (serverError) {
        console.error(`Server error for hike ${hike.id}:`, serverError);
        errors.push({ hikeId: hike.id, message: serverError.message });
      }
    }
    
    return { 
      success: true, 
      message: `Synced ${syncedCount} of ${unsyncedHikes.length} hikes`,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, message: error.message };
  }
  */
};

// Clear all hikes (for testing)
export const clearAllHikes = async () => {
  try {
    await AsyncStorage.removeItem(HIKES_STORAGE_KEY);
    console.log('All hikes cleared from storage');
    return true;
  } catch (error) {
    console.error('Error clearing hikes:', error);
    return false;
  }
};

// Test function to check storage
export const debugStorage = async () => {
  try {
    const hikesStr = await AsyncStorage.getItem(HIKES_STORAGE_KEY);
    console.log('Raw hikes data in storage:', hikesStr);
    return hikesStr ? JSON.parse(hikesStr) : [];
  } catch (error) {
    console.error('Debug storage error:', error);
    return null;
  }
};