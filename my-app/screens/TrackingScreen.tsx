import React, { useState, useEffect, useRef } from 'react';
import type { JSX } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import SafeMapView, {
  SafePolyline,
  SafeMarker,
  PROVIDER_GOOGLE,
} from '../components/SafeMapView';
import * as Location from 'expo-location';
import {
  formatDuration,
  formatPace,
  formatDistance,
} from '../utils/formatters';
import NetInfo from '@react-native-community/netinfo';
import {
  saveHikeToLocalDB,
  getAllHikes,
  getCurrentUserId,
} from '../services/databaseService';
import { isUserLoggedIn } from '../services/supabaseClient';
import HikeStats from '../components/HikeStats';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

// Type definitions

type TrackingScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface TrackingScreenProps {
  navigation: TrackingScreenNavigationProp;
}

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

interface HikeStatsData {
  distance: number; // in meters
  duration: number; // in seconds
  pace: number; // in m/s (for formatPace function)
  elevation: number; // in meters
  currentSpeed: number; // in m/s
}

type SyncStatus = 'checking' | 'ready' | 'local-only' | 'offline';

export default function TrackingScreen({ navigation }: TrackingScreenProps) {
  const [tracking, setTracking] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>(
    [],
  );
  const [stats, setStats] = useState<HikeStatsData>({
    distance: 0, // in meters
    duration: 0, // in seconds
    pace: 0, // in minutes per km
    elevation: 0, // in meters
    currentSpeed: 0, // in m/s
  });
  const [saveModalVisible, setSaveModalVisible] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('checking');

  const mapRef = useRef<any>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0); // For tracking total paused time
  const pauseStartTimeRef = useRef<number | null>(null); // When pause started
  const initialAltitudeRef = useRef<number | null>(null);
  const prevCoordinatesRef = useRef<RouteCoordinate[]>([]);
  const lastValidDistanceRef = useRef<number>(0); // To prevent erroneous distance jumps
  const lastStatsRef = useRef<HikeStatsData>({} as HikeStatsData); // Store stats at pause time
  const paceReadingsRef = useRef<number[]>([]); // To store last 5 speed readings (m/s) for smoothing

  const MIN_SPEED_THRESHOLD = 0.5; // Minimum speed in m/s to consider for pace calculation

  useEffect(() => {
    (async () => {
      // Request both foreground and background permissions
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please grant location permissions to use the tracking feature.',
        );
        navigation.goBack();
        return;
      }

      // Background permissions are optional but helpful
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const { status: backgroundStatus } =
          await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          Alert.alert(
            'Limited Functionality',
            'Background location permission not granted. Tracking may stop when app is in background.',
          );
        }
      }

      // Get initial location with more retries
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setCurrentLocation(location.coords);
        // Store initial altitude
        initialAltitudeRef.current = location.coords.altitude || 0;

        // Pre-populate first coordinate for route drawing
        prevCoordinatesRef.current = [
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        ];
      } catch (error) {
        Alert.alert(
          'Error',
          'Could not get your current location. Please check your GPS settings and try again.',
        );
      }
    })();

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;
      setIsConnected(isConnected);
      updateSyncStatus(isConnected);
    });

    // Check initial connection status
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected ?? false);
    });

    // Check login status
    checkLoginStatus();

    // Cleanup
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      unsubscribe(); // Unsubscribe from network state updates
    };
  }, []);

  // Check if user is logged in
  const checkLoginStatus = async (): Promise<void> => {
    try {
      const loggedIn = await isUserLoggedIn();
      setIsLoggedIn(loggedIn);
      updateSyncStatus(isConnected, loggedIn);
    } catch (error) {
      setIsLoggedIn(false);
      updateSyncStatus(isConnected, false);
    }
  };

  // Update sync status based on connection and login
  const updateSyncStatus = (
    connected: boolean,
    loggedIn: boolean = isLoggedIn,
  ): void => {
    if (!connected) {
      setSyncStatus('offline');
    } else if (!loggedIn) {
      setSyncStatus('local-only');
    } else {
      setSyncStatus('ready');
    }
  };

  const startTracking = async (): Promise<void> => {
    try {
      if (!currentLocation) {
        Alert.alert(
          'Error',
          'Cannot start tracking without location. Please wait for GPS signal.',
        );
        return;
      }

      // Reset values but initialize with current location
      const initialCoord = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      };

      setRouteCoordinates([initialCoord]);
      prevCoordinatesRef.current = [initialCoord];
      lastValidDistanceRef.current = 0;

      const initialStats = {
        distance: 0,
        duration: 0,
        pace: 0,
        elevation: 0,
        currentSpeed: 0,
      };

      // Reset pace readings for new tracking session
      paceReadingsRef.current = [];

      setStats(initialStats);
      lastStatsRef.current = { ...initialStats };

      startTimeRef.current = new Date().getTime();
      pausedTimeRef.current = 0;
      initialAltitudeRef.current = currentLocation.altitude || 0;

      // Use subscription-based tracking
      startLocationTracking();

      // Start timer for duration updates
      startTimer();

      setTracking(true);
      setPaused(false);
    } catch (error) {
      Alert.alert(
        'Error',
        'Could not start tracking. Please check your GPS signal and try again.',
      );
    }
  };

  const startLocationTracking = async (): Promise<void> => {
    // Remove any existing subscription first
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 2, // Update every 2 meters (more frequent)
        timeInterval: 1000, // At least every 1 second
        mayShowUserSettingsDialog: true, // Encourage best settings
      },
      location => {
        if (paused) {
          return;
        } // Don't update if paused

        const { latitude, longitude, altitude, speed } = location.coords;

        setCurrentLocation(location.coords);

        const newCoord = { latitude, longitude };

        // Update route on the map
        setRouteCoordinates(prevCoords => [...prevCoords, newCoord]);

        // Calculate new distance based on the previous coordinate
        if (prevCoordinatesRef.current.length > 0) {
          const lastCoord =
            prevCoordinatesRef.current[prevCoordinatesRef.current.length - 1];

          const newDistance = calculateDistance(
            lastCoord.latitude,
            lastCoord.longitude,
            latitude,
            longitude,
          );

          // Only update if we moved a reasonable distance (reduces GPS jitter)
          // Also check for unrealistic jumps in distance (more than 100m instantly)
          if (newDistance > 1 && newDistance < 100) {
            lastValidDistanceRef.current += newDistance;

            setStats(prevStats => {
              const newTotalDistance = lastValidDistanceRef.current;
              const newDuration = startTimeRef.current
                ? (new Date().getTime() -
                    startTimeRef.current -
                    pausedTimeRef.current) /
                  1000
                : 0;

              // Calculate pace using current speed (more accurate for real-time display)
              let newPace = 0;
              if (speed && speed > MIN_SPEED_THRESHOLD) {
                // Store speed readings for smoothing (formatPace expects m/s)
                paceReadingsRef.current.push(speed);
                // Keep only last 5 readings for smoothing
                if (paceReadingsRef.current.length > 5) {
                  paceReadingsRef.current.shift();
                }

                // Calculate average speed from readings
                const sum = paceReadingsRef.current.reduce((a, b) => a + b, 0);
                newPace = sum / paceReadingsRef.current.length;
              } else if (newTotalDistance > 50 && newDuration > 30) {
                // Fallback: calculate average pace from total distance/time for very slow movement
                const avgSpeedMs = newTotalDistance / newDuration; // m/s
                if (avgSpeedMs > 0.1) {
                  // Only if moving at least 0.1 m/s
                  newPace = avgSpeedMs;
                }
              }

              // Calculate elevation change
              const currentAltitude = location.coords.altitude || 0;
              const elevationChange = initialAltitudeRef.current
                ? Math.max(0, currentAltitude - initialAltitudeRef.current)
                : 0;

              const newStats = {
                distance: newTotalDistance,
                duration: newDuration,
                pace: newPace,
                elevation: elevationChange,
                currentSpeed: speed || 0,
              };

              // Update the last stats reference
              lastStatsRef.current = { ...newStats };

              return newStats;
            });

            // Store the new coordinate for next calculation
            prevCoordinatesRef.current.push(newCoord);
          }
        }

        // Center map on current location
        if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude,
              longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            },
            500,
          );
        }
      },
    );
  };

  const startTimer = (): void => {
    // Clear existing timer if any
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      if (paused) {
        return;
      } // Don't update if paused

      const currentTime = new Date().getTime();
      const elapsedSeconds = startTimeRef.current
        ? (currentTime - startTimeRef.current - pausedTimeRef.current) / 1000
        : 0;

      setStats(prevStats => {
        // Don't recalculate pace here - use the value from location tracking
        // This avoids pace changes when standing still
        const newStats = {
          ...prevStats,
          duration: elapsedSeconds,
          // Keep existing pace from location tracking
        };

        // Update the last stats reference
        lastStatsRef.current = { ...newStats };

        return newStats;
      });
    }, 1000);
  };

  const pauseTracking = (): void => {
    if (paused) {
      // Resume tracking

      // Calculate how long we were paused and add to total pause time
      const pauseDuration = pauseStartTimeRef.current
        ? new Date().getTime() - pauseStartTimeRef.current
        : 0;
      pausedTimeRef.current += pauseDuration;

      // Restart location tracking and timer
      startLocationTracking();
      startTimer();

      setPaused(false);
    } else {
      // Pause tracking

      // Store when we paused
      pauseStartTimeRef.current = new Date().getTime();

      // Stop location updates and timer
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Save current stats
      lastStatsRef.current = { ...stats };

      setPaused(true);
    }
  };

  const stopTracking = (): void => {
    // Clean up all tracking resources
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setTracking(false);
    setPaused(false);

    // Always show save option regardless of route length or distance
    setSaveModalVisible(true);
  };

  // Modify the handleSaveHike function to ensure coordinates are properly formatted
  const handleSaveHike = async (): Promise<void> => {
    try {
      // Make validation less restrictive - allow saving even with minimal data
      if (!routeCoordinates || routeCoordinates.length < 1) {
        // Only require at least one coordinate point
        Alert.alert('Error', 'No tracking data available to save.');
        return;
      }

      // Ensure route coordinates are in the correct format for map display
      const sanitizedCoordinates = routeCoordinates
        .map(coord => ({
          latitude: Number(coord.latitude),
          longitude: Number(coord.longitude),
        }))
        .filter(
          coord =>
            !isNaN(coord.latitude) &&
            !isNaN(coord.longitude) &&
            Math.abs(coord.latitude) <= 90 &&
            Math.abs(coord.longitude) <= 180,
        );

      // Navigate to the SaveActivityScreen with sanitized route coordinates
      navigation.navigate('SaveActivity', {
        routeCoordinates: sanitizedCoordinates,
        stats: {
          distance: stats.distance || 0,
          duration: stats.duration || 0,
          pace: stats.pace || 0,
          elevation: stats.elevation || 0,
        },
        // date: new Date().toISOString(), // Remove this as it's not part of the expected type
        // syncReady: syncStatus === 'ready' // Remove this property as it's not part of the expected type
      });

      // Close the modal
      setSaveModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const handleDiscardHike = (): void => {
    setSaveModalVisible(false);
    navigation.goBack();
  };

  // Replace your calculateDistance function with this more accurate version
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    // More accurate Earth radius calculation based on latitude
    const getEarthRadius = (lat: number): number => {
      // Earth is not a perfect sphere - radius varies by latitude
      const equatorialRadius = 6378137.0; // Earth radius at equator in meters
      const polarRadius = 6356752.3; // Earth radius at poles in meters

      const latRad = (lat * Math.PI) / 180;
      const cos = Math.cos(latRad);
      const sin = Math.sin(latRad);

      // Calculate radius at given latitude
      const numerator =
        Math.pow(equatorialRadius * equatorialRadius * cos, 2) +
        Math.pow(polarRadius * polarRadius * sin, 2);
      const denominator =
        Math.pow(equatorialRadius * cos, 2) + Math.pow(polarRadius * sin, 2);

      return Math.sqrt(numerator / denominator);
    };

    // Average Earth radius for the two points
    const R = (getEarthRadius(lat1) + getEarthRadius(lat2)) / 2;

    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance; // in meters
  };

  const renderStatsSection = (): JSX.Element => {
    return (
      <View style={styles.statsSection}>
        <HikeStats stats={stats} />
      </View>
    );
  };

  // Render sync status indicator in the modal
  const renderSyncStatus = (): JSX.Element => {
    if (syncStatus === 'checking') {
      return (
        <View style={styles.syncStatusContainer}>
          <MaterialIcons name='sync' size={20} color='#757575' />
          <Text style={styles.syncStatusText}>Checking sync status...</Text>
        </View>
      );
    } else if (syncStatus === 'ready') {
      return (
        <View style={styles.syncStatusContainer}>
          <MaterialIcons name='cloud-done' size={20} color='#2E7D32' />
          <Text style={[styles.syncStatusText, { color: '#2E7D32' }]}>
            Will be synced to cloud
          </Text>
        </View>
      );
    } else if (syncStatus === 'local-only') {
      return (
        <View style={styles.syncStatusContainer}>
          <MaterialIcons name='save' size={20} color='#FFA000' />
          <Text style={[styles.syncStatusText, { color: '#FFA000' }]}>
            Saved locally only (not logged in)
          </Text>
        </View>
      );
    } else {
      // offline
      return (
        <View style={styles.syncStatusContainer}>
          <MaterialIcons name='cloud-off' size={20} color='#F44336' />
          <Text style={[styles.syncStatusText, { color: '#F44336' }]}>
            Saved locally only (offline)
          </Text>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor='transparent'
        translucent
      />

      <View style={styles.mapContainer}>
        {currentLocation ? (
          <SafeMapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            showsUserLocation={true}
            followsUserLocation={tracking && !paused}
            scrollEnabled={true}
            zoomEnabled={true}
            showsCompass={true}
            showsScale={true}
            mapType='standard'
          >
            {routeCoordinates.length > 0 && (
              <>
                {/* Background glow effect */}
                <SafePolyline
                  coordinates={routeCoordinates}
                  strokeWidth={8}
                  strokeColor='#2E7D3250' // Semi-transparent primary blue
                  lineCap='round'
                  lineJoin='round'
                  zIndex={1}
                />

                {/* Main route line */}
                <SafePolyline
                  coordinates={routeCoordinates}
                  strokeWidth={5}
                  strokeColor='#2E7D32'
                  lineCap='round'
                  lineJoin='round'
                  zIndex={2}
                />
              </>
            )}

            {/* Start marker with custom callout */}
            {tracking && routeCoordinates.length > 0 && (
              <SafeMarker
                coordinate={routeCoordinates[0]}
                title='Start'
                description='Your journey began here'
                pinColor='green'
              />
            )}

            {/* Distance markers every kilometer */}
            {routeCoordinates.length > 0 &&
              stats.distance >= 1000 &&
              Array.from({ length: Math.floor(stats.distance / 1000) }).map(
                (_, i) => {
                  // Find the coordinate closest to this kilometer mark
                  const targetDistance = (i + 1) * 1000; // 1km, 2km, etc.
                  let distanceSoFar = 0;
                  let markerCoord = routeCoordinates[0];

                  for (let j = 1; j < routeCoordinates.length; j++) {
                    const segmentDistance = calculateDistance(
                      routeCoordinates[j - 1].latitude,
                      routeCoordinates[j - 1].longitude,
                      routeCoordinates[j].latitude,
                      routeCoordinates[j].longitude,
                    );

                    distanceSoFar += segmentDistance;

                    if (distanceSoFar >= targetDistance) {
                      markerCoord = routeCoordinates[j];
                      break;
                    }
                  }

                  return (
                    <SafeMarker
                      key={`km-${i + 1}`}
                      coordinate={markerCoord}
                      anchor={{ x: 0.5, y: 0.5 }}
                    >
                      <View style={styles.kmMarker}>
                        <Text style={styles.kmMarkerText}>{i + 1}</Text>
                      </View>
                    </SafeMarker>
                  );
                },
              )}
          </SafeMapView>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        )}

        {/* Map overlay for current stats summary */}
        {tracking && !paused && (
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayText}>
              <Text style={styles.mapDistanceValue}>
                {(stats.distance / 1000).toFixed(2)}
              </Text>
              <Text style={styles.mapDistanceUnit}> km</Text>
              {' • '}
              {formatDuration(stats.duration)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.statsContainer}>
        <HikeStats stats={stats} />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (tracking) {
              Alert.alert(
                'Stop Tracking?',
                'Are you sure you want to stop tracking? Your current session will be lost unless you save it.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Stop',
                    style: 'destructive',
                    onPress: () => {
                      stopTracking();
                    },
                  },
                ],
              );
            } else {
              navigation.goBack();
            }
          }}
          accessibilityRole='button'
          accessibilityLabel={tracking ? 'Stop tracking' : 'Go back'}
          accessibilityHint={
            tracking
              ? 'Stops current tracking session'
              : 'Returns to previous screen'
          }
        >
          <Ionicons name='arrow-back' size={24} color='white' />
        </TouchableOpacity>

        {!tracking ? (
          <TouchableOpacity
            style={styles.trackButton}
            onPress={startTracking}
            activeOpacity={0.8}
            accessibilityRole='button'
            accessibilityLabel='Start Tracking'
            accessibilityHint='Begins tracking your hike route and statistics'
          >
            <Text style={styles.trackButtonText}>Start Tracking</Text>
            <Ionicons name='play' size={20} color='white' />
          </TouchableOpacity>
        ) : (
          <View style={styles.trackingButtonsContainer}>
            {/* Pause/Resume button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                paused ? styles.resumeButton : styles.pauseButton,
              ]}
              onPress={pauseTracking}
              activeOpacity={0.8}
              accessibilityRole='button'
              accessibilityLabel={paused ? 'Resume' : 'Pause'}
              accessibilityHint={
                paused
                  ? 'Resumes tracking your hike'
                  : 'Pauses tracking your hike'
              }
            >
              <Ionicons
                name={paused ? 'play' : 'pause'}
                size={22}
                color='white'
              />
              <Text style={styles.actionButtonText}>
                {paused ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>

            {/* Stop button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.stopButton]}
              onPress={stopTracking}
              activeOpacity={0.8}
              accessibilityRole='button'
              accessibilityLabel='Stop'
              accessibilityHint='Stops tracking and shows save options'
            >
              <Ionicons name='stop' size={22} color='white' />
              <Text style={styles.actionButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Enhanced Save Modal */}
      <Modal
        animationType='fade'
        transparent={true}
        visible={saveModalVisible}
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save Your Hike</Text>
              <MaterialIcons name='hiking' size={28} color='#2E7D32' />
            </View>

            <View style={styles.modalStatsContainer}>
              <View style={styles.modalStatRow}>
                <View style={styles.modalStatItem}>
                  <Ionicons
                    name='speedometer-outline'
                    size={22}
                    color='#666666'
                  />
                  <Text style={styles.modalStatLabel}>Distance</Text>
                  <Text style={styles.modalStatValue}>
                    {(stats.distance / 1000).toFixed(2)} km
                  </Text>
                </View>

                <View style={styles.modalStatItem}>
                  <Ionicons name='time-outline' size={22} color='#666666' />
                  <Text style={styles.modalStatLabel}>Duration</Text>
                  <Text style={styles.modalStatValue}>
                    {formatDuration(stats.duration)}
                  </Text>
                </View>
              </View>

              <View style={styles.modalStatRow}>
                <View style={styles.modalStatItem}>
                  <MaterialIcons name='speed' size={22} color='#666666' />
                  <Text style={styles.modalStatLabel}>Pace</Text>
                  <Text style={styles.modalStatValue}>
                    {formatPace(stats.pace)}
                  </Text>
                </View>

                <View style={styles.modalStatItem}>
                  <MaterialIcons name='terrain' size={22} color='#666666' />
                  <Text style={styles.modalStatLabel}>Elevation</Text>
                  <Text style={styles.modalStatValue}>
                    {stats.elevation.toFixed(1)}m
                  </Text>
                </View>
              </View>
            </View>

            {/* Add sync status indicator */}
            {renderSyncStatus()}

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.discardButton]}
                onPress={handleDiscardHike}
              >
                <Text style={styles.discardButtonText}>Discard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveHike}
              >
                <Text style={styles.saveButtonText}>Save Hike</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Enhanced Paused overlay */}
      {paused && tracking && (
        <View style={styles.pausedOverlay}>
          <View style={styles.pausedContent}>
            <Text style={styles.pausedText}>PAUSED</Text>
            <View style={styles.pausedStatsContainer}>
              <View style={styles.pausedStatRow}>
                <Ionicons
                  name='speedometer-outline'
                  size={20}
                  color='#2E7D32'
                />
                <Text style={styles.pausedStat}>
                  <Text style={styles.pausedStatValue}>
                    {(stats.distance / 1000).toFixed(2)}
                  </Text>
                  <Text style={styles.pausedStatUnit}> km</Text>
                </Text>
              </View>

              <View style={styles.pausedStatRow}>
                <Ionicons name='time-outline' size={20} color='#2E7D32' />
                <Text style={styles.pausedStat}>
                  {formatDuration(stats.duration)}
                </Text>
              </View>

              <View style={styles.pausedStatRow}>
                <MaterialIcons name='speed' size={20} color='#2E7D32' />
                <Text style={styles.pausedStat}>{formatPace(stats.pace)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.resumeOverlayButton}
              onPress={pauseTracking}
              activeOpacity={0.9}
            >
              <Ionicons name='play' size={24} color='white' />
              <Text style={styles.resumeButtonText}>RESUME</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Connection Status Indicator */}
      {!isConnected && (
        <View style={styles.offlineIndicator}>
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}

      {isConnected && !isLoggedIn && (
        <View style={[styles.offlineIndicator, styles.localOnlyIndicator]}>
          <Text style={styles.offlineText}>Local Only</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F8F5',
  },
  loadingText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  mapOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Light with transparency
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapOverlayText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  mapDistanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  mapDistanceUnit: {
    fontSize: 16,
    color: '#2E7D32',
  },
  statsContainer: {
    backgroundColor: '#FFFFFF', // White background
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F5F8F5',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2E7D3220', // Semi-transparent primary
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackButton: {
    flexDirection: 'row',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  trackingButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 25,
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  resumeButton: {
    backgroundColor: '#2E7D32',
  },
  stopButton: {
    backgroundColor: '#D32F2F',
  },
  trackButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },

  // Updated modal styles for a more professional look
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Lighter overlay
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F8F5',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2E7D32',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  modalStatsContainer: {
    padding: 24,
  },
  modalStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalStatItem: {
    alignItems: 'center',
    width: '48%',
  },
  modalStatLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  modalStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  discardButton: {
    backgroundColor: '#F5F8F5',
    borderRightWidth: 0.5,
    borderRightColor: '#E5E5E5',
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    borderLeftWidth: 0.5,
    borderLeftColor: '#E5E5E5',
  },
  discardButtonText: {
    color: '#666666',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },

  // Paused overlay with forest green theme
  pausedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Lighter overlay
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  pausedContent: {
    width: '85%',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  pausedText: {
    color: '#2E7D32',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 28,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  pausedStatsContainer: {
    backgroundColor: '#F5F8F5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  pausedStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  pausedStat: {
    color: '#333333',
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  pausedStatValue: {
    color: '#333333',
    fontSize: 20,
    fontWeight: 'bold',
  },
  pausedStatUnit: {
    color: '#333333',
    fontSize: 18,
    fontWeight: 'normal',
  },
  resumeOverlayButton: {
    flexDirection: 'row',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  resumeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  offlineIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 30,
    right: 15,
    backgroundColor: '#2E7D32E6', // Primary blue with transparency
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    zIndex: 100,
  },
  offlineText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  kmMarker: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#2E7D32',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  kmMarkerText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2E7D32',
  },

  // Add new styles for sync status
  syncStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  syncStatusText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  localOnlyIndicator: {
    backgroundColor: 'rgba(255, 160, 0, 0.9)', // Amber with transparency
  },
  statsSection: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
});
