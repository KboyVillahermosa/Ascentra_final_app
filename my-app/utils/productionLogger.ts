import { logger } from './logger';

/**
 * Production-safe logger that conditionally logs based on environment
 * Replaces direct console.log usage throughout the app
 */
export class ProductionLogger {
  private static isDevelopment = __DEV__;

  /**
   * Log info messages (only in development)
   */
  static info(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      logger.info(message, ...args);
    }
  }

  /**
   * Log warning messages (development + production)
   */
  static warn(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.warn(message, ...args);
    } else {
      // In production, send to error reporting service
      logger.warn(message, ...args);
    }
  }

  /**
   * Log error messages (development + production)
   */
  static error(message: string, error?: Error, context?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.error(message, error, context);
    } else {
      // In production, send to error reporting service
      logger.error(message, error, context);
    }
  }

  /**
   * Log debug messages (only in development)
   */
  static debug(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Performance timing (only in development)
   */
  static time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  /**
   * End performance timing (only in development)
   */
  static timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  /**
   * Network request logging (only in development)
   */
  static network(method: string, url: string, status?: number, data?: any): void {
    if (this.isDevelopment) {
      const statusText = status ? `[${status}]` : '';
      console.log(`🌐 ${method} ${url} ${statusText}`, data || '');
    }
  }

  /**
   * User action logging (development + analytics in production)
   */
  static userAction(action: string, data?: Record<string, any>): void {
    if (this.isDevelopment) {
      console.log(`👤 User Action: ${action}`, data || '');
    } else {
      // In production, send to analytics service
      // Analytics.track(action, data);
    }
  }
}

// Convenience exports
export const pLog = ProductionLogger;
export default ProductionLogger;