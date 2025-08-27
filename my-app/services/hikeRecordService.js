import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { Alert, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const HIKE_RECORDS_KEY = 'hike_records_';

// Get the current user's ID
const getCurrentUserId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id;
};

// Get the storage key for the current user
const getUserStorageKey = async () => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User is not authenticated');
  return `${HIKE_RECORDS_KEY}${userId}`;
};

// Get all hike records for the current user
export const getHikeRecords = async () => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    
    // Fetch from Supabase
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching hike records:', error);
    // Fallback to local storage if Supabase fails
    const storageKey = await getUserStorageKey();
    const recordsJson = await AsyncStorage.getItem(storageKey);
    return recordsJson ? JSON.parse(recordsJson) : [];
  }
};

// Mock implementation to replace actual API calls for now
export const saveHikeRecord = async (hikeData) => {
  console.log('Mock server save - no actual API call made');
  console.log('Hike data that would be sent:', hikeData.date, `${hikeData.stats.distance}m`);
  
  // Return a successful response without making actual network request
  return {
    id: Date.now(),
    success: true,
    message: 'Hike saved successfully (mock)'
  };
  
  /* 
  // COMMENTED OUT - Real implementation for when API is ready
  try {
    const response = await fetch('YOUR_API_URL/hikes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(hikeData),
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
  */
};

// Delete a hike record by ID
export const deleteHikeRecord = async (hikeId) => {
  try {
    const storageKey = await getUserStorageKey();
    const existingRecords = await getHikeRecords();
    const updatedRecords = existingRecords.filter(record => record.id !== hikeId);
    
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedRecords));
    return true;
  } catch (error) {
    console.error('Error deleting hike record:', error);
    throw error;
  }
};

// Get a single hike record by ID
export const getHikeRecordById = async (hikeId) => {
  try {
    const records = await getHikeRecords();
    return records.find(record => record.id === hikeId) || null;
  } catch (error) {
    console.error('Error getting hike record by ID:', error);
    throw error;
  }
};