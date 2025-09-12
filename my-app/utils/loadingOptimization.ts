import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataCacheManager } from './dataCache';

// AbortController polyfill for React Native
if (typeof global.AbortController === 'undefined') {
  global.AbortController = class {
    signal = {
      aborted: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    abort() {
      this.signal.aborted = true;
    }
  } as any;
}

// Extended RequestInit interface for our custom options
interface ExtendedRequestInit extends RequestInit {
  timeout?: number;
  useCache?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
}

// Timeout configuration
export const TIMEOUTS = {
  FAST: 3000, // 3 seconds for quick operations
  MEDIUM: 8000, // 8 seconds for normal operations
  SLOW: 15000, // 15 seconds for heavy operations
  CRITICAL: 30000, // 30 seconds for critical operations
};

// Network status tracking
class NetworkStatusManager {
  private static instance: NetworkStatusManager;
  private isOnline: boolean = true;
  private retryQueue: Array<() => Promise<any>> = [];
  private maxRetries: number = 3;

  static getInstance(): NetworkStatusManager {
    if (!NetworkStatusManager.instance) {
      NetworkStatusManager.instance = new NetworkStatusManager();
    }
    return NetworkStatusManager.instance;
  }

  setOnlineStatus(status: boolean) {
    this.isOnline = status;
    if (status && this.retryQueue.length > 0) {
      this.processRetryQueue();
    }
  }

  isNetworkAvailable(): boolean {
    return this.isOnline;
  }

  addToRetryQueue(operation: () => Promise<any>) {
    if (this.retryQueue.length < 10) {
      // Limit queue size
      this.retryQueue.push(operation);
    }
  }

  private async processRetryQueue() {
    const queue = [...this.retryQueue];
    this.retryQueue = [];

    for (const operation of queue) {
      try {
        await operation();
      } catch (error) {
        console.warn('Retry operation failed:', error);
      }
    }
  }
}

// Enhanced loading hook with timeout and error handling
export function useAsyncOperation<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const execute = useCallback(
    async (
      operation: () => Promise<T>,
      options: {
        timeout?: number;
        maxRetries?: number;
        showErrorAlert?: boolean;
        fallbackData?: T;
        onError?: (error: Error) => void;
      } = {},
    ) => {
      const {
        timeout = TIMEOUTS.MEDIUM,
        maxRetries = 3,
        showErrorAlert = false,
        fallbackData,
        onError,
      } = options;

      setLoading(true);
      setError(null);

      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Operation timed out after ${timeout}ms`));
          }, timeout);
        });

        // Race between operation and timeout
        const result = await Promise.race([operation(), timeoutPromise]);

        setData(result);
        setRetryCount(0);
        return result;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Unknown error occurred');
        console.error('Async operation failed:', error);

        setError(error);

        // Handle retries
        if (retryCount < maxRetries) {
          console.log(
            `Retrying operation... Attempt ${retryCount + 1}/${maxRetries}`,
          );
          setRetryCount(prev => prev + 1);

          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          setTimeout(() => {
            execute(operation, options);
          }, delay);

          return null;
        }

        // Use fallback data if available
        if (fallbackData !== undefined) {
          console.log('Using fallback data due to error:', error.message);
          setData(fallbackData);
          return fallbackData;
        }

        // Show error alert if requested
        if (showErrorAlert) {
          Alert.alert('Operation Failed', error.message, [
            { text: 'OK' },
            {
              text: 'Retry',
              onPress: () => {
                setRetryCount(0);
                execute(operation, options);
              },
            },
          ]);
        }

        // Call custom error handler
        if (onError) {
          onError(error);
        }

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [retryCount],
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
    setRetryCount(0);
  }, []);

  return {
    loading,
    error,
    data,
    retryCount,
    execute,
    reset,
  };
}

// Optimized data fetching with caching
class DataCache {
  private static instance: DataCache;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> =
    new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): DataCache {
    if (!DataCache.instance) {
      DataCache.instance = new DataCache();
    }
    return DataCache.instance;
  }

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    const isExpired = Date.now() - item.timestamp > item.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  delete(key: string) {
    this.cache.delete(key);
  }
}

// Enhanced fetch with caching and error handling
export async function optimizedFetch<T>(
  url: string,
  options: ExtendedRequestInit = {},
): Promise<T> {
  const {
    timeout = TIMEOUTS.MEDIUM,
    useCache = true,
    cacheKey = url,
    cacheTTL,
    ...fetchOptions
  } = options;

  const cache = DataCache.getInstance();
  const networkManager = NetworkStatusManager.getInstance();

  // Check cache first
  if (useCache) {
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('Returning cached data for:', cacheKey);
      return cachedData;
    }
  }

  // Check network status
  if (!networkManager.isNetworkAvailable()) {
    throw new Error('No network connection available');
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache successful response
    if (useCache) {
      cache.set(cacheKey, data, cacheTTL);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }

    throw error;
  }
}

// Preload critical resources
export const preloadCriticalData = async (): Promise<void> => {
  try {
    // Use the data cache manager for better performance
    await dataCacheManager.preloadCriticalData();

    // Preload any additional critical endpoints if needed
    const criticalEndpoints: string[] = [
      // Add your critical API endpoints here if any
    ];

    if (criticalEndpoints.length > 0) {
      const preloadPromises = criticalEndpoints.map(endpoint =>
        optimizedFetch(endpoint, {
          method: 'GET',
          priority: 'high',
        }),
      );

      await Promise.allSettled(preloadPromises);
    }

    console.log('Critical data preloaded successfully');
  } catch (error) {
    console.error('Error preloading critical data:', error);
  }
};

// Export instances
export const networkManager = NetworkStatusManager.getInstance();
export const dataCache = DataCache.getInstance();
