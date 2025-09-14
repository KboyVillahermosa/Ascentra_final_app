import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { JSX } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  FlatList,
} from 'react-native';
import { supabase } from '../services/supabaseClient';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';
import TrackScreen from './TrackScreen';
import ForumPost from './ForumPost';
import {
  formatDate,
  formatDistance,
  formatDuration,
} from '../utils/formatters';
import { getAllHikes } from '../services/databaseService';
import { CommonActions } from '@react-navigation/native';
import { User } from '@supabase/supabase-js';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { getHikingSpotImageSource, isMountBabag } from '../utils/imageHelpers';
import {
  HikingSpot,
  loadHikingSpots,
  ALLOWED_HIKING_SPOTS,
} from '../data/mockHikingSpots';
// Removed favoritesService import - now using ProfileContext
import { useProfile } from '../contexts/ProfileContext';
import { ProductionLogger as pLog } from '../utils/productionLogger';

// Skill level mapping
const SKILL_LEVELS = {
  rookie_rambler: { emoji: '🌱', name: 'Rookie Rambler', color: '#4CAF50' },
  climb_chaser: { emoji: '🌄', name: 'Climb Chaser', color: '#FF9800' },
  rock_scrambler: { emoji: '🔗', name: 'Rock Scrambler', color: '#795548' },
  summit_strider: { emoji: '🧗', name: 'Summit Strider', color: '#9C27B0' },
  earth_roamer: { emoji: '🌍', name: 'Earth Roamer', color: '#2196F3' },
};

// Removed large mock data - now loaded from separate file

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface HikingSpotCardProps {
  spot: HikingSpot;
  navigation: HomeScreenNavigationProp;
  userVote?: string;
  onVote?: (spotId: string, voteType: 'upvote' | 'downvote') => void;
}

interface HomeContentProps {
  navigation: HomeScreenNavigationProp;
  user: User | null;
}

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

