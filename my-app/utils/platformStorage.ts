import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Platform-aware storage utility that uses SecureStore on native platforms
 * and AsyncStorage on web platform for compatibility
 */
class PlatformStorage {
  /**
   * Store a key-value pair securely
   */
  static async setItemAsync(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.log('Error saving item:', error);
      throw error;
    }
  }

  /**
   * Retrieve a value by key
   */
  static async getItemAsync(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.log('Error getting item:', error);
      return null;
    }
  }

  /**
   * Delete a key-value pair
   */
  static async deleteItemAsync(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.log('Error deleting item:', error);
      throw error;
    }
  }

  /**
   * Check if a key exists
   */
  static async hasItemAsync(key: string): Promise<boolean> {
    try {
      const value = await this.getItemAsync(key);
      return value !== null;
    } catch (error) {
      console.log('Error checking item existence:', error);
      return false;
    }
  }

  /**
   * Clear all stored items (use with caution)
   */
  static async clearAsync(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.clear();
      } else {
        // SecureStore doesn't have a clear all method
        // This would need to be implemented by tracking keys
        console.warn('Clear all not implemented for SecureStore');
      }
    } catch (error) {
      console.log('Error clearing storage:', error);
      throw error;
    }
  }
}

export default PlatformStorage;
