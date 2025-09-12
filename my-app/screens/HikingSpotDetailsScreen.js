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
import BudlaanFallsTrailMap from '../components/BudlaanFallsTrailMap';

import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { TRAILS_DATA, getTrailsNearLocation } from '../services/trailService';
import {
  getCurrentWeather,
  MOUNT_BABAG_COORDS,
  isMountBabagLocation,
} from '../services/weatherService';
import { toggleFavorite, isFavorited } from '../services/favoritesService';

export default function HikingSpotDetailsScreen({ route, navigation }) {
  const { spot: passedSpot, spotId } = route.params || {};
  const [spot, setSpot] = useState(null);
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
  const [commentSortBy, setCommentSortBy] = useState('newest'); // newest, oldest, highest_rated
  const [commentHelpfulVotes, setCommentHelpfulVotes] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [mapType, setMapType] = useState('terrain'); // terrain, satellite, hybrid
  const [nearbyTrails, setNearbyTrails] = useState([]);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Check if this is Mount Babag (ID 3) or if spot name is Mount Babag
  const isMountBabag = spotId === 3 || (spot && spot.name === 'Mount Babag');

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
      case 'very hard':
        return 5;
      case 'extreme':
        return 5;
      default:
        return 1;
    }
  };

  const mapRef = useRef(null);
  const screenWidth = Dimensions.get('window').width;
  const styles = useMemo(() => createStyles(screenWidth), [screenWidth]);

  const getImageSource = path => {
    if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
      return { uri: path };
    }

    const imageMap = {
      '../assets/images/spot1.jpg': require('../assets/images/spot1.jpg'),
      '../assets/images/spot2.jpg': require('../assets/images/spot2.jpg'),
      '../assets/images/spot3.jpg': require('../assets/images/spot3.jpg'),
      '../assets/images/spot4.jpg': require('../assets/images/spot4.jpg'),
      '../assets/images/spot5.jpg': require('../assets/images/spot5.jpg'),
    };

    try {
      return imageMap[path] || require('../assets/images/spot1.jpg');
    } catch (error) {
      return require('../assets/images/spot1.jpg');
    }
  };

  // Memoized image loading with performance optimization
  const getSpotImages = useCallback(
    spotId => {
      try {
        if (isMountBabag) {
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
        }

        // Check if this is Budlaan Falls (by spotId or spot name)
        if (
          spotId === '15' ||
          spotId === 15 ||
          (spot && spot.name === 'Budlaan Falls') ||
          (spot && spot.id === '15')
        ) {
          // Use specific Budlaan Falls images from the budlaanfalls folder
          try {
            return [
              require('../assets/images/budlaanfalls/thumbnail.jpg'),
              require('../assets/images/budlaanfalls/IMG_20250209_103323.jpg'),
              require('../assets/images/budlaanfalls/IMG_1323.jpg'),
              require('../assets/images/budlaanfalls/IMG_1344.jpg'),
              require('../assets/images/budlaanfalls/IMG_1347.jpg'),
            ];
          } catch (error) {
            return [
              require('../assets/images/spot1.jpg'),
              require('../assets/images/spot2.jpg'),
              require('../assets/images/spot3.jpg'),
              require('../assets/images/spot4.jpg'),
            ];
          }
        }

        // Create multiple images for other spots for gallery
        const baseImages = [
          require('../assets/images/spot1.jpg'),
          require('../assets/images/spot2.jpg'),
          require('../assets/images/spot3.jpg'),
          require('../assets/images/spot4.jpg'),
          require('../assets/images/spot5.jpg'),
        ];

        // Rotate images based on spot ID to create variety
        const startIndex = (spotId - 1) % baseImages.length;
        const images = [];

        for (let i = 0; i < 4; i++) {
          images.push(baseImages[(startIndex + i) % baseImages.length]);
        }

        return images;
      } catch (error) {
        // Return fallback images in case of any error
        return [
          require('../assets/images/spot1.jpg'),
          require('../assets/images/spot2.jpg'),
          require('../assets/images/spot3.jpg'),
          require('../assets/images/spot4.jpg'),
        ];
      }
    },
    [spot],
  );

  // Optimized data fetching with concurrent loading
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Start all independent operations concurrently
        const promises = [fetchUser(), getUserLocation()];

        if (passedSpot) {
          // If spot object is passed directly, use it
          setSpot(passedSpot);
          setLoading(false);

          // Set coordinates based on spot data
          const coords = getCoordinatesForSpot(passedSpot);
          setCoordinates(coords);

          // Add comments fetching to concurrent operations
          promises.push(fetchComments(passedSpot.id));
        } else if (spotId) {
          // If only spotId is provided, fetch spot details
          promises.push(fetchSpotDetails());
        }

        // Execute all operations concurrently
        await Promise.allSettled(promises);
      } catch (error) {
        console.error('Error in concurrent operations:', error);
      }
    };

    initializeData();
  }, [passedSpot, spotId]);

  // Helper function to get coordinates for a spot
  const getCoordinatesForSpot = useCallback(spotData => {
    if (
      (spotData.name &&
        (spotData.name.toLowerCase().includes('busay') ||
          spotData.name.toLowerCase().includes('babag'))) ||
      (spotData.location &&
        (spotData.location.toLowerCase().includes('busay') ||
          spotData.location.toLowerCase().includes('babag')))
    ) {
      return { latitude: 10.3795765, longitude: 123.8711162 };
    } else if (spotData.latitude && spotData.longitude) {
      return { latitude: spotData.latitude, longitude: spotData.longitude };
    } else {
      return { latitude: 10.3157, longitude: 123.8854 };
    }
  }, []);

  // Optimized secondary data fetching with debouncing
  useEffect(() => {
    if (!spot || !coordinates) {
      return;
    }

    const loadSecondaryData = async () => {
      try {
        // Load nearby trails immediately (synchronous operation)
        const trailsNearSpot = getTrailsNearLocation(coordinates, 10); // 10km radius
        setNearbyTrails(trailsNearSpot);

        // Start weather and travel info concurrently
        const promises = [fetchWeather()];

        if (userLocation) {
          promises.push(calculateTravelInfo());
        }

        await Promise.allSettled(promises);
      } catch (error) {
        console.error('Error in promise operations:', error);
      }
    };

    // Debounce the data loading to prevent excessive calls
    const timeoutId = setTimeout(loadSecondaryData, 100);

    // Set up auto-refresh for weather data every 10 minutes
    const timer = setInterval(
      () => {
        fetchWeather();
      },
      10 * 60 * 1000,
    ); // 10 minutes

    setWeatherRefreshTimer(timer);

    return () => {
      clearTimeout(timeoutId);
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [spot, coordinates, userLocation]);

  useEffect(() => {
    return () => {
      if (weatherRefreshTimer) {
        clearInterval(weatherRefreshTimer);
      }
    };
  }, []);

  // Check favorite status when component mounts
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (user && (passedSpot?.id || spotId)) {
        try {
          const favoriteStatus = await isFavorited(passedSpot?.id || spotId);
          setIsFavorite(favoriteStatus);
        } catch (error) {
          console.error('Error checking favorite status:', error);
        }
      }
    };

    checkFavoriteStatus();
  }, [user, passedSpot?.id, spotId]);

  // Handle favorite toggle
  const handleFavoritePress = async () => {
    if (!user || favoriteLoading) {
      return;
    }

    const currentSpotId = passedSpot?.id || spotId;
    if (!currentSpotId) {
      return;
    }

    try {
      setFavoriteLoading(true);
      const newFavoriteStatus = await toggleFavorite(currentSpotId);
      setIsFavorite(newFavoriteStatus);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status');
    } finally {
      setFavoriteLoading(false);
    }
  };

  async function fetchUser() {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      setUser(data.user);
      fetchUserVote(data.user.id);
    }
  }

  async function fetchUserVote(userId) {
    const currentSpotId = passedSpot?.id || spotId;
    if (!currentSpotId) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('hiking_spot_votes')
        .select('vote_type')
        .eq('hiking_spot_id', currentSpotId)
        .eq('user_id', userId)
        .single();

      if (error) {
        // Handle table not found or no vote found
        if (
          error.code === 'PGRST116' ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist')
        ) {
          console.log('Voting table not yet created - votes disabled');
        }
        setUserVote(null);
        return;
      }

      if (data) {
        setUserVote(data.vote_type);
      }
    } catch (error) {
      // No vote found or other error, which is fine
      setUserVote(null);
    }
  }

  async function getUserLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } else {
        // Default to Cebu City center
        setUserLocation({
          latitude: 10.3157,
          longitude: 123.8854,
        });
      }
    } catch (error) {
      // Default to Cebu City center
      setUserLocation({
        latitude: 10.3157,
        longitude: 123.8854,
      });
    }
  }

  async function fetchWeather() {
    if (!coordinates) {
      return;
    }

    try {
      setLoadingWeather(true);

      // Use AccuWeather API for real-time weather conditions
      // Optimized for Mount Babag location with enhanced mountain weather data
      const weatherData = await getCurrentWeather(
        coordinates.latitude,
        coordinates.longitude,
      );

      if (weatherData) {
        setWeather({
          temperature: weatherData.temperature,
          description: weatherData.description,
          humidity: weatherData.humidity,
          windSpeed: weatherData.windSpeed,
          windDirection: weatherData.windDirection,
          icon: weatherData.weatherIcon?.toString() || '01d',
          feelsLike: weatherData.feelsLike,
          pressure: weatherData.pressure,
          uvIndex: weatherData.uvIndex,
          visibility: weatherData.visibility,
          cloudCover: weatherData.cloudCover,
          location: weatherData.location,
          elevation: weatherData.elevation,
          isDayTime: weatherData.isDayTime,
          precipitationProbability: weatherData.precipitationProbability,
        });
        setLastWeatherUpdate(new Date());
      } else {
        throw new Error('No weather data received');
      }
    } catch (error) {
      // Fallback to enhanced mock weather data
      const isMountBabag = isMountBabagLocation(
        coordinates.latitude,
        coordinates.longitude,
      );

      setWeather({
        temperature: isMountBabag ? 18 : 28,
        description: isMountBabag
          ? 'Cool mountain breeze with clear skies'
          : 'Partly cloudy',
        humidity: isMountBabag ? 82 : 75,
        windSpeed: isMountBabag ? 4.5 : 2.8,
        windDirection: isMountBabag ? 'NE' : 'E',
        icon: isMountBabag ? '1' : '3',
        feelsLike: isMountBabag ? 19 : 30,
        pressure: isMountBabag ? 925 : 1013,
        uvIndex: isMountBabag ? 8 : 6,
        visibility: isMountBabag ? 15 : 10,
        cloudCover: isMountBabag ? 20 : 40,
        location: isMountBabag ? 'Mount Babag, Cebu City' : 'Cebu City',
        elevation: isMountBabag ? MOUNT_BABAG_COORDS.elevation : 0,
        isDayTime: true,
        precipitationProbability: isMountBabag ? 10 : 20,
      });
      setLastWeatherUpdate(new Date());
    } finally {
      setLoadingWeather(false);
    }
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async function calculateTravelInfo() {
    if (!userLocation || !coordinates) {
      return;
    }

    try {
      setLoadingTravel(true);
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        coordinates.latitude,
        coordinates.longitude,
      );

      // Estimate travel time (assuming average speed of 40 km/h for road travel)
      const estimatedTime = Math.round((distance / 40) * 60); // in minutes

      setTravelInfo({
        distance: distance.toFixed(1),
        estimatedTime: estimatedTime,
      });
    } catch (error) {
      console.error('Error calculating travel time:', error);
    } finally {
      setLoadingTravel(false);
    }
  }

  async function handleVote(voteType) {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to vote');
      return;
    }

    const currentSpotId = passedSpot?.id || spotId;
    if (!currentSpotId) {
      return;
    }

    try {
      if (userVote === voteType) {
        // Remove vote if clicking the same vote type
        const { error } = await supabase
          .from('hiking_spot_votes')
          .delete()
          .eq('hiking_spot_id', currentSpotId)
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }
        setUserVote(null);
      } else {
        // Insert or update vote
        const { error } = await supabase.from('hiking_spot_votes').upsert({
          hiking_spot_id: currentSpotId,
          user_id: user.id,
          vote_type: voteType,
        });

        if (error) {
          throw error;
        }
        setUserVote(voteType);
      }

      // Refresh spot details to get updated vote counts
      if (passedSpot) {
        // If using passed spot, just refresh comments
        await fetchComments(currentSpotId);
      } else {
        // If using spotId, refresh full spot details
        fetchSpotDetails();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit vote');
    }
  }

  async function fetchUserEmails(commentData) {
    if (!commentData.length || !user) {
      return;
    }

    try {
      const emails = {};

      if (user.email) {
        emails[user.id] = user.email;
      }

      setUserEmails(emails);
    } catch (error) {
      console.error('Error fetching user emails:', error);
    }
  }

  // Optimized comments fetching with better error handling
  const fetchComments = useCallback(async currentSpotId => {
    if (!currentSpotId) {
      return;
    }

    try {
      const { data: commentData, error: commentError } = await supabase
        .from('hiking_spot_comments')
        .select(
          `
          id,
          comment,
          rating,
          created_at,
          user_id,
          profiles:user_id(username)
        `,
        )
        .eq('hiking_spot_id', currentSpotId)
        .order('created_at', { ascending: false })
        .limit(50); // Limit initial load to 50 comments for performance

      if (commentError) {
        throw commentError;
      }

      setComments(commentData || []);

      // Fetch user emails concurrently without blocking
      if (commentData?.length) {
        fetchUserEmails(commentData);
      }
    } catch (error) {
      console.error('Error fetching comments:', error.message);
      setComments([]); // Set empty array on error to prevent UI issues
    }
  }, []);

  // Optimized spot details fetching with better error handling
  const fetchSpotDetails = useCallback(async () => {
    if (!spotId) {
      return;
    }

    try {
      setLoading(true);

      // Fetch spot data and comments concurrently
      const [spotResult, commentsResult] = await Promise.allSettled([
        supabase.from('hiking_spots').select('*').eq('id', spotId).single(),
        fetchComments(spotId),
      ]);

      // Handle spot data
      if (spotResult.status === 'fulfilled' && !spotResult.value.error) {
        const spotData = spotResult.value.data;
        setSpot(spotData);

        // Set coordinates using helper function
        const coords = getCoordinatesForSpot(spotData);
        setCoordinates(coords);
      } else {
        throw new Error(
          spotResult.value?.error?.message || 'Failed to fetch spot data',
        );
      }

      // Log any comment fetching errors without blocking the main flow
      if (commentsResult.status === 'rejected') {
        console.warn('Comments failed to load:', commentsResult.reason);
      }
    } catch (error) {
      console.error('Error fetching spot details:', error.message);
      Alert.alert(
        'Error',
        'Failed to load hiking spot details. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [spotId, getCoordinatesForSpot]);

  // Memoized map type handlers
  const handleMapTypeStandard = useCallback(() => {
    setMapType('standard');
  }, []);

  const handleMapTypeSatellite = useCallback(() => {
    setMapType('satellite');
  }, []);

  const handleMapTypeTerrain = useCallback(() => {
    setMapType('terrain');
  }, []);

  async function submitComment() {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to leave a review');
      return;
    }

    if (!userRating) {
      Alert.alert('Rating Required', 'Please select a rating');
      return;
    }

    if (!commentText.trim()) {
      Alert.alert('Comment Required', 'Please share your experience');
      return;
    }

    const currentSpotId = passedSpot?.id || spotId;
    if (!currentSpotId) {
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from('hiking_spot_comments').insert({
        hiking_spot_id: currentSpotId,
        user_id: user.id,
        comment: commentText.trim(),
        rating: userRating,
      });

      if (error) {
        throw error;
      }

      setCommentText('');
      setUserRating(0);

      // Refresh comments
      await fetchComments(currentSpotId);

      Alert.alert('Success', 'Your review has been submitted!');
    } catch (error) {
      console.error('Error submitting comment:', error.message);
      Alert.alert('Error', 'Failed to submit your review');
    } finally {
      setSubmitting(false);
    }
  }

  const openInMaps = (coords, label) => {
    const { latitude, longitude } = coords;
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q=',
    });
    const latLng = `${latitude},${longitude}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    Linking.openURL(url);
  };

  const sortComments = (comments, sortBy) => {
    const sorted = [...comments];
    switch (sortBy) {
      case 'newest':
        return sorted.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        );
      case 'oldest':
        return sorted.sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at),
        );
      case 'highest_rated':
        return sorted.sort((a, b) => b.rating - a.rating);
      default:
        return sorted;
    }
  };

  const toggleHelpfulVote = async commentId => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to vote on reviews');
      return;
    }

    try {
      const currentVote = commentHelpfulVotes[commentId];
      const newVote = !currentVote;

      // Update local state immediately for better UX
      setCommentHelpfulVotes(prev => ({
        ...prev,
        [commentId]: newVote,
      }));

      // Here you would typically update the database
    } catch (error) {
      console.error('Error toggling helpful vote:', error);
      // Revert the local state on error
      setCommentHelpfulVotes(prev => ({
        ...prev,
        [commentId]: !prev[commentId],
      }));
    }
  };

  const submitReply = async parentCommentId => {
    if (!replyText.trim()) {
      Alert.alert('Error', 'Please enter a reply');
      return;
    }

    if (!user) {
      Alert.alert('Login Required', 'Please log in to reply to reviews');
      return;
    }

    try {
      // Here you would typically save the reply to the database

      setReplyText('');
      setReplyingTo(null);
      Alert.alert('Success', 'Reply submitted successfully!');
    } catch (error) {
      console.error('Error submitting reply:', error);
      Alert.alert('Error', 'Failed to submit reply');
    }
  };

  function RatingStars({
    rating,
    onRatingChange,
    disabled = false,
    size = 24,
  }) {
    return (
      <View style={styles.ratingStarsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            disabled={disabled}
            onPress={() => onRatingChange && onRatingChange(star)}
            style={styles.starButton}
          >
            <FontAwesome
              name={star <= rating ? 'star' : 'star-o'}
              size={size}
              color={'#388E3C'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle='dark-content' backgroundColor={'#FFFFFF'} />
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Image skeleton */}
          <View style={styles.imageContainer}>
            <SkeletonLoader width='100%' height={250} borderRadius={0} />
          </View>

          {/* Header skeleton */}
          <View style={styles.header}>
            <SkeletonLoader width='80%' height={28} borderRadius={4} />
            <View style={{ height: 8 }} />
            <SkeletonLoader width='60%' height={16} borderRadius={4} />
            <View style={{ height: 12 }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SkeletonLoader width={80} height={20} borderRadius={10} />
              <SkeletonLoader width={100} height={20} borderRadius={10} />
            </View>
          </View>

          {/* Description skeleton */}
          <View style={styles.section}>
            <SkeletonLoader width='40%' height={20} borderRadius={4} />
            <View style={{ height: 12 }} />
            <SkeletonLoader width='100%' height={16} borderRadius={4} />
            <View style={{ height: 8 }} />
            <SkeletonLoader width='90%' height={16} borderRadius={4} />
            <View style={{ height: 8 }} />
            <SkeletonLoader width='70%' height={16} borderRadius={4} />
          </View>

          {/* Map skeleton */}
          <View style={styles.section}>
            <SkeletonLoader width='30%' height={20} borderRadius={4} />
            <View style={{ height: 12 }} />
            <SkeletonLoader width='100%' height={200} borderRadius={12} />
          </View>

          {/* Trail info skeleton */}
          <View style={styles.section}>
            <SkeletonLoader width='50%' height={20} borderRadius={4} />
            <View style={{ height: 12 }} />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                padding: 16,
              }}
            >
              <SkeletonLoader width={60} height={40} borderRadius={8} />
              <SkeletonLoader width={60} height={40} borderRadius={8} />
              <SkeletonLoader width={60} height={40} borderRadius={8} />
              <SkeletonLoader width={60} height={40} borderRadius={8} />
            </View>
          </View>

          {/* Comments skeleton */}
          <View style={styles.section}>
            <SkeletonLoader width='40%' height={20} borderRadius={4} />
            <View style={{ height: 16 }} />
            {[1, 2, 3].map(item => (
              <View key={item} style={{ marginBottom: 16 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <SkeletonLoader width={32} height={32} borderRadius={16} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <SkeletonLoader width='40%' height={14} borderRadius={4} />
                    <View style={{ height: 4 }} />
                    <SkeletonLoader width='60%' height={12} borderRadius={4} />
                  </View>
                </View>
                <SkeletonLoader width='100%' height={14} borderRadius={4} />
                <View style={{ height: 4 }} />
                <SkeletonLoader width='80%' height={14} borderRadius={4} />
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!spot) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle='dark-content' backgroundColor={'#FFFFFF'} />
        <View style={styles.errorContainer}>
          <Ionicons name='warning-outline' size={60} color={'#F44336'} />
          <Text style={styles.errorText}>Hiking spot not found</Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
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
                const index = Math.round(contentOffsetX / screenWidth);
                const maxIndex = getSpotImages(spotId).length - 1;
                const clampedIndex = Math.max(0, Math.min(index, maxIndex));
                setSelectedImageIndex(clampedIndex);
              } catch (error) {
                console.warn('Error in onMomentumScrollEnd:', error);
                setSelectedImageIndex(0);
              }
            }}
            renderItem={({ item, index }) => (
              <Image
                source={item}
                style={[styles.heroImage, { width: screenWidth }]}
                resizeMode='cover'
                fadeDuration={200}
                onLoadStart={() => {
                  /* console.log(`Loading image ${index}`) */
                }}
                onLoad={() => {
                  /* console.log(`Image ${index} loaded`) */
                }}
                onError={error =>
                  console.warn(`Image ${index} failed to load:`, error)
                }
              />
            )}
            keyExtractor={(item, index) => `image-${spotId}-${index}`}
            getItemLayout={(data, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
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

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name='arrow-back' size={24} color='white' />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleFavoritePress}
            disabled={favoriteLoading || !user}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? '#FF6B6B' : 'white'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>{spot.name}</Text>

          <View style={styles.ratingRow}>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingText}>
                {spot.average_rating ? spot.average_rating.toFixed(1) : 'N/A'}
              </Text>
              <FontAwesome name='star' size={18} color={'#388E3C'} />
              <Text style={styles.ratingCount}>
                ({spot.rating_count || 0}{' '}
                {spot.rating_count === 1 ? 'rating' : 'ratings'})
              </Text>
            </View>

            {/* Voting Section */}
            <View style={styles.voteContainer}>
              <TouchableOpacity
                style={[
                  styles.voteButton,
                  userVote === 'upvote' && styles.voteButtonActive,
                ]}
                onPress={() => handleVote('upvote')}
              >
                <MaterialIcons
                  name='thumb-up'
                  size={16}
                  color={userVote === 'upvote' ? 'white' : '#388E3C'}
                />
                <Text
                  style={[
                    styles.voteText,
                    userVote === 'upvote' && styles.voteTextActive,
                  ]}
                >
                  {spot.upvotes || 0}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.voteButton,
                  userVote === 'downvote' && styles.voteButtonActive,
                ]}
                onPress={() => handleVote('downvote')}
              >
                <MaterialIcons
                  name='thumb-down'
                  size={16}
                  color={userVote === 'downvote' ? 'white' : '#388E3C'}
                />
                <Text
                  style={[
                    styles.voteText,
                    userVote === 'downvote' && styles.voteTextActive,
                  ]}
                >
                  {spot.downvotes || 0}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.locationContainer}>
            <MaterialIcons name='location-on' size={18} color={'#616161'} />
            <Text style={styles.location}>{spot.location}</Text>
          </View>

          <View style={styles.divider} />

          {/* Trail Map Title */}
          <Text style={[styles.sectionTitle, styles.trailMapTitle]}>
            Trail Map
          </Text>

          {/* Interactive Map Section */}
          <View style={styles.mapSection}>
            {isMountBabag ? (
              <MtBabagNapoTrailMap
                containerStyle={styles.babagTrailMapContainer}
                navigation={navigation}
                onRouteSelect={route => {
                  setSelectedRoute(route);
                }}
              />
            ) : spotId === '15' ||
              spotId === 15 ||
              (spot && spot.name === 'Budlaan Falls') ||
              (spot && spot.id === '15') ? (
              <BudlaanFallsTrailMap
                containerStyle={styles.babagTrailMapContainer}
                navigation={navigation}
                onRouteSelect={route => {
                  console.log(
                    '🔥 HikingSpotDetailsScreen - Budlaan Route selected:',
                    route,
                  );
                  console.log(
                    '🔥 Setting selectedRoute state to:',
                    route?.name,
                  );
                  setSelectedRoute(route);
                  console.log(
                    '🔥 selectedRoute state should now be:',
                    route?.name,
                  );
                }}
              />
            ) : (
              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: coordinates?.latitude || 10.3157,
                    longitude: coordinates?.longitude || 123.8854,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                  mapType={mapType}
                  showsUserLocation={false}
                  showsMyLocationButton={false}
                  showsCompass={false}
                  showsScale={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  scrollEnabled={true}
                  zoomEnabled={true}
                  loadingEnabled={mapLoading}
                  loadingIndicatorColor={'#388E3C'}
                  loadingBackgroundColor={'#FFFFFF'}
                  onMapReady={() => setMapLoading(false)}
                >
                  {coordinates && (
                    <Marker
                      key={`spot-${spot.id}`}
                      coordinate={coordinates}
                      title={spot.name}
                      description={spot.location}
                      tracksViewChanges={false}
                    />
                  )}
                  {userLocation && (
                    <Marker
                      key='user-location'
                      coordinate={userLocation}
                      title='You are here'
                      pinColor='blue'
                      tracksViewChanges={false}
                    />
                  )}
                  {nearbyTrails.map((trail, index) => (
                    <React.Fragment key={`trail-${trail.id || index}`}>
                      <Polyline
                        coordinates={trail.coordinates}
                        strokeColor={trail.color || '#388E3C'}
                        strokeWidth={3}
                        lineDashPattern={[0]}
                      />
                      <Marker
                        coordinate={trail.startPoint}
                        title={trail.name}
                        description={`Start: ${trail.location}`}
                        pinColor='green'
                        tracksViewChanges={false}
                      />
                      <Marker
                        coordinate={trail.endPoint}
                        title={trail.name}
                        description={`End: ${trail.location}`}
                        pinColor='red'
                        tracksViewChanges={false}
                      />
                    </React.Fragment>
                  ))}
                </MapView>
                <View style={styles.mapTypeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.mapTypeButton,
                      mapType === 'standard' && styles.mapTypeButtonActive,
                    ]}
                    onPress={handleMapTypeStandard}
                  >
                    <Text
                      style={[
                        styles.mapTypeText,
                        mapType === 'standard' && styles.mapTypeTextActive,
                      ]}
                    >
                      Standard
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.mapTypeButton,
                      mapType === 'satellite' && styles.mapTypeButtonActive,
                    ]}
                    onPress={handleMapTypeSatellite}
                  >
                    <Text
                      style={[
                        styles.mapTypeText,
                        mapType === 'satellite' && styles.mapTypeTextActive,
                      ]}
                    >
                      Satellite
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.mapTypeButton,
                      mapType === 'terrain' && styles.mapTypeButtonActive,
                    ]}
                    onPress={handleMapTypeTerrain}
                  >
                    <Text
                      style={[
                        styles.mapTypeText,
                        mapType === 'terrain' && styles.mapTypeTextActive,
                      ]}
                    >
                      Terrain
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* General Info Section */}
          <View style={styles.section}>
            <View style={styles.trailInfoHeader}>
              <Text style={styles.sectionTitle}>Trail Information</Text>
              {selectedRoute && (
                <View style={styles.selectedRouteIndicator}>
                  <View
                    style={[
                      styles.routeColorDot,
                      { backgroundColor: selectedRoute.color },
                    ]}
                  />
                  <Text style={styles.selectedRouteName}>
                    {selectedRoute.name}
                  </Text>
                </View>
              )}
            </View>

            {/* Always visible route status for testing */}
            <View
              style={{
                backgroundColor: selectedRoute ? '#4CAF50' : '#F44336',
                padding: 8,
                marginBottom: 8,
                borderRadius: 4,
              }}
            >
              <Text
                style={{
                  color: 'white',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                Route Status:{' '}
                {selectedRoute
                  ? `✅ ${selectedRoute.name} Selected`
                  : '❌ No Route Selected'}
              </Text>
              {selectedRoute && (
                <Text
                  style={{
                    color: 'white',
                    fontSize: 12,
                    textAlign: 'center',
                    marginTop: 4,
                  }}
                >
                  ID: {selectedRoute.id} | Difficulty:{' '}
                  {selectedRoute.difficulty} | Distance:{' '}
                  {selectedRoute.distance}
                </Text>
              )}
            </View>

            {/* Test buttons for manual route selection */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                marginBottom: 8,
              }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: '#2196F3',
                  padding: 8,
                  borderRadius: 4,
                  flex: 1,
                  marginRight: 4,
                }}
                onPress={() => {
                  const testRoute = {
                    id: 'short-route',
                    name: 'Short Route (Budlaan Drop-off)',
                    difficulty: 'Easy',
                    distance: '0.8 km',
                    duration: '30-45 min',
                    elevation: '+80m',
                    color: '#2196F3',
                  };
                  console.log('🧪 Manual test - Setting route:', testRoute);
                  setSelectedRoute(testRoute);
                }}
              >
                <Text
                  style={{ color: 'white', textAlign: 'center', fontSize: 12 }}
                >
                  Test Short Route
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: '#9E9E9E',
                  padding: 8,
                  borderRadius: 4,
                  flex: 1,
                  marginLeft: 4,
                }}
                onPress={() => {
                  console.log('🧪 Manual test - Clearing route');
                  setSelectedRoute(null);
                }}
              >
                <Text
                  style={{ color: 'white', textAlign: 'center', fontSize: 12 }}
                >
                  Clear Route
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <MaterialIcons name='trending-up' size={24} color={'#388E3C'} />
                <Text style={styles.infoLabel}>Difficulty</Text>
                <View style={styles.difficultyContainer}>
                  {[1, 2, 3, 4, 5].map(star => {
                    const difficultyRating = selectedRoute
                      ? getDifficultyStars(selectedRoute.difficulty)
                      : spot.difficulty || 1;

                    return (
                      <FontAwesome
                        key={star}
                        name={star <= difficultyRating ? 'star' : 'star-o'}
                        size={14}
                        color={'#388E3C'}
                      />
                    );
                  })}
                </View>
                {selectedRoute && (
                  <Text
                    style={[styles.infoValue, { fontSize: 12, marginTop: 2 }]}
                  >
                    {selectedRoute.difficulty}
                  </Text>
                )}
              </View>

              <View style={styles.infoCard}>
                <MaterialIcons name='height' size={24} color={'#388E3C'} />
                <Text style={styles.infoLabel}>Elevation</Text>
                <Text style={styles.infoValue}>
                  {selectedRoute
                    ? selectedRoute.elevation
                    : spot.elevation || 'N/A'}
                  {selectedRoute || spot.elevation ? '' : ' m'}
                </Text>
              </View>

              <View style={styles.infoCard}>
                <MaterialIcons name='straighten' size={24} color={'#388E3C'} />
                <Text style={styles.infoLabel}>Distance</Text>
                <Text style={styles.infoValue}>
                  {selectedRoute
                    ? selectedRoute.distance
                    : spot.trail_length
                      ? `${spot.trail_length} km`
                      : 'N/A'}
                </Text>
              </View>

              <View style={styles.infoCard}>
                <MaterialIcons name='schedule' size={24} color={'#388E3C'} />
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>
                  {selectedRoute
                    ? selectedRoute.duration
                    : spot.estimated_duration || 'N/A'}
                </Text>
              </View>
            </View>
            {selectedRoute && selectedRoute.description && (
              <View style={styles.routeDescriptionCard}>
                <Text style={styles.routeDescriptionTitle}>
                  Route Description
                </Text>
                <Text style={styles.routeDescription}>
                  {selectedRoute.description}
                </Text>
                {selectedRoute.highlights &&
                  selectedRoute.highlights.length > 0 && (
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

          {/* Weather Section */}
          <View style={styles.section}>
            <View style={styles.weatherHeader}>
              <Text style={styles.sectionTitle}>Current Weather</Text>
              {lastWeatherUpdate && (
                <Text style={styles.weatherUpdateTime}>
                  Updated{' '}
                  {lastWeatherUpdate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              )}
            </View>
            {weather && weather.location && (
              <View style={styles.weatherLocationContainer}>
                <MaterialIcons name='location-on' size={16} color={'#388E3C'} />
                <Text style={styles.weatherLocation}>{weather.location}</Text>
                {weather.elevation > 0 && (
                  <Text style={styles.weatherElevation}>
                    {' '}
                    • {weather.elevation}m elevation
                  </Text>
                )}
              </View>
            )}
            {loadingWeather ? (
              <View style={styles.weatherLoading}>
                <ActivityIndicator size='small' color={'#388E3C'} />
                <Text style={styles.loadingText}>Loading weather...</Text>
              </View>
            ) : weather ? (
              <View style={styles.weatherCard}>
                <View style={styles.weatherMain}>
                  <View style={styles.weatherTempSection}>
                    <Feather name='thermometer' size={28} color={'#388E3C'} />
                    <View style={styles.weatherTempInfo}>
                      <Text style={styles.weatherTemp}>
                        {weather.temperature}°C
                      </Text>
                      <Text style={styles.weatherFeelsLike}>
                        Feels like {weather.feelsLike}°C
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.weatherDesc}>{weather.description}</Text>
                </View>
                <View style={styles.weatherDetailsGrid}>
                  <View style={styles.weatherDetailCard}>
                    <Feather name='cloud-rain' size={20} color={'#388E3C'} />
                    <Text style={styles.weatherDetailValue}>
                      {weather.humidity}%
                    </Text>
                    <Text style={styles.weatherDetailLabel}>Humidity</Text>
                  </View>
                  <View style={styles.weatherDetailCard}>
                    <Feather name='wind' size={20} color={'#388E3C'} />
                    <Text style={styles.weatherDetailValue}>
                      {weather.windSpeed} m/s
                    </Text>
                    <Text style={styles.weatherDetailLabel}>
                      Wind {weather.windDirection || ''}
                    </Text>
                  </View>
                  <View style={styles.weatherDetailCard}>
                    <Feather name='eye' size={20} color={'#388E3C'} />
                    <Text style={styles.weatherDetailValue}>
                      {weather.pressure} hPa
                    </Text>
                    <Text style={styles.weatherDetailLabel}>Pressure</Text>
                  </View>
                  {weather.uvIndex !== undefined && (
                    <View style={styles.weatherDetailCard}>
                      <Feather name='sun' size={20} color={'#388E3C'} />
                      <Text style={styles.weatherDetailValue}>
                        {weather.uvIndex}
                      </Text>
                      <Text style={styles.weatherDetailLabel}>UV Index</Text>
                    </View>
                  )}
                  {weather.visibility !== undefined && (
                    <View style={styles.weatherDetailCard}>
                      <Feather name='eye' size={20} color={'#388E3C'} />
                      <Text style={styles.weatherDetailValue}>
                        {weather.visibility} km
                      </Text>
                      <Text style={styles.weatherDetailLabel}>Visibility</Text>
                    </View>
                  )}
                  {weather.precipitationProbability !== undefined && (
                    <View style={styles.weatherDetailCard}>
                      <Feather
                        name='cloud-drizzle'
                        size={20}
                        color={'#388E3C'}
                      />
                      <Text style={styles.weatherDetailValue}>
                        {weather.precipitationProbability}%
                      </Text>
                      <Text style={styles.weatherDetailLabel}>Rain Chance</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.refreshWeatherButton}
                  onPress={fetchWeather}
                  disabled={loadingWeather}
                >
                  <Feather name='refresh-cw' size={16} color={'#388E3C'} />
                  <Text style={styles.refreshWeatherText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.weatherError}>Weather data unavailable</Text>
            )}
          </View>

          {/* Travel Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Distance & Travel Info</Text>
            {loadingTravel ? (
              <View style={styles.travelLoading}>
                <ActivityIndicator size='small' color={'#388E3C'} />
                <Text style={styles.loadingText}>Calculating distance...</Text>
              </View>
            ) : travelInfo ? (
              <View style={styles.travelCard}>
                <View style={styles.travelItem}>
                  <MaterialIcons
                    name='directions-car'
                    size={24}
                    color={'#388E3C'}
                  />
                  <View style={styles.travelInfo}>
                    <Text style={styles.travelDistance}>
                      {travelInfo.distance} km
                    </Text>
                    <Text style={styles.travelLabel}>from your location</Text>
                  </View>
                </View>
                <View style={styles.travelItem}>
                  <MaterialIcons
                    name='access-time'
                    size={24}
                    color={'#388E3C'}
                  />
                  <View style={styles.travelInfo}>
                    <Text style={styles.travelTime}>
                      {travelInfo.estimatedTime < 60
                        ? `${travelInfo.estimatedTime} min`
                        : `${Math.floor(travelInfo.estimatedTime / 60)}h ${travelInfo.estimatedTime % 60}m`}
                    </Text>
                    <Text style={styles.travelLabel}>
                      estimated travel time
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={styles.travelError}>Travel info unavailable</Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <View style={styles.descriptionHeader}>
              <MaterialIcons name='description' size={24} color={'#388E3C'} />
              <Text style={styles.sectionTitle}>About This Trail</Text>
            </View>
            <View style={styles.descriptionCard}>
              <Text style={styles.description}>{spot.description}</Text>

              {/* Trail Highlights */}
              <View style={styles.highlightsContainer}>
                <Text style={styles.highlightsTitle}>Trail Highlights</Text>
                <View style={styles.highlightsList}>
                  <View style={styles.highlightItem}>
                    <MaterialIcons name='nature' size={16} color={'#388E3C'} />
                    <Text style={styles.highlightText}>
                      Scenic mountain views
                    </Text>
                  </View>
                  <View style={styles.highlightItem}>
                    <MaterialIcons
                      name='camera-alt'
                      size={16}
                      color={'#388E3C'}
                    />
                    <Text style={styles.highlightText}>
                      Photo opportunities
                    </Text>
                  </View>
                  <View style={styles.highlightItem}>
                    <MaterialIcons name='terrain' size={16} color={'#388E3C'} />
                    <Text style={styles.highlightText}>Varied terrain</Text>
                  </View>
                  <View style={styles.highlightItem}>
                    <MaterialIcons
                      name='local-florist'
                      size={16}
                      color={'#388E3C'}
                    />
                    <Text style={styles.highlightText}>Wildlife viewing</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Write a Review</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.ratingLabel}>Your Rating:</Text>
              <RatingStars rating={userRating} onRatingChange={setUserRating} />

              <TextInput
                style={styles.commentInput}
                placeholder='Share your experience...'
                value={commentText}
                onChangeText={setCommentText}
                multiline
                textAlignVertical='top'
                placeholderTextColor={'#9E9E9E'}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                ]}
                onPress={submitComment}
                disabled={submitting}
              >
                {submitting ? (
                  <View style={styles.submitButtonContent}>
                    <ActivityIndicator size='small' color='white' />
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </View>
                ) : (
                  <View style={styles.submitButtonContent}>
                    <Text style={styles.submitButtonText}>Submit Review</Text>
                    <Ionicons name='send' size={16} color='white' />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>
                Reviews {comments.length > 0 && `(${comments.length})`}
              </Text>

              {comments.length > 0 && (
                <View style={styles.sortContainer}>
                  <Text style={styles.sortLabel}>Sort by:</Text>
                  <TouchableOpacity
                    style={[
                      styles.sortButton,
                      commentSortBy === 'newest' && styles.sortButtonActive,
                    ]}
                    onPress={() => setCommentSortBy('newest')}
                  >
                    <Text
                      style={[
                        styles.sortButtonText,
                        commentSortBy === 'newest' &&
                          styles.sortButtonTextActive,
                      ]}
                    >
                      Newest
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortButton,
                      commentSortBy === 'highest_rated' &&
                        styles.sortButtonActive,
                    ]}
                    onPress={() => setCommentSortBy('highest_rated')}
                  >
                    <Text
                      style={[
                        styles.sortButtonText,
                        commentSortBy === 'highest_rated' &&
                          styles.sortButtonTextActive,
                      ]}
                    >
                      Top Rated
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortButton,
                      commentSortBy === 'oldest' && styles.sortButtonActive,
                    ]}
                    onPress={() => setCommentSortBy('oldest')}
                  >
                    <Text
                      style={[
                        styles.sortButtonText,
                        commentSortBy === 'oldest' &&
                          styles.sortButtonTextActive,
                      ]}
                    >
                      Oldest
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {comments.length === 0 ? (
              <View style={styles.emptyReviewsContainer}>
                <Ionicons
                  name='chatbubble-ellipses-outline'
                  size={40}
                  color={'#9E9E9E'}
                />
                <Text style={styles.noReviewsText}>
                  No reviews yet. Be the first to review!
                </Text>
              </View>
            ) : (
              <View style={styles.reviewsContainer}>
                {sortComments(comments, commentSortBy)
                  .slice(0, showAllComments ? comments.length : 3)
                  .map(comment => (
                    <View key={comment.id} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <View style={styles.userInfo}>
                          <View style={styles.userAvatar}>
                            <Text style={styles.userInitial}>
                              {comment.profiles?.username
                                ? comment.profiles.username[0].toUpperCase()
                                : userEmails[comment.user_id]
                                  ? userEmails[comment.user_id][0].toUpperCase()
                                  : 'A'}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.commentUser}>
                              {comment.profiles?.username ||
                                (userEmails[comment.user_id]
                                  ? userEmails[comment.user_id]
                                  : 'Anonymous')}
                            </Text>
                            <Text style={styles.commentDate}>
                              {new Date(comment.created_at).toLocaleDateString(
                                undefined,
                                {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                },
                              )}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.ratingBadge}>
                          <Text style={styles.ratingBadgeText}>
                            {comment.rating.toFixed(1)}
                          </Text>
                          <FontAwesome
                            name='star'
                            size={12}
                            color='white'
                            style={styles.ratingBadgeStar}
                          />
                        </View>
                      </View>
                      <View style={styles.commentBodyContainer}>
                        <Text style={styles.commentText}>
                          {comment.comment}
                        </Text>

                        <View style={styles.commentActions}>
                          <TouchableOpacity
                            style={[
                              styles.helpfulButton,
                              commentHelpfulVotes[comment.id] &&
                                styles.helpfulButtonActive,
                            ]}
                            onPress={() => toggleHelpfulVote(comment.id)}
                          >
                            <MaterialIcons
                              name='thumb-up'
                              size={16}
                              color={
                                commentHelpfulVotes[comment.id]
                                  ? 'white'
                                  : '#388E3C'
                              }
                            />
                            <Text
                              style={[
                                styles.helpfulButtonText,
                                commentHelpfulVotes[comment.id] &&
                                  styles.helpfulButtonTextActive,
                              ]}
                            >
                              Helpful{' '}
                              {commentHelpfulVotes[comment.id] ? '✓' : ''}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.replyButton}
                            onPress={() =>
                              setReplyingTo(
                                replyingTo === comment.id ? null : comment.id,
                              )
                            }
                          >
                            <MaterialIcons
                              name='reply'
                              size={16}
                              color={'#388E3C'}
                            />
                            <Text style={styles.replyButtonText}>Reply</Text>
                          </TouchableOpacity>
                        </View>

                        {replyingTo === comment.id && (
                          <View style={styles.replyContainer}>
                            <TextInput
                              style={styles.replyInput}
                              placeholder='Write a reply...'
                              value={replyText}
                              onChangeText={setReplyText}
                              multiline
                              placeholderTextColor={'#9E9E9E'}
                            />
                            <View style={styles.replyActions}>
                              <TouchableOpacity
                                style={styles.cancelReplyButton}
                                onPress={() => {
                                  setReplyingTo(null);
                                  setReplyText('');
                                }}
                              >
                                <Text style={styles.cancelReplyText}>
                                  Cancel
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.submitReplyButton}
                                onPress={() => submitReply(comment.id)}
                              >
                                <Text style={styles.submitReplyText}>
                                  Reply
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}

                {comments.length > 3 && (
                  <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={() => setShowAllComments(!showAllComments)}
                  >
                    <Text style={styles.showMoreText}>
                      {showAllComments
                        ? 'Show Less'
                        : `Show All ${comments.length} Reviews`}
                    </Text>
                    <MaterialIcons
                      name={showAllComments ? 'expand-less' : 'expand-more'}
                      size={20}
                      color={'#388E3C'}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = screenWidth =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    imageContainer: {
      position: 'relative',
      height: 350,
      width: '100%',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 15,
      color: '#616161',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      fontSize: 18,
      color: '#212121',
      marginVertical: 20,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    },
    goBackButton: {
      backgroundColor: '#388E3C',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 30,
      alignItems: 'center',
      minWidth: 120,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
    },
    goBackButtonText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 16,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    },
    heroImage: {
      height: '100%',
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
      padding: screenWidth < 375 ? 16 : 24, // Responsive padding
      paddingBottom: screenWidth < 375 ? 32 : 40, // Extra bottom padding for better spacing
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: screenWidth < 375 ? 20 : 24,
      borderTopRightRadius: screenWidth < 375 ? 20 : 24,
      marginTop: screenWidth < 375 ? -20 : -24,
    },
    title: {
      fontSize: screenWidth < 375 ? 24 : 28, // Responsive font size
      fontWeight: '700',
      color: '#212121',
      marginBottom: screenWidth < 375 ? 10 : 12,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
      letterSpacing: -0.5,
      lineHeight: screenWidth < 375 ? 28 : 32, // Better line height
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
      marginVertical: screenWidth < 375 ? 20 : 24, // Responsive spacing
      marginHorizontal: screenWidth < 375 ? 8 : 12, // Add horizontal margin for visual breathing room
    },
    section: {
      marginBottom: screenWidth < 375 ? 20 : 28, // Responsive section spacing
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
    mapPlaceholder: {
      height: 200,
      backgroundColor: '#F5F5F5',
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      borderWidth: 1,
      borderColor: '#EEEEEE',
    },
    mapPlaceholderText: {
      textAlign: 'center',
      color: '#9E9E9E',
      marginTop: 10,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
    },
    map: {
      height: 200,
      width: '100%',
      borderRadius: 16,
    },
    directionsButton: {
      backgroundColor: '#388E3C',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: screenWidth < 375 ? 14 : 12, // Better touch target
      margin: screenWidth < 375 ? 10 : 12,
      borderRadius: 30,
      elevation: 0,
      minHeight: 48, // Minimum touch target size
    },
    directionsButtonText: {
      color: 'white',
      fontWeight: '600',
      marginRight: 8,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    },
    reviewCard: {
      backgroundColor: '#F9F9F9',
      borderRadius: 16,
      padding: 16,
      elevation: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      borderWidth: 1,
      borderColor: '#EEEEEE',
    },
    ratingLabel: {
      fontSize: 16,
      color: '#212121',
      marginBottom: 8,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    },
    ratingStarsContainer: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    starButton: {
      padding: screenWidth < 375 ? 6 : 4, // Better touch target
      marginRight: 6,
      minWidth: 32, // Minimum touch target width
      minHeight: 32, // Minimum touch target height
      justifyContent: 'center',
      alignItems: 'center',
    },
    commentInput: {
      borderWidth: 1,
      borderColor: '#EEEEEE',
      borderRadius: 12,
      padding: 14,
      minHeight: 100,
      fontSize: 16,
      marginBottom: 16,
      backgroundColor: '#FFFFFF',
      color: '#212121',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    submitButton: {
      backgroundColor: '#388E3C',
      padding: screenWidth < 375 ? 16 : 14, // Better touch target
      borderRadius: 30,
      alignItems: 'center',
      elevation: 0,
      minHeight: 48, // Minimum touch target size
    },
    submitButtonDisabled: {
      backgroundColor: '#9E9E9E',
    },
    submitButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 16,
      marginHorizontal: 8,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    },
    emptyReviewsContainer: {
      backgroundColor: '#F9F9F9',
      borderRadius: 16,
      padding: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#EEEEEE',
      borderStyle: 'dashed',
    },
    noReviewsText: {
      fontStyle: 'italic',
      color: '#9E9E9E',
      marginTop: 10,
      textAlign: 'center',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
    },
    reviewsContainer: {
      gap: 16,
    },
    commentCard: {
      backgroundColor: '#F9F9F9',
      borderRadius: 16,
      padding: 0,
      overflow: 'hidden',
      elevation: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      borderWidth: 1,
      borderColor: '#EEEEEE',
    },
    commentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#EEEEEE',
      backgroundColor: 'rgba(56, 142, 60, 0.05)', // Very light green background
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: '80%',
    },
    userAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#388E3C',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    userInitial: {
      color: 'white',
      fontWeight: '600',
      fontSize: 16,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    },
    commentUser: {
      fontWeight: '600',
      fontSize: 16,
      color: '#212121',
      marginBottom: 2,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    },
    commentDate: {
      color: '#9E9E9E',
      fontSize: 12,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    ratingBadge: {
      backgroundColor: '#388E3C',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 16,
      minWidth: 50,
    },
    ratingBadgeText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 14,
      marginRight: 3,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    },
    ratingBadgeStar: {
      marginBottom: 1,
    },
    commentBodyContainer: {
      padding: 16,
      backgroundColor: '#FFFFFF',
    },
    commentText: {
      fontSize: 15,
      lineHeight: 22,
      color: '#212121',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
    },
    // Voting styles
    voteContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    voteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: screenWidth < 375 ? 14 : 12, // Better touch target
      paddingVertical: screenWidth < 375 ? 8 : 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#388E3C',
      backgroundColor: '#FFFFFF',
      gap: 4,
      minHeight: 36, // Minimum touch target height
    },
    voteButtonActive: {
      backgroundColor: '#388E3C',
    },
    voteText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#388E3C',
    },
    voteTextActive: {
      color: 'white',
    },
    // Info grid styles - Responsive design
    infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: screenWidth < 375 ? 8 : 12, // Smaller gap on smaller screens
      justifyContent: 'space-between',
    },
    infoCard: {
      flex: 1,
      minWidth: screenWidth < 375 ? '47%' : '45%', // Adjust width for small screens
      maxWidth: screenWidth < 375 ? '47%' : '48%',
      backgroundColor: '#F9F9F9',
      borderRadius: screenWidth < 375 ? 10 : 12,
      padding: screenWidth < 375 ? 12 : 16, // Smaller padding on small screens
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#EEEEEE',
      minHeight: screenWidth < 375 ? 80 : 90, // Ensure consistent height
    },
    infoLabel: {
      fontSize: 12,
      color: '#616161',
      marginTop: 8,
      marginBottom: 4,
      textAlign: 'center',
    },
    infoValue: {
      fontSize: 16,
      fontWeight: '600',
      color: '#212121',
      textAlign: 'center',
    },
    difficultyContainer: {
      flexDirection: 'row',
      gap: 2,
    },
    // Weather styles
    weatherHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    weatherUpdateTime: {
      fontSize: 12,
      color: '#9E9E9E',
      fontStyle: 'italic',
    },
    weatherLocationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 4,
    },
    weatherLocation: {
      fontSize: 14,
      color: '#616161',
      fontWeight: '500',
    },
    weatherElevation: {
      fontSize: 12,
      color: '#9E9E9E',
      fontWeight: '400',
    },
    weatherCard: {
      backgroundColor: '#F9F9F9',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: '#EEEEEE',
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    weatherMain: {
      marginBottom: 20,
    },
    weatherTempSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 12,
    },
    weatherTempInfo: {
      flex: 1,
    },
    weatherTemp: {
      fontSize: 32,
      fontWeight: '700',
      color: '#212121',
      lineHeight: 36,
    },
    weatherFeelsLike: {
      fontSize: 14,
      color: '#616161',
      marginTop: 2,
    },
    weatherDesc: {
      fontSize: 18,
      color: '#616161',
      textTransform: 'capitalize',
      fontWeight: '500',
    },
    weatherDetailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 8,
    },
    weatherDetailCard: {
      width: screenWidth < 375 ? '48%' : '30%',
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#EEEEEE',
      minHeight: 70,
      marginBottom: 8,
    },
    weatherDetailValue: {
      fontSize: 16,
      fontWeight: '600',
      color: '#212121',
      marginTop: 4,
    },
    weatherDetailLabel: {
      fontSize: 12,
      color: '#616161',
      marginTop: 2,
      textAlign: 'center',
    },
    refreshWeatherButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#388E3C',
      backgroundColor: '#FFFFFF',
      alignSelf: 'center',
      gap: 6,
    },
    refreshWeatherText: {
      fontSize: 14,
      color: '#388E3C',
      fontWeight: '500',
    },
    weatherItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    weatherItemText: {
      fontSize: 14,
      color: '#616161',
    },
    weatherLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      gap: 10,
    },
    weatherError: {
      textAlign: 'center',
      color: '#9E9E9E',
      fontStyle: 'italic',
      padding: 20,
    },
    // Travel info styles
    travelCard: {
      backgroundColor: '#F9F9F9',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#EEEEEE',
      gap: 12,
    },
    travelItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    travelInfo: {
      flex: 1,
    },
    travelDistance: {
      fontSize: 18,
      fontWeight: '600',
      color: '#212121',
    },
    travelTime: {
      fontSize: 18,
      fontWeight: '600',
      color: '#212121',
    },
    travelLabel: {
      fontSize: 14,
      color: '#616161',
    },
    travelLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      gap: 10,
    },
    travelError: {
      textAlign: 'center',
      color: '#9E9E9E',
      fontStyle: 'italic',
      padding: 20,
    },
    // Map enhancement styles
    customMarker: {
      backgroundColor: '#388E3C',
      padding: 8,
      borderRadius: 20,
      borderWidth: 3,
      borderColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    customMarkerEnd: {
      backgroundColor: '#FF5722',
      padding: 8,
      borderRadius: 20,
      borderWidth: 3,
      borderColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    customMarkerViewpoint: {
      backgroundColor: '#2196F3',
      padding: 6,
      borderRadius: 15,
      borderWidth: 2,
      borderColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },
    customMarkerRest: {
      backgroundColor: '#FF9800',
      padding: 6,
      borderRadius: 15,
      borderWidth: 2,
      borderColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },
    mapInfo: {
      marginTop: 15,
      padding: 15,
      backgroundColor: '#F9F9F9',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#EEEEEE',
    },
    mapLegendGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: screenWidth < 375 ? 'flex-start' : 'space-between',
      marginBottom: 15,
      gap: screenWidth < 375 ? 8 : 0, // Add gap for small screens
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      width: screenWidth < 375 ? '100%' : '48%', // Full width on small screens
      marginBottom: screenWidth < 375 ? 8 : 8, // Consistent spacing
    },
    legendMarker: {
      width: 24,
      height: 24,
      borderRadius: 12,
      marginRight: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'white',
    },
    legendText: {
      fontSize: 12,
      color: '#212121',
      fontFamily: 'Poppins-Regular',
      flex: 1,
    },
    mapStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: '#EEEEEE',
    },
    mapStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    mapStatText: {
      fontSize: 13,
      color: '#212121',
      fontFamily: 'Poppins-Medium',
      marginLeft: 6,
    },
    mapActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 15,
      gap: 10,
    },
    mapActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F9F9F9',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: '#388E3C',
      flex: 1,
      gap: 6,
    },
    mapActionText: {
      color: '#388E3C',
      fontSize: 14,
      fontFamily: 'Poppins-SemiBold',
    },
    mapTypeButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },

    // Enhanced Reviews Section
    reviewsHeader: {
      marginBottom: 16,
    },
    sortContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      flexWrap: 'wrap',
    },
    sortLabel: {
      fontSize: 14,
      color: '#616161',
      marginRight: 8,
      fontWeight: '500',
    },
    sortButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: '#F9F9F9',
      borderWidth: 1,
      borderColor: '#EEEEEE',
      marginRight: 8,
      marginBottom: 4,
    },
    sortButtonActive: {
      backgroundColor: '#388E3C',
      borderColor: '#388E3C',
    },
    sortButtonText: {
      fontSize: 12,
      color: '#616161',
      fontWeight: '500',
    },
    sortButtonTextActive: {
      color: 'white',
    },
    commentActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#EEEEEE',
    },
    helpfulButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: '#F9F9F9',
      borderWidth: 1,
      borderColor: '#388E3C',
      marginRight: 12,
    },
    helpfulButtonActive: {
      backgroundColor: '#388E3C',
    },
    helpfulButtonText: {
      fontSize: 12,
      color: '#388E3C',
      marginLeft: 4,
      fontWeight: '500',
    },
    helpfulButtonTextActive: {
      color: 'white',
    },
    replyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: '#F9F9F9',
      borderWidth: 1,
      borderColor: '#EEEEEE',
    },
    replyButtonText: {
      fontSize: 12,
      color: '#388E3C',
      marginLeft: 4,
      fontWeight: '500',
    },
    replyContainer: {
      marginTop: 12,
      padding: 12,
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#EEEEEE',
    },
    replyInput: {
      borderWidth: 1,
      borderColor: '#EEEEEE',
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: '#212121',
      backgroundColor: 'white',
      minHeight: 80,
      textAlignVertical: 'top',
    },
    replyActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 8,
    },
    cancelReplyButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      marginRight: 8,
    },
    cancelReplyText: {
      fontSize: 14,
      color: '#616161',
      fontWeight: '500',
    },
    submitReplyButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: '#388E3C',
    },
    submitReplyText: {
      fontSize: 14,
      color: 'white',
      fontWeight: '600',
    },
    showMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      marginTop: 16,
      borderTopWidth: 1,
      borderTopColor: '#EEEEEE',
    },
    showMoreText: {
      fontSize: 14,
      color: '#388E3C',
      fontWeight: '500',
      marginRight: 4,
    },

    babagTrailMapContainer: {
      marginBottom: 16,
      borderRadius: 12,
      overflow: 'hidden',
    },

    // Route information styles
    trailInfoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    selectedRouteIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F9F9F9',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#EEEEEE',
    },
    routeColorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    selectedRouteName: {
      fontSize: 12,
      fontWeight: '600',
      color: '#212121',
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
