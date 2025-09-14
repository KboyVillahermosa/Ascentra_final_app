import React, { useState, useEffect } from 'react';
import type { JSX } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { supabase } from '../services/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActivityFeedComponent from '../components/ActivityFeedComponent';
// import FavoritesComponent from '../components/FavoritesComponent'; // Replaced with inline implementation
import AchievementsComponent from '../components/AchievementsComponent';
import FriendsComponent from '../components/FriendsComponent';
import { getHikesForUser } from '../services/databaseService';
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatPace,
} from '../utils/formatters';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { User } from '@supabase/supabase-js';
import { RootStackParamList } from '../App';
import { useProgression } from '../hooks/useProgression';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';

type ProfileScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Profile'
>;
type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;

interface ProfileScreenProps {
  navigation: ProfileScreenNavigationProp;
  route: ProfileScreenRouteProp;
}

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  cover_photo_url?: string;
  skill_level?: string;
  total_km_traveled?: number;
}

interface Post {
  id: string;
  content?: string;
  image_url?: string;
  created_at: string;
  user_id: string;
  visibility?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

interface UserStats {
  postsCount: number;
  hikesCount: number;
  totalDistance: number;
}

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
}

interface Hike {
  id: string;
  title?: string;
  description?: string;
  date: string;
  distance: number;
  duration: number;
  elevation: number;
  media?: MediaItem[];
}

