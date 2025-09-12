import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatPace,
} from '../utils/formatters';
import {
  getAllHikes,
  debugStorage,
  deleteHike,
  syncAllHikesToSupabase,
  syncHikeToSupabase,
  getCurrentUserId,
} from '../services/databaseService';
import MapView, { Polyline, PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32; // Account for margins and padding

// Custom HikeHistoryItem component with map
const HikeHistoryItem = ({
  hike,
  onPress,
  onMediaPress,
  onOptionsPress,
  onSyncPress,
  onDelete,
}) => {
  // Check if the hike has media files and route coordinates
  const hasMedia =
    hike.media && Array.isArray(hike.media) && hike.media.length > 0;
  const hasRoute =
    hike.routeCoordinates &&
    Array.isArray(hike.routeCoordinates) &&
    hike.routeCoordinates.length > 1;

  // Calculate map region based on route coordinates
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
      latitudeDelta: Math.max(maxLat - minLat + latPadding, 0.01),
      longitudeDelta: Math.max(maxLng - minLng + lngPadding, 0.01),
    };
  };

  // Function to render media thumbnails
  const renderMedia = () => {
    if (!hasMedia) {
      return null;
    }

    // Determine how many thumbnails to show (max 3)
    const displayCount = Math.min(hike.media.length, 3);
    const remainingCount = hike.media.length - displayCount;

    return (
      <View style={styles.mediaContainer}>
        {hike.media.slice(0, displayCount).map((media, index) => {
          const isVideo =
            media.type === 'video' || (media.uri && media.uri.endsWith('.mp4'));

          return (
            <TouchableOpacity
              key={index}
              style={styles.mediaThumbnail}
              onPress={() => onMediaPress(hike.media, index)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: media.uri }}
                style={styles.mediaImage}
                resizeMode='cover'
              />

              {isVideo && (
                <View style={styles.videoIndicator}>
                  <Ionicons name='play' size={16} color='white' />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {remainingCount > 0 && (
          <TouchableOpacity
            style={[styles.mediaThumbnail, styles.moreMediaIndicator]}
            onPress={() => onMediaPress(hike.media, displayCount)}
          >
            <Text style={styles.moreMediaText}>+{remainingCount}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
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
      {/* Card header with activity type and menu */}
      <View style={styles.cardHeader}>
        <View style={styles.activityBadge}>
          <Ionicons name={getActivityIcon()} size={16} color='white' />
          <Text style={styles.activityBadgeText}>
            {hike.activityType || 'Hiking'}
          </Text>
        </View>

        {/* Sync status indicator */}
        {hike.synced ? (
          <View style={styles.syncedBadge}>
            <Ionicons name='cloud-done' size={16} color='white' />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.notSyncedBadge}
            onPress={() => onSyncPress(hike.id)}
          >
            <Ionicons name='cloud-upload' size={16} color='white' />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.optionsButton}
          onPress={onOptionsPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name='ellipsis-horizontal' size={20} color='#666' />
        </TouchableOpacity>
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
            liteMode={false} // Change to false for more interactive map
            scrollEnabled={true}
            zoomEnabled={true}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            {/* Thicker background trace for glow effect */}
            <Polyline
              coordinates={hike.routeCoordinates}
              strokeWidth={7}
              strokeColor='rgba(46, 125, 50, 0.3)' // Semi-transparent green
              lineCap='round'
              lineJoin='round'
              zIndex={1}
            />

            {/* Main route line */}
            <Polyline
              coordinates={hike.routeCoordinates}
              strokeWidth={4}
              strokeColor='#2E7D32' // Solid green
              lineCap='round'
              lineJoin='round'
              zIndex={2}
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
              coordinate={
                hike.routeCoordinates[hike.routeCoordinates.length - 1]
              }
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.endMarkerDot}>
                <View style={styles.endMarkerInner} />
              </View>
            </Marker>
          </MapView>

          <View style={styles.mapOverlay}>
            <Ionicons name='map' size={16} color='white' />
          </View>
        </View>
      )}

      {/* Media gallery */}
      {renderMedia()}

      {/* Stats row */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name='navigate' size={18} color='#2E7D32' />
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{formatDistance(hike.distance)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <Ionicons name='time' size={18} color='#2E7D32' />
          <Text style={styles.statLabel}>Duration</Text>
          <Text style={styles.statValue}>{formatDuration(hike.duration)}</Text>
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

      {/* Feeling badge if available */}
      {hike.feeling && (
        <View style={styles.feelingBadge}>
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
            size={14}
            color='#2E7D32'
          />
          <Text style={styles.feelingText}>Felt {hike.feeling}</Text>
        </View>
      )}

      {/* Add action buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onPress()}>
          <Ionicons name='eye-outline' size={20} color='#2E7D32' />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onOptionsPress()}
        >
          <Ionicons name='ellipsis-horizontal' size={20} color='#666' />
          <Text style={styles.actionButtonText}>More</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => onDelete()}
        >
          <Ionicons name='trash-outline' size={20} color='#D32F2F' />
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function HikeHistoryScreen({ navigation }) {
  const { user, isAuthenticated } = useAuth();
  const [hikeRecords, setHikeRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedHikeId, setSelectedHikeId] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // New state for media viewer
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [initialMediaIndex, setInitialMediaIndex] = useState(0);

  useEffect(() => {
    fetchHikeRecords();

    // Check network status
    const unsubscribeNet = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });

    // Refresh when the screen comes into focus
    const unsubscribeNav = navigation.addListener('focus', () => {
      fetchHikeRecords();
    });

    return () => {
      unsubscribeNav();
      unsubscribeNet();
    };
  }, [navigation]);

  const fetchHikeRecords = async () => {
    try {
      setLoading(true);

      // Debug storage first
      await debugStorage();

      // Get hikes from AsyncStorage using the existing function
      const hikes = await getAllHikes();

      // Debug media content
      hikes.forEach((hike, index) => {
        if (hike.media && Array.isArray(hike.media) && hike.media.length > 0) {
          // Media processing logic can be added here
        }
      });

      // Sort by date (newest first)
      const sortedHikes = hikes.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });

      setHikeRecords(sortedHikes);
    } catch (error) {
      console.error('Error fetching hike records:', error);
      setHikeRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHike = hikeId => {
    setSelectedHikeId(hikeId);
    setDeleteModalVisible(true);
  };

  const handleOptionsPress = hikeId => {
    // Show options menu for this hike
    Alert.alert('Hike Options', 'What would you like to do with this hike?', [
      {
        text: 'View Details',
        onPress: () => navigation.navigate('HikeDetail', { hikeId }),
      },
      { text: 'Share', onPress: () => alert('Sharing feature coming soon!') },
      {
        text: 'Delete',
        onPress: () => handleDeleteHike(hikeId),
        style: 'destructive',
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Handler for opening media viewer
  const handleMediaPress = (media, index) => {
    setMediaItems(media);
    setInitialMediaIndex(index);
    setMediaViewerVisible(true);
  };

  // Simple media modal component
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

  const confirmDeleteHike = async () => {
    try {
      // Use the new deleteHike function
      await deleteHike(selectedHikeId);

      // Update state
      setHikeRecords(prevRecords =>
        prevRecords.filter(hike => hike.id !== selectedHikeId),
      );

      setDeleteModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete hike. Please try again.');
    }
  };

  // Handle sync all hikes
  const handleSyncAll = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'You need to be online to sync your hikes.');
      return;
    }

    if (!isAuthenticated) {
      Alert.alert(
        'Not Logged In',
        'Please log in to sync your hikes across devices.',
      );
      return;
    }

    try {
      setIsSyncing(true);
      const result = await syncAllHikesToSupabase();

      if (result.success) {
        Alert.alert(
          'Sync Complete',
          `Successfully synced ${result.synced} of ${result.total} hikes to the cloud.`,
        );
        // Refresh data
        await fetchHikeRecords();
      } else {
        Alert.alert(
          'Sync Error',
          result.error || 'Failed to sync hikes. Please try again.',
        );
      }
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert(
        'Sync Error',
        'An unexpected error occurred. Please try again.',
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle sync individual hike
  const handleSyncHike = async hikeId => {
    if (!isOnline) {
      Alert.alert('Offline', 'You need to be online to sync your hikes.');
      return;
    }

    if (!isAuthenticated) {
      Alert.alert(
        'Not Logged In',
        'Please log in to sync your hikes across devices.',
      );
      return;
    }

    try {
      // Find the hike
      const hikeToSync = hikeRecords.find(h => h.id === hikeId);
      if (!hikeToSync) {
        Alert.alert('Error', 'Hike not found');
        return;
      }

      // Get user ID
      const userId = await getCurrentUserId();

      // Sync to Supabase
      await syncHikeToSupabase(hikeToSync, userId);

      // Update local state
      const updatedHikes = hikeRecords.map(h => {
        if (h.id === hikeId) {
          return { ...h, synced: true };
        }
        return h;
      });

      setHikeRecords(updatedHikes);
      Alert.alert('Success', 'Hike synced to cloud successfully');
    } catch (error) {
      console.error('Error syncing hike:', error);
      Alert.alert('Error', 'Failed to sync hike. Please try again.');
    }
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size='large' color='#2E7D32' />
          <Text style={styles.emptyText}>Loading your adventures...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name='trail-sign-outline'
          size={80}
          color='#2E7D32'
          style={{ opacity: 0.7 }}
        />
        <Text style={styles.emptyTitle}>No Activities Yet</Text>
        <Text style={styles.emptyText}>
          Start tracking to record your outdoor adventures.
        </Text>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.navigate('Tracking')}
        >
          <Text style={styles.startButtonText}>Start Tracking</Text>
          <Ionicons name='arrow-forward' size={16} color='white' />
        </TouchableOpacity>
      </View>
    );
  };

  const renderHikeItem = ({ item }) => (
    <View style={styles.hikeItemWrapper}>
      <HikeHistoryItem
        hike={item}
        onPress={() => navigation.navigate('HikeDetail', { hikeId: item.id })}
        onMediaPress={handleMediaPress}
        onOptionsPress={() => handleOptionsPress(item.id)}
        onSyncPress={handleSyncHike}
        onDelete={() => handleDeleteHike(item.id)}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='light-content' backgroundColor='#2E7D32' />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color='white' />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Activity History</Text>

        {isAuthenticated && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSyncAll}
            disabled={isSyncing || !isOnline}
          >
            {isSyncing ? (
              <ActivityIndicator size='small' color='white' />
            ) : (
              <Ionicons name='cloud-upload' size={22} color='white' />
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name='funnel' size={22} color='white' />
        </TouchableOpacity>
      </View>

      {/* Offline indicator */}
      {!isOnline && (
        <View style={styles.offlineBar}>
          <Ionicons name='cloud-offline' size={16} color='white' />
          <Text style={styles.offlineText}>You are offline</Text>
        </View>
      )}

      {/* Login reminder */}
      {!isAuthenticated && hikeRecords.length > 0 && (
        <TouchableOpacity
          style={styles.loginReminderBar}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name='log-in' size={16} color='white' />
          <Text style={styles.loginReminderText}>
            Log in to sync your activities across devices
          </Text>
          <Ionicons name='chevron-forward' size={16} color='white' />
        </TouchableOpacity>
      )}

      <FlatList
        data={hikeRecords}
        keyExtractor={item => item.id?.toString() || Math.random().toString()}
        renderItem={renderHikeItem}
        contentContainerStyle={
          hikeRecords.length === 0 ? { flex: 1 } : styles.listContent
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        animationType='fade'
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Activity?</Text>
            <Text style={styles.modalText}>
              This will permanently delete this activity and all associated
              data.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteConfirmButton]}
                onPress={confirmDeleteHike}
              >
                <Text style={styles.deleteConfirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Media Viewer Modal */}
      <MediaViewerModal />

      {/* FAB for new activity */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Tracking')}
      >
        <Ionicons name='add' size={24} color='white' />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    height: 60 + StatusBar.currentHeight,
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: StatusBar.currentHeight,
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
  },
  filterButton: {
    padding: 8,
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  startButton: {
    marginTop: 16,
    backgroundColor: '#2E7D32',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'medium',
    marginRight: 8,
  },
  hikeItemWrapper: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'white',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  hikeCard: {
    borderRadius: 12,
    backgroundColor: 'white',
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2E7D32',
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#388E3C',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  activityBadgeText: {
    fontSize: 14,
    color: 'white',
    marginLeft: 4,
  },
  optionsButton: {
    padding: 8,
  },
  hikeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  hikeDate: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
  },
  hikeDescription: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  mapPreviewContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  mapPreview: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  mediaThumbnail: {
    width: (CARD_WIDTH - 24) / 3,
    height: (CARD_WIDTH - 24) / 3,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    marginBottom: 8,
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  videoIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    paddingVertical: 2,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreMediaIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
  },
  moreMediaText: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#EEE',
  },
  feelingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  feelingText: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#333',
  },
  deleteConfirmButton: {
    backgroundColor: '#D32F2F',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    color: 'white',
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
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
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(46, 125, 50, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2E7D32',
  },
  endMarkerDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(211, 47, 47, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D32F2F',
  },
  syncedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#388E3C',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  notSyncedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA000',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  syncButton: {
    padding: 8,
    marginRight: 8,
  },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  offlineText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  loginReminderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  loginReminderText: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  actionDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#EEE',
  },
  deleteButton: {
    // Optional: Add specific styling for the delete button
  },
  deleteButtonText: {
    color: '#D32F2F',
  },
});
