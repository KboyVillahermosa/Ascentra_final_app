import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StatusBar,
  SafeAreaView,
  FlatList,
  Dimensions,
} from 'react-native';
import { supabase } from '../services/supabaseClient';
import {
  MaterialIcons,
  FontAwesome,
  Ionicons,
  Feather,
} from '@expo/vector-icons';
import SkeletonLoader from '../components/SkeletonLoader';
import MtBabagNapoTrailMap from '../components/MtBabagNapoTrailMap';

import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { TRAILS_DATA, getTrailsNearLocation } from '../services/trailService';
import {
  getCurrentWeather,
  MOUNT_BABAG_COORDS,
  isMountBabagLocation,
} from '../services/weatherService';
import { toggleFavorite, isFavorited } from '../services/favoritesService';

// Mount Babag specific data
const MOUNT_BABAG_DATA = {
  id: '1',
  name: 'Mount Babag',
  description:
    'A challenging mountain hike with breathtaking panoramic views of Cebu City and surrounding islands.',
  location: 'Cebu City, Philippines',
  image_url: '../assets/images/spot1.jpg',
  average_rating: 4.8,
  rating_count: 156,
  upvotes: 142,
  downvotes: 8,
  vote_score: 134,
  combined_score: 4.9,
  type: 'Peak',
  category: 'Peaks & Mountains',
  difficulty: 'Hard',
  elevation: 800,
  trail_length: 8.5,
  estimated_duration: 240,
};

const { width: screenWidth } = Dimensions.get('window');

