import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Memory management utilities for better app performance
export class MemoryManager {
  private static memoryWarningListeners: (() => void)[] = [];
  private static isLowMemoryMode = false;
  private static memoryUsageThreshold = 0.8; // 80% memory usage threshold

  // Register memory warning listener
  static addMemoryWarningListener(callback: () => void): void {
    this.memoryWarningListeners.push(callback);
  }

  // Remove memory warning listener
  static removeMemoryWarningListener(callback: () => void): void {
    const index = this.memoryWarningListeners.indexOf(callback);
    if (index > -1) {
      this.memoryWarningListeners.splice(index, 1);
    }
  }

  // Trigger memory warning callbacks
  static triggerMemoryWarning(): void {
    this.isLowMemoryMode = true;
    this.memoryWarningListeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.warn('Memory warning callback error:', error);
      }
    });
  }

  // Check if in low memory mode
  static isInLowMemoryMode(): boolean {
    return this.isLowMemoryMode;
  }

  // Reset low memory mode
  static resetLowMemoryMode(): void {
    this.isLowMemoryMode = false;
  }

  // Force garbage collection (if available)
  static forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
    }
  }

  // Clear unused caches and data
  static async clearUnusedData(): Promise<void> {
    try {
      // Clear old AsyncStorage entries
      const keys = await AsyncStorage.getAllKeys();
      const oldKeys = keys.filter(key => {
        if (key.includes('temp_') || key.includes('cache_')) {
          return true;
        }
        return false;
      });

      if (oldKeys.length > 0) {
        await AsyncStorage.multiRemove(oldKeys);
        console.log(`Cleared ${oldKeys.length} temporary storage entries`);
      }

      // Force garbage collection
      this.forceGarbageCollection();
    } catch (error) {
      console.error('Error clearing unused data:', error);
    }
  }

  // Optimize images for memory usage
  static getOptimizedImageSize(
    originalWidth: number,
    originalHeight: number,
    maxSize: number = 800,
  ): { width: number; height: number } {
    if (this.isLowMemoryMode) {
      maxSize = Math.min(maxSize, 400); // Reduce max size in low memory mode
    }

    const aspectRatio = originalWidth / originalHeight;

    if (originalWidth > originalHeight) {
      return {
        width: Math.min(originalWidth, maxSize),
        height: Math.min(originalWidth, maxSize) / aspectRatio,
      };
    } else {
      return {
        width: Math.min(originalHeight, maxSize) * aspectRatio,
        height: Math.min(originalHeight, maxSize),
      };
    }
  }

  // Get memory-optimized list rendering props
  static getListOptimizationProps(itemCount: number) {
    const baseProps = {
      removeClippedSubviews: true,
      maxToRenderPerBatch: this.isLowMemoryMode ? 5 : 10,
      updateCellsBatchingPeriod: this.isLowMemoryMode ? 100 : 50,
      initialNumToRender: this.isLowMemoryMode ? 5 : 10,
      windowSize: this.isLowMemoryMode ? 5 : 10,
    };

    // Adjust based on item count
    if (itemCount > 1000) {
      return {
        ...baseProps,
        maxToRenderPerBatch: 3,
        initialNumToRender: 3,
        windowSize: 3,
      };
    }

    return baseProps;
  }

  // Monitor memory usage (simplified)
  static startMemoryMonitoring(): void {
    if (Platform.OS === 'android') {
      // On Android, we can use performance.memory if available
      const checkMemory = () => {
        if (global.performance && (global.performance as any).memory) {
          const memoryInfo = (global.performance as any).memory;
          const usageRatio =
            memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;

          if (usageRatio > this.memoryUsageThreshold && !this.isLowMemoryMode) {
            this.triggerMemoryWarning();
          } else if (usageRatio < 0.5 && this.isLowMemoryMode) {
            this.resetLowMemoryMode();
          }
        }
      };

      // Check memory every 30 seconds
      setInterval(checkMemory, 30000);
    }
  }
}

// Image cache management
export class ImageCacheManager {
  private static cache = new Map<
    string,
    { data: any; timestamp: number; size: number }
  >();
  private static maxCacheSize = 50 * 1024 * 1024; // 50MB
  private static currentCacheSize = 0;

  static addToCache(key: string, data: any, size: number): void {
    // Remove old entries if cache is full
    while (
      this.currentCacheSize + size > this.maxCacheSize &&
      this.cache.size > 0
    ) {
      this.removeOldestEntry();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size,
    });
    this.currentCacheSize += size;
  }

  static getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry is too old (1 hour)
    if (Date.now() - entry.timestamp > 60 * 60 * 1000) {
      this.removeFromCache(key);
      return null;
    }

    return entry.data;
  }

  static removeFromCache(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentCacheSize -= entry.size;
      this.cache.delete(key);
    }
  }

  private static removeOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.removeFromCache(oldestKey);
    }
  }

  static clearCache(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
  }

  static getCacheStats(): { size: number; count: number; maxSize: number } {
    return {
      size: this.currentCacheSize,
      count: this.cache.size,
      maxSize: this.maxCacheSize,
    };
  }
}

// Initialize memory monitoring
MemoryManager.startMemoryMonitoring();

// Add memory warning listener to clear caches
MemoryManager.addMemoryWarningListener(() => {
  console.log('Memory warning triggered - clearing caches');
  ImageCacheManager.clearCache();
  MemoryManager.clearUnusedData();
});
