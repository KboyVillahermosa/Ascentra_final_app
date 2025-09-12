import { InteractionManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static startTimes: Map<string, number> = new Map();
  private static metrics: Map<string, number[]> = new Map();

  static startTimer(label: string): void {
    this.startTimes.set(label, Date.now());
  }

  static endTimer(label: string): number {
    const startTime = this.startTimes.get(label);
    if (!startTime) {
      return 0;
    }

    const duration = Date.now() - startTime;

    // Store metrics for analysis
    const existing = this.metrics.get(label) || [];
    existing.push(duration);
    this.metrics.set(label, existing.slice(-10)); // Keep last 10 measurements

    this.startTimes.delete(label);
    return duration;
  }

  static getAverageTime(label: string): number {
    const times = this.metrics.get(label) || [];
    if (times.length === 0) {
      return 0;
    }
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  static logMetrics(): void {
    console.log('Performance Metrics:');
    this.metrics.forEach((times, label) => {
      const avg = this.getAverageTime(label);
      console.log(
        `${label}: ${avg.toFixed(2)}ms (avg of ${times.length} measurements)`,
      );
    });
  }
}

// Lazy loading utilities
export const runAfterInteractions = (callback: () => void): void => {
  InteractionManager.runAfterInteractions(callback);
};

// Memory management
export const clearUnusedCache = async (): Promise<void> => {
  try {
    // Clear old cached data that's no longer needed
    const keys = await AsyncStorage.getAllKeys();
    const oldKeys = keys.filter(key => {
      // Remove cache entries older than 7 days
      if (key.includes('cache_')) {
        const timestamp = key.split('_').pop();
        if (timestamp) {
          const cacheTime = parseInt(timestamp, 10);
          const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          return cacheTime < weekAgo;
        }
      }
      return false;
    });

    if (oldKeys.length > 0) {
      await AsyncStorage.multiRemove(oldKeys);
      console.log(`Cleared ${oldKeys.length} old cache entries`);
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

// Bundle splitting utilities
export const preloadCriticalScreens = (): void => {
  // Preload critical screens after initial render
  runAfterInteractions(() => {
    // These imports will be bundled separately and loaded on demand
    import('../screens/ProfileScreen');
    import('../screens/HikingSpotDetailsScreen');
    import('../screens/TrackingScreen');
    import('../screens/HikeHistoryScreen');
  });
};

// Enhanced lazy loading with priority
export const lazyLoadWithPriority = (
  importFn: () => Promise<any>,
  priority: 'high' | 'medium' | 'low' = 'medium',
): Promise<any> => {
  const delay = priority === 'high' ? 0 : priority === 'medium' ? 100 : 500;

  return new Promise(resolve => {
    setTimeout(() => {
      runAfterInteractions(() => {
        importFn().then(resolve);
      });
    }, delay);
  });
};

// Component preloading queue
class PreloadQueue {
  private queue: (() => Promise<any>)[] = [];
  private isProcessing = false;
  private maxConcurrent = 2;
  private processing = 0;

  add(importFn: () => Promise<any>): void {
    this.queue.push(importFn);
    this.process();
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.processing >= this.maxConcurrent) {
      return;
    }

    const importFn = this.queue.shift();
    if (!importFn) {
      return;
    }

    this.processing++;
    this.isProcessing = true;

    try {
      await importFn();
    } catch (error) {
      console.warn('Preload error:', error);
    } finally {
      this.processing--;
      this.isProcessing = false;

      // Process next item
      if (this.queue.length > 0) {
        setTimeout(() => this.process(), 50);
      }
    }
  }
}

export const preloadQueue = new PreloadQueue();

// Image optimization
export const optimizeImageLoading = {
  // Reduce image quality for thumbnails
  thumbnailQuality: 0.7,

  // Lazy load images with intersection observer
  shouldLoadImage: (
    isVisible: boolean,
    priority: 'high' | 'medium' | 'low' = 'medium',
  ): boolean => {
    if (priority === 'high') {
      return true;
    }
    if (priority === 'low' && !isVisible) {
      return false;
    }
    return isVisible;
  },

  // Progressive image loading
  getImageUri: (
    uri: string,
    quality: 'thumbnail' | 'medium' | 'full' = 'medium',
  ): string => {
    if (!uri) {
      return '';
    }

    // Add quality parameters for supported image services
    const qualityParams = {
      thumbnail: 'w=150&h=150&q=70',
      medium: 'w=400&h=400&q=80',
      full: 'q=90',
    };

    const separator = uri.includes('?') ? '&' : '?';
    return `${uri}${separator}${qualityParams[quality]}`;
  },
};

// Network optimization
export const networkOptimizations = {
  // Batch API requests
  batchRequests: <T>(
    requests: Promise<T>[],
    batchSize: number = 5,
  ): Promise<T[]> => {
    const batches: Promise<T>[][] = [];
    for (let i = 0; i < requests.length; i += batchSize) {
      batches.push(requests.slice(i, i + batchSize));
    }

    return batches.reduce(
      async (acc, batch) => {
        const results = await acc;
        const batchResults = await Promise.all(batch);
        return [...results, ...batchResults];
      },
      Promise.resolve([] as T[]),
    );
  },

  // Request deduplication
  requestCache: new Map<string, Promise<any>>(),

  dedupedRequest: <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
    if (networkOptimizations.requestCache.has(key)) {
      return networkOptimizations.requestCache.get(key)!;
    }

    const request = Promise.resolve(requestFn()).finally(() => {
      // Remove from cache after completion
      setTimeout(() => {
        networkOptimizations.requestCache.delete(key);
      }, 5000); // Cache for 5 seconds
    });

    networkOptimizations.requestCache.set(key, request);
    return request;
  },
};

// Startup optimization
export const initializeApp = async (): Promise<void> => {
  try {
    // Import memory optimization utilities
    const { MemoryManager } = await import('./memoryOptimization');

    // Clear old cache on startup
    await clearUnusedCache();
    await MemoryManager.clearUnusedData();

    // Start memory monitoring
    MemoryManager.startMemoryMonitoring();

    // Preload critical screens after a delay
    setTimeout(() => {
      preloadCriticalScreens();
    }, 2000);

    // Initialize performance monitoring
    PerformanceMonitor.startTimer('app_ready');

    console.log('App initialization complete with enhanced optimizations');
  } catch (error) {
    console.error('App initialization error:', error);
  }
};

// Platform-specific optimizations
export const platformOptimizations = {
  isAndroid: Platform.OS === 'android',
  isIOS: Platform.OS === 'ios',

  // Android-specific optimizations
  android: {
    // Use native driver for animations
    useNativeDriver: true,

    // Optimize list rendering
    getItemLayout: (itemHeight: number) => (data: any, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
  },

  // iOS-specific optimizations
  ios: {
    // Use native driver for animations
    useNativeDriver: true,

    // Optimize scroll performance
    scrollEventThrottle: 16,
  },
};