export default function ProfileScreen({
  route,
  navigation,
}: ProfileScreenProps) {
  const { userId } = route.params || { userId: undefined };
  const { user: currentUser } = useAuth();
  const {
    profile: globalProfile,
    loading: profileLoading,
    refreshProfile,
    favorites,
    favoritesLoading,
    addToFavorites,
    removeFromFavorites,
    isSpotFavorited,
    refreshFavorites,
  } = useProfile();

  // For viewing other users' profiles, we still need local state
  const [otherUserProfile, setOtherUserProfile] = useState<Profile | null>(
    null,
  );
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [postsLoading, setPostsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [stats, setStats] = useState<UserStats>({
    postsCount: 0,
    hikesCount: 0,
    totalDistance: 0,
  });

  // Add state for hikes
  const [hikes, setHikes] = useState<Hike[]>([]);
  const [hikesLoading, setHikesLoading] = useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('Posts');

  // Determine if we're viewing the current user's profile or someone else's
  const isOwnProfile = !userId || (currentUser && userId === currentUser.id);
  const profileId = userId || currentUser?.id;

  // Use global profile for own profile, local state for others
  const profile = isOwnProfile ? globalProfile : otherUserProfile;

  // Use progression hook for current user only
  const {
    userStats: progressionStats,
    loading: progressionLoading,
    skillLevelProgress,
    nextLevelInfo,
    fetchUserStats: fetchProgressionStats,
  } = useProgression();

  // Skill level mapping
  const SKILL_LEVELS = {
    rookie_rambler: { emoji: '🌱', name: 'Rookie Rambler', color: '#4CAF50' },
    climb_chaser: { emoji: '🌄', name: 'Climb Chaser', color: '#FF9800' },
    rock_scrambler: { emoji: '🔗', name: 'Rock Scrambler', color: '#795548' },
    summit_strider: { emoji: '🧗', name: 'Summit Strider', color: '#9C27B0' },
    earth_roamer: { emoji: '🌍', name: 'Earth Roamer', color: '#2196F3' },
  };

  useEffect(() => {
    if (currentUser) {
      if (isOwnProfile) {
        // For own profile, use global context with force refresh for immediate updates
        refreshProfile(); // This will refresh the global state
        refreshFavorites(); // Refresh favorites from global context
        fetchUserPosts(currentUser.id);
        fetchUserStats(currentUser.id);
        fetchUserHikes(currentUser.id);
      } else if (userId) {
        // For other users' profiles, use local state
        fetchOtherUserProfile(userId);
        fetchUserPosts(userId);
        fetchUserStats(userId);
        fetchUserHikes(userId);
      }
    }
  }, [currentUser, userId, isOwnProfile]);

  // Handle refresh when navigating back from EditProfile
  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.refresh && currentUser) {
        if (isOwnProfile) {
          // For own profile, refresh global context
          refreshProfile();
          refreshFavorites();
        } else if (userId) {
          fetchOtherUserProfile(userId);
        }
        const targetId = userId || currentUser.id;
        fetchUserPosts(targetId);
        fetchUserStats(targetId);
        fetchUserHikes(targetId);
        // Clear the refresh parameter
        navigation.setParams({ refresh: undefined });
      }
    }, [route.params?.refresh, currentUser, userId, isOwnProfile, refreshProfile, refreshFavorites]),
  );

  // Add function to fetch user hikes
  async function fetchUserHikes(id: string): Promise<void> {
    try {
      setHikesLoading(true);
      // Get hikes for this user
      const userHikes = await getHikesForUser(id);

      if (!userHikes || userHikes.length === 0) {
        setHikes([]);
        return;
      }

      // Log details of first hike for debugging
      if (userHikes.length > 0) {
        console.log('First hike details:', userHikes[0]);
      }

      // Sort by date (newest first)
      const sortedHikes = userHikes.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      // Limit to most recent 5 for profile view
      const recentHikes = sortedHikes.slice(0, 5);

      setHikes(recentHikes);
    } catch (error) {
      setHikes([]);
    } finally {
      setHikesLoading(false);
    }
  }

  // Function to fetch other users' profiles (not own profile)
  async function fetchOtherUserProfile(id: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id) // Use user_id to reference auth.users.id
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setOtherUserProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchOtherUserProfile:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchUserPosts(id: string): Promise<void> {
    setPostsLoading(true);
    try {
      // Build query based on whether viewing own profile or another user's profile
      let query = supabase
        .from('forum_posts')
        .select(
          `
          *,
          profiles!forum_posts_user_id_fkey (username, avatar_url)
        `,
        )
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      // If viewing another user's profile, only show public posts
      if (!isOwnProfile) {
        query = query.eq('visibility', 'public');
      }
      // If viewing own profile, show all posts (public and private)

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user posts:', error);
      } else {
        // Transform data to match expected Post interface
        const transformedPosts = data.map((post: any) => ({
          id: post.id,
          content: post.content,
          image_url: post.image_url,
          created_at: post.created_at,
          user_id: post.user_id,
          visibility: post.visibility,
          likeCount: 0, // TODO: Implement likes for forum posts
          commentCount: 0, // TODO: Implement comments count
          isLiked: false, // TODO: Implement like status
          profiles: post.profiles,
        }));

        setPosts(transformedPosts);
      }
    } catch (error) {
      console.error('Error in fetchUserPosts:', error);
    } finally {
      setPostsLoading(false);
    }
  }

  // Update fetchUserStats to use forum_posts data
  async function fetchUserStats(id: string): Promise<void> {
    try {
      // Build query for post count based on profile visibility
      let postsQuery = supabase
        .from('forum_posts')
        .select('id', { count: 'exact' })
        .eq('user_id', id);

      // If viewing another user's profile, only count public posts
      if (!isOwnProfile) {
        postsQuery = postsQuery.eq('visibility', 'public');
      }
      // If viewing own profile, count all posts (public and private)

      const { data: postsData, error: postsError } = await postsQuery;

      // Get hikes count and total distance from local storage
      const userHikes = await getHikesForUser(id);

      // Calculate total distance from local hikes
      const totalDistance = userHikes.reduce(
        (sum, hike) => sum + (hike.distance || 0),
        0,
      );

      setStats({
        postsCount: postsData?.length || 0,
        hikesCount: userHikes?.length || 0,
        totalDistance: totalDistance / 1000, // Convert to km
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }

  function onRefresh(): void {
    setRefreshing(true);

    const refreshPromises = [
      fetchUserPosts(profileId || ''),
      fetchUserStats(profileId || ''),
      fetchUserHikes(profileId || ''),
    ];

    if (isOwnProfile) {
      // For own profile, refresh the centralized context
      refreshPromises.push(refreshProfile());
      refreshPromises.push(refreshFavorites());
      // Add progression refresh for own profile
      if (fetchProgressionStats) {
        refreshPromises.push(fetchProgressionStats());
      }
    } else {
      // For other user profiles, fetch their data
      refreshPromises.push(fetchOtherUserProfile(profileId || ''));
    }

    Promise.all(refreshPromises).finally(() => {
      setRefreshing(false);
    });
  }

  function editProfile(): void {
    navigation.navigate('EditProfile');
  }

  async function handleSignOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert(
        'Sign Out Failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  function openSettingsModal(): void {
    setShowSettingsModal(true);
  }

  function closeSettingsModal(): void {
    setShowSettingsModal(false);
  }

  function navigateToChangePassword(): void {
    closeSettingsModal();
    navigation.navigate('ChangePassword');
  }

  function navigateToEditProfile(): void {
    closeSettingsModal();
    navigation.navigate('EditProfile');
  }

  // Function to render a hike activity item
  function renderHikeItem({ item }: { item: Hike }): JSX.Element {
    // Check if the hike has media files
    const hasMedia =
      item.media && Array.isArray(item.media) && item.media.length > 0;
    const mainImage =
      hasMedia && item.media && item.media[0]
        ? { uri: item.media[0].uri }
        : null;

    return (
      <TouchableOpacity
        style={styles.hikeCard}
        onPress={() => {
          // Navigate to activity details screen or show details modal
          Alert.alert(
            item.title || 'Hiking Activity',
            `${item.description ? item.description + '\n\n' : ''}` +
              `Date: ${formatDate(item.date)}\n` +
              `Distance: ${formatDistance(item.distance)}\n` +
              `Duration: ${formatDuration(item.duration)}\n` +
              `Elevation gain: ${item.elevation?.toFixed(0)}m`,
          );
        }}
      >
        <View style={styles.hikeCardContent}>
          <View style={styles.hikeInfo}>
            <Text style={styles.hikeTitle}>
              {item.title || 'Hiking Activity'}
            </Text>
            <Text style={styles.hikeDate}>{formatDate(item.date)}</Text>

            <View style={styles.hikeStats}>
              <View style={styles.hikeStat}>
                <Ionicons name='navigate' size={16} color='#FC4C02' />
                <Text style={styles.hikeStatText}>
                  {formatDistance(item.distance)}
                </Text>
              </View>

              <View style={styles.hikeStat}>
                <Ionicons name='time' size={16} color='#FC4C02' />
                <Text style={styles.hikeStatText}>
                  {formatDuration(item.duration)}
                </Text>
              </View>

              <View style={styles.hikeStat}>
                <Ionicons name='trending-up' size={16} color='#FC4C02' />
                <Text style={styles.hikeStatText}>
                  {item.elevation?.toFixed(0)}m
                </Text>
              </View>
            </View>
          </View>

          {mainImage && <Image source={mainImage} style={styles.hikeImage} />}
        </View>
      </TouchableOpacity>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size='large' color='#2E7D32' />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color='#333' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isOwnProfile
            ? 'My Profile'
            : `${profile?.username || 'User'}'s Profile`}
        </Text>
        {isOwnProfile ? (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={openSettingsModal}
          >
            <Ionicons name='settings-outline' size={24} color='#333' />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType='fade'
        onRequestClose={closeSettingsModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeSettingsModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Settings</Text>

              <TouchableOpacity
                style={styles.settingsOption}
                onPress={navigateToEditProfile}
              >
                <Ionicons name='person-outline' size={22} color='#333' />
                <Text style={styles.settingsOptionText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsOption}
                onPress={navigateToChangePassword}
              >
                <Ionicons name='key-outline' size={22} color='#333' />
                <Text style={styles.settingsOptionText}>Change Password</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingsOption, styles.signOutOption]}
                onPress={handleSignOut}
              >
                <Ionicons name='log-out-outline' size={22} color='#FF3B30' />
                <Text style={[styles.settingsOptionText, styles.signOutText]}>
                  Sign Out
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeSettingsModal}
              >
                <Text style={styles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Enhanced Profile Header */}
        <View style={styles.profileHeaderContainer}>
          {/* Cover Photo */}
          <View style={styles.coverPhotoContainer}>
            <Image
              source={{
                uri:
                  profile?.cover_photo_url ||
                  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=300&fit=crop',
              }}
              style={styles.coverPhoto}
            />
            <View style={styles.coverPhotoOverlay} />
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfoContainer}>
            {/* Avatar with border */}
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri:
                    profile?.avatar_url ||
                    'https://www.gravatar.com/avatar/?d=mp',
                }}
                style={styles.avatar}
              />
            </View>

            {/* Name and Skill Badge */}
            <View style={styles.nameAndBadgeContainer}>
              <Text style={styles.profileName}>
                {profile?.username || (profileLoading ? 'Loading...' : 'User')}
              </Text>

              {/* Skill Level Badge */}
              {profile?.skill_level &&
                SKILL_LEVELS[
                  profile.skill_level as keyof typeof SKILL_LEVELS
                ] ? (
                  <View
                    style={[
                      styles.skillBadge,
                      {
                        backgroundColor:
                          SKILL_LEVELS[
                            profile.skill_level as keyof typeof SKILL_LEVELS
                          ].color,
                      },
                    ]}
                  >
                    <Text style={styles.skillBadgeEmoji}>
                      {
                        SKILL_LEVELS[
                          profile.skill_level as keyof typeof SKILL_LEVELS
                        ].emoji
                      }
                    </Text>
                    <Text style={styles.skillBadgeText}>
                      {
                        SKILL_LEVELS[
                          profile.skill_level as keyof typeof SKILL_LEVELS
                        ].name
                      }
                    </Text>
                  </View>
                ) : (
                  !profileLoading && (
                    <View
                      style={[
                        styles.skillBadge,
                        {
                          backgroundColor: SKILL_LEVELS.rookie_rambler.color,
                        },
                      ]}
                    >
                      <Text style={styles.skillBadgeEmoji}>
                        {SKILL_LEVELS.rookie_rambler.emoji}
                      </Text>
                      <Text style={styles.skillBadgeText}>
                        {SKILL_LEVELS.rookie_rambler.name}
                      </Text>
                    </View>
                  )
                )}
            </View>

            {/* Bio */}
            {profile?.bio && (
              <Text style={styles.profileBio}>{profile.bio}</Text>
            )}

            {/* Edit Profile Button */}
            {isOwnProfile && (
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={editProfile}
              >
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            )}

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.postsCount}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {isOwnProfile && progressionStats
                    ? progressionStats.totalHikes
                    : stats.hikesCount}
                </Text>
                <Text style={styles.statLabel}>Hikes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {isOwnProfile && progressionStats
                    ? progressionStats.totalDistance.toFixed(1)
                    : (
                        profile?.total_km_traveled || stats.totalDistance
                      ).toFixed(1)}{' '}
                  km
                </Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {['Posts', 'About', 'Friends', 'Favorites', 'Achievements'].map(
            tab => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton,
                  activeTab === tab && styles.activeTabButton,
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </View>

        {/* Tab Content */}
        {activeTab === 'Posts' && (
          <ActivityFeedComponent
            navigation={navigation}
            userId={profile?.id}
            showCreatePost={!!isOwnProfile}
          />
        )}

        {/* About Tab */}
        {activeTab === 'About' && (
          <View style={styles.tabContent}>
            <View style={styles.aboutSection}>
              <Text style={styles.sectionTitle}>About</Text>
              <View style={styles.aboutItem}>
                <Ionicons name='person-outline' size={20} color='#666' />
                <Text style={styles.aboutText}>
                  Username: {profile?.username}
                </Text>
              </View>
              {profile?.bio && (
                <View style={styles.aboutItem}>
                  <Ionicons
                    name='information-circle-outline'
                    size={20}
                    color='#666'
                  />
                  <Text style={styles.aboutText}>Bio: {profile.bio}</Text>
                </View>
              )}
              {profile?.skill_level && (
                <View style={styles.aboutItem}>
                  <Ionicons name='trophy-outline' size={20} color='#666' />
                  <Text style={styles.aboutText}>
                    Skill Level:{' '}
                    {
                      SKILL_LEVELS[
                        profile.skill_level as keyof typeof SKILL_LEVELS
                      ]?.name
                    }
                  </Text>
                </View>
              )}
              <View style={styles.aboutItem}>
                <Ionicons name='location-outline' size={20} color='#666' />
                <Text style={styles.aboutText}>
                  Total Distance:{' '}
                  {(profile?.total_km_traveled || stats.totalDistance).toFixed(
                    1,
                  )}{' '}
                  km
                </Text>
              </View>
            </View>

            {/* Favorites Button */}
            <TouchableOpacity
              style={styles.favoritesButton}
              onPress={() => navigation.navigate('Favorites')}
            >
              <View style={styles.favoritesButtonContent}>
                <Ionicons name='heart' size={24} color='#FF6B6B' />
                <View style={styles.favoritesButtonText}>
                  <Text style={styles.favoritesButtonTitle}>My Favorites</Text>
                  <Text style={styles.favoritesButtonSubtitle}>
                    {favorites.length} favorite hiking spots
                  </Text>
                </View>
                <Ionicons name='chevron-forward' size={20} color='#999' />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Friends Tab */}
        {activeTab === 'Friends' && (
          <FriendsComponent
            userId={profile?.id || ''}
            navigation={navigation}
          />
        )}

        {/* Favorites Tab */}
        {activeTab === 'Favorites' && (
          <View style={styles.favoritesTabContainer}>
            {favoritesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading favorites...</Text>
              </View>
            ) : favorites.length > 0 ? (
              <FlatList
                data={favorites}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.favoritesRow}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.favoriteCard}
                    onPress={() => {
                      navigation.navigate('HikingSpotDetails', {
                        spot: item,
                      });
                    }}
                  >
                    <Image
                      source={{
                        uri: item.photos?.[0] || 'https://via.placeholder.com/150x100?text=No+Image',
                      }}
                      style={styles.favoriteImage}
                    />
                    <TouchableOpacity
                      style={styles.favoriteHeartButton}
                      onPress={async () => {
                        const success = await removeFromFavorites(item.id);
                        if (!success) {
                          Alert.alert('Error', 'Failed to remove from favorites');
                        }
                      }}
                    >
                      <Ionicons name="heart" size={20} color="#FF6B6B" />
                    </TouchableOpacity>
                    <View style={styles.favoriteCardContent}>
                      <Text style={styles.favoriteCardTitle} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={styles.favoriteCardLocation} numberOfLines={1}>
                        {item.location_name}
                      </Text>
                      <View style={styles.favoriteCardStats}>
                        <Text style={styles.favoriteCardStat}>
                          {item.difficulty_level}
                        </Text>
                        <Text style={styles.favoriteCardStat}>
                          {item.distance}km
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.emptyFavoritesContainer}>
                <Ionicons name="heart-outline" size={64} color="#CCC" />
                <Text style={styles.emptyFavoritesTitle}>No Favorites Yet</Text>
                <Text style={styles.emptyFavoritesSubtitle}>
                  Start exploring and add hiking spots to your favorites!
                </Text>
                <TouchableOpacity
                  style={styles.exploreButton}
                  onPress={() => navigation.navigate('Home')}
                >
                  <Text style={styles.exploreButtonText}>Explore Spots</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Achievements Tab */}
        {activeTab === 'Achievements' && (
          <AchievementsComponent userId={profile?.id || ''} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 30,
  },
  profileHeaderContainer: {
    backgroundColor: '#FFF',
    marginBottom: 0,
  },
  coverPhotoContainer: {
    position: 'relative',
    height: 200,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPhotoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  profileInfoContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    marginTop: -50,
  },
  avatarContainer: {
    backgroundColor: '#FFF',
    borderRadius: 60,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  nameAndBadgeContainer: {
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  skillBadgeEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  skillBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  profileBio: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
    lineHeight: 22,
  },
  editProfileButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginVertical: 10,
  },
  editProfileText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    marginTop: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#EEEEEE',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },
  postsSection: {
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 15,
  },

  // Add new styles for hikes
  activitiesSection: {
    marginTop: 15,
    backgroundColor: '#FFF',
    paddingBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  viewAllButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  viewAllText: {
    color: '#2E7D32',
    fontWeight: '500',
  },
  hikeCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 10,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  hikeCardContent: {
    flexDirection: 'row',
    padding: 15,
  },
  hikeInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  hikeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  hikeDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  hikeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hikeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  hikeStatText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 4,
  },
  hikeImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginLeft: 15,
  },
  hikesLoader: {
    padding: 30,
  },
  emptyHikesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    margin: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    backgroundColor: '#FAFAFA',
  },
  emptyHikesText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 15,
    marginBottom: 10,
  },
  startTrackingButton: {
    backgroundColor: '#FC4C02',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 10,
  },
  startTrackingText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 5,
  },
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
  },
  signOutOption: {
    borderBottomWidth: 0,
  },
  signOutText: {
    color: '#FF3B30',
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
  },
  aboutSection: {
    backgroundColor: '#FFF',
    margin: 10,
    borderRadius: 12,
    padding: 20,
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  aboutText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  emptyTabContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
    backgroundColor: '#FFF',
    margin: 10,
    borderRadius: 12,
  },
  emptyTabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyTabText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  favoritesButton: {
    backgroundColor: '#FFF',
    marginHorizontal: 10,
    marginTop: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  favoritesButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  favoritesButtonText: {
    flex: 1,
    marginLeft: 15,
  },
  favoritesButtonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  favoritesButtonSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  favoritesTabContainer: {
    flex: 1,
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  favoritesRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  favoriteCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 15,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  favoriteImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  favoriteHeartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  favoriteCardContent: {
    padding: 12,
  },
  favoriteCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  favoriteCardLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  favoriteCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  favoriteCardStat: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  emptyFavoritesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyFavoritesTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyFavoritesSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  exploreButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
