import AsyncStorage from '@react-native-async-storage/async-storage';
import { HikingSpot } from '../data/mockHikingSpots';

const CACHE_KEYS = {
  HIKING_SPOTS: 'hiking_spots_cache',
  USER_FAVORITES: 'user_favorites_cache',
  USER_VOTES: 'user_votes_cache',
  LAST_UPDATED: 'cache_last_updated',
};

const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CacheData<T> {
  data: T;
  timestamp: number;
}

class DataCacheManager {
  private memoryCache = new Map<string, any>();

  // Generic cache methods
  async setCache<T>(key: string, data: T): Promise<void> {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now(),
      };

      // Store in memory cache
      this.memoryCache.set(key, cacheData);

      // Store in persistent storage
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  async getCache<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      const memoryData = this.memoryCache.get(key);
      if (memoryData && this.isCacheValid(memoryData.timestamp)) {
        return memoryData.data;
      }

      // Check persistent storage
      const cachedString = await AsyncStorage.getItem(key);
      if (!cachedString) {
        return null;
      }

      const cachedData: CacheData<T> = JSON.parse(cachedString);

      if (this.isCacheValid(cachedData.timestamp)) {
        // Update memory cache
        this.memoryCache.set(key, cachedData);
        return cachedData.data;
      }

      // Cache expired, remove it
      await this.removeCache(key);
      return null;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  async removeCache(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing cache:', error);
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      this.memoryCache.clear();
      const keys = Object.values(CACHE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < CACHE_EXPIRY_TIME;
  }

  // Specific cache methods for hiking spots
  async cacheHikingSpots(spots: HikingSpot[]): Promise<void> {
    await this.setCache(CACHE_KEYS.HIKING_SPOTS, spots);
  }

  async getCachedHikingSpots(): Promise<HikingSpot[] | null> {
    return this.getCache<HikingSpot[]>(CACHE_KEYS.HIKING_SPOTS);
  }

  async cacheUserFavorites(favorites: string[]): Promise<void> {
    await this.setCache(CACHE_KEYS.USER_FAVORITES, favorites);
  }

  async getCachedUserFavorites(): Promise<string[] | null> {
    return this.getCache<string[]>(CACHE_KEYS.USER_FAVORITES);
  }

  async cacheUserVotes(votes: { [key: string]: string }): Promise<void> {
    await this.setCache(CACHE_KEYS.USER_VOTES, votes);
  }

  async getCachedUserVotes(): Promise<{ [key: string]: string } | null> {
    return this.getCache<{ [key: string]: string }>(CACHE_KEYS.USER_VOTES);
  }

  // Preload critical data for faster app startup
  async preloadCriticalData(): Promise<void> {
    try {
      // This runs in background, doesn't block UI
      const [spots, favorites, votes] = await Promise.all([
        this.getCachedHikingSpots(),
        this.getCachedUserFavorites(),
        this.getCachedUserVotes(),
      ]);

      console.log('Preloaded cached data:', {
        spots: spots?.length || 0,
        favorites: favorites?.length || 0,
        votes: Object.keys(votes || {}).length,
      });
    } catch (error) {
      console.error('Error preloading critical data:', error);
    }
  }

  // Get cache statistics for debugging
  async getCacheStats(): Promise<{
    memorySize: number;
    persistentKeys: string[];
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key =>
        Object.values(CACHE_KEYS).includes(key),
      );

      return {
        memorySize: this.memoryCache.size,
        persistentKeys: cacheKeys,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        memorySize: 0,
        persistentKeys: [],
      };
    }
  }
}

// Export singleton instance
export const dataCacheManager = new DataCacheManager();
export { CACHE_KEYS };
