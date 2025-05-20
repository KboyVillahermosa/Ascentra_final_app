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
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDate, formatDistance, formatDuration, formatPace } from '../utils/formatters';
import { getAllHikes, debugStorage, deleteHike } from '../services/databaseService';

// Custom HikeHistoryItem component since we're not importing the original
const HikeHistoryItem = ({ hike, onPress, onMediaPress }) => {
  // Check if the hike has media files
  const hasMedia = hike.media && Array.isArray(hike.media) && hike.media.length > 0;
  
  // Function to render media thumbnails
  const renderMedia = () => {
    if (!hasMedia) return null;
    
    // Determine how many thumbnails to show (max 3)
    const displayCount = Math.min(hike.media.length, 3);
    const remainingCount = hike.media.length - displayCount;
    
    return (
      <View style={styles.mediaContainer}>
        {hike.media.slice(0, displayCount).map((media, index) => {
          const isVideo = media.type === 'video' || 
                         (media.uri && media.uri.endsWith('.mp4'));
          
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
                resizeMode="cover"
              />
              
              {isVideo && (
                <View style={styles.videoIndicator}>
                  <Ionicons name="play" size={16} color="white" />
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
  
  return (
    <TouchableOpacity 
      style={styles.hikeItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.hikeHeader}>
        <Text style={styles.hikeTitle}>
          {hike.title || 'Hiking Activity'}
        </Text>
        {/* Not Synced badge removed */}
      </View>
      
      <Text style={styles.hikeDate}>{formatDate(hike.date)}</Text>
      
      {hike.description ? (
        <Text style={styles.hikeDescription} numberOfLines={2}>{hike.description}</Text>
      ) : null}
      
      {/* Media gallery */}
      {renderMedia()}
      
      <View style={styles.hikeStats}>
        <View style={styles.statItem}>
          <Ionicons name="navigate" size={18} color="#FC4C02" />
          <Text style={styles.statValue}>{formatDistance(hike.distance)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="time" size={18} color="#FC4C02" />
          <Text style={styles.statValue}>{formatDuration(hike.duration)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="trending-up" size={18} color="#FC4C02" />
          <Text style={styles.statValue}>{hike.elevation?.toFixed(0)}m</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function HikeHistoryScreen({ navigation }) {
  const [hikeRecords, setHikeRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedHikeId, setSelectedHikeId] = useState(null);
  
  // New state for media viewer
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [initialMediaIndex, setInitialMediaIndex] = useState(0);

  useEffect(() => {
    fetchHikeRecords();
    
    // Refresh when the screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchHikeRecords();
    });
    
    return () => {
      unsubscribe();
    }
  }, [navigation]);

  const fetchHikeRecords = async () => {
    try {
      setLoading(true);
      console.log('Fetching hikes from local storage...');
      
      // Debug storage first
      await debugStorage();
      
      // Get hikes from AsyncStorage using the existing function
      const hikes = await getAllHikes();
      console.log(`Fetched ${hikes.length} hikes from local storage`);
      
      // Debug media content
      hikes.forEach((hike, index) => {
        console.log(`Hike #${index}: "${hike.title}" has ${hike.media && Array.isArray(hike.media) ? hike.media.length : 0} media items`);
        if (hike.media && Array.isArray(hike.media) && hike.media.length > 0) {
          console.log(`First media URI: ${hike.media[0].uri}`);
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

  const handleDeleteHike = (hikeId) => {
    setSelectedHikeId(hikeId);
    setDeleteModalVisible(true);
  };
  
  // Handler for opening media viewer
  const handleMediaPress = (media, index) => {
    // You could navigate to a MediaViewer screen if you have one
    // Or show a modal with the media
    setMediaItems(media);
    setInitialMediaIndex(index);
    setMediaViewerVisible(true);
    
    // Alternatively, navigate to a dedicated MediaViewer screen
    // navigation.navigate('MediaViewer', { media, initialIndex: index });
  };
  
  // Simple media modal component
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

  const confirmDeleteHike = async () => {
    try {
      // Use the new deleteHike function
      await deleteHike(selectedHikeId);
      
      // Update state
      setHikeRecords(prevRecords => 
        prevRecords.filter(hike => hike.id !== selectedHikeId)
      );
      
      setDeleteModalVisible(false);
      
      // Show success message
      Alert.alert('Success', 'Hike deleted successfully');
    } catch (error) {
      console.error('Error deleting hike:', error);
      Alert.alert('Error', 'Failed to delete hike. Please try again.');
    }
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#FC4C02" />
          <Text style={styles.emptyText}>Loading your hikes...</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trail-sign-outline" size={80} color="#DDD" />
        <Text style={styles.emptyTitle}>No Hikes Yet</Text>
        <Text style={styles.emptyText}>
          Start tracking your hikes to see your history here.
        </Text>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => {
            console.log("Navigating to Tracking screen");
            navigation.navigate('Tracking');
          }}
        >
          <Text style={styles.startButtonText}>Start Tracking</Text>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderHikeItem = ({ item }) => (
    <View style={styles.hikeItemContainer}>
      <HikeHistoryItem 
        hike={item} 
        onPress={() => {
          Alert.alert(
            item.title || 'Hike Details',
            `${item.description ? item.description + '\n\n' : ''}` +
            `Date: ${formatDate(item.date)}\n` +
            `Distance: ${formatDistance(item.distance)}\n` +
            `Duration: ${formatDuration(item.duration)}\n` +
            `Elevation gain: ${item.elevation?.toFixed(0)}m` +
            `${item.privateNotes ? '\n\nNotes: ' + item.privateNotes : ''}`
          );
        }}
        onMediaPress={handleMediaPress}
      />
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDeleteHike(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#D32F2F" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FC4C02" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hiking History</Text>
        <View style={{ width: 24 }}> 
          {/* Empty view for spacing */}
        </View>
      </View>
      
      <FlatList
        data={hikeRecords}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderHikeItem}
        contentContainerStyle={hikeRecords.length === 0 ? { flex: 1 } : styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Hike?</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete this hike? This action cannot be undone.
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FC4C02',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#FC4C02',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  hikeItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteButton: {
    padding: 10,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  deleteConfirmButton: {
    backgroundColor: '#D32F2F',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  deleteConfirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Add styles for the inline HikeHistoryItem component
  hikeItem: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  hikeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hikeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  hikeDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  hikeDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    lineHeight: 20,
  },
  // Media display styles
  mediaContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  mediaThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreMediaIndicator: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreMediaText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Media viewer modal styles
  mediaViewerContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaViewerCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
  },
  fullScreenMedia: {
    width: '100%',
    height: '80%',
  },
  mediaNavigation: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 40,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  mediaNavButton: {
    padding: 10,
  },
  mediaCounter: {
    color: 'white',
    fontSize: 16,
  },
  syncStatusBadge: {
    backgroundColor: '#f39c12',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  syncStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  hikeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    marginLeft: 6,
    fontSize: 15,
    color: '#555',
  },
});