export default function MountBabagScreen({ navigation }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [userEmails, setUserEmails] = useState({});
  const [weather, setWeather] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [travelInfo, setTravelInfo] = useState(null);
  const [userVote, setUserVote] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingTravel, setLoadingTravel] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [weatherRefreshTimer, setWeatherRefreshTimer] = useState(null);
  const [lastWeatherUpdate, setLastWeatherUpdate] = useState(null);
  const [commentSortBy, setCommentSortBy] = useState('newest');
  const [commentHelpfulVotes, setCommentHelpfulVotes] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [mapType, setMapType] = useState('terrain');
  const [nearbyTrails, setNearbyTrails] = useState([]);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const spot = MOUNT_BABAG_DATA;
  const spotId = '1';
  const isMountBabag = true;

  // Helper function to convert difficulty text to star rating
  const getDifficultyStars = difficulty => {
    if (typeof difficulty === 'number') {
      return difficulty;
    }
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 2;
      case 'moderate':
        return 3;
      case 'hard':
        return 4;
      case 'expert':
        return 5;
      default:
        return 3;
    }
  };

  // Memoized image loading with performance optimization
  const getSpotImages = useCallback(spotId => {
    try {
      // Use specific Mount Babag images with thumbnail as primary
      try {
        return [
          require('../assets/images/mount babag/thumbnail.webp'),
          require('../assets/images/mount babag/28385907379_92e72d4e4b_c.jpg'),
          require('../assets/images/mount babag/p3090312-2.jpg'),
          require('../assets/images/mount babag/wp-1609551201167.webp'),
          require('../assets/images/mount babag/wp-1609551201238.webp'),
          require('../assets/images/mount babag/trail-view.webp'),
        ];
      } catch (error) {
        return [
          require('../assets/images/spot1.jpg'),
          require('../assets/images/spot2.jpg'),
          require('../assets/images/spot3.jpg'),
          require('../assets/images/spot4.jpg'),
        ];
      }
    } catch (error) {
      console.warn('Error loading spot images:', error);
      return [require('../assets/images/spot1.jpg')];
    }
  }, []);

  // Initialize component
  useEffect(() => {
    const initializeScreen = async () => {
      try {
        setLoading(true);

        // Set coordinates for Mount Babag
        setCoordinates({
          latitude: 10.3157,
          longitude: 123.9644,
        });

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);

        // Check if favorited
        if (user) {
          const favorited = await isFavorited(spotId);
          setIsFavorite(favorited);
        }

        // Load comments
        await fetchComments();
      } catch (error) {
        console.error('Error initializing Mount Babag screen:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeScreen();
  }, []);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('hiking_spot_id', spotId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to add favorites.');
      return;
    }

    try {
      setFavoriteLoading(true);
      const newFavoriteStatus = await toggleFavorite(spotId);
      setIsFavorite(newFavoriteStatus);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status.');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const renderStars = (rating, size = 16) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <FontAwesome key={i} name='star' size={size} color={'#388E3C'} />,
      );
    }

    if (hasHalfStar) {
      stars.push(
        <FontAwesome
          key='half'
          name='star-half-empty'
          size={size}
          color={'#388E3C'}
        />,
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <FontAwesome
          key={`empty-${i}`}
          name='star-o'
          size={size}
          color={'#388E3C'}
        />,
      );
    }

    return stars;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle='dark-content' backgroundColor={'#FFFFFF'} />
        <ScrollView style={styles.container}>
          <View style={styles.imageContainer}>
            <SkeletonLoader width='100%' height={250} borderRadius={0} />
          </View>
          <View style={styles.contentContainer}>
            <SkeletonLoader width='80%' height={28} borderRadius={8} />
            <View style={{ height: 12 }} />
            <SkeletonLoader width='60%' height={20} borderRadius={6} />
            <View style={{ height: 16 }} />
            <SkeletonLoader width='100%' height={16} borderRadius={4} />
            <View style={{ height: 8 }} />
            <SkeletonLoader width='90%' height={16} borderRadius={4} />
            <View style={{ height: 8 }} />
            <SkeletonLoader width='95%' height={16} borderRadius={4} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle='light-content' backgroundColor={'#388E3C'} />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        decelerationRate='normal'
        scrollEventThrottle={16}
        bounces={true}
      >
        <View style={styles.imageContainer}>
          <FlatList
            data={getSpotImages(spotId)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews={true}
            onMomentumScrollEnd={event => {
              try {
                const contentOffsetX =
                  event?.nativeEvent?.contentOffset?.x || 0;
                const imageWidth = screenWidth;
                const currentIndex = Math.round(contentOffsetX / imageWidth);
                setSelectedImageIndex(currentIndex);
              } catch (error) {
                console.warn('Error updating image index:', error);
              }
            }}
            renderItem={({ item, index }) => (
              <Image
                key={index}
                source={item}
                style={styles.spotImage}
                resizeMode='cover'
              />
            )}
            keyExtractor={(item, index) => index.toString()}
          />

          {/* Image indicators */}
          <View style={styles.imageIndicators}>
            {getSpotImages(spotId).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  selectedImageIndex === index && styles.activeIndicator,
                ]}
              />
            ))}
          </View>

          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name='arrow-back' size={24} color='white' />
          </TouchableOpacity>

          {/* Favorite button */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleFavoriteToggle}
            disabled={favoriteLoading}
          >
            {favoriteLoading ? (
              <ActivityIndicator size='small' color='white' />
            ) : (
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorite ? '#FF6B6B' : 'white'}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>{spot.name}</Text>

          <View style={styles.ratingRow}>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingText}>{spot.average_rating}</Text>
              {renderStars(spot.average_rating, 18)}
              <Text style={styles.ratingCount}>({spot.rating_count})</Text>
            </View>
          </View>

          <View style={styles.locationContainer}>
            <MaterialIcons name='location-on' size={20} color={'#388E3C'} />
            <Text style={styles.location}>{spot.location}</Text>
          </View>

          <View style={styles.divider} />

          {/* Trail Map Title */}
          <Text style={[styles.sectionTitle, styles.trailMapTitle]}>
            Trail Map
          </Text>

          {/* Interactive Map Section */}
          <View style={styles.mapSection}>
            <MtBabagNapoTrailMap
              onRouteSelect={route => {
                console.log('🔥 MountBabagScreen - Route selected:', route);
                setSelectedRoute(route);
              }}
              selectedRoute={selectedRoute}
            />

            {/* Directions button */}
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={() => {
                if (coordinates) {
                  const url = Platform.select({
                    ios: `maps:0,0?q=${coordinates.latitude},${coordinates.longitude}`,
                    android: `geo:0,0?q=${coordinates.latitude},${coordinates.longitude}`,
                  });
                  Linking.openURL(url);
                }
              }}
            >
              <Text style={styles.directionsButtonText}>Get Directions</Text>
              <MaterialIcons name='directions' size={20} color='white' />
            </TouchableOpacity>
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <View style={styles.descriptionHeader}>
              <MaterialIcons name='description' size={24} color={'#388E3C'} />
              <Text style={styles.sectionTitle}>About This Trail</Text>
            </View>
            <View style={styles.descriptionCard}>
              <Text style={styles.description}>{spot.description}</Text>

              {/* Trail highlights */}
              <View style={styles.highlightsContainer}>
                <Text style={styles.highlightsTitle}>Trail Highlights</Text>
                <View style={styles.highlightsList}>
                  <View style={styles.highlightItem}>
                    <MaterialIcons
                      name='landscape'
                      size={20}
                      color={'#388E3C'}
                    />
                    <Text style={styles.highlightText}>
                      Panoramic views of Cebu City
                    </Text>
                  </View>
                  <View style={styles.highlightItem}>
                    <MaterialIcons
                      name='camera-alt'
                      size={20}
                      color={'#388E3C'}
                    />
                    <Text style={styles.highlightText}>
                      Perfect for photography
                    </Text>
                  </View>
                  <View style={styles.highlightItem}>
                    <MaterialIcons
                      name='fitness-center'
                      size={20}
                      color={'#388E3C'}
                    />
                    <Text style={styles.highlightText}>
                      Challenging workout
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Trail Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trail Information</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <MaterialIcons name='straighten' size={24} color={'#388E3C'} />
                <Text style={styles.infoLabel}>Distance</Text>
                <Text style={styles.infoValue}>
                  {selectedRoute
                    ? selectedRoute.distance
                    : spot.trail_length || 'N/A'}
                  {selectedRoute || spot.trail_length ? ' km' : ''}
                </Text>
              </View>

              <View style={styles.infoCard}>
                <MaterialIcons name='height' size={24} color={'#388E3C'} />
                <Text style={styles.infoLabel}>Elevation</Text>
                <Text style={styles.infoValue}>
                  {selectedRoute
                    ? selectedRoute.elevation
                    : spot.elevation || 'N/A'}
                  {selectedRoute || spot.elevation ? ' m' : ''}
                </Text>
              </View>

              <View style={styles.infoCard}>
                <MaterialIcons name='access-time' size={24} color={'#388E3C'} />
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>
                  {selectedRoute
                    ? selectedRoute.duration
                    : spot.estimated_duration
                      ? `${Math.floor(spot.estimated_duration / 60)}h ${spot.estimated_duration % 60}m`
                      : 'N/A'}
                </Text>
              </View>

              <View style={styles.infoCard}>
                <MaterialIcons name='trending-up' size={24} color={'#388E3C'} />
                <Text style={styles.infoLabel}>Difficulty</Text>
                <View style={styles.difficultyContainer}>
                  {renderStars(getDifficultyStars(spot.difficulty), 14)}
                  <Text style={styles.difficultyText}>{spot.difficulty}</Text>
                </View>
              </View>
            </View>

            {/* Selected route description */}
            {selectedRoute && (
              <View style={styles.routeDescriptionCard}>
                <Text style={styles.routeDescriptionTitle}>
                  {selectedRoute.name} Route
                </Text>
                <Text style={styles.routeDescription}>
                  {selectedRoute.description}
                </Text>
                {selectedRoute.highlights && (
                  <View style={styles.routeHighlights}>
                    <Text style={styles.routeHighlightsTitle}>
                      Route Highlights:
                    </Text>
                    {selectedRoute.highlights.map((highlight, index) => (
                      <View key={index} style={styles.routeHighlightItem}>
                        <Text style={styles.routeHighlightBullet}>•</Text>
                        <Text style={styles.routeHighlightText}>
                          {highlight}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  spotImage: {
    width: screenWidth,
    height: 250,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeIndicator: {
    backgroundColor: 'white',
    width: 24,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 35,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  favoriteButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 35,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  contentContainer: {
    padding: screenWidth < 375 ? 16 : 24,
    paddingBottom: screenWidth < 375 ? 32 : 40,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: screenWidth < 375 ? 20 : 24,
    borderTopRightRadius: screenWidth < 375 ? 20 : 24,
    marginTop: screenWidth < 375 ? -20 : -24,
  },
  title: {
    fontSize: screenWidth < 375 ? 24 : 28,
    fontWeight: '700',
    color: '#212121',
    marginBottom: screenWidth < 375 ? 10 : 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    letterSpacing: -0.5,
    lineHeight: screenWidth < 375 ? 28 : 32,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginRight: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  ratingCount: {
    color: '#616161',
    marginLeft: 5,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  location: {
    fontSize: 16,
    color: '#616161',
    marginLeft: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: screenWidth < 375 ? 20 : 24,
    marginHorizontal: screenWidth < 375 ? 8 : 12,
  },
  section: {
    marginBottom: screenWidth < 375 ? 20 : 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  trailMapTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  descriptionCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 20,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    marginBottom: 20,
    textAlign: 'justify',
  },
  highlightsContainer: {
    marginTop: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  highlightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  highlightsList: {
    gap: 10,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  highlightText: {
    fontSize: 15,
    color: '#616161',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    flex: 1,
  },
  mapSection: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F9F9F9',
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  directionsButton: {
    backgroundColor: '#388E3C',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: screenWidth < 375 ? 14 : 12,
    margin: screenWidth < 375 ? 10 : 12,
    borderRadius: 30,
    elevation: 0,
    minHeight: 48,
  },
  directionsButtonText: {
    color: 'white',
    fontWeight: '600',
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    minHeight: 100,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  infoLabel: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 8,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  difficultyContainer: {
    alignItems: 'center',
    gap: 4,
  },
  difficultyText: {
    fontSize: 12,
    color: '#9E9E9E',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  routeDescriptionCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  routeDescriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  routeDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#616161',
    marginBottom: 12,
  },
  routeHighlights: {
    marginTop: 8,
  },
  routeHighlightsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  routeHighlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  routeHighlightBullet: {
    fontSize: 14,
    color: '#388E3C',
    marginRight: 8,
    fontWeight: 'bold',
  },
  routeHighlightText: {
    fontSize: 13,
    color: '#616161',
    flex: 1,
    lineHeight: 18,
  },
});
