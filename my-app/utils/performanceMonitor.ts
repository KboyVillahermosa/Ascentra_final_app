import { InteractionManager, Platform } from 'react-native';
import { useEffect, useRef, useState } from 'react';

// Performance polyfill for React Native
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    getEntriesByName: () => [],
    getEntriesByType: () => [],
    clearMarks: () => {},
    clearMeasures: () => {},
  } as any;
}

// Type declarations for performance API
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

// Performance metrics interface
interface PerformanceMetrics {
  screenLoadTime: number;
  renderTime: number;
  interactionTime: number;
  memoryUsage?: number;
  jsHeapSize?: number;
}

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  SCREEN_LOAD: 2000, // 2 seconds
  RENDER_TIME: 100, // 100ms
  INTERACTION: 50, // 50ms
  MEMORY_WARNING: 100, // 100MB
};

// Performance monitoring class
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private startTimes: Map<string, number> = new Map();
  private isEnabled: boolean = __DEV__; // Only enable in development

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start timing a screen load
  startScreenLoad(screenName: string) {
    if (!this.isEnabled) {
      return;
    }

    const startTime = Date.now();
    this.startTimes.set(`screen_${screenName}`, startTime);
    console.log(`📊 Started timing screen load: ${screenName}`);
  }

  // End timing a screen load
  endScreenLoad(screenName: string) {
    if (!this.isEnabled) {
      return;
    }

    const endTime = Date.now();
    const startTime = this.startTimes.get(`screen_${screenName}`);

    if (startTime) {
      const loadTime = endTime - startTime;
      this.recordMetric(screenName, {
        screenLoadTime: loadTime,
        renderTime: 0,
        interactionTime: 0,
      });

      // Log performance warning if slow
      if (loadTime > PERFORMANCE_THRESHOLDS.SCREEN_LOAD) {
        console.warn(
          `⚠️ Slow screen load detected: ${screenName} took ${loadTime}ms`,
        );
      } else {
        console.log(`✅ Screen loaded: ${screenName} in ${loadTime}ms`);
      }

      this.startTimes.delete(`screen_${screenName}`);
    }
  }

  // Start timing a render operation
  startRender(componentName: string) {
    if (!this.isEnabled) {
      return;
    }

    const startTime = performance.now();
    this.startTimes.set(`render_${componentName}`, startTime);
  }

  // End timing a render operation
  endRender(componentName: string) {
    if (!this.isEnabled) {
      return;
    }

    const endTime = performance.now();
    const startTime = this.startTimes.get(`render_${componentName}`);

    if (startTime) {
      const renderTime = endTime - startTime;

      if (renderTime > PERFORMANCE_THRESHOLDS.RENDER_TIME) {
        console.warn(
          `⚠️ Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`,
        );
      }

      this.startTimes.delete(`render_${componentName}`);
    }
  }

  // Record interaction timing
  recordInteraction(interactionName: string, duration: number) {
    if (!this.isEnabled) {
      return;
    }

    if (duration > PERFORMANCE_THRESHOLDS.INTERACTION) {
      console.warn(
        `⚠️ Slow interaction: ${interactionName} took ${duration.toFixed(2)}ms`,
      );
    }
  }

  // Record performance metric
  private recordMetric(key: string, metric: PerformanceMetrics) {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metrics = this.metrics.get(key)!;
    metrics.push(metric);

    // Keep only last 10 metrics to prevent memory leaks
    if (metrics.length > 10) {
      metrics.shift();
    }
  }

  // Get performance summary
  getPerformanceSummary(): Record<string, any> {
    if (!this.isEnabled) {
      return {};
    }

    const summary: Record<string, any> = {};

    this.metrics.forEach((metrics, key) => {
      const avgLoadTime =
        metrics.reduce((sum, m) => sum + m.screenLoadTime, 0) / metrics.length;
      const maxLoadTime = Math.max(...metrics.map(m => m.screenLoadTime));
      const minLoadTime = Math.min(...metrics.map(m => m.screenLoadTime));

      summary[key] = {
        averageLoadTime: Math.round(avgLoadTime),
        maxLoadTime,
        minLoadTime,
        sampleCount: metrics.length,
      };
    });

    return summary;
  }

  // Clear all metrics
  clearMetrics() {
    this.metrics.clear();
    this.startTimes.clear();
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
}

