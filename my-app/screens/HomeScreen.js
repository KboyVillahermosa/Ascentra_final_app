import { useState, useEffect } from 'react'
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
  FlatList,
  KeyboardAvoidingView
} from 'react-native'
import { supabase } from '../utils/supabase'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons'
import TrackScreen from './TrackScreen'
import ForumPost from './ForumPost'
import { formatDate, formatDistance, formatDuration } from '../utils/formatters'
import { getAllHikes } from '../services/databaseService'
import MapView, { Polyline, PROVIDER_GOOGLE, Marker } from 'react-native-maps'
import { CommonActions } from '@react-navigation/native';

const Tab = createBottomTabNavigator()
const { width } = Dimensions.get('window');

function HikingSpotCard({ spot, navigation }) {
  // Map database paths to corresponding image requires
  const getImageSource = (path) => {
    // Check if it's already a valid URL
    if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
      return { uri: path };
    }
    
    // Map relative paths to actual image requires
    const imageMap = {
      '../assets/images/spot1.jpg': require('../assets/images/spot1.jpg'),
      '../assets/images/spot2.jpg': require('../assets/images/spot2.jpg'),
      '../assets/images/spot3.jpg': require('../assets/images/spot3.jpg'),
      '../assets/images/spot4.jpg': require('../assets/images/spot4.jpg'),
      '../assets/images/spot5.jpg': require('../assets/images/spot5.jpg'),
    };
    
    // Use the mapped image if available, or the first image as a fallback
    try {
      return imageMap[path] || require('../assets/images/spot1.jpg');
    } catch (error) {
      console.log('Error loading image:', error);
      // If all else fails, return the first image we know exists
      return require('../assets/images/spot1.jpg');
    }
  };

  // Calculate full stars, half stars and empty stars
  const fullStars = Math.floor(spot.average_rating || 0);
  const halfStar = (spot.average_rating || 0) - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('HikingSpotDetails', { spotId: spot.id })}
      activeOpacity={0.9}
    >
      <Image 
        source={getImageSource(spot.image_url)} 
        style={styles.cardImage} 
        resizeMode="cover"
        onError={() => console.log('Failed to load image:', spot.image_url)}
      />
      <View style={styles.cardBadge}>
        <Text style={styles.cardBadgeText}>Hiking</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{spot.name}</Text>
        
        <View style={styles.cardDetails}>
          <View style={styles.ratingContainer}>
            {/* Render full stars */}
            {[...Array(fullStars)].map((_, i) => (
              <FontAwesome key={`star-${i}`} name="star" size={14} color="#2E7D32" style={{marginRight: 2}} />
            ))}
            
            {/* Render half star if needed */}
            {halfStar && <FontAwesome name="star-half-o" size={14} color="#2E7D32" style={{marginRight: 2}} />}
            
            {/* Render empty stars */}
            {[...Array(emptyStars)].map((_, i) => (
              <FontAwesome key={`empty-star-${i}`} name="star-o" size={14} color="#2E7D32" style={{marginRight: 2}} />
            ))}
            
            <Text style={styles.cardRatingCount}>
              {spot.average_rating ? `${spot.average_rating.toFixed(1)} (${spot.rating_count})` : 'No ratings'}
            </Text>
          </View>
          
          <View style={styles.locationContainer}>
            <MaterialIcons name="location-on" size={16} color="#666" />
            <Text style={styles.cardLocation}>{spot.location}</Text>
          </View>
        </View>
        
        <Text style={styles.cardDescription} numberOfLines={2}>
          {spot.description}
        </Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.exploreButton}>
            <Text style={styles.exploreButtonText}>Explore</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#1976D2" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function HomeContent({ navigation, user }) {
  const [hikingSpots, setHikingSpots] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchHikingSpots()
  }, [])

  async function fetchHikingSpots() {
    try {
      setLoading(true)
      
      // Get hiking spots with average rating
      const { data, error } = await supabase
        .from('hiking_spots')
        .select(`
          id, 
          name, 
          description, 
          location, 
          image_url,
          average_rating,
          rating_count
        `)
        .eq('region', 'Cebu')
        .order('average_rating', { ascending: false })
      
      if (error) {
        throw error;
      }
      
      setHikingSpots(data || [])
    } catch (error) {
      console.error('Error fetching hiking spots:', error.message);
      Alert.alert('Connection Error', 
        'Unable to connect to the server. Please check your internet connection or try again later.'
      );
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchHikingSpots()
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading hiking spots...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
       <Image 
                        source={require('../assets/images/ascentra.png')} 
                        style={styles.logo}
                      />
        <Text style={styles.headerTitle}>Discover</Text>
        <Text style={styles.headerSubtitle}>Explore Cebu's best hiking trails</Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#2E7D32"]}
            tintColor="#2E7D32"
          />
        }
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Rated Spots</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {hikingSpots.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trail-sign-outline" size={60} color="#DDD" />
            <Text style={styles.emptyText}>No hiking spots found</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchHikingSpots}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {hikingSpots.map(spot => (
              <HikingSpotCard 
                key={spot.id} 
                spot={spot} 
                navigation={navigation} 
              />
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.fabButton}
        onPress={() => navigation.navigate('Posts')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

function ProfileScreen({ user, profile, signOut, navigation, route }) {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [bio, setBio] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [hikeRecords, setHikeRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [initialMediaIndex, setInitialMediaIndex] = useState(0);
  
  // New state for comments
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Add state to track if we're viewing another user's profile
  const [viewingUserId, setViewingUserId] = useState(null);
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  
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

  // Function to fetch user profile
  async function fetchProfile() {
    try {
      if (!user) return;
      
      // Fetch user profile with bio and avatar_url
      const { data, error } = await supabase
        .from('profiles')
        .select('username, bio, avatar_url')
        .eq('id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }
      
      if (data) {
        setBio(data.bio || 'No bio yet. Tap edit to add your bio.');
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  }

  // Function to fetch another user's profile
  async function fetchUserProfile(userId) {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('username, bio, avatar_url')
        .eq('id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        return;
      }
      
      if (data) {
        setViewingUserProfile(data);
        setBio(data.bio || 'No bio available.');
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      console.error('Error:', error.message);
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
        return new Date(b.date) - new Date(a.date);
      });
      
      // Only show recent 3 hikes in profile
      const recentHikes = sortedHikes.slice(0, 3);
      
      // Fetch real like and comment data from Supabase
      const enhancedHikes = await Promise.all(recentHikes.map(async (hike) => {
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
          isLiked: !!userLike
        };
      }));
      
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
  async function fetchUserHikeRecords(userId) {
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
        console.error('Error fetching user hikes:', error);
        setHikeRecords([]);
        return;
      }
      
      // Fetch real like and comment data from Supabase
      const enhancedHikes = await Promise.all((hikes || []).map(async (hike) => {
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
          userId: userId
        };
      }));
      
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
  const toggleLike = async (activityId) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to like activities');
      return;
    }
    
    try {
      // Find the activity in state
      const activity = hikeRecords.find(h => h.id === activityId);
      
      if (!activity) {
        console.error('Activity not found:', activityId);
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
          console.error('Error unliking activity:', error);
          throw error;
        }
        
        // Update UI immediately
        setHikeRecords(prevRecords => 
          prevRecords.map(hike => {
            if (hike.id === activityId) {
              return {
                ...hike,
                isLiked: false,
                likes: Math.max(0, hike.likes - 1)
              };
            }
            return hike;
          })
        );
      } else {
        // Like the activity
        const { error } = await supabase
          .from('activity_likes')
          .insert({
            activity_id: activityId,
            user_id: user.id
          });
          
        if (error) {
          console.error('Error liking activity:', error);
          throw error;
        }
        
        // Update UI immediately
        setHikeRecords(prevRecords => 
          prevRecords.map(hike => {
            if (hike.id === activityId) {
              return {
                ...hike,
                isLiked: true,
                likes: hike.likes + 1
              };
            }
            return hike;
          })
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Could not update like status');
    }
  };

  // New function to open comments modal
  const openComments = async (activityId, activityTitle) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to view and add comments');
      return;
    }
    
    setSelectedActivity({ id: activityId, title: activityTitle });
    setCommentModalVisible(true);
    await fetchComments(activityId);
  };
  
  // New function to fetch comments for an activity
  const fetchComments = async (activityId) => {
    try {
      setLoadingComments(true);
      
      const { data, error } = await supabase
        .from('activity_comments')
        .select('*')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Error', 'Could not load comments');
    } finally {
      setLoadingComments(false);
    }
  };
  
  // New function to submit a comment
  const submitComment = async () => {
    if (!newComment.trim() || !user || !selectedActivity) return;
    
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
          username: username
        })
        .select();
        
      if (error) throw error;
      
      // Add the new comment to the list
      setComments(prevComments => [data[0], ...prevComments]);
      setNewComment('');
      
      // Update the comment count in the hikeRecords
      setHikeRecords(prevRecords => 
        prevRecords.map(hike => {
          if (hike.id === selectedActivity.id) {
            return {
              ...hike,
              comments: hike.comments + 1
            };
          }
          return hike;
        })
      );
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Could not add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // New function to delete a comment
  const deleteComment = async (commentId) => {
    try {
      const { error } = await supabase
        .from('activity_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // Remove the deleted comment from the list
      setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
      
      // Update the comment count in the hikeRecords
      setHikeRecords(prevRecords => 
        prevRecords.map(hike => {
          if (hike.id === selectedActivity.id) {
            return {
              ...hike,
              comments: Math.max(0, hike.comments - 1)
            };
          }
          return hike;
        })
      );
    } catch (error) {
      console.error('Error deleting comment:', error);
      Alert.alert('Error', 'Could not delete comment');
    }
  };

  // Functions for media viewer
  const handleMediaPress = (media, index) => {
    setMediaItems(media);
    setInitialMediaIndex(index);
    setMediaViewerVisible(true);
  };

  // HikeHistoryItem component (updated)
  const HikeHistoryItem = ({ hike, onPress, onMediaPress, onLike, onComment, isOwnProfile }) => {
    // Check if the hike has media files and route coordinates
    const hasMedia = hike.media && Array.isArray(hike.media) && hike.media.length > 0;
    const hasRoute = hike.routeCoordinates && Array.isArray(hike.routeCoordinates) && hike.routeCoordinates.length > 1;
    
    // Calculate map region
    const getMapRegion = () => {
      if (!hasRoute) return {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      };
      
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
      
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max((maxLat - minLat) + latPadding, 0.01),
        longitudeDelta: Math.max((maxLng - minLng) + lngPadding, 0.01)
      };
    };
    
    // Get activity icon based on type
    const getActivityIcon = () => {
      switch(hike.activityType) {
        case 'Trail Running': return 'walk';
        case 'Mountain Biking': return 'bicycle';
        case 'Backpacking': return 'pin';
        case 'Rock Climbing': return 'trending-up';
        case 'Snowshoeing': return 'snow';
        case 'Exploring': return 'compass';
        default: return 'footsteps';
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
            <Ionicons name={getActivityIcon()} size={16} color="white" />
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
            <MapView
              style={styles.mapPreview}
              provider={PROVIDER_GOOGLE}
              initialRegion={getMapRegion()}
              liteMode={true}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              {/* Main route line */}
              <Polyline
                coordinates={hike.routeCoordinates}
                strokeWidth={4}
                strokeColor="#2E7D32"
                lineCap="round"
                lineJoin="round"
              />
              
              {/* Start marker */}
              <Marker
                coordinate={hike.routeCoordinates[0]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.startMarkerDot}>
                  <View style={styles.startMarkerInner} />
                </View>
              </Marker>
              
              {/* End marker */}
              <Marker
                coordinate={hike.routeCoordinates[hike.routeCoordinates.length - 1]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.endMarkerDot}>
                  <View style={styles.endMarkerInner} />
                </View>
              </Marker>
            </MapView>
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
              resizeMode="cover"
            />
            {hike.media.length > 1 && (
              <View style={styles.moreMediaBadge}>
                <Text style={styles.moreMediaText}>+{hike.media.length - 1}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        
        {/* Stats row */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="navigate" size={18} color="#2E7D32" />
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{formatDistance(hike.distance)}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.statItem}>
            <Ionicons name="time" size={18} color="#2E7D32" />
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formatDuration(hike.duration)}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={18} color="#2E7D32" />
            <Text style={styles.statLabel}>Elevation</Text>
            <Text style={styles.statValue}>{(hike.elevation || 0).toFixed(0)}m</Text>
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
                name={hike.isLiked ? "heart" : "heart-outline"} 
                size={22} 
                color={hike.isLiked ? "#F44336" : "#757575"} 
              />
              <Text style={[styles.engagementActionText, hike.isLiked && styles.engagementActionActive]}>
                Like
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.engagementAction}
              onPress={() => onComment(hike.id, hike.title || 'Activity')}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#757575" />
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
      animationType="fade"
      transparent={false}
      visible={mediaViewerVisible}
      onRequestClose={() => setMediaViewerVisible(false)}
    >
      <View style={styles.mediaViewerContainer}>
        <TouchableOpacity 
          style={styles.mediaViewerCloseBtn}
          onPress={() => setMediaViewerVisible(false)}
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        
        {mediaItems.length > 0 && (
          <Image 
            source={{ uri: mediaItems[initialMediaIndex].uri }} 
            style={styles.fullScreenMedia}
            resizeMode="contain"
          />
        )}
        
        {/* Navigation buttons for prev/next image */}
        <View style={styles.mediaNavigation}>
          <TouchableOpacity 
            style={styles.mediaNavButton}
            onPress={() => setInitialMediaIndex(Math.max(0, initialMediaIndex - 1))}
            disabled={initialMediaIndex === 0}
          >
            <Ionicons 
              name="chevron-back" 
              size={32} 
              color={initialMediaIndex === 0 ? "#555" : "white"} 
            />
          </TouchableOpacity>
          
          <Text style={styles.mediaCounter}>{initialMediaIndex + 1}/{mediaItems.length}</Text>
          
          <TouchableOpacity 
            style={styles.mediaNavButton}
            onPress={() => setInitialMediaIndex(Math.min(mediaItems.length - 1, initialMediaIndex + 1))}
            disabled={initialMediaIndex === mediaItems.length - 1}
          >
            <Ionicons 
              name="chevron-forward" 
              size={32} 
              color={initialMediaIndex === mediaItems.length - 1 ? "#555" : "white"} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  // New Comments Modal
  const CommentsModal = () => (
    <Modal
      animationType="slide"
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
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.commentModalTitle}>
            Comments {selectedActivity?.title ? `• ${selectedActivity.title}` : ''}
          </Text>
        </View>
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.commentContent}
          keyboardVerticalOffset={100}
        >
          {loadingComments ? (
            <ActivityIndicator size="large" color="#2E7D32" style={{marginTop: 20}} />
          ) : comments.length === 0 ? (
            <View style={styles.emptyCommentsContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color="#DDD" />
              <Text style={styles.emptyCommentsText}>No comments yet</Text>
              <Text style={styles.emptyCommentsSubtext}>Be the first to leave a comment</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentUser}>
                      <View style={styles.commentAvatar}>
                        <Text style={styles.commentAvatarText}>
                          {(item.username || 'User').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.commentUsername}>{item.username || 'User'}</Text>
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
                                onPress: () => deleteComment(item.id)
                              }
                            ]
                          );
                        }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#F44336" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.commentText}>{item.comment}</Text>
                </View>
              )}
              contentContainerStyle={styles.commentsList}
            />
          )}
          
          <View style={styles.addCommentContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.postCommentButton,
                (!newComment.trim() || submittingComment) && styles.disabledButton
              ]}
              onPress={submitComment}
              disabled={!newComment.trim() || submittingComment}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={20} color="white" />
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
      fetchProfile();
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
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
      
      <View style={styles.profileHeader}>
        {/* Add back button when viewing other profiles */}
        {!isOwnProfile && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#212121" />
          </TouchableOpacity>
        )}
        
        <Text style={styles.profileHeaderTitle}>
          {isOwnProfile ? 'Profile' : (viewingUserProfile?.username || 'User Profile')}
        </Text>
        
        {/* Only show settings when viewing own profile */}
        {isOwnProfile && (
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={toggleSettingsModal}
          >
            <Ionicons name="settings-outline" size={24} color="#212121" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Only show settings modal on own profile */}
      {isOwnProfile && (
        <Modal
          animationType="fade"
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
                  <Ionicons name="person-outline" size={22} color="#333" />
                  <Text style={styles.settingsOptionText}>Edit Profile</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.settingsOption}
                  onPress={() => {
                    toggleSettingsModal();
                    navigateToChangePassword();
                  }}
                >
                  <Ionicons name="key-outline" size={22} color="#333" />
                  <Text style={styles.settingsOptionText}>Change Password</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.settingsOption, styles.signOutOption]}
                  onPress={() => {
                    toggleSettingsModal();
                    signOut();
                  }}
                >
                  <Ionicons name="log-out-outline" size={22} color="#F44336" />
                  <Text style={[styles.settingsOptionText, styles.signOutText]}>Sign Out</Text>
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
            colors={["#388E3C"]}
            tintColor="#388E3C"
          />
        }
      >
        <View style={styles.profileContent}>
          {/* Profile image */}
          {avatarUrl ? (
            <Image 
              source={{ uri: avatarUrl }} 
              style={styles.profileAvatar}
              onError={() => setAvatarUrl(null)}
            />
          ) : (
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {isOwnProfile 
                  ? (profile?.username ? profile.username.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase())
                  : (viewingUserProfile?.username ? viewingUserProfile.username.charAt(0).toUpperCase() : 'U')
                }
              </Text>
            </View>
          )}
          
          <Text style={styles.profileUsername}>
            {isOwnProfile 
              ? (profile?.username || "Username Not Set") 
              : (viewingUserProfile?.username || "Username Not Available")
            }
          </Text>
          
          <Text style={styles.profileEmail}>
            {isOwnProfile ? user?.email : ''}
          </Text>
          
          {/* Bio section */}
          <View style={styles.bioContainer}>
            <Text style={styles.bioTitle}>About {isOwnProfile ? 'Me' : 'User'}</Text>
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
            <ActivityIndicator size="large" color="#2E7D32" style={{padding: 20}} />
          ) : hikeRecords.length > 0 ? (
            hikeRecords.map((hike, index) => (
              <HikeHistoryItem 
                key={`hike-${hike.id || index}`} // Use a combination of id and index to guarantee uniqueness
                hike={hike}
                onPress={() => navigation.navigate('HikeDetail', { hikeId: hike.id })}
                onMediaPress={handleMediaPress}
                onLike={toggleLike}
                onComment={openComments}
                isOwnProfile={isOwnProfile}
              />
            ))
          ) : (
            <View style={styles.emptyActivitiesContainer}>
              <Ionicons name="footsteps-outline" size={60} color="#DDD" />
              <Text style={styles.emptyActivitiesTitle}>No Activities {isOwnProfile ? 'Yet' : 'Found'}</Text>
              <Text style={styles.emptyActivitiesText}>
                {isOwnProfile 
                  ? 'Start tracking to record your hiking adventures.'
                  : 'This user has not shared any activities yet.'
                }
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
                  <Ionicons name="arrow-forward" size={16} color="white" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProfile()
  }, [])

  async function getProfile() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUser(user)
        
        // Fetch user profile
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single()
          
        if (error) throw error
        setProfile(data)
      }
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      navigation.navigate('Login')
    } catch (error) {
      alert(error.message)
    }
  }

  // Navigation to view other user profiles
  const navigateToUserProfile = (userId) => {
    navigation.navigate('Profile', { userId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#388E3C', // Dark green for active tabs
        tabBarInactiveTintColor: '#9E9E9E', // Medium gray for inactive
        headerShown: false,
        tabBarStyle: {
          elevation: 0,
          borderTopWidth: 0, 
          height: 60,
          paddingBottom: 10,
          paddingTop: 5,
          backgroundColor: '#FFFFFF',
          shadowColor: 'transparent',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: -5,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
        },
      }}
    >
      <Tab.Screen 
        name="Discover" 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" color={color} size={size} />
          ),
        }}
      >
        {props => <HomeContent {...props} user={user} />}
      </Tab.Screen>
      
      <Tab.Screen 
        name="Track" 
        component={TrackScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="footsteps" color={color} size={size} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="Forum" 
        component={ForumPost}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" color={color} size={size} />
          ),
        }}
      />
      
      <Tab.Screen 
        name="Profile" 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
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
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Pure white for minimalist feel
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
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 20,
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
    color: '#388E3C', // Darker green
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
    backgroundColor: '#388E3C', // Darker green instead of black
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
  profileEmail: {
    fontSize: 16,
    color: '#9E9E9E',
    marginBottom: 30,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
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
  logo: {
    width:100, // Smaller logo
    height: 100, // Smaller logo
    resizeMode: 'contain',
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
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
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
  }
})