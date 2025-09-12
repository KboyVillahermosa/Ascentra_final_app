// Production-safe logging utility
// Automatically disables logs in production builds

interface Logger {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

// Create production-safe logger
const createLogger = (): Logger => {
  const isDevelopment = __DEV__;

  return {
    log: (...args: any[]) => {
      if (isDevelopment) {
        console.log(...args);
      }
    },
    warn: (...args: any[]) => {
      if (isDevelopment) {
        console.warn(...args);
      }
    },
    error: (...args: any[]) => {
      // Always log errors, even in production
      console.error(...args);
    },
    info: (...args: any[]) => {
      if (isDevelopment) {
        console.info(...args);
      }
    },
    debug: (...args: any[]) => {
      if (isDevelopment) {
        console.debug(...args);
      }
    },
  };
};

// Export singleton logger instance
export const logger = createLogger();

// Performance logging utility
export const performanceLogger = {
  startTimer: (label: string) => {
    if (__DEV__) {
      console.time(label);
    }
  },
  endTimer: (label: string) => {
    if (__DEV__) {
      console.timeEnd(label);
    }
  },
  mark: (label: string) => {
    if (__DEV__) {
      console.log(`📊 Performance Mark: ${label} at ${Date.now()}`);
    }
  },
};

// Error reporting utility for production
export const errorReporter = {
  captureError: (error: Error, context?: Record<string, any>) => {
    // In production, you would send this to a service like Sentry
    if (!__DEV__) {
      // TODO: Integrate with error reporting service
      // Sentry.captureException(error, { extra: context });
    } else {
      console.error('Error captured:', error, context);
    }
  },
  captureMessage: (
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
  ) => {
    if (!__DEV__) {
      // TODO: Integrate with error reporting service
      // Sentry.captureMessage(message, level);
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`);
    }
  },
};

// Network logging utility
export const networkLogger = {
  logRequest: (url: string, method: string, data?: any) => {
    if (__DEV__) {
      console.log(`🌐 ${method} ${url}`, data ? { data } : '');
    }
  },
  logResponse: (url: string, status: number, data?: any) => {
    if (__DEV__) {
      const emoji = status >= 200 && status < 300 ? '✅' : '❌';
      console.log(`${emoji} ${status} ${url}`, data ? { data } : '');
    }
  },
  logError: (url: string, error: Error) => {
    if (__DEV__) {
      console.error(`🚫 Network Error ${url}:`, error);
    } else {
      errorReporter.captureError(error, { url, type: 'network_error' });
    }
  },
};

export default logger;