// React hook for screen performance monitoring
export function useScreenPerformance(screenName: string) {
  const monitor = PerformanceMonitor.getInstance();
  const mountTime = useRef<number>(Date.now());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Start monitoring when component mounts
    monitor.startScreenLoad(screenName);

    // Wait for interactions to complete
    const interactionPromise = InteractionManager.runAfterInteractions(() => {
      const readyTime = Date.now();
      const totalTime = readyTime - mountTime.current;

      monitor.endScreenLoad(screenName);
      setIsReady(true);

      console.log(
        `🎯 Screen ${screenName} ready for interaction in ${totalTime}ms`,
      );
    });

    return () => {
      interactionPromise.cancel();
    };
  }, [screenName, monitor]);

  return { isReady };
}

// React hook for component render performance
export function useRenderPerformance(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();
  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
    monitor.startRender(componentName);
  });

  useEffect(() => {
    const renderEndTime = performance.now();
    const renderDuration = renderEndTime - renderStartTime.current;

    monitor.endRender(componentName);
    monitor.recordInteraction(`${componentName}_render`, renderDuration);
  });
}

// Memory monitoring utilities
export function getMemoryUsage(): number | null {
  if (Platform.OS === 'web' && 'memory' in performance) {
    // @ts-ignore - performance.memory is available in Chrome
    return performance.memory?.usedJSHeapSize || null;
  }
  return null;
}

export function monitorMemoryUsage() {
  if (!__DEV__) {
    return;
  }

  const checkMemory = () => {
    const memoryUsage = getMemoryUsage();
    if (memoryUsage) {
      const memoryMB = memoryUsage / (1024 * 1024);

      if (memoryMB > PERFORMANCE_THRESHOLDS.MEMORY_WARNING) {
        console.warn(`⚠️ High memory usage detected: ${memoryMB.toFixed(2)}MB`);
      }
    }
  };

  // Check memory every 30 seconds
  const interval = setInterval(checkMemory, 30000);

  return () => clearInterval(interval);
}

// Bundle size analyzer (development only)
export function analyzeBundleSize() {
  if (!__DEV__) {
    return;
  }

  console.log('📦 Bundle Analysis:');
  console.log('- React Native version:', Platform.Version);
  console.log('- Platform:', Platform.OS);
  console.log('- Development mode:', __DEV__);

  // Log loaded modules count (approximation)
  if (typeof require !== 'undefined' && (require as any).getModules) {
    const modules = (require as any).getModules();
    console.log('- Loaded modules:', Object.keys(modules).length);
  }
}

// Performance optimization suggestions
export function getOptimizationSuggestions(): string[] {
  const suggestions: string[] = [];
  const monitor = PerformanceMonitor.getInstance();
  const summary = monitor.getPerformanceSummary();

  Object.entries(summary).forEach(([screen, metrics]) => {
    if (metrics.averageLoadTime > PERFORMANCE_THRESHOLDS.SCREEN_LOAD) {
      suggestions.push(
        `Consider optimizing ${screen} - average load time: ${metrics.averageLoadTime}ms`,
      );
    }

    if (metrics.maxLoadTime > PERFORMANCE_THRESHOLDS.SCREEN_LOAD * 2) {
      suggestions.push(
        `${screen} has inconsistent performance - max load time: ${metrics.maxLoadTime}ms`,
      );
    }
  });

  if (suggestions.length === 0) {
    suggestions.push('Performance looks good! 🎉');
  }

  return suggestions;
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-start memory monitoring in development
if (__DEV__) {
  monitorMemoryUsage();
  analyzeBundleSize();
}
