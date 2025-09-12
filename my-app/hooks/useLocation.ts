import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

interface UseLocationOptions {
  accuracy?: Location.Accuracy;
  distanceInterval?: number;
  timeInterval?: number;
  background?: boolean;
}

interface UseLocationReturn {
  location: Location.LocationObject | null;
  error: string | null;
  tracking: boolean;
  requestPermissions: () => Promise<boolean>;
  getInitialLocation: () => Promise<Location.LocationObject | null>;
  startTracking: () => Promise<boolean>;
  stopTracking: () => boolean;
}

export default function useLocation(
  options: UseLocationOptions = {},
): UseLocationReturn {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<boolean>(false);
  const watchId = useRef<Location.LocationSubscription | null>(null);

  const defaultOptions: UseLocationOptions = {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 5, // meters
    timeInterval: 1000, // milliseconds
  };

  const mergedOptions = { ...defaultOptions, ...options };

  useEffect(() => {
    return () => {
      if (watchId.current) {
        watchId.current.remove();
      }
    };
  }, []);

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Location permission not granted');
        return false;
      }

      // For background tracking (if needed)
      if (options.background) {
        const { status: backgroundStatus } =
          await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.warn('Background location permission not granted');
        }
      }

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const getInitialLocation =
    async (): Promise<Location.LocationObject | null> => {
      try {
        const hasPermission = await requestPermissions();

        if (!hasPermission) {
          return null;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: mergedOptions.accuracy,
        });

        setLocation(currentLocation);
        return currentLocation;
      } catch (err: any) {
        setError(err.message);
        return null;
      }
    };

  const startTracking = async (): Promise<boolean> => {
    try {
      const hasPermission = await requestPermissions();

      if (!hasPermission) {
        return false;
      }

      watchId.current = await Location.watchPositionAsync(
        {
          accuracy: mergedOptions.accuracy,
          distanceInterval: mergedOptions.distanceInterval,
          timeInterval: mergedOptions.timeInterval,
        },
        (newLocation: Location.LocationObject) => {
          setLocation(newLocation);
        },
      );

      setTracking(true);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const stopTracking = (): boolean => {
    if (watchId.current) {
      watchId.current.remove();
      watchId.current = null;
      setTracking(false);
      return true;
    }
    return false;
  };

  return {
    location,
    error,
    tracking,
    requestPermissions,
    getInitialLocation,
    startTracking,
    stopTracking,
  };
}
