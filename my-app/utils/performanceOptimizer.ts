import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { Dimensions, PixelRatio } from 'react-native';

/**
 * Performance optimization utilities for React Native apps
 */

// Debounce hook for expensive operations
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for scroll events and frequent updates
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
}

// Memoized screen dimensions
export const useScreenDimensions = () => {
  return useMemo(() => {
    const { width, height } = Dimensions.get('window');
    const pixelRatio = PixelRatio.get();
    
    return {
      width,
      height,
      pixelRatio,
      isTablet: width >= 768,
      isSmallScreen: width < 375,
    };
  }, []);
};

// Image optimization helper
export const optimizeImageUri = (uri: string, width: number, height: number) => {
  const pixelRatio = PixelRatio.get();
  const optimalWidth = Math.round(width * pixelRatio);
  const optimalHeight = Math.round(height * pixelRatio);
  
  // Add image optimization parameters if using a CDN
  if (uri.includes('supabase') || uri.includes('cloudinary')) {
    return `${uri}?w=${optimalWidth}&h=${optimalHeight}&q=80&f=webp`;
  }
  
  return uri;
};

// Memory cleanup utility
export class MemoryManager {
  private static timers: Set<NodeJS.Timeout> = new Set();
  private static intervals: Set<NodeJS.Timeout> = new Set();
  
  static setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      callback();
      this.timers.delete(timer);
    }, delay);
    
    this.timers.add(timer);
    return timer;
  }
  
  static setInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }
  
  static clearTimeout(timer: NodeJS.Timeout): void {
    clearTimeout(timer);
    this.timers.delete(timer);
  }
  
  static clearInterval(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    this.intervals.delete(interval);
  }
  
  static cleanup(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.intervals.forEach(interval => clearInterval(interval));
    this.timers.clear();
    this.intervals.clear();
  }
}

// Component performance tracker
export const useRenderTracker = (componentName: string) => {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());
  
  useEffect(() => {
    renderCount.current += 1;
    const renderTime = Date.now() - startTime.current;
    
    if (__DEV__ && renderCount.current > 10) {
      console.warn(
        `${componentName} has rendered ${renderCount.current} times in ${renderTime}ms. Consider optimization.`
      );
    }
  });
  
  return renderCount.current;
};

// Lazy loading helper for heavy components
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) => {
  return React.lazy(importFunc);
};

// Bundle size analyzer (development only)
export const analyzeBundleSize = () => {
  if (__DEV__) {
    const modules = require.cache;
    const moduleCount = Object.keys(modules).length;
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
    
    console.log('Bundle Analysis:', {
      moduleCount,
      memoryUsage: `${(memoryUsage / 1024 / 1024).toFixed(2)} MB`,
      timestamp: new Date().toISOString(),
    });
  }
};

export default {
  useDebounce,
  useThrottle,
  useScreenDimensions,
  optimizeImageUri,
  MemoryManager,
  useRenderTracker,
  createLazyComponent,
  analyzeBundleSize,
};