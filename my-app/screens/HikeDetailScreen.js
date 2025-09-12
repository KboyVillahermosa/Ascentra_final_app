import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatPace,
} from '../utils/formatters';
import { getHikeById } from '../services/databaseService';

const { width } = Dimensions.get('window');

export default function HikeDetailScreen({ route, navigation }) {
  const { hikeId } = route.params;
  const [hike, setHike] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('hybrid'); // Changed from 'standard' to 'hybrid'

  // Load hike data
  useEffect(() => {
    async function loadHikeData() {
      try {
        setLoading(true);
        const hikeData = await getHikeById(hikeId);

        if (!hikeData) {
          alert('Hike not found');
          navigation.goBack();
          return;
        }

        setHike(hikeData);
      } catch (error) {
        alert('Failed to load hike details');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }

    loadHikeData();
  }, [hikeId]);

  // Calculate map region based on route coordinates
  const getMapRegion = () => {
    if (!hike?.routeCoordinates?.length) {
      return {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    // Find min/max coordinates to set boundaries
    let minLat = hike.routeCoordinates[0].latitude;
    let maxLat = hike.routeCoordinates[0].latitude;
    let minLng = hike.routeCoordinates[0].longitude;
    let maxLng = hike.routeCoordinates[0].longitude;

    hike.routeCoordinates.forEach(coord => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });

    // Add padding
    const latPadding = (maxLat - minLat) * 0.2;
    const lngPadding = (maxLng - minLng) * 0.2;

    // Log coordinates for debugging

    // Log the calculated region
    const region = {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat + latPadding, 0.01),
      longitudeDelta: Math.max(maxLng - minLng + lngPadding, 0.01),
    };

    return region;
  };

  // Toggle map type
  const toggleMapType = () => {
    setMapType(mapType === 'standard' ? 'satellite' : 'standard');
  };

  // Get activity icon based on type
  const getActivityIcon = () => {
    switch (hike?.activityType) {
      case 'Trail Running':
        return 'walk';
      case 'Mountain Biking':
        return 'bicycle';
      case 'Backpacking':
        return 'pin';
      case 'Rock Climbing':
        return 'trending-up';
      case 'Snowshoeing':
        return 'snow';
      case 'Exploring':
        return 'compass';
      default:
        return 'footsteps';
    }
  };

  // First, let's add more debugging to validate your coordinates data
  useEffect(() => {
    if (hike?.routeCoordinates?.length) {
      // Check if coordinates are valid numbers
      const hasInvalidCoords = hike.routeCoordinates.some(
        coord => isNaN(coord.latitude) || isNaN(coord.longitude),
      );

      if (hasInvalidCoords) {
        // Invalid coordinates detected
      }
    }
  }, [hike]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle='light-content' backgroundColor='#2E7D32' />
        <ActivityIndicator size='large' color='#2E7D32' />
        <Text style={styles.loadingText}>Loading activity details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='light-content' backgroundColor='#2E7D32' />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color='white' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{hike.title}</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name='share-outline' size={24} color='white' />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Activity type badge */}
        <View style={styles.activityBadgeContainer}>
          <View style={styles.activityBadge}>
            <Ionicons name={getActivityIcon()} size={16} color='white' />
            <Text style={styles.activityBadgeText}>
              {hike.activityType || 'Hiking'}
            </Text>
          </View>
          <Text style={styles.dateText}>{formatDate(hike.date)}</Text>
        </View>

        {/* Map with route */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={getMapRegion()}
            mapType={mapType}
            showsUserLocation={false}
            minZoomLevel={10} // Force a reasonable zoom level
            onMapReady={() => {
              // Map is ready
            }}
          >
            {/* Add a simple marker at the map center for reference */}
            <Marker
              coordinate={getMapRegion()}
              pinColor='blue'
              title='Map Center'
            />

            {/* Add more visible route lines with higher contrast colors */}
            {hike.routeCoordinates?.length > 1 && (
              <>
                {/* Background track */}
                <Polyline
                  coordinates={hike.routeCoordinates}
                  strokeWidth={12} // Very thick
                  strokeColor='rgba(0, 0, 0, 0.5)' // Black background for contrast
                  lineCap='round'
                  lineJoin='round'
                  zIndex={1}
                />

                {/* Main visible track */}
                <Polyline
                  coordinates={hike.routeCoordinates}
                  strokeWidth={8} // Thicker
                  strokeColor='#4CAF50' // Brighter green for visibility
                  lineCap='round'
                  lineJoin='round'
                  zIndex={2}
                />
              </>
            )}

            {/* Add more visible markers for start/end */}
            {hike.routeCoordinates?.length > 0 && (
              <Marker coordinate={hike.routeCoordinates[0]} title='Start'>
                <View
                  style={[styles.startMarker, { backgroundColor: 'green' }]}
                >
                  <Ionicons name='flag' size={16} color='white' />
                </View>
              </Marker>
            )}

            {hike.routeCoordinates?.length > 1 && (
              <Marker
                coordinate={
                  hike.routeCoordinates[hike.routeCoordinates.length - 1]
                }
                title='End'
              >
                <View style={[styles.endMarker, { backgroundColor: 'red' }]}>
                  <Ionicons name='flag-checkered' size={16} color='white' />
                </View>
              </Marker>
            )}
          </MapView>

          {/* Map type toggle button */}
          <TouchableOpacity
            style={styles.mapTypeButton}
            onPress={toggleMapType}
          >
            <Ionicons
              name={mapType === 'standard' ? 'earth' : 'map'}
              size={20}
              color='white'
            />
          </TouchableOpacity>
        </View>

        {/* Stats cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name='navigate' size={22} color='#2E7D32' />
              <Text style={styles.statValue}>
                {formatDistance(hike.distance)}
              </Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name='time' size={22} color='#2E7D32' />
              <Text style={styles.statValue}>
                {formatDuration(hike.duration)}
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name='speedometer' size={22} color='#2E7D32' />
              <Text style={styles.statValue}>{formatPace(hike.pace)}</Text>
              <Text style={styles.statLabel}>Pace</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name='trending-up' size={22} color='#2E7D32' />
              <Text style={styles.statValue}>
                {(hike.elevation || 0).toFixed(0)} m
              </Text>
              <Text style={styles.statLabel}>Elevation Gain</Text>
            </View>
          </View>
        </View>

        {/* Description section */}
        {hike.description ? (
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Details</Text>
            <Text style={styles.description}>{hike.description}</Text>
          </View>
        ) : null}

        {/* Feelings section */}
        {hike.feeling ? (
          <View style={styles.feelingContainer}>
            <View style={styles.feelingHeader}>
              <Ionicons
                name={
                  hike.feeling === 'Great'
                    ? 'happy'
                    : hike.feeling === 'Good'
                      ? 'smile'
                      : hike.feeling === 'Okay'
                        ? 'thumbs-up'
                        : hike.feeling === 'Tired'
                          ? 'sad'
                          : 'thumbs-down'
                }
                size={22}
                color='#2E7D32'
              />
              <Text style={styles.feelingTitle}>How it felt</Text>
            </View>
            <Text style={styles.feelingText}>{hike.feeling}</Text>
          </View>
        ) : null}

        {/* Private notes section */}
        {hike.privateNotes ? (
          <View style={styles.privateNotesContainer}>
            <View style={styles.privateNotesHeader}>
              <Ionicons name='lock-closed' size={18} color='#666' />
              <Text style={styles.privateNotesTitle}>Private Notes</Text>
            </View>
            <Text style={styles.privateNotes}>{hike.privateNotes}</Text>
          </View>
        ) : null}

        {/* Media gallery */}
        {hike.media && hike.media.length > 0 ? (
          <View style={styles.mediaContainer}>
            <Text style={styles.sectionTitle}>Photos & Videos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.mediaScroll}
              contentContainerStyle={styles.mediaScrollContent}
            >
              {hike.media.map((media, index) => {
                const isVideo =
                  media.type === 'video' ||
                  (media.uri && media.uri.endsWith('.mp4'));

                return (
                  <View key={index} style={styles.mediaItem}>
                    <Image
                      source={{ uri: media.uri }}
                      style={styles.mediaImage}
                      resizeMode='cover'
                    />

                    {isVideo && (
                      <View style={styles.videoIndicator}>
                        <Ionicons name='play' size={24} color='white' />
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#2E7D32',
  },
  header: {
    height: Platform.OS === 'ios' ? 90 : 60 + StatusBar.currentHeight,
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  shareButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  activityBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  activityBadgeText: {
    fontSize: 14,
    color: 'white',
    marginLeft: 6,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  mapContainer: {
    height: 300,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapTypeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  endMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  statsContainer: {
    margin: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  descriptionContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  feelingContainer: {
    margin: 16,
    marginTop: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  feelingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feelingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  feelingText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '500',
  },
  privateNotesContainer: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  privateNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  privateNotesTitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  privateNotes: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  mediaContainer: {
    margin: 16,
    marginTop: 0,
  },
  mediaScroll: {
    marginTop: 8,
  },
  mediaScrollContent: {
    paddingRight: 16,
  },
  mediaItem: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E7D32',
    borderWidth: 1,
    borderColor: 'white',
  },
});
