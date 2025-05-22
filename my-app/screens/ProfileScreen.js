import React, { useState, useEffect } from 'react';
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
  Modal
} from 'react-native';
import { supabase } from '../utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getHikesForUser } from '../services/databaseService';
import { formatDate, formatDistance, formatDuration, formatPace } from '../utils/formatters';

export default function ProfileScreen({ route, navigation }) {
  const { userId } = route.params || {};
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    postsCount: 0,
    hikesCount: 0,
    totalDistance: 0
  });
  
  // Add state for hikes
  const [hikes, setHikes] = useState([]);
  const [hikesLoading, setHikesLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Determine if we're viewing the current user's profile or someone else's
  const isOwnProfile = !userId || (currentUser && userId === currentUser.id);
  const profileId = userId || currentUser?.id;

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (!userId) {
        // If no userId provided, we're viewing the current user's profile
        fetchProfile(currentUser.id);
        fetchUserPosts(currentUser.id);
        fetchUserStats(currentUser.id);
        fetchUserHikes(currentUser.id);
      } else {
        // Otherwise, we're viewing someone else's profile
        fetchProfile(userId);
        fetchUserPosts(userId);
        fetchUserStats(userId);
        fetchUserHikes(userId);
      }
    }
  }, [currentUser, userId]);

  async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  }

  // Add function to fetch user hikes
  async function fetchUserHikes(id) {
    try {
      setHikesLoading(true);
      console.log('Fetching hikes for user ID:', id);
      
      // Get hikes for this user
      const userHikes = await getHikesForUser(id);
      console.log(`Received ${userHikes ? userHikes.length : 0} hikes for user ${id}`);
      
      if (!userHikes || userHikes.length === 0) {
        console.log('No hikes found for this user');
        setHikes([]);
        return;
      }
      
      // Log details of first hike for debugging
      if (userHikes.length > 0) {
        console.log('First hike details:', {
          title: userHikes[0].title,
          date: userHikes[0].date,
          hasMedia: userHikes[0].media && userHikes[0].media.length > 0
        });
      }
      
      // Sort by date (newest first)
      const sortedHikes = userHikes.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });
      
      // Limit to most recent 5 for profile view
      const recentHikes = sortedHikes.slice(0, 5);
      
      setHikes(recentHikes);
    } catch (error) {
      console.error('Error fetching user hikes:', error);
      setHikes([]);
    } finally {
      setHikesLoading(false);
    }
  }

  async function fetchProfile(id) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchUserPosts(id) {
    setPostsLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, avatar_url),
          likes:likes(count),
          comments:comments(count)
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user posts:', error);
      } else {
        // Transform data to include like counts and check if user liked it
        const postsWithLikes = await Promise.all(data.map(async (post) => {
          // Check if current user liked this post
          const { data: likeData, error: likeError } = await supabase
            .from('likes')
            .select('*')
            .eq('post_id', post.id)
            .eq('user_id', currentUser?.id)
            .single();
          
          return {
            ...post,
            likeCount: post.likes?.length || 0,
            commentCount: post.comments?.length || 0,
            isLiked: !!likeData
          };
        }));
        
        setPosts(postsWithLikes);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setPostsLoading(false);
    }
  }

  // Update fetchUserStats to use local data
  async function fetchUserStats(id) {
    try {
      // Get post count from Supabase
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id', { count: 'exact' })
        .eq('user_id', id);

      // Get hikes count and total distance from local storage
      const userHikes = await getHikesForUser(id);
      
      // Calculate total distance from local hikes
      const totalDistance = userHikes.reduce((sum, hike) => 
        sum + (hike.distance || 0), 0);
      
      setStats({
        postsCount: postsData?.length || 0,
        hikesCount: userHikes?.length || 0,
        totalDistance: totalDistance / 1000 // Convert to km
      });
      
      console.log('Updated user stats:', {
        posts: postsData?.length || 0,
        hikes: userHikes?.length || 0,
        distance: totalDistance / 1000
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    
    Promise.all([
      fetchProfile(profileId),
      fetchUserPosts(profileId),
      fetchUserStats(profileId),
      fetchUserHikes(profileId)
    ]).finally(() => {
      setRefreshing(false);
    });
  }

  async function toggleLike(postId, isLiked) {
    if (!currentUser) {
      Alert.alert('Authentication Required', 'Please log in to like posts');
      return;
    }
    
    try {
      if (isLiked) {
        // Remove like
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('post_id', postId);
      } else {
        // Add like
        await supabase
          .from('likes')
          .insert([{
            user_id: currentUser.id,
            post_id: postId
          }]);
      }
      
      // Update posts state
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1,
            isLiked: !isLiked
          };
        }
        return post;
      }));
      
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }

  function navigateToComments(postId) {
    navigation.navigate('Comments', { postId });
  }

  function editProfile() {
    navigation.navigate('EditProfile');
  }

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }]
      });
    } catch (error) {
      console.error('Error signing out:', error.message);
      Alert.alert('Sign Out Failed', error.message);
    }
  }

  function openSettingsModal() {
    setShowSettingsModal(true);
  }

  function closeSettingsModal() {
    setShowSettingsModal(false);
  }

  function navigateToChangePassword() {
    closeSettingsModal();
    navigation.navigate('ChangePassword');
  }

  function navigateToEditProfile() {
    closeSettingsModal();
    navigation.navigate('EditProfile');
  }

  function renderPostItem({ item }) {
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Image 
            source={{ 
              uri: profile?.avatar_url || 'https://www.gravatar.com/avatar/?d=mp' 
            }} 
            style={styles.smallAvatar} 
          />
          <View>
            <Text style={styles.username}>{profile?.username || 'User'}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        {item.content && (
          <Text style={styles.postContent}>{item.content}</Text>
        )}
        
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.postImage} />
        )}
        
        <View style={styles.postStats}>
          <Text style={styles.statsText}>
            {item.likeCount} {item.likeCount === 1 ? 'like' : 'likes'} • {item.commentCount} {item.commentCount === 1 ? 'comment' : 'comments'}
          </Text>
        </View>
        
        <View style={styles.postActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => toggleLike(item.id, item.isLiked)}
          >
            <Ionicons 
              name={item.isLiked ? "heart" : "heart-outline"} 
              size={22} 
              color={item.isLiked ? "#FF3B30" : "#666"} 
            />
            <Text style={[styles.actionText, item.isLiked && styles.likedText]}>Like</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigateToComments(item.id)}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#666" />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Function to render a hike activity item
  function renderHikeItem({ item }) {
    // Check if the hike has media files
    const hasMedia = item.media && Array.isArray(item.media) && item.media.length > 0;
    const mainImage = hasMedia ? { uri: item.media[0].uri } : null;
    
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
            `Elevation gain: ${item.elevation?.toFixed(0)}m`
          );
        }}
      >
        <View style={styles.hikeCardContent}>
          <View style={styles.hikeInfo}>
            <Text style={styles.hikeTitle}>{item.title || 'Hiking Activity'}</Text>
            <Text style={styles.hikeDate}>{formatDate(item.date)}</Text>
            
            <View style={styles.hikeStats}>
              <View style={styles.hikeStat}>
                <Ionicons name="navigate" size={16} color="#FC4C02" />
                <Text style={styles.hikeStatText}>{formatDistance(item.distance)}</Text>
              </View>
              
              <View style={styles.hikeStat}>
                <Ionicons name="time" size={16} color="#FC4C02" />
                <Text style={styles.hikeStatText}>{formatDuration(item.duration)}</Text>
              </View>
              
              <View style={styles.hikeStat}>
                <Ionicons name="trending-up" size={16} color="#FC4C02" />
                <Text style={styles.hikeStatText}>{item.elevation?.toFixed(0)}m</Text>
              </View>
            </View>
          </View>
          
          {mainImage && (
            <Image 
              source={mainImage} 
              style={styles.hikeImage} 
            />
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
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
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isOwnProfile ? 'My Profile' : `${profile?.username || 'User'}'s Profile`}
        </Text>
        {isOwnProfile ? (
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={openSettingsModal}
          >
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>
      
      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="fade"
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
                <Ionicons name="person-outline" size={22} color="#333" />
                <Text style={styles.settingsOptionText}>Edit Profile</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.settingsOption}
                onPress={navigateToChangePassword}
              >
                <Ionicons name="key-outline" size={22} color="#333" />
                <Text style={styles.settingsOptionText}>Change Password</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.settingsOption, styles.signOutOption]}
                onPress={handleSignOut}
              >
                <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
                <Text style={[styles.settingsOptionText, styles.signOutText]}>Sign Out</Text>
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
        <View style={styles.profileSection}>
          <Image 
            source={{ 
              uri: profile?.avatar_url || 'https://www.gravatar.com/avatar/?d=mp' 
            }} 
            style={styles.avatar} 
          />
          
          <Text style={styles.profileName}>{profile?.username || 'User'}</Text>
          
          {profile?.bio && (
            <Text style={styles.profileBio}>{profile.bio}</Text>
          )}
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.postsCount}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.hikesCount}</Text>
              <Text style={styles.statLabel}>Hikes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {stats.totalDistance.toFixed(1)} km
              </Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
          </View>
        </View>
        
        {/* Add Hiking Activities Section */}
        <View style={styles.activitiesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => {
                // Navigate to a screen showing all activities
                navigation.navigate('HikeHistory');
              }}
            >
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>
          
          {hikesLoading ? (
            <ActivityIndicator style={styles.hikesLoader} color="#2E7D32" />
          ) : hikes.length > 0 ? (
            hikes.map((hike, index) => (
              <View key={hike.id || index}>
                {renderHikeItem({ item: hike })}
              </View>
            ))
          ) : (
            <View style={styles.emptyHikesContainer}>
              <Ionicons name="footsteps-outline" size={50} color="#ccc" />
              <Text style={styles.emptyHikesText}>No hiking activities yet</Text>
              {isOwnProfile && (
                <TouchableOpacity 
                  style={styles.startTrackingButton}
                  onPress={() => navigation.navigate('Tracking')}
                >
                  <Text style={styles.startTrackingText}>Start tracking</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        
        {/* Keep existing posts section */}
        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>Posts</Text>
          
          {postsLoading ? (
            <ActivityIndicator style={styles.postsLoader} color="#2E7D32" />
          ) : posts.length > 0 ? (
            posts.map(post => renderPostItem({ item: post }))
          ) : (
            <View style={styles.emptyPostsContainer}>
              <Ionicons name="images-outline" size={50} color="#ccc" />
              <Text style={styles.emptyPostsText}>No posts yet</Text>
              {isOwnProfile && (
                <TouchableOpacity 
                  style={styles.createPostButton}
                  onPress={() => navigation.navigate('Posts')}
                >
                  <Text style={styles.createPostText}>Create your first post</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
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
  profileSection: {
    backgroundColor: '#FFF',
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
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
  },
  editProfileButton: {
    backgroundColor: '#EEEEEE',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginVertical: 10,
  },
  editProfileText: {
    color: '#333',
    fontWeight: '500',
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
  postCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 10,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  smallAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  postContent: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  postStats: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
  },
  postActions: {
    flexDirection: 'row',
    padding: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  likedText: {
    color: '#FF3B30',
  },
  emptyPostsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
    backgroundColor: '#FFF',
    margin: 10,
    borderRadius: 12,
  },
  emptyPostsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 15,
    marginBottom: 10,
  },
  createPostButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 10,
  },
  createPostText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  postsLoader: {
    padding: 30,
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
});