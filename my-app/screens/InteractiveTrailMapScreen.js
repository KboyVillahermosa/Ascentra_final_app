import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { WebView } from 'react-native-webview';
import SafeMapView, {
  SafeMarker,
  SafePolyline,
  PROVIDER_GOOGLE,
} from '../components/SafeMapView';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import {
  TRAILS_DATA,
  calculateDistance,
  calculateTravelTime,
  getDifficultyColor,
  getTrailsNearLocation,
} from '../services/trailService';

const { width, height } = Dimensions.get('window');

const InteractiveTrailMapScreen = ({ navigation, route }) => {
  const { hikingSpot, coordinates } = route.params || {};
  const [userLocation, setUserLocation] = useState(null);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [travelInfo, setTravelInfo] = useState(null);
  const [travelMode, setTravelMode] = useState('driving'); // 'driving' or 'walking'
  const [loading, setLoading] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [nearbyTrails, setNearbyTrails] = useState(TRAILS_DATA);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [selectedTravelMode, setSelectedTravelMode] = useState('driving');
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    getCurrentLocation();

    // If hiking spot coordinates are provided, filter trails near that location
    if (coordinates && hikingSpot) {
      const trailsNearSpot = getTrailsNearLocation(coordinates, 10); // 10km radius
      setNearbyTrails(trailsNearSpot);

      // Center map on hiking spot after a short delay
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            },
            1000,
          );
        }
      }, 500);
    }

    // Cleanup search timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [coordinates, hikingSpot]);

  const fitToAllTrails = useCallback(() => {
    if (mapRef.current && nearbyTrails.length > 0) {
      const coordinates = nearbyTrails.flatMap(trail => [
        trail.startPoint,
        trail.endPoint,
        ...trail.coordinates,
      ]);

      if (userLocation) {
        coordinates.push({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        });
      }

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [nearbyTrails, userLocation]);

  const debouncedSearch = useCallback(query => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      // Determine base trails to search from
      const baseTrails =
        coordinates && hikingSpot
          ? getTrailsNearLocation(coordinates, 10)
          : TRAILS_DATA;

      if (query.trim() === '') {
        setNearbyTrails(baseTrails);
      } else {
        const filtered = baseTrails.filter(
          trail =>
            (trail.name &&
              trail.name.toLowerCase().includes(query.toLowerCase())) ||
            (trail.location &&
              trail.location.toLowerCase().includes(query.toLowerCase())) ||
            (trail.difficulty &&
              trail.difficulty.toLowerCase().includes(query.toLowerCase())),
        );
        setNearbyTrails(filtered);
      }
    }, 300);
  }, []);

  const handleSearchChange = useCallback(
    text => {
      setSearchQuery(text);
      debouncedSearch(text);
    },
    [debouncedSearch],
  );

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      setLocationError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        Alert.alert(
          'Permission Denied',
          'Location permission is required to show your position and calculate distances.',
        );
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 10000,
      });

      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      setUserLocation(userCoords);

      // Load nearby trails based on user location
      const nearby = getTrailsNearLocation(
        location.coords.latitude,
        location.coords.longitude,
        50, // 50km radius
      );
      setNearbyTrails(nearby);

      setLocationLoading(false);
    } catch (error) {
      setLocationError('Failed to get location');
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please check your GPS and try again.',
      );
      setLocationLoading(false);
    }
  };

  const handleTrailPress = useCallback(
    trail => {
      setSelectedTrail(trail);
      setModalVisible(true);

      // Animate to trail location with smooth transition
      if (mapRef.current) {
        const region = {
          latitude: trail.startPoint.latitude,
          longitude: trail.startPoint.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        mapRef.current.animateToRegion(region, 1000);
      }

      if (userLocation) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          trail.startPoint.latitude,
          trail.startPoint.longitude,
        );

        const travelTimes = calculateTravelTime(distance);

        setTravelInfo({
          distance: distance.toFixed(1),
          ...travelTimes,
        });
      }
    },
    [userLocation],
  );

  const renderTrailModal = () => {
    if (!selectedTrail) {
      return null;
    }

    return (
      <Modal
        animationType='slide'
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedTrail.name}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name='close' size={24} color='#666' />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Trail Rating */}
              {selectedTrail.rating && (
                <View style={styles.ratingSection}>
                  <View style={styles.ratingRow}>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Ionicons
                          key={star}
                          name={
                            star <= selectedTrail.rating
                              ? 'star'
                              : 'star-outline'
                          }
                          size={16}
                          color='#FFD700'
                        />
                      ))}
                    </View>
                    <Text style={styles.ratingText}>
                      {selectedTrail.rating} ({selectedTrail.reviews} reviews)
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.trailInfo}>
                <View style={styles.infoRow}>
                  <Ionicons
                    name='fitness'
                    size={20}
                    color={getDifficultyColor(selectedTrail.difficulty)}
                  />
                  <Text
                    style={[
                      styles.difficultyText,
                      { color: getDifficultyColor(selectedTrail.difficulty) },
                    ]}
                  >
                    {selectedTrail.difficulty}
                  </Text>
                  {selectedTrail.trailType && (
                    <Text style={styles.trailTypeText}>
                      {' '}
                      • {selectedTrail.trailType}
                    </Text>
                  )}
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name='walk' size={20} color='#666' />
                  <Text style={styles.infoText}>{selectedTrail.distance}</Text>
                  {selectedTrail.distanceKm && (
                    <Text style={styles.subInfoText}>
                      {' '}
                      ({selectedTrail.distanceKm} km)
                    </Text>
                  )}
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name='time' size={20} color='#666' />
                  <Text style={styles.infoText}>
                    {selectedTrail.estimatedTime}
                  </Text>
                </View>

                {selectedTrail.elevationGain && (
                  <View style={styles.infoRow}>
                    <Ionicons name='trending-up' size={20} color='#666' />
                    <Text style={styles.infoText}>
                      {selectedTrail.elevationGain}
                    </Text>
                    {selectedTrail.elevationGainM && (
                      <Text style={styles.subInfoText}>
                        {' '}
                        ({selectedTrail.elevationGainM}m)
                      </Text>
                    )}
                  </View>
                )}

                {selectedTrail.bestTime && (
                  <View style={styles.infoRow}>
                    <Ionicons name='sunny' size={20} color='#666' />
                    <Text style={styles.infoText}>
                      Best time: {selectedTrail.bestTime}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.descriptionText}>
                {selectedTrail.description}
              </Text>

              {/* Trail Features */}
              {selectedTrail.features && selectedTrail.features.length > 0 && (
                <View style={styles.featuresSection}>
                  <Text style={styles.sectionTitle}>Trail Features</Text>
                  <View style={styles.featuresContainer}>
                    {selectedTrail.features.map((feature, index) => (
                      <View key={index} style={styles.featureTag}>
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {travelInfo && (
                <View style={styles.travelSection}>
                  <Text style={styles.sectionTitle}>
                    Travel from Your Location
                  </Text>

                  {/* Travel Mode Selector */}
                  <View style={styles.travelModeSelector}>
                    <TouchableOpacity
                      style={[
                        styles.travelModeButton,
                        selectedTravelMode === 'driving' &&
                          styles.activeTravelMode,
                      ]}
                      onPress={() => setSelectedTravelMode('driving')}
                    >
                      <Ionicons
                        name='car'
                        size={20}
                        color={
                          selectedTravelMode === 'driving' ? '#fff' : '#2196F3'
                        }
                      />
                      <Text
                        style={[
                          styles.travelModeText,
                          selectedTravelMode === 'driving' &&
                            styles.activeTravelModeText,
                        ]}
                      >
                        Drive
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.travelModeButton,
                        selectedTravelMode === 'cycling' &&
                          styles.activeTravelMode,
                      ]}
                      onPress={() => setSelectedTravelMode('cycling')}
                    >
                      <Ionicons
                        name='bicycle'
                        size={20}
                        color={
                          selectedTravelMode === 'cycling' ? '#fff' : '#9C27B0'
                        }
                      />
                      <Text
                        style={[
                          styles.travelModeText,
                          selectedTravelMode === 'cycling' &&
                            styles.activeTravelModeText,
                        ]}
                      >
                        Cycle
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.travelModeButton,
                        selectedTravelMode === 'walking' &&
                          styles.activeTravelMode,
                      ]}
                      onPress={() => setSelectedTravelMode('walking')}
                    >
                      <Ionicons
                        name='walk'
                        size={20}
                        color={
                          selectedTravelMode === 'walking' ? '#fff' : '#FF9800'
                        }
                      />
                      <Text
                        style={[
                          styles.travelModeText,
                          selectedTravelMode === 'walking' &&
                            styles.activeTravelModeText,
                        ]}
                      >
                        Walk
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.travelInfo}>
                    <View style={styles.travelRow}>
                      <Ionicons name='location' size={20} color='#4CAF50' />
                      <Text style={styles.travelText}>
                        Distance: {travelInfo.distance} km
                      </Text>
                    </View>

                    {/* Show selected travel mode info prominently */}
                    <View style={[styles.travelRow, styles.selectedTravelRow]}>
                      <Ionicons
                        name={
                          selectedTravelMode === 'driving'
                            ? 'car'
                            : selectedTravelMode === 'cycling'
                              ? 'bicycle'
                              : 'walk'
                        }
                        size={24}
                        color={
                          selectedTravelMode === 'driving'
                            ? '#2196F3'
                            : selectedTravelMode === 'cycling'
                              ? '#9C27B0'
                              : '#FF9800'
                        }
                      />
                      <Text style={styles.selectedTravelText}>
                        {selectedTravelMode === 'driving'
                          ? travelInfo.drivingTime
                          : selectedTravelMode === 'cycling'
                            ? travelInfo.cyclingTime
                            : travelInfo.walkingTime}
                      </Text>
                    </View>
                  </View>

                  {selectedTrail.distanceFromUser && (
                    <View style={styles.proximityInfo}>
                      <Text style={styles.proximityText}>
                        {selectedTrail.distanceFromUser < 5
                          ? 'Very close to you!'
                          : selectedTrail.distanceFromUser < 20
                            ? 'Nearby trail'
                            : 'Distant trail'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => {
                  setModalVisible(false);
                  // Navigate to detailed trail view or start navigation
                  navigation.navigate('HikingSpotDetails', {
                    spot: selectedTrail,
                  });
                }}
              >
                <Text style={styles.exploreButtonText}>Explore Trail</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#4CAF50' />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Interactive Map</Text>
        <Text style={styles.headerSubtitle}>
          Mt. Babag Trail - Cebu, Philippines
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        {webViewLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size='large' color='#4CAF50' />
            <Text style={styles.loadingText}>Loading Interactive Map...</Text>
          </View>
        )}
        <WebView
          source={{
            html: `
               <!DOCTYPE html>
               <html>
                 <head>
                   <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
                   <meta name="format-detection" content="telephone=no">
                   <style>
                     * { box-sizing: border-box; }
                     body { 
                       margin: 0; 
                       padding: 0; 
                       overflow: hidden;
                       background: #f5f5f5;
                     }
                     iframe { 
                       width: 100%; 
                       height: 100vh; 
                       border: 0;
                       display: block;
                     }
                     .loading {
                       position: absolute;
                       top: 50%;
                       left: 50%;
                       transform: translate(-50%, -50%);
                       color: #4CAF50;
                       font-family: Arial, sans-serif;
                     }
                   </style>
                 </head>
                 <body>
                   <div class="loading" id="loading">Loading Map...</div>
                   <iframe 
                     src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3922.4306059537753!2d124.81873757463775!3d10.545437489589647!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x330775001eaf1739%3A0x97b27e1210cff7e9!2sMt.%20Babag!5e0!3m2!1sen!2sph!4v1756551626096!5m2!1sen!2sph" 
                     width="100%" 
                     height="100%" 
                     style="border:0;" 
                     allowfullscreen="" 
                     loading="lazy" 
                     referrerpolicy="no-referrer-when-downgrade"
                     onload="document.getElementById('loading').style.display='none'">
                   </iframe>
                 </body>
               </html>
             `,
          }}
          style={[styles.map, { opacity: webViewLoading ? 0 : 1 }]}
          onLoadStart={() => setWebViewLoading(true)}
          onLoadEnd={() => setWebViewLoading(false)}
          onError={() => setWebViewLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          cacheEnabled={true}
          cacheMode='LOAD_CACHE_ELSE_NETWORK'
          mixedContentMode='compatibility'
          thirdPartyCookiesEnabled={false}
          sharedCookiesEnabled={false}
          startInLoadingState={false}
          androidLayerType='hardware'
        />
      </View>

      {/* Trail Reference Link */}
      <View style={styles.trailReference}>
        <TouchableOpacity
          style={styles.referenceButton}
          onPress={() => {
            // Open Trailforks link in browser
            const url = 'https://www.trailforks.com/trails/mt-babag-to-napo';
            // You can implement linking here if needed
          }}
        >
          <Ionicons name='link' size={16} color='#4CAF50' />
          <Text style={styles.referenceText}>View on Trailforks</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  waypointMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  trailReference: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  referenceButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    gap: 8,
  },
  referenceText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
  },
  ratingSection: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  trailInfo: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  difficultyText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  trailTypeText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  infoText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  subInfoText: {
    fontSize: 14,
    color: '#999',
  },
  featuresSection: {
    marginBottom: 20,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTag: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  featureText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  travelSection: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  travelInfo: {
    gap: 8,
  },
  travelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  travelText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  proximityInfo: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    alignItems: 'center',
  },
  proximityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  travelModeSelector: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  travelModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeTravelMode: {
    backgroundColor: '#4CAF50',
  },
  travelModeText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeTravelModeText: {
    color: '#fff',
  },
  selectedTravelRow: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  selectedTravelText: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  exploreButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  hikingSpotMarker: {
    width: 40,
    height: 40,
    backgroundColor: '#FF6B35',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
});

export default InteractiveTrailMapScreen;