const HikingSpotCard = React.memo(
  ({ spot, navigation, userVote, onVote }: HikingSpotCardProps) => {
    // Memoize optimized image source calculation using utility function
    const imageSource = useMemo(() => {
      // Mt. Babag detection handled by isMountBabag utility
      return getHikingSpotImageSource(spot);
    }, [spot.image_url, spot.name, spot.id]);

    // Memoize star calculations
    const starData = useMemo(() => {
      const rating = spot.average_rating || 0;
      const fullStars = Math.floor(rating);
      const halfStar = rating - fullStars >= 0.5;
      const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
      return { fullStars, halfStar, emptyStars, rating };
    }, [spot.average_rating]);

    // Memoize navigation handler
    const handlePress = useCallback(() => {
      navigation.navigate('HikingSpotDetails', { spot: spot });
    }, [navigation, spot]);

    // Memoize vote handlers
    const handleUpvote = useCallback(() => {
      onVote?.(spot.id, 'upvote');
    }, [onVote, spot.id]);

    const handleDownvote = useCallback(() => {
      onVote?.(spot.id, 'downvote');
    }, [onVote, spot.id]);

    return (
      <TouchableOpacity
        style={styles.modernCard}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.modernCardImageContainer}>
          <Image
            source={imageSource}
            style={styles.modernCardImage}
            resizeMode='cover'
            defaultSource={require('../assets/images/spot1.jpg')}
            onError={() => {
              // Silently handle image errors
            }}
          />
          <View style={styles.modernCardOverlay}>
            <View style={styles.modernCardBadge}>
              <Text style={styles.modernCardBadgeText}>Adventure</Text>
            </View>
            <View style={styles.modernCardRating}>
              <FontAwesome name='star' size={12} color='#FFD700' />
              <Text style={styles.modernCardRatingText}>
                {starData.rating ? starData.rating.toFixed(1) : '0.0'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.modernCardContent}>
          <Text style={styles.modernCardTitle} numberOfLines={1}>
            {spot.name}
          </Text>
          <View style={styles.modernCardLocationRow}>
            <MaterialIcons name='location-on' size={14} color='#8E8E93' />
            <Text style={styles.modernCardLocation} numberOfLines={1}>
              {spot.location}
            </Text>
          </View>

          <Text style={styles.modernCardDescription} numberOfLines={2}>
            {spot.description}
          </Text>

          <View style={styles.modernCardFooter}>
            <View style={styles.modernCardStats}>
              <Text style={styles.modernCardReviews}>
                {spot.rating_count} Reviews
              </Text>
            </View>
            <TouchableOpacity
              onPress={handlePress}
              style={styles.modernCardButton}
              activeOpacity={0.8}
            >
              <Text style={styles.modernCardButtonText}>Explore</Text>
              <MaterialIcons name='arrow-forward' size={16} color={'#2E7D32'} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);

const WelcomeCard = React.memo(() => {
  return (
    <View style={styles.welcomeCard}>
      <View style={styles.welcomeCardContent}>
        <View style={styles.welcomeCardHeader}>
          <View style={styles.welcomeCardProfile}>
            <View style={styles.welcomeCardAvatar}>
              <MaterialIcons name='person' size={16} color='#8E8E93' />
            </View>
          </View>
        </View>

        <Text style={styles.welcomeCardGreeting}>Welcome Back</Text>
        <Text style={styles.welcomeCardTitle}>
          Create Your Own{'\n'}Adventure Story ⛰️
        </Text>

        <View style={styles.welcomeCardRecommended}>
          <Text style={styles.welcomeCardRecommendedText}>
            Discover Amazing Trails 🔥
          </Text>
          <TouchableOpacity>
            <Text style={styles.welcomeCardMoreText}>Explore</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const ExploreCard = React.memo(
  ({
    spot,
    navigation,
  }: {
    spot: HikingSpot;
    navigation: HomeScreenNavigationProp;
  }) => {
    const { addToFavorites, removeFromFavorites, isSpotFavorited, favoritesLoading } = useProfile();
    
    const imageSource = useMemo(() => {
      // Mt. Babag detection handled by isMountBabag utility
      return getHikingSpotImageSource(spot);
    }, [spot.image_url, spot.name, spot.id]);

    const handlePress = useCallback(() => {
      try {
        navigation.navigate('HikingSpotDetails', { spot: spot });
      } catch (navError) {
        pLog.warn('Navigation error:', navError);
      }
    }, [navigation, spot]);

    const handleFavoriteToggle = useCallback(async () => {
      if (favoritesLoading) return;
      
      try {
        const isCurrentlyFavorited = isSpotFavorited(spot.id);
        if (isCurrentlyFavorited) {
          await removeFromFavorites(spot.id);
        } else {
          await addToFavorites({
            ...spot,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      } catch (error) {
        pLog.error('Error toggling favorite:', error);
      }
    }, [spot.id, favoritesLoading, isSpotFavorited, addToFavorites, removeFromFavorites]);

    return (
      <View style={styles.exploreCardWrapper}>
        <TouchableOpacity
          style={styles.exploreCard}
          onPress={handlePress}
          activeOpacity={0.95}
        >
          <View style={styles.exploreCardImageContainer}>
            <Image
              source={imageSource}
              style={styles.exploreCardImage}
              resizeMode='cover'
              defaultSource={require('../assets/images/spot1.jpg')}
              onError={() => {
                // Silently handle image errors without logging
              }}
            />
            <View style={styles.exploreCardOverlay}>
              <View style={styles.exploreCardTopRow}>
                <View style={styles.exploreCardBadge}>
                  <Text style={styles.exploreCardBadgeText}>Adventure</Text>
                </View>
                <TouchableOpacity
                  style={styles.exploreCardHeartButton}
                  onPress={handleFavoriteToggle}
                  disabled={favoritesLoading}
                >
                  <Ionicons
                    name={isSpotFavorited(spot.id) ? 'heart' : 'heart-outline'}
                    size={20}
                    color={isSpotFavorited(spot.id) ? '#FF6B6B' : 'white'}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.exploreCardRating}>
                <FontAwesome name='star' size={12} color='#FFD700' />
                <Text style={styles.exploreCardRatingText}>
                  {spot.average_rating ? spot.average_rating.toFixed(1) : '0.0'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.exploreCardContent}>
            <Text style={styles.exploreCardTitle} numberOfLines={1}>
              {spot.name || 'Unknown Spot'}
            </Text>
            <View style={styles.exploreCardLocationRow}>
              <MaterialIcons name='location-on' size={12} color='#8E8E93' />
              <Text style={styles.exploreCardLocation} numberOfLines={1}>
                {spot.location || 'Unknown Location'}
              </Text>
            </View>

            <Text style={styles.exploreCardDescription} numberOfLines={2}>
              {spot.description || 'No description available'}
            </Text>

            <View style={styles.exploreCardFooter}>
              <Text style={styles.exploreCardReviews}>
                {spot.rating_count || 0} Reviews
              </Text>
              <TouchableOpacity style={styles.exploreCardButton}>
                <Text style={styles.exploreCardButtonText}>Explore</Text>
                <MaterialIcons name='arrow-forward' size={14} color='#007AFF' />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  },
);

const FeaturedCard = React.memo(
  ({
    spot,
    navigation,
  }: {
    spot: HikingSpot;
    navigation: HomeScreenNavigationProp;
  }) => {
    const { addToFavorites, removeFromFavorites, isSpotFavorited, favoritesLoading } = useProfile();

    const imageSource = useMemo(() => {
      // Mt. Babag detection handled by isMountBabag utility
      return getHikingSpotImageSource(spot);
    }, [spot.image_url, spot.name, spot.id]);

    const handlePress = useCallback(() => {
      navigation.navigate('HikingSpotDetails', { spot: spot });
    }, [navigation, spot]);

    const handleFavoriteToggle = useCallback(async () => {
      if (favoritesLoading) return;
      
      try {
        const isCurrentlyFavorited = isSpotFavorited(spot.id);
        if (isCurrentlyFavorited) {
          await removeFromFavorites(spot.id);
        } else {
          await addToFavorites({
            ...spot,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error toggling favorite:', error);
      }
    }, [spot.id, favoritesLoading, isSpotFavorited, addToFavorites, removeFromFavorites]);

    return (
      <TouchableOpacity
        style={styles.featuredCard}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Image
          source={imageSource}
          style={styles.featuredCardImage}
          resizeMode='cover'
          defaultSource={require('../assets/images/spot1.jpg')}
          onError={() => {
            // Silently handle image errors
          }}
        />
        <View style={styles.featuredCardOverlay}>
          <View style={styles.featuredCardTopRow}>
            <TouchableOpacity
              style={styles.featuredCardHeartButton}
              onPress={handleFavoriteToggle}
              disabled={favoritesLoading}
            >
              <Ionicons
                name={isSpotFavorited(spot.id) ? 'heart' : 'heart-outline'}
                size={24}
                color={isSpotFavorited(spot.id) ? '#FF6B6B' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.featuredCardContent}>
            <Text style={styles.featuredCardTitle}>{spot.name}</Text>
            <View style={styles.featuredCardRating}>
              <FontAwesome name='star' size={12} color='#FFD700' />
              <Text style={styles.featuredCardRatingText}>
                {spot.average_rating ? spot.average_rating.toFixed(1) : '0.0'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);

// TopRatedCard component for the new design
const TopRatedCard = React.memo(
  ({ spot, navigation }: { spot: HikingSpot; navigation: any }) => {
    const { addToFavorites, removeFromFavorites, isSpotFavorited, favoritesLoading } = useProfile();

    const imageSource = getHikingSpotImageSource(spot);
    const rating = spot.average_rating || 0;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    const handleFavoriteToggle = useCallback(async () => {
      if (favoritesLoading) return;
      
      try {
        const isCurrentlyFavorited = isSpotFavorited(spot.id);
        if (isCurrentlyFavorited) {
          await removeFromFavorites(spot.id);
        } else {
          await addToFavorites({
            ...spot,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error toggling favorite:', error);
      }
    }, [spot.id, favoritesLoading, isSpotFavorited, addToFavorites, removeFromFavorites]);

    return (
      <TouchableOpacity
        style={styles.topRatedCard}
        onPress={() => navigation.navigate('HikingSpotDetails', { spot })}
        activeOpacity={0.8}
      >
        <View style={styles.topRatedCardImageContainer}>
          <Image
            source={imageSource}
            style={styles.topRatedCardImage}
            resizeMode='cover'
          />
          <View style={styles.topRatedCardOverlay}>
            <TouchableOpacity
              style={styles.topRatedCardHeartButton}
              onPress={handleFavoriteToggle}
              disabled={favoritesLoading}
            >
              <Ionicons
                name={isSpotFavorited(spot.id) ? 'heart' : 'heart-outline'}
                size={20}
                color={isSpotFavorited(spot.id) ? '#FF6B6B' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.topRatedCardContent}>
          <Text style={styles.topRatedCardName} numberOfLines={1}>
            {spot.name}
          </Text>
          <Text style={styles.topRatedCardType} numberOfLines={1}>
            {spot.type}
          </Text>
          <View style={styles.topRatedCardRating}>
            <View style={styles.starsContainer}>
              {[...Array(5)].map((_, index) => {
                if (index < fullStars) {
                  return (
                    <MaterialIcons
                      key={index}
                      name='star'
                      size={14}
                      color='#FFD700'
                    />
                  );
                } else if (index === fullStars && hasHalfStar) {
                  return (
                    <MaterialIcons
                      key={index}
                      name='star-half'
                      size={14}
                      color='#FFD700'
                    />
                  );
                } else {
                  return (
                    <MaterialIcons
                      key={index}
                      name='star-border'
                      size={14}
                      color='#E0E0E0'
                    />
                  );
                }
              })}
            </View>
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);

// AllSpotsCard component for the View All screen
const AllSpotsCard = React.memo(
  ({ spot, navigation }: { spot: HikingSpot; navigation: any }) => {
    const { addToFavorites, removeFromFavorites, isSpotFavorited, favoritesLoading } = useProfile();

    const imageSource = getHikingSpotImageSource(spot);
    const rating = spot.average_rating || 0;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    const handleFavoriteToggle = useCallback(async () => {
      if (favoritesLoading) return;
      
      try {
        const isCurrentlyFavorited = isSpotFavorited(spot.id);
        if (isCurrentlyFavorited) {
          await removeFromFavorites(spot.id);
        } else {
          await addToFavorites({
            ...spot,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error toggling favorite:', error);
      }
    }, [spot.id, favoritesLoading, isSpotFavorited, addToFavorites, removeFromFavorites]);

    return (
      <TouchableOpacity
        style={styles.allSpotsCard}
        onPress={() => navigation.navigate('HikingSpotDetails', { spot })}
        activeOpacity={0.8}
      >
        <View style={styles.allSpotsCardImageContainer}>
          <Image
            source={imageSource}
            style={styles.allSpotsCardImage}
            resizeMode='cover'
          />
          <View style={styles.allSpotsCardOverlay}>
            <TouchableOpacity
              style={styles.allSpotsCardHeartButton}
              onPress={handleFavoriteToggle}
              disabled={favoritesLoading}
            >
              <Ionicons
                name={isSpotFavorited(spot.id) ? 'heart' : 'heart-outline'}
                size={20}
                color={isSpotFavorited(spot.id) ? '#FF6B6B' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.allSpotsCardContent}>
          <Text style={styles.allSpotsCardName} numberOfLines={2}>
            {spot.name}
          </Text>
          <Text style={styles.allSpotsCardType} numberOfLines={1}>
            {spot.type}
          </Text>
          <View style={styles.allSpotsCardRating}>
            <View style={styles.starsContainer}>
              {[...Array(5)].map((_, index) => {
                if (index < fullStars) {
                  return (
                    <MaterialIcons
                      key={index}
                      name='star'
                      size={14}
                      color='#FFD700'
                    />
                  );
                } else if (index === fullStars && hasHalfStar) {
                  return (
                    <MaterialIcons
                      key={index}
                      name='star-half'
                      size={14}
                      color='#FFD700'
                    />
                  );
                } else {
                  return (
                    <MaterialIcons
                      key={index}
                      name='star-border'
                      size={14}
                      color='#E0E0E0'
                    />
                  );
                }
              })}
            </View>
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
          {spot.difficulty && (
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>{spot.difficulty}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  },
);

function HomeContent({ navigation, user }: HomeContentProps) {
  const [topSpots, setTopSpots] = useState<HikingSpot[]>([]);
  const [allSpots, setAllSpots] = useState<HikingSpot[]>([]);
  const [showAllSpots, setShowAllSpots] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [userVotes, setUserVotes] = useState<{ [key: string]: string }>({});
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMoreSpots, setHasMoreSpots] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredSpots, setFilteredSpots] = useState<HikingSpot[]>([]);

  // Optimized: Fetch votes only for specific spots to reduce query size
  const fetchUserVotesForSpots = useCallback(
    async (spotIds: string[]): Promise<void> => {
      if (!user || spotIds.length === 0) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from('hiking_spot_votes')
          .select('hiking_spot_id, vote_type')
          .eq('user_id', user.id)
          .in('hiking_spot_id', spotIds);

        if (error) {
          console.error('Error fetching user votes:', error);
          return;
        }

        const votesMap: { [key: string]: string } = {};
        data?.forEach((vote: any) => {
          votesMap[vote.hiking_spot_id] = vote.vote_type;
        });

        setUserVotes(prevVotes => ({ ...prevVotes, ...votesMap }));
      } catch (error) {
        console.error('Error in fetchUserVotesForSpots:', error);
      }
    },
    [user],
  );

  const fetchHikingSpots = useCallback(
    async (loadMore: boolean = false): Promise<void> => {
      const timerLabel = loadMore ? 'fetch_more_spots' : 'fetch_initial_spots';
      // PerformanceMonitor.startTimer(timerLabel);

      try {
        if (!loadMore) {
          setLoading(true);
          setError(null);
          setNetworkError(false);
        } else {
          setLoadingMore(true);
        }

        // Simulate a small delay to mimic API call
        await new Promise(resolve => setTimeout(resolve, 300));

        // Use mock data instead of database query
        const spots = await loadHikingSpots();

        if (loadMore) {
          // For loadMore, we don't have additional data since we have all 15 spots
          setHasMoreSpots(false);
        } else {
          setAllSpots(spots);
          setTopSpots(spots.slice(0, 5)); // Top 5 for homepage
          setHasMoreSpots(false); // No more spots to load
        }

        // Batch fetch user's votes for all spots at once if logged in
        if (user && spots.length > 0) {
          await fetchUserVotesForSpots(spots.map((spot: any) => spot.id));
        }

        // PerformanceMonitor.endTimer(timerLabel);
      } catch (error) {
        if (!loadMore) {
          if (
            error instanceof Error &&
            (error.message?.includes('network') ||
              error.message?.includes('fetch'))
          ) {
            setNetworkError(true);
          } else {
            setError(
              error instanceof Error
                ? error.message
                : 'Failed to load hiking spots',
            );
          }
        }
        // PerformanceMonitor.endTimer(timerLabel);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [user?.id, fetchUserVotesForSpots],
  );

  const fetchHikingSpotsCallback = useCallback(() => {
    fetchHikingSpots();
  }, [fetchHikingSpots]);

  useEffect(() => {
    fetchHikingSpotsCallback();
  }, [fetchHikingSpotsCallback]);

  // Memoized search functionality to prevent unnecessary re-renders
  const filteredSpotsResult = useMemo(() => {
    if (searchQuery.trim() === '') {
      return [];
    }
    return allSpots.filter(
      spot =>
        (spot.name &&
          spot.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (spot.location &&
          spot.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (spot.description &&
          spot.description.toLowerCase().includes(searchQuery.toLowerCase())),
    );
  }, [searchQuery, allSpots]);

  useEffect(() => {
    setFilteredSpots(filteredSpotsResult);
  }, [filteredSpotsResult]);

  // Memoize vote handler to prevent unnecessary re-renders
  const handleVote = useCallback(
    async (spotId: string, voteType: 'upvote' | 'downvote'): Promise<void> => {
      if (!user) {
        Alert.alert(
          'Sign In Required',
          'Please sign in to vote on hiking spots',
        );
        return;
      }

      try {
        const currentVote = userVotes[spotId];

        if (currentVote === voteType) {
          // Remove vote if clicking the same vote type
          const { error } = await supabase
            .from('hiking_spot_votes')
            .delete()
            .eq('hiking_spot_id', spotId)
            .eq('user_id', user.id);

          if (error) {
            throw error;
          }

          const newVotes = { ...userVotes };
          delete newVotes[spotId];
          setUserVotes(newVotes);
        } else {
          // Insert or update vote
          const { error } = await supabase.from('hiking_spot_votes').upsert({
            hiking_spot_id: spotId,
            user_id: user.id,
            vote_type: voteType,
          });

          if (error) {
            throw error;
          }

          setUserVotes({ ...userVotes, [spotId]: voteType });
        }

        // Refresh spots to get updated vote counts
        await fetchHikingSpots();
      } catch (error) {
        Alert.alert('Error', 'Failed to submit vote');
      }
    },
    [user, userVotes, fetchHikingSpots],
  );

  // Function to fetch all hiking spots
  const fetchAllHikingSpots = useCallback(async (): Promise<void> => {
    const timerLabel = 'fetch_all_spots';
    // PerformanceMonitor.startTimer(timerLabel);

    try {
      setLoading(true);
      setError(null);
      setNetworkError(false);

      // Fetch all hiking spots without limit
      const { data, error } = await supabase
        .from('hiking_spots')
        .select(
          `
            id,
            name,
            description,
            difficulty,
            location,
            image_url,
            average_rating,
            rating_count,
            type,
            category
          `,
        )
        .order('average_rating', { ascending: false });

      if (error) {
        if (
          error.message?.includes('network') ||
          error.message?.includes('fetch')
        ) {
          setNetworkError(true);
        } else {
          setError(error.message || 'Failed to load hiking spots');
        }
        return;
      }

      const spots = data || [];

      // Filter to show only the 15 specified hiking spots
      const filteredSpots = spots
        .filter((spot: any) => ALLOWED_HIKING_SPOTS.includes(parseInt(spot.id)))
        .map((spot: any) => ({
          ...spot,
          upvotes: 0,
          downvotes: 0,
          vote_score: 0,
          combined_score: 0,
        }));

      setAllSpots(filteredSpots);
      setTopSpots(filteredSpots.slice(0, 5)); // Keep top 5 for homepage
      setHasMoreSpots(false); // No more spots to load since we have all

      // Batch fetch user's votes for all spots at once if logged in
      if (user && spots.length > 0) {
        await fetchUserVotesForSpots(spots.map(spot => spot.id));
      }

      // PerformanceMonitor.endTimer(timerLabel);
    } catch (error) {
      console.error(
        'Error fetching all hiking spots:',
        error instanceof Error ? error.message : error,
      );
      if (
        error instanceof Error &&
        (error.message?.includes('network') || error.message?.includes('fetch'))
      ) {
        setNetworkError(true);
      } else {
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to load hiking spots',
        );
      }
      // PerformanceMonitor.endTimer(timerLabel);
    } finally {
      setLoading(false);
    }
  }, [user, fetchUserVotesForSpots]);

  // Load more spots function
  const loadMoreSpots = useCallback(() => {
    if (!loadingMore && hasMoreSpots && showAllSpots) {
      fetchHikingSpots(true);
    }
  }, [loadingMore, hasMoreSpots, showAllSpots]);

  const onRefresh = useCallback((): void => {
    setRefreshing(true);
    setError(null);
    setNetworkError(false);
    setAllSpots([]);
    setTopSpots([]);
    setHasMoreSpots(true);
    fetchHikingSpots();
  }, []);

  if (loading && !refreshing) {
    if (networkError) {
      return (
        <SafeAreaView style={styles.safeArea}>
          {/* <NetworkErrorFallback onRetry={() => fetchHikingSpots()} /> */}
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>Network Error</Text>
            <Text style={styles.emptyStateSubtext}>
              Please check your connection and try again
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    if (error) {
      return (
        <SafeAreaView style={styles.safeArea}>
          {/* <GenericErrorFallback onRetry={() => fetchHikingSpots()} /> */}
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>Something went wrong</Text>
            <Text style={styles.emptyStateSubtext}>Please try again later</Text>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle='dark-content' backgroundColor='#FFFFFF' />

        <View style={styles.header}>
          <Image
            source={require('../assets/images/ascentra.png')}
            style={styles.logo}
          />
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSubtitle}>
            Explore Cebu's best hiking trails
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top 5 Rated Spots</Text>
          </View>

          {/* <HikingSpotSkeleton count={5} /> */}
          <View style={styles.emptyStateContainer}>
            <ActivityIndicator size='large' color='#2E7D32' />
            <Text style={styles.emptyStateText}>Loading hiking spots...</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle='dark-content' backgroundColor={'#F5F8F5'} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        bounces={true}
        bouncesZoom={false}
        alwaysBounceVertical={true}
        overScrollMode='auto'
        nestedScrollEnabled={false}
        keyboardShouldPersistTaps='handled'
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2E7D32']}
            tintColor={'#2E7D32'}
            progressBackgroundColor='#FFFFFF'
          />
        }
      >
        {!showAllSpots ? (
          <>
            {/* Clean Header/Banner */}
            <View style={styles.cleanHeader}>
              <View style={styles.headerBanner}>
                <Image
                  source={require('../assets/images/ascentra.png')}
                  style={styles.headerLogo}
                  onError={error => {}}
                />
              </View>

              {/* Search Bar */}
              <View style={styles.modernSearchBar}>
                <Ionicons name='search' size={14} color='#666666' />
                <TextInput
                  style={styles.modernSearchInput}
                  placeholder='Search trails, locations...'
                  placeholderTextColor='#666666'
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType='search'
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name='close-circle' size={14} color='#666666' />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Search Results */}
            {searchQuery.trim() !== '' && (
              <View style={styles.searchResultsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Search Results</Text>
                  <Text style={styles.searchResultsCount}>
                    {filteredSpots.length} results
                  </Text>
                </View>
                {filteredSpots.length === 0 ? (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name='search' size={48} color='#DDD' />
                    <Text style={styles.noResultsText}>No trails found</Text>
                    <Text style={styles.noResultsSubtext}>
                      Try searching with different keywords
                    </Text>
                  </View>
                ) : (
                  <View style={styles.exploreGrid}>
                    {filteredSpots.map((spot, index) => (
                      <ExploreCard
                        key={spot.id}
                        spot={spot}
                        navigation={navigation}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Top Rated Section */}
            {searchQuery.trim() === '' &&
              topSpots &&
              Array.isArray(topSpots) &&
              topSpots.length > 0 && (
                <View style={styles.topRatedSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Top Rated</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.topRatedScrollContent}
                    decelerationRate='fast'
                    snapToInterval={280}
                    snapToAlignment='start'
                  >
                    {topSpots
                      .slice(0, 5)
                      .map((spot, index) => {
                        try {
                          if (!spot || !spot.id) {
                            return null;
                          }
                          return (
                            <TopRatedCard
                              key={spot.id || `top-rated-${index}`}
                              spot={spot}
                              navigation={navigation}
                            />
                          );
                        } catch (error) {
                          return null;
                        }
                      })
                      .filter(Boolean)}
                  </ScrollView>
                </View>
              )}

            {/* Explore All Trails Section */}
            <View style={styles.exploreSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Explore All Trails</Text>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => setShowAllSpots(true)}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <MaterialIcons
                    name='arrow-forward'
                    size={16}
                    color='#2E7D32'
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.exploreGrid}>
                {(() => {
                  if (
                    !allSpots ||
                    !Array.isArray(allSpots) ||
                    allSpots.length === 0
                  ) {
                    return (
                      <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateText}>
                          No hiking spots available
                        </Text>
                        <Text style={styles.emptyStateSubtext}>
                          Please try again later
                        </Text>
                      </View>
                    );
                  }

                  // Show at least 8 spots in explore section
                  const spotsToShow = allSpots.slice(
                    0,
                    Math.max(8, allSpots.length),
                  );

                  return spotsToShow
                    .map((spot, index) => {
                      try {
                        if (!spot || !spot.id) {
                          return null;
                        }

                        return (
                          <ExploreCard
                            key={spot.id}
                            spot={spot}
                            navigation={navigation}
                          />
                        );
                      } catch (error) {
                        return null;
                      }
                    })
                    .filter(Boolean);
                })()}
              </View>
            </View>
          </>
        ) : (
          <>
            {/* All Spots View */}
            <View style={styles.allSpotsHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowAllSpots(false)}
              >
                <MaterialIcons name='arrow-back' size={24} color='#2E7D32' />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.allSpotsTitle}>All Hiking Spots</Text>
              <Text style={styles.allSpotsSubtitle}>
                {allSpots.length} amazing destinations
              </Text>
            </View>

            {/* <HikingSpotsGrid
              onSpotPress={spot =>
                navigation.navigate('HikingSpotDetails', { spot })
              }
              searchQuery={searchQuery}
            /> */}
            <Text style={styles.emptyStateText}>
              Hiking spots grid coming soon
            </Text>
          </>
        )}
      </ScrollView>

      {/* Floating forum button removed for cleaner homepage */}
    </SafeAreaView>
  );
}

function ProfileScreen({ user, profile, signOut, navigation, route }: any) {
  const { profile: contextProfile, loading: profileLoading, refreshProfile, fetchProfile } = useProfile();
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [hikeRecords, setHikeRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [mediaViewerVisible, setMediaViewerVisible] = useState<boolean>(false);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [initialMediaIndex, setInitialMediaIndex] = useState<number>(0);
  
  // Use context profile data instead of local state
  const currentProfile = contextProfile || profile;
  const avatarUrl = currentProfile?.avatar_url;
  const bio = currentProfile?.bio || 'No bio yet. Tap edit to add your bio.';

  // New state for comments
  const [commentModalVisible, setCommentModalVisible] =
    useState<boolean>(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [loadingComments, setLoadingComments] = useState<boolean>(false);
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);

  // Add state to track if we're viewing another user's profile
  const [viewingUserId, setViewingUserId] = useState<any>(null);
  const [viewingUserProfile, setViewingUserProfile] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState<boolean>(true);

  const { width } = Dimensions.get('window');
  const CARD_WIDTH = width - 32;

  useEffect(() => {
    // Check if we're viewing another user's profile from route params
    if (route?.params?.userId && route.params.userId !== user?.id) {
      setViewingUserId(route.params.userId);
      setIsOwnProfile(false);
      fetchUserProfile(route.params.userId);
      fetchUserHikeRecords(route.params.userId);
    } else {
      setIsOwnProfile(true);
      setViewingUserId(null);
      setViewingUserProfile(null);
      fetchProfile();
      fetchHikeRecords();
    }
  }, [route?.params?.userId, user?.id]);

  // Profile data is now handled by ProfileContext

  // Function to fetch another user's profile
  async function fetchUserProfile(userId: any) {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('username, bio, avatar_url, skill_level')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        return;
      }

      if (data) {
        setViewingUserProfile(data);
      }
    } catch (error) {
      console.warn('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  }

  // Modified function to fetch hike records with actual like data
  async function fetchHikeRecords() {
    try {
      setLoading(true);
      // Get hikes from AsyncStorage
      const hikes = await getAllHikes();

      // Sort by date (newest first)
      const sortedHikes = hikes.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      // Only show recent 3 hikes in profile
      const recentHikes = sortedHikes.slice(0, 3);

      // Fetch real like and comment data from Supabase
      const enhancedHikes = await Promise.all(
        recentHikes.map(async hike => {
          // Get like count
          const { count: likesCount, error: likesError } = await supabase
            .from('activity_likes')
            .select('id', { count: 'exact', head: true })
            .eq('activity_id', hike.id);

          // Check if current user has liked this activity
          const { data: userLike, error: userLikeError } = await supabase
            .from('activity_likes')
            .select('id')
            .eq('activity_id', hike.id)
            .eq('user_id', user?.id)
            .maybeSingle();

          // Get comment count
          const { count: commentsCount, error: commentsError } = await supabase
            .from('activity_comments')
            .select('id', { count: 'exact', head: true })
            .eq('activity_id', hike.id);

          return {
            ...hike,
            likes: likesCount || 0,
            comments: commentsCount || 0,
            isLiked: !!userLike,
          };
        }),
      );

      setHikeRecords(enhancedHikes);
    } catch (error) {
      console.error('Error fetching hike records:', error);
      setHikeRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Function to fetch another user's hike records
  async function fetchUserHikeRecords(userId: any) {
    try {
      setLoading(true);

      // Fetch hikes from the database for a specific user
      const { data: hikes, error } = await supabase
        .from('hikes')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(10); // Increased the limit to show more activities

      if (error) {
        setHikeRecords([]);
        return;
      }

      // Fetch real like and comment data from Supabase
      const enhancedHikes = await Promise.all(
        (hikes || []).map(async hike => {
          // Get like count
          const { count: likesCount, error: likesError } = await supabase
            .from('activity_likes')
            .select('id', { count: 'exact', head: true })
            .eq('activity_id', hike.id);

          // Check if current user has liked this activity
          const { data: userLike, error: userLikeError } = await supabase
            .from('activity_likes')
            .select('id')
            .eq('activity_id', hike.id)
            .eq('user_id', user?.id)
            .maybeSingle();

          // Get comment count
          const { count: commentsCount, error: commentsError } = await supabase
            .from('activity_comments')
            .select('id', { count: 'exact', head: true })
            .eq('activity_id', hike.id);

          return {
            ...hike,
            likes: likesCount || 0,
            comments: commentsCount || 0,
            isLiked: !!userLike,
            // Ensure the hike has the same properties that we need
            media: hike.media || [],
            routeCoordinates: hike.routeCoordinates || [],
            // Make sure we record the original owner
            userId: userId,
          };
        }),
      );

      setHikeRecords(enhancedHikes);
    } catch (error) {
      console.error('Error fetching user hike records:', error);
      setHikeRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // New function to toggle like on activity
  const toggleLike = async (activityId: any) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to like activities');
      return;
    }

    try {
      // Find the activity in state
      const activity = hikeRecords.find(h => h.id === activityId);

      if (!activity) {
        return;
      }

      if (activity.isLiked) {
        // Unlike the activity
        const { error } = await supabase
          .from('activity_likes')
          .delete()
          .eq('activity_id', activityId)
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        // Update UI immediately
        setHikeRecords(prevRecords =>
          prevRecords.map(hike => {
            if (hike.id === activityId) {
              return {
                ...hike,
                isLiked: false,
                likes: Math.max(0, hike.likes - 1),
              };
            }
            return hike;
          }),
        );
      } else {
        // Like the activity
        const { error } = await supabase.from('activity_likes').insert({
          activity_id: activityId,
          user_id: user.id,
        });

        if (error) {
          throw error;
        }

        // Update UI immediately
        setHikeRecords(prevRecords =>
          prevRecords.map(hike => {
            if (hike.id === activityId) {
              return {
                ...hike,
                isLiked: true,
                likes: hike.likes + 1,
              };
            }
            return hike;
          }),
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Could not update like status');
    }
  };

  // New function to open comments modal
  const openComments = async (activityId: any, activityTitle: any) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to view and add comments');
      return;
    }

    setSelectedActivity({ id: activityId, title: activityTitle });
    setCommentModalVisible(true);
    await fetchComments(activityId);
  };

  // New function to fetch comments for an activity
  const fetchComments = async (activityId: any) => {
    try {
      setLoadingComments(true);

      const { data, error } = await supabase
        .from('activity_comments')
        .select('*')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setComments(data || []);
    } catch (error) {
      Alert.alert('Error', 'Could not load comments');
    } finally {
      setLoadingComments(false);
    }
  };

  // New function to submit a comment
  const submitComment = async () => {
    if (!newComment.trim() || !user || !selectedActivity) {
      return;
    }

    try {
      setSubmittingComment(true);

      // Get username from profile
      const username = profile?.username || user.email.split('@')[0];

      const { data, error } = await supabase
        .from('activity_comments')
        .insert({
          activity_id: selectedActivity.id,
          user_id: user.id,
          comment: newComment.trim(),
          username: username,
        })
        .select();

      if (error) {
        throw error;
      }

      // Add the new comment to the list
      setComments(prevComments => [data[0], ...prevComments]);
      setNewComment('');

      // Update the comment count in the hikeRecords
      setHikeRecords(prevRecords =>
        prevRecords.map(hike => {
          if (hike.id === selectedActivity.id) {
            return {
              ...hike,
              comments: hike.comments + 1,
            };
          }
          return hike;
        }),
      );
    } catch (error) {
      Alert.alert('Error', 'Could not add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // New function to delete a comment
  const deleteComment = async (commentId: any) => {
    try {
      const { error } = await supabase
        .from('activity_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Remove the deleted comment from the list
      setComments(prevComments =>
        prevComments.filter(comment => comment.id !== commentId),
      );

      // Update the comment count in the hikeRecords
      setHikeRecords(prevRecords =>
        prevRecords.map(hike => {
          if (hike.id === selectedActivity.id) {
            return {
              ...hike,
              comments: Math.max(0, hike.comments - 1),
            };
          }
          return hike;
        }),
      );
    } catch (error) {
      Alert.alert('Error', 'Could not delete comment');
    }
  };

  // Functions for media viewer
  const handleMediaPress = (media: any, index: any) => {
    setMediaItems(media);
    setInitialMediaIndex(index);
    setMediaViewerVisible(true);
  };

  // HikeHistoryItem component (updated)
  const HikeHistoryItem = ({
    hike,
    onPress,
    onMediaPress,
    onLike,
    onComment,
    isOwnProfile,
  }: any) => {
    // Check if the hike has media files and route coordinates
    const hasMedia =
      hike.media && Array.isArray(hike.media) && hike.media.length > 0;
    const hasRoute =
      hike.routeCoordinates &&
      Array.isArray(hike.routeCoordinates) &&
      hike.routeCoordinates.length > 1;

    // Calculate map region
    const getMapRegion = () => {
      if (!hasRoute) {
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

      hike.routeCoordinates.forEach((coord: any) => {
        minLat = Math.min(minLat, coord.latitude);
        maxLat = Math.max(maxLat, coord.latitude);
        minLng = Math.min(minLng, coord.longitude);
        maxLng = Math.max(maxLng, coord.longitude);
      });

      // Add padding
      const latPadding = (maxLat - minLat) * 0.2;
      const lngPadding = (maxLng - minLng) * 0.2;

      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(maxLat - minLat + latPadding, 0.01),
        longitudeDelta: Math.max(maxLng - minLng + lngPadding, 0.01),
      };
    };

    // Get activity icon based on type
    const getActivityIcon = () => {
      switch (hike.activityType) {
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

    return (
      <TouchableOpacity
        style={styles.hikeCard}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Card header with activity type */}
        <View style={styles.cardHeader}>
          <View style={styles.activityBadge}>
            <Ionicons name={getActivityIcon()} size={16} color='white' />
            <Text style={styles.activityBadgeText}>
              {hike.activityType || 'Hiking'}
            </Text>
          </View>
        </View>

        {/* Title and date */}
        <Text style={styles.hikeTitle}>{hike.title || 'Hiking Activity'}</Text>
        <Text style={styles.hikeDate}>{formatDate(hike.date)}</Text>

        {/* Description if available */}
        {hike.description ? (
          <Text style={styles.hikeDescription} numberOfLines={2}>
            {hike.description}
          </Text>
        ) : null}

        {/* Route Map Preview */}
        {hasRoute && (
          <View style={styles.mapPreviewContainer}>
            {/* <LazyMapView
              style={styles.mapPreview}
              initialRegion={getMapRegion()}
              scrollEnabled={false}
              zoomEnabled={false}
            /> */}
            <View style={styles.mapPreview}>
              <Text style={styles.emptyStateText}>Map preview coming soon</Text>
            </View>
          </View>
        )}

        {/* Render a single media item preview */}
        {hasMedia && (
          <TouchableOpacity
            onPress={() => onMediaPress(hike.media, 0)}
            style={styles.singleMediaContainer}
          >
            <Image
              source={{ uri: hike.media[0].uri }}
              style={styles.singleMediaImage}
              resizeMode='cover'
            />
            {hike.media.length > 1 && (
              <View style={styles.moreMediaBadge}>
                <Text style={styles.moreMediaText}>
                  +{hike.media.length - 1}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Stats row */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name='navigate' size={18} color='#2E7D32' />
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>
              {formatDistance(hike.distance)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Ionicons name='time' size={18} color='#2E7D32' />
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>
              {formatDuration(hike.duration)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Ionicons name='trending-up' size={18} color='#2E7D32' />
            <Text style={styles.statLabel}>Elevation</Text>
            <Text style={styles.statValue}>
              {(hike.elevation || 0).toFixed(0)}m
            </Text>
          </View>
        </View>

        {/* Engagement stats */}
        <View style={styles.engagementContainer}>
          <Text style={styles.engagementText}>
            {hike.likes} likes • {hike.comments} comments
          </Text>

          <View style={styles.engagementActions}>
            <TouchableOpacity
              style={styles.engagementAction}
              onPress={() => onLike(hike.id)}
            >
              <Ionicons
                name={hike.isLiked ? 'heart' : 'heart-outline'}
                size={22}
                color={hike.isLiked ? '#F44336' : '#757575'}
              />
              <Text
                style={[
                  styles.engagementActionText,
                  hike.isLiked && styles.engagementActionActive,
                ]}
              >
                Like
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.engagementAction}
              onPress={() => onComment(hike.id, hike.title || 'Activity')}
            >
              <Ionicons name='chatbubble-outline' size={20} color='#757575' />
              <Text style={styles.engagementActionText}>Comment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Media Viewer Modal
  const MediaViewerModal = () => (
    <Modal
      animationType='fade'
      transparent={false}
      visible={mediaViewerVisible}
      onRequestClose={() => setMediaViewerVisible(false)}
    >
      <View style={styles.mediaViewerContainer}>
        <TouchableOpacity
          style={styles.mediaViewerCloseBtn}
          onPress={() => setMediaViewerVisible(false)}
        >
          <Ionicons name='close' size={28} color='white' />
        </TouchableOpacity>

        {mediaItems.length > 0 && (
          <Image
            source={{ uri: mediaItems[initialMediaIndex].uri }}
            style={styles.fullScreenMedia}
            resizeMode='contain'
          />
        )}

        {/* Navigation buttons for prev/next image */}
        <View style={styles.mediaNavigation}>
          <TouchableOpacity
            style={styles.mediaNavButton}
            onPress={() =>
              setInitialMediaIndex(Math.max(0, initialMediaIndex - 1))
            }
            disabled={initialMediaIndex === 0}
          >
            <Ionicons
              name='chevron-back'
              size={32}
              color={initialMediaIndex === 0 ? '#555' : 'white'}
            />
          </TouchableOpacity>

          <Text style={styles.mediaCounter}>
            {initialMediaIndex + 1}/{mediaItems.length}
          </Text>

          <TouchableOpacity
            style={styles.mediaNavButton}
            onPress={() =>
              setInitialMediaIndex(
                Math.min(mediaItems.length - 1, initialMediaIndex + 1),
              )
            }
            disabled={initialMediaIndex === mediaItems.length - 1}
          >
            <Ionicons
              name='chevron-forward'
              size={32}
              color={
                initialMediaIndex === mediaItems.length - 1 ? '#555' : 'white'
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // New Comments Modal
  const CommentsModal = () => (
    <Modal
      animationType='slide'
      transparent={false}
      visible={commentModalVisible}
      onRequestClose={() => setCommentModalVisible(false)}
    >
      <SafeAreaView style={styles.commentModalContainer}>
        <View style={styles.commentModalHeader}>
          <TouchableOpacity
            style={styles.commentBackButton}
            onPress={() => setCommentModalVisible(false)}
          >
            <Ionicons name='arrow-back' size={24} color='#333' />
          </TouchableOpacity>
          <Text style={styles.commentModalTitle}>
            Comments{' '}
            {selectedActivity?.title ? `• ${selectedActivity.title}` : ''}
          </Text>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.commentContent}
          keyboardVerticalOffset={100}
        >
          {loadingComments ? (
            <ActivityIndicator
              size='large'
              color='#2E7D32'
              style={{ marginTop: 20 }}
            />
          ) : comments.length === 0 ? (
            <View style={styles.emptyCommentsContainer}>
              <Ionicons name='chatbubbles-outline' size={60} color='#DDD' />
              <Text style={styles.emptyCommentsText}>No comments yet</Text>
              <Text style={styles.emptyCommentsSubtext}>
                Be the first to leave a comment
              </Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item: any) => item.id}
              renderItem={({ item }: { item: any }) => (
                <View style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentUser}>
                      <View style={styles.commentAvatar}>
                        <Text style={styles.commentAvatarText}>
                          {(item.username || 'User').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.commentUsername}>
                          {item.username || 'User'}
                        </Text>
                        <Text style={styles.commentTime}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>

                    {item.user_id === user?.id && (
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            'Delete Comment',
                            'Are you sure you want to delete this comment?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: () => deleteComment(item.id),
                              },
                            ],
                          );
                        }}
                      >
                        <Ionicons
                          name='trash-outline'
                          size={20}
                          color='#F44336'
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.commentText}>{item.comment}</Text>
                </View>
              )}
              contentContainerStyle={styles.commentsList}
              removeClippedSubviews={true}
              maxToRenderPerBatch={5}
              updateCellsBatchingPeriod={50}
              initialNumToRender={8}
              windowSize={10}
              getItemLayout={(data, index) => ({
                length: 100,
                offset: 100 * index,
                index,
              })}
            />
          )}

          <View style={styles.addCommentContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder='Add a comment...'
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.postCommentButton,
                (!newComment.trim() || submittingComment) &&
                  styles.disabledButton,
              ]}
              onPress={submitComment}
              disabled={!newComment.trim() || submittingComment}
            >
              {submittingComment ? (
                <ActivityIndicator size='small' color='white' />
              ) : (
                <Ionicons name='send' size={20} color='white' />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );

  // Add this missing function to handle the onRefresh action
  const onRefresh = () => {
    setRefreshing(true);
    if (isOwnProfile) {
      refreshProfile(); // Use centralized profile refresh
      fetchHikeRecords();
    } else if (viewingUserId) {
      fetchUserProfile(viewingUserId);
      fetchUserHikeRecords(viewingUserId);
    }
  };

  // Add this missing function to toggle the settings modal
  const toggleSettingsModal = () => {
    setShowSettingsModal(prevState => !prevState);
  };

  // Define navigation functions
  const navigateToEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const navigateToChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  return (
    <SafeAreaView style={styles.profileContainer}>
      <StatusBar barStyle='light-content' backgroundColor='#2E7D32' />

      <View style={styles.profileHeader}>
        {/* Add back button when viewing other profiles */}
        {!isOwnProfile && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name='arrow-back' size={24} color='#212121' />
          </TouchableOpacity>
        )}

        <Text style={styles.profileHeaderTitle}>
          {isOwnProfile
            ? 'Profile'
            : viewingUserProfile?.username || 'User Profile'}
        </Text>

        {/* Only show settings when viewing own profile */}
        {isOwnProfile && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={toggleSettingsModal}
          >
            <Ionicons name='settings-outline' size={24} color='#212121' />
          </TouchableOpacity>
        )}
      </View>

      {/* Only show settings modal on own profile */}
      {isOwnProfile && (
        <Modal
          animationType='fade'
          transparent={true}
          visible={showSettingsModal}
          onRequestClose={toggleSettingsModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={toggleSettingsModal}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Settings</Text>

                <TouchableOpacity
                  style={styles.settingsOption}
                  onPress={() => {
                    toggleSettingsModal();
                    navigateToEditProfile();
                  }}
                >
                  <Ionicons name='person-outline' size={22} color='#333' />
                  <Text style={styles.settingsOptionText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.settingsOption}
                  onPress={() => {
                    toggleSettingsModal();
                    navigateToChangePassword();
                  }}
                >
                  <Ionicons name='key-outline' size={22} color='#333' />
                  <Text style={styles.settingsOptionText}>Change Password</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsOption, styles.signOutOption]}
                  onPress={() => {
                    toggleSettingsModal();
                    signOut();
                  }}
                >
                  <Ionicons name='log-out-outline' size={22} color='#F44336' />
                  <Text style={[styles.settingsOptionText, styles.signOutText]}>
                    Sign Out
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={toggleSettingsModal}
                >
                  <Text style={styles.closeButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Media Viewer Modal */}
      <MediaViewerModal />

      {/* Comments Modal */}
      <CommentsModal />

      <ScrollView
        style={styles.profileScrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#388E3C']}
            tintColor='#388E3C'
          />
        }
      >
        <View style={styles.profileContent}>
          {/* Profile image */}
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.profileAvatar}
            />
          ) : (
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {isOwnProfile
                  ? currentProfile?.username
                    ? currentProfile.username.charAt(0).toUpperCase()
                    : user?.email.charAt(0).toUpperCase()
                  : viewingUserProfile?.username
                    ? viewingUserProfile.username.charAt(0).toUpperCase()
                    : 'U'}
              </Text>
            </View>
          )}

          <Text style={styles.profileUsername}>
            {isOwnProfile
              ? currentProfile?.username || 'Username Not Set'
              : viewingUserProfile?.username || 'Username Not Available'}
          </Text>

          {/* Skill Level Badge */}
          {((isOwnProfile && currentProfile?.skill_level) ||
            (!isOwnProfile && viewingUserProfile?.skill_level)) && (
            <View
              style={[
                styles.skillBadge,
                {
                  backgroundColor:
                    SKILL_LEVELS[
                      (isOwnProfile
                        ? currentProfile?.skill_level
                        : viewingUserProfile?.skill_level) as keyof typeof SKILL_LEVELS
                    ]?.color || '#4CAF50',
                },
              ]}
            >
              <Text style={styles.skillBadgeEmoji}>
                {
                  SKILL_LEVELS[
                    (isOwnProfile
                      ? currentProfile?.skill_level
                      : viewingUserProfile?.skill_level) as keyof typeof SKILL_LEVELS
                  ]?.emoji
                }
              </Text>
              <Text style={styles.skillBadgeText}>
                {
                  SKILL_LEVELS[
                    (isOwnProfile
                      ? currentProfile?.skill_level
                      : viewingUserProfile?.skill_level) as keyof typeof SKILL_LEVELS
                  ]?.name
                }
              </Text>
            </View>
          )}

          {/* Bio section */}
          <View style={styles.bioContainer}>
            <Text style={styles.bioTitle}>
              About {isOwnProfile ? 'Me' : 'User'}
            </Text>
            <Text style={styles.bioText}>{bio}</Text>
          </View>

          {/* Stats section - simplified for other users */}
          <View style={styles.profileStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{hikeRecords.length}</Text>
              <Text style={styles.statLabel}>Activities</Text>
            </View>
            {isOwnProfile && (
              <>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>Reviews</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>Favorites</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Activity History Section */}
        <View style={styles.activityHistorySection}>
          <View style={styles.activitySectionHeader}>
            <Text style={styles.activitySectionTitle}>
              {isOwnProfile ? 'Activity History' : 'Recent Activities'}
            </Text>
            {isOwnProfile && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('HikeHistory')}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator
              size='large'
              color='#2E7D32'
              style={{ padding: 20 }}
            />
          ) : hikeRecords.length > 0 ? (
            hikeRecords.map((hike, index) => (
              <HikeHistoryItem
                key={`hike-${hike.id || index}`} // Use a combination of id and index to guarantee uniqueness
                hike={hike}
                onPress={() =>
                  navigation.navigate('HikeDetail', { hikeId: hike.id })
                }
                onMediaPress={handleMediaPress}
                onLike={toggleLike}
                onComment={openComments}
                isOwnProfile={isOwnProfile}
              />
            ))
          ) : (
            <View style={styles.emptyActivitiesContainer}>
              <Ionicons name='footsteps-outline' size={60} color='#DDD' />
              <Text style={styles.emptyActivitiesTitle}>
                No Activities {isOwnProfile ? 'Yet' : 'Found'}
              </Text>
              <Text style={styles.emptyActivitiesText}>
                {isOwnProfile
                  ? 'Start tracking to record your hiking adventures.'
                  : 'This user has not shared any activities yet.'}
              </Text>
              {isOwnProfile && (
                <TouchableOpacity
                  style={styles.startTrackingButton}
                  onPress={() => {
                    // Simple tab navigation - this should work for direct tab screens
                    navigation.navigate('Track');
                  }}
                >
                  <Text style={styles.startTrackingText}>Start Tracking</Text>
                  <Ionicons name='arrow-forward' size={16} color='white' />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function HomeScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user as any);

        // Fetch user profile - handle gracefully if profile doesn't exist
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (error) {
          // If profile doesn't exist, create a default one or continue without profile
          if (error.code === 'PGRST116') {
            // No profile found - this is okay, user can continue without profile
            console.log(
              'No profile found for user, continuing without profile',
            );
            setProfile(null);
          } else {
            // Other database errors - log but don't show alert to user
            console.error('Profile fetch error:', error.message);
            setProfile(null);
          }
        } else {
          setProfile(data as any);
        }
      }
    } catch (error) {
      // Log error for debugging but don't show alert to user
      console.error(
        'Auth error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      // Continue without user/profile
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error.message);
        // Continue with navigation even if sign out fails
      }
      navigation.navigate('Login');
    } catch (error) {
      // Log error but don't show alert - still navigate to login
      console.error(
        'Sign out error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      navigation.navigate('Login');
    }
  }

  // Navigation to view other user profiles
  const navigateToUserProfile = (userId: string) => {
    navigation.navigate('Profile', { userId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={'#2E7D32'} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2E7D32', // Blue for active tabs
        tabBarInactiveTintColor: '#8E8E93', // Gray for inactive
        headerShown: false,
        tabBarStyle: {
          elevation: 8,
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          height: Platform.OS === 'ios' ? 90 : 75,
          paddingBottom: Platform.OS === 'ios' ? 25 : 12,
          paddingTop: 10,
          paddingHorizontal: 8,
          backgroundColor: '#FFFFFF',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          borderRadius: 0,
        },
        tabBarLabelStyle: {
          fontSize: Platform.OS === 'ios' ? 13 : 12,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 4,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
          letterSpacing: 0.4,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}
    >
      <Tab.Screen
        name='Discover'
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='compass' color={color} size={28} />
          ),
          tabBarButton: props => {
            const {
              delayLongPress,
              disabled,
              onBlur,
              onFocus,
              onLongPress,
              onPressIn,
              onPressOut,
              ref,
              ...filteredProps
            } = props;
            return (
              <TouchableOpacity
                {...filteredProps}
                {...(delayLongPress !== null && delayLongPress !== undefined
                  ? { delayLongPress }
                  : {})}
                {...(disabled !== null && disabled !== undefined
                  ? { disabled }
                  : {})}
                {...(onBlur !== null && onBlur !== undefined ? { onBlur } : {})}
                {...(onFocus !== null && onFocus !== undefined
                  ? { onFocus }
                  : {})}
                {...(onLongPress !== null && onLongPress !== undefined
                  ? { onLongPress }
                  : {})}
                {...(onPressIn !== null && onPressIn !== undefined
                  ? { onPressIn }
                  : {})}
                {...(onPressOut !== null && onPressOut !== undefined
                  ? { onPressOut }
                  : {})}
                style={[
                  props.style,
                  {
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    minHeight: 56,
                    borderRadius: 8,
                    marginHorizontal: 2,
                  },
                ]}
                activeOpacity={0.6}
                onPress={event => {
                  if (props.onPress) {
                    props.onPress(event);
                  }
                }}
              >
                {props.children}
              </TouchableOpacity>
            );
          },
        }}
      >
        {props => <HomeContent {...props} user={user} />}
      </Tab.Screen>

      <Tab.Screen
        name='Track'
        component={TrackScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='footsteps' color={color} size={28} />
          ),
          tabBarButton: props => {
            const {
              delayLongPress,
              disabled,
              onBlur,
              onFocus,
              onLongPress,
              onPressIn,
              onPressOut,
              ref,
              ...filteredProps
            } = props;
            return (
              <TouchableOpacity
                {...filteredProps}
                {...(delayLongPress !== null && delayLongPress !== undefined
                  ? { delayLongPress }
                  : {})}
                {...(disabled !== null && disabled !== undefined
                  ? { disabled }
                  : {})}
                {...(onBlur !== null && onBlur !== undefined ? { onBlur } : {})}
                {...(onFocus !== null && onFocus !== undefined
                  ? { onFocus }
                  : {})}
                {...(onLongPress !== null && onLongPress !== undefined
                  ? { onLongPress }
                  : {})}
                {...(onPressIn !== null && onPressIn !== undefined
                  ? { onPressIn }
                  : {})}
                {...(onPressOut !== null && onPressOut !== undefined
                  ? { onPressOut }
                  : {})}
                style={[
                  props.style,
                  {
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    minHeight: 56,
                    borderRadius: 8,
                    marginHorizontal: 2,
                  },
                ]}
                activeOpacity={0.6}
                onPress={event => {
                  if (props.onPress) {
                    props.onPress(event);
                  }
                }}
              >
                {props.children}
              </TouchableOpacity>
            );
          },
        }}
      />

      <Tab.Screen
        name='Forum'
        component={ForumPost}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='chatbubbles' color={color} size={28} />
          ),
          tabBarButton: props => {
            const { delayLongPress, disabled, onPress, ...restProps } = props;
            // Filter out null values from props to avoid type errors
            const filteredProps = Object.fromEntries(
              Object.entries(restProps).filter(([_, value]) => value !== null),
            );
            return (
              <TouchableOpacity
                {...filteredProps}
                disabled={disabled ?? undefined}
                {...(delayLongPress !== null && delayLongPress !== undefined
                  ? { delayLongPress }
                  : {})}
                onPress={onPress ? event => onPress(event) : undefined}
                style={[
                  props.style,
                  {
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    minHeight: 56,
                    borderRadius: 8,
                    marginHorizontal: 2,
                  },
                ]}
                activeOpacity={0.6}
              >
                {props.children}
              </TouchableOpacity>
            );
          },
        }}
      />

      <Tab.Screen
        name='Profile'
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='person' color={color} size={28} />
          ),
          tabBarButton: props => {
            const { delayLongPress, disabled, onPress, ...restProps } = props;
            // Filter out null values from props to avoid type errors
            const filteredProps = Object.fromEntries(
              Object.entries(restProps).filter(([_, value]) => value !== null),
            );
            return (
              <TouchableOpacity
                {...filteredProps}
                disabled={disabled ?? undefined}
                {...(delayLongPress !== null && delayLongPress !== undefined
                  ? { delayLongPress }
                  : {})}
                onPress={onPress ? event => onPress(event) : undefined}
                style={[
                  props.style,
                  {
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    minHeight: 56,
                    borderRadius: 8,
                    marginHorizontal: 2,
                  },
                ]}
                activeOpacity={0.6}
              >
                {props.children}
              </TouchableOpacity>
            );
          },
        }}
      >
        {props => (
          <ProfileScreen
            {...props}
            user={user}
            profile={profile}
            signOut={signOut}
            navigation={navigation}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  // Simple styles for old design
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F8F5',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F8F5',
  },
  scrollContent: {
    paddingBottom: 80,
    paddingTop: 10,
    backgroundColor: '#F5F8F5',
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 140,
    height: 45,
    resizeMode: 'contain',
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2E7D32',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 5,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredSection: {
    paddingHorizontal: 0,
    marginTop: 40,
    marginBottom: 20,
  },
  featuredScrollContent: {
    paddingHorizontal: 20,
  },
  featuredCardWrapper: {
    marginRight: 15,
    width: 300,
  },
  featuredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    height: 200,
    width: '100%',
  },
  featuredCardImage: {
    width: '100%',
    height: '100%',
  },
  featuredCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    padding: 15,
  },
  featuredCardContent: {
    justifyContent: 'flex-end',
    flex: 1,
  },
  featuredCardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 5,
  },
  featuredCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  featuredCardRatingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  featuredCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  featuredCardHeartButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
    padding: 20,
  },
  featuredTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featuredBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 12,
  },
  featuredBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  featuredRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  featuredRatingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  featuredBottomContent: {
    alignItems: 'flex-start',
  },
  featuredTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  featuredLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featuredLocation: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 6,
    opacity: 0.9,
  },
  featuredButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 10,
  },
  recommendedSection: {
    paddingTop: 50,
  },
  modernSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  modernSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
  },
  modernSeeAllText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
  },
  horizontalScrollContent: {
    paddingHorizontal: 20,
  },
  modernCardWrapper: {
    marginRight: 16,
    width: 280,
  },
  modernCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  modernCardImageContainer: {
    position: 'relative',
    height: 160,
  },
  modernCardImage: {
    width: '100%',
    height: '100%',
  },
  modernCardOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modernCardBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modernCardBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  modernCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modernCardRatingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  modernCardContent: {
    padding: 16,
  },
  modernCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 5,
  },
  modernCardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modernCardLocation: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 5,
    flex: 1,
  },
  modernCardDescription: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 18,
    marginBottom: 16,
  },
  modernCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modernCardStats: {
    flex: 1,
  },
  modernCardReviews: {
    fontSize: 12,
    color: '#8E8E93',
  },
  modernCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  modernCardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginRight: 5,
  },
  exploreSection: {
    marginTop: 25,
    marginBottom: 25,
  },
  exploreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 25,
    gap: 20,
  },
  exploreCardWrapper: {
    width: width > 768 ? '31%' : width > 480 ? '48%' : '100%',
    marginBottom: 20,
    marginHorizontal: width > 768 ? '1%' : 0,
  },
  exploreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  exploreCardImageContainer: {
    position: 'relative',
    height: 120,
  },
  exploreCardImage: {
    width: '100%',
    height: '100%',
  },
  exploreCardOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  exploreCardBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  exploreCardBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2E7D32',
  },
  exploreCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  exploreCardRatingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
  },
  exploreCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  exploreCardHeartButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreCardContent: {
    padding: 15,
  },
  exploreCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 5,
    lineHeight: 20,
  },
  exploreCardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  exploreCardLocation: {
    fontSize: 11,
    color: '#666666',
    marginLeft: 4,
    flex: 1,
  },
  exploreCardDescription: {
    fontSize: 11,
    color: '#666666',
    lineHeight: 16,
    marginBottom: 8,
  },
  exploreCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exploreCardReviews: {
    fontSize: 10,
    color: '#8E8E93',
    flex: 1,
  },
  exploreCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  exploreCardButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
    marginRight: 4,
  },
  allSpotsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modernBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  modernBackButtonText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
    marginLeft: 8,
  },
  allSpotsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  listCardWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modernFabButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    shadowColor: '#2E7D32',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#9E9E9E',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 30,
    paddingBottom: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 40, // Even larger
    fontWeight: '700',
    color: '#212121', // Almost black
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -1, // Tighter letter spacing for modern look
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerTagline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#388E3C', // Darker green for better readability
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1, // Wider letter spacing for tagline
    textTransform: 'uppercase', // Uppercase for modern look
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#9E9E9E', // Medium gray
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  seeAllText: {
    fontSize: 13,
    color: '#388E3C', // Darker green
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  cardsContainer: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 0, // Remove elevation for flatter design
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderWidth: 1, // Add subtle border
    borderColor: '#F5F5F5', // Very light border
  },
  cardImage: {
    height: 200, // Taller image
    width: '100%',
  },
  cardBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(33, 33, 33, 0.85)', // Dark black with transparency
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 30,
  },
  cardBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRatingCount: {
    marginLeft: 5,
    color: '#9E9E9E',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLocation: {
    color: '#9E9E9E',
    fontSize: 12,
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  cardDescription: {
    color: '#616161',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exploreButtonText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9E9E9E',
    marginTop: 16,
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2E7D32',
    borderRadius: 30,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },

  // Profile Screen Styles
  profileContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 30,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  profileHeaderTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  settingsButton: {
    position: 'absolute',
    right: 20,
    padding: 8,
  },
  profileScrollView: {
    flex: 1,
  },
  profileContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 30,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEEEEE', // Light gray background for avatar
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  profileAvatarText: {
    fontSize: 42,
    fontWeight: '600',
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  profileUsername: {
    fontSize: 26,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 15,
    alignSelf: 'center',
  },
  skillBadgeEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  skillBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },

  bioContainer: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  bioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#388E3C', // Darker green
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  bioText: {
    fontSize: 15,
    color: '#616161',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 30,
    marginBottom: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  statLabel: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
  },
  profileActionButton: {
    flexDirection: 'row',
    backgroundColor: '#388E3C', // Darker green for buttons
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    width: '85%',
  },
  profileActionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  signOutButton: {
    marginTop: 20,
    backgroundColor: '#F44336', // Red for caution
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#388E3C', // Darker green for floating action button
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },

  // New styles for profile header with settings button
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalContent: {
    paddingTop: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingsOptionText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  signOutOption: {
    borderBottomWidth: 0,
  },
  signOutText: {
    color: '#F44336',
  },
  closeButton: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },

  // Activity History styles
  activityHistorySection: {
    marginTop: 15,
    backgroundColor: '#FFFFFF',
    paddingBottom: 20,
  },
  activitySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  activitySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  viewAllButton: {
    padding: 5,
  },
  viewAllText: {
    color: '#388E3C',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  hikeCard: {
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    padding: 12,
    backgroundColor: '#2E7D32',
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#388E3C',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  activityBadgeText: {
    fontSize: 14,
    color: 'white',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  hikeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  hikeDate: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  hikeDescription: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  mapPreviewContainer: {
    height: 180,
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  mapPreview: {
    width: '100%',
    height: '100%',
  },
  singleMediaContainer: {
    height: 180,
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  singleMediaImage: {
    width: '100%',
    height: '100%',
  },
  moreMediaBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  moreMediaText: {
    color: 'white',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  statValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#F0F0F0',
  },
  engagementContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  engagementText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  engagementActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  engagementAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  engagementActionText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  engagementActionActive: {
    color: '#F44336',
  },
  emptyActivitiesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    margin: 15,
  },
  emptyActivitiesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  emptyActivitiesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  startTrackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 15,
  },
  startTrackingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  mediaViewerContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaViewerCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 16,
    zIndex: 1,
  },
  fullScreenMedia: {
    width: '100%',
    height: '100%',
  },
  mediaNavigation: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaNavButton: {
    padding: 16,
  },
  mediaCounter: {
    fontSize: 16,
    color: 'white',
    marginHorizontal: 16,
  },
  startMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(46, 125, 50, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startMarkerInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E7D32',
  },
  endMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(211, 47, 47, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endMarkerInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D32F2F',
  },

  // Add new styles for comments
  commentModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  commentModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  commentBackButton: {
    padding: 8,
  },
  commentModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  commentContent: {
    flex: 1,
  },
  commentsList: {
    padding: 16,
  },
  commentItem: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  commentUsername: {
    fontWeight: '600',
    fontSize: 14,
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  commentTime: {
    fontSize: 12,
    color: '#9E9E9E',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  commentText: {
    fontSize: 15,
    color: '#212121',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  postCommentButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  disabledButton: {
    backgroundColor: '#C8E6C9',
  },
  emptyCommentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyCommentsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  emptyCommentsSubtext: {
    fontSize: 15,
    color: '#9E9E9E',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    padding: 8,
  },

  // New styles for the activity list view
  activityListItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  activityListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activityListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  activityListDate: {
    fontSize: 14,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  activityListStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  activityListStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityListStatValue: {
    fontSize: 14,
    color: '#333',
    marginLeft: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  activityListEngagement: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  activityListAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  activityListActionText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },

  // Voting system styles
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#F5F5F5',
  },
  voteButtonActive: {
    backgroundColor: '#F2F2F7',
  },
  voteText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  voteTextActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },

  // Back button styles
  bottomBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2E7D32',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },

  // Load more styles
  loadMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },

  // Welcome Card Styles
  welcomeCardContent: {
    flex: 1,
  },
  welcomeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeCardProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeCardGreeting: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 10,
  },
  welcomeCardTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2E7D32',
    lineHeight: 38,
    marginBottom: 30,
  },
  welcomeCardSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  welcomeCardSearchText: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  welcomeCardRecommended: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeCardRecommendedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  welcomeCardMoreText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
  },

  // Modern Header Styles
  modernHeader: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 30,
    backgroundColor: '#F5F8F5',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  modernHeaderLogo: {
    width: 280,
    height: 100,
    resizeMode: 'contain',
  },
  modernSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  modernSearchText: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 15,
    flex: 1,
  },
  modernSearchInput: {
    fontSize: 16,
    color: '#000000',
    marginLeft: 15,
    flex: 1,
    paddingVertical: 0,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#666666',
    marginTop: 16,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 16,
    color: '#999999',
    marginTop: 10,
    textAlign: 'center',
  },

  // Search Results Styles
  searchResultsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  searchResultsCount: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },

  // Empty State Styles
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#90A4AE',
    textAlign: 'center',
    marginTop: 6,
  },

  // Clean Header Styles
  cleanHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
  },
  headerBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  headerLogo: {
    width: 280,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  bottomHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 4,
  },
  bottomHeaderSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '400',
  },

  // Top Rated Section Styles
  topRatedSection: {
    marginTop: 25,
    marginBottom: 25,
  },
  bottomSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  bottomSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2E7D32',
    fontFamily: 'System',
  },
  bottomViewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
  },
  bottomViewAllText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
    marginRight: 4,
  },
  topRatedScrollContent: {
    paddingLeft: 20,
    paddingRight: 20,
  },

  // Top Rated Card Styles
  topRatedCard: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginRight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  topRatedCardImageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  topRatedCardImage: {
    width: '100%',
    height: 160,
  },
  topRatedCardOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  topRatedCardHeartButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRatedCardContent: {
    padding: 16,
  },
  topRatedCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 4,
  },
  topRatedCardType: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  topRatedCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },

  // Category Header styles
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 20,
    marginTop: 10,
    marginBottom: 15,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
    flex: 1,
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },

  // All Spots View styles
  bottomAllSpotsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  bottomAllSpotsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 4,
  },
  allSpotsSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '400',
  },
  allSpotsScrollView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  allSpotsContent: {
    paddingBottom: 20,
  },
  allSpotsGrid: {
    paddingHorizontal: 15,
    paddingTop: 20,
  },

  // All Spots Card styles
  allSpotsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  allSpotsCardImageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  allSpotsCardImage: {
    width: '100%',
    height: 180,
  },
  allSpotsCardOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  allSpotsCardHeartButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allSpotsCardContent: {
    padding: 16,
  },
  allSpotsCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 4,
    lineHeight: 24,
  },
  allSpotsCardType: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  allSpotsCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
});
