import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import { getHikeById } from '../services/databaseService';
import { formatDistance, formatDuration } from '../utils/formatters';

const { width, height } = Dimensions.get('window');

export default function SaveConfirmationScreen({ navigation, route }) {
  const { hikeId } = route.params;
  const [loading, setLoading] = useState(true);
  const [hike, setHike] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHikeDetails = async () => {
      try {
        setLoading(true);
        // Fetch the saved hike details
        const hikeData = await getHikeById(hikeId);

        if (!hikeData) {
          setError('Could not load activity details');
          return;
        }

        setHike(hikeData);

        // Calculate map region if coordinates exist
        if (hikeData.routeCoordinates && hikeData.routeCoordinates.length > 0) {
          calculateMapRegion(hikeData.routeCoordinates);
        }
      } catch (err) {
        setError('Failed to load activity details');
      } finally {
        setLoading(false);
      }
    };

    fetchHikeDetails();
  }, [hikeId]);

  // Calculate the map region to show the entire route
  const calculateMapRegion = coordinates => {
    if (!coordinates || coordinates.length === 0) {
      return;
    }

    let minLat = coordinates[0].latitude;
    let maxLat = coordinates[0].latitude;
    let minLng = coordinates[0].longitude;
    let maxLng = coordinates[0].longitude;

    coordinates.forEach(coord => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });

    // Add padding
    const latPadding = (maxLat - minLat) * 0.2;
    const lngPadding = (maxLng - minLng) * 0.2;

    setMapRegion({
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat + latPadding, 0.01),
      longitudeDelta: Math.max(maxLng - minLng + lngPadding, 0.01),
    });
  };

  const handleViewDetails = () => {
    navigation.replace('HikeDetail', { hikeId });
  };

  const handleGoToHistory = () => {
    navigation.replace('HikeHistory');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#2E7D32' />
        <Text style={styles.loadingText}>Loading activity details...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name='alert-circle' size={60} color='#D32F2F' />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={handleGoToHistory}
        >
          <Text style={styles.errorButtonText}>Go to Activity History</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='light-content' backgroundColor='#2E7D32' />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity Saved</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleGoToHistory}
        >
          <Ionicons name='close' size={24} color='white' />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.successCard}>
          <View style={styles.iconContainer}>
            <Ionicons name='checkmark-circle' size={60} color='#2E7D32' />
          </View>

          <Text style={styles.successTitle}>Success!</Text>
          <Text style={styles.successText}>
            Your {hike?.activityType || 'activity'} has been saved successfully.
          </Text>

          <View style={styles.statsSummary}>
            <View style={styles.statItem}>
              <Ionicons name='navigate' size={20} color='#2E7D32' />
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>
                {formatDistance(hike?.stats?.distance || 0)}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name='time' size={20} color='#2E7D32' />
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>
                {formatDuration(hike?.stats?.duration || 0)}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name='trending-up' size={20} color='#2E7D32' />
              <Text style={styles.statLabel}>Elevation</Text>
              <Text style={styles.statValue}>
                {(hike?.stats?.elevation || 0).toFixed(0)}m
              </Text>
            </View>
          </View>
        </View>

        {/* Map preview */}
        {hike?.routeCoordinates &&
          hike.routeCoordinates.length > 0 &&
          mapRegion && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={mapRegion}
                showsUserLocation={false}
                showsMyLocationButton={false}
                showsCompass={false}
                zoomEnabled={true}
                rotateEnabled={false}
                scrollEnabled={true}
              >
                {/* Route polyline */}
                <Polyline
                  coordinates={hike.routeCoordinates}
                  strokeWidth={4}
                  strokeColor='#2E7D32'
                  lineCap='round'
                  lineJoin='round'
                />

                {/* Start marker */}
                {hike.routeCoordinates.length > 0 && (
                  <Marker
                    coordinate={hike.routeCoordinates[0]}
                    anchor={{ x: 0.5, y: 0.5 }}
                  >
                    <View style={styles.startMarker}>
                      <View style={styles.startMarkerInner} />
                    </View>
                  </Marker>
                )}

                {/* End marker */}
                {hike.routeCoordinates.length > 0 && (
                  <Marker
                    coordinate={
                      hike.routeCoordinates[hike.routeCoordinates.length - 1]
                    }
                    anchor={{ x: 0.5, y: 0.5 }}
                  >
                    <View style={styles.endMarker}>
                      <View style={styles.endMarkerInner} />
                    </View>
                  </Marker>
                )}
              </MapView>
            </View>
          )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={handleViewDetails}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyButton}
            onPress={handleGoToHistory}
          >
            <Text style={styles.historyButtonText}>Go to Activity History</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F8F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F8F5',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#2E7D32',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  successCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  iconContainer: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  successText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  statsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  statValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  mapContainer: {
    height: height * 0.3,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  detailsButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  historyButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  historyButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  startMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(46, 125, 50, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E7D32',
  },
  endMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(211, 47, 47, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D32F2F',
  },
});
