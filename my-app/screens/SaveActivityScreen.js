import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Image,
  FlatList,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { saveHikeToLocalDB, getCurrentUserId, syncHikeToSupabase } from '../services/databaseService';
import { supabase, isUserLoggedIn } from '../services/supabaseClient';
import NetInfo from '@react-native-community/netinfo';

export default function SaveActivityScreen({ navigation, route }) {
  // Get hike data from route params
  const { routeCoordinates, stats, date, syncReady } = route.params;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityType, setActivityType] = useState('Hiking');
  const [feeling, setFeeling] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  
  // Modal visibility state
  const [activityTypeModalVisible, setActivityTypeModalVisible] = useState(false);
  const [feelingModalVisible, setFeelingModalVisible] = useState(false);
  
  // Add state for tracking connection and sync status
  const [isConnected, setIsConnected] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [syncStatus, setSyncStatus] = useState('pending'); // 'pending', 'synced', 'local-only', 'failed'

  // Debug state
  const [debugInfo, setDebugInfo] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  // Activity type options
  const activityTypes = [
    { icon: 'footsteps', name: 'Hiking' },
    { icon: 'walk', name: 'Trail Running' },
    { icon: 'bicycle', name: 'Mountain Biking' },
    { icon: 'pin', name: 'Backpacking' },
    { icon: 'trending-up', name: 'Rock Climbing' },
    { icon: 'snow', name: 'Snowshoeing' },
    { icon: 'compass', name: 'Exploring' }
  ];
  
  // Feeling options
  const feelingOptions = [
    { icon: 'happy', name: 'Great' },
    { icon: 'smile', name: 'Good' },
    { icon: 'thumbs-up', name: 'Okay' },
    { icon: 'sad', name: 'Tired' },
    { icon: 'thumbs-down', name: 'Exhausted' }
  ];

  // Request permissions and pick images
  const pickMedia = async () => {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to add photos or videos.');
      return;
    }

    try {
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow both photos and videos
        allowsEditing: false,
        allowsMultipleSelection: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Limit to 5 media files
        const newMedia = result.assets.slice(0, 5);
        
        // Add selected media to state
        setMediaFiles([...mediaFiles, ...newMedia].slice(0, 10)); // Limit to 10 total
        
        console.log(`Added ${newMedia.length} media files`);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to load selected media. Please try again.');
    }
  };

  // Remove a media item
  const removeMediaItem = (index) => {
    const updatedMedia = [...mediaFiles];
    updatedMedia.splice(index, 1);
    setMediaFiles(updatedMedia);
  };

  // Check network connection and login status
  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    // Check if user is logged in - improved version
    const checkLoginStatus = async () => {
      try {
        // Try the improved isUserLoggedIn utility first
        const loggedIn = await isUserLoggedIn();
        setIsLoggedIn(loggedIn);
        
        if (loggedIn) {
          setDebugInfo(prev => `User is logged in\n${prev}`);
        } else {
          // Double-check with getCurrentUserId
          const userId = await getCurrentUserId();
          const isNotGuest = userId !== 'guest';
          setIsLoggedIn(isNotGuest);
          
          setDebugInfo(prev => `User ID check: ${userId} (${isNotGuest ? 'logged in' : 'guest'})\n${prev}`);
        }
      } catch (error) {
        console.error('Error checking login status:', error);
        setIsLoggedIn(false);
        setDebugInfo(prev => `Login check error: ${error.message}\n${prev}`);
      }
    };

    checkLoginStatus();

    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, []);

  // Set initial sync status based on what TrackingScreen determined
  useEffect(() => {
    if (typeof syncReady === 'boolean') {
      setSyncStatus(syncReady ? 'pending' : 'local-only');
    }
  }, [syncReady]);

  // Advanced debug function - enhanced version
  const checkSupabaseConnection = async () => {
    try {
      setDebugInfo('Checking Supabase connection...\n');
      
      // Test Supabase connection by listing tables
      const { data: tablesData, error: tablesError } = await supabase
        .rpc('get_tables');
      
      if (tablesError) {
        setDebugInfo(prev => prev + `Tables error: ${tablesError.message}\n`);
        
        // Try a simple endpoint just to check connectivity
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setDebugInfo(prev => prev + `Connection error: ${error.message}\n`);
          return false;
        } else {
          setDebugInfo(prev => prev + `Base connection OK, but table query failed\n`);
        }
      } else {
        // Check if saveactivity table exists
        const tables = tablesData || [];
        const hasActivityTable = tables.some(t => t === 'saveactivity');
        setDebugInfo(prev => prev + `Tables: ${tables.join(', ')}\n`);
        setDebugInfo(prev => prev + `saveactivity table exists: ${hasActivityTable}\n`);
      }
      
      // Check auth status
      const { data: authData, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        setDebugInfo(prev => prev + `Auth error: ${authError.message}\n`);
        return false;
      }
      
      const isAuthenticated = !!authData?.session?.user;
      
      setDebugInfo(prev => prev + `User authenticated: ${isAuthenticated}\n`);
      if (isAuthenticated) {
        setDebugInfo(prev => prev + `User ID: ${authData.session.user.id}\n`);
        setDebugInfo(prev => prev + `User email: ${authData.session.user.email}\n`);
        setDebugInfo(prev => prev + `Session expires: ${new Date(authData.session.expires_at * 1000).toISOString()}\n`);
      }
      
      // Try to directly access saveactivity table
      try {
        const { data: activityData, error: activityError } = await supabase
          .from('saveactivity')
          .select('count')
          .limit(1);
        
        if (activityError) {
          setDebugInfo(prev => prev + `Activity table error: ${activityError.message}\n`);
        } else {
          setDebugInfo(prev => prev + `Activity table connection OK\n`);
        }
      } catch (tableError) {
        setDebugInfo(prev => prev + `Activity table exception: ${tableError.message}\n`);
      }
      
      return isAuthenticated;
    } catch (error) {
      setDebugInfo(prev => prev + `Error: ${error.message}\n`);
      return false;
    }
  };

  // Handle save activity with improved error handling and diagnostics
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Use the syncStatus that was determined earlier
      if (syncStatus === 'local-only') {
        setDebugInfo('Activity will be saved locally only');
      } else {
        setDebugInfo('Attempting to sync with cloud');
      }
      
      // Process media files to extract just the necessary data
      const processedMedia = mediaFiles.map(media => ({
        uri: media.uri,
        type: media.type || (media.uri.endsWith('.mp4') ? 'video' : 'image'),
        name: media.fileName || media.uri.split('/').pop()
      }));
      
      console.log('Processed media files:', processedMedia.length, 'items');
      setDebugInfo(prev => prev + `Processed ${processedMedia.length} media files\n`);
      
      // Prepare enriched hike data
      const hikeData = {
        title: title.trim() || 'Hiking Activity',
        description: description.trim(),
        activityType: activityType,
        feeling: feeling,
        privateNotes: privateNotes.trim(),
        date: date || new Date().toISOString(),
        routeCoordinates,
        media: processedMedia,
        stats: {
          distance: stats.distance || 0,
          duration: stats.duration || 0,
          pace: stats.pace || 0,
          elevation: stats.elevation || 0
        }
      };
      
      // Get user ID for direct Supabase sync
      const userId = await getCurrentUserId();
      setDebugInfo(prev => prev + `Current user ID: ${userId}\n`);
      
      // Determine if we can sync now
      const canSync = isConnected && isLoggedIn;
      setDebugInfo(prev => prev + `Can sync? ${canSync} (connected: ${isConnected}, logged in: ${isLoggedIn})\n`);
      
      // Check Supabase connection
      if (canSync) {
        const connectionOk = await checkSupabaseConnection();
        setDebugInfo(prev => prev + `Supabase check result: ${connectionOk}\n`);
      }
      
      // Save locally first
      setDebugInfo(prev => prev + 'Saving to local database...\n');
      const savedId = await saveHikeToLocalDB(hikeData);
      setDebugInfo(prev => prev + `Local save successful, assigned ID: ${savedId}\n`);
      
      // Get the saved hike with its ID for manual sync
      hikeData.id = savedId;
      
      // Try manual sync to Supabase if we're online and logged in
      if (canSync && userId !== 'guest') {
        try {
          setDebugInfo(prev => prev + 'Attempting direct Supabase sync...\n');
          
          const syncResult = await syncHikeToSupabase(hikeData, userId);
          setDebugInfo(prev => prev + `Direct sync result: ${syncResult ? 'Success' : 'Failed'}\n`);
          
          if (syncResult) {
            setSyncStatus('synced');
            console.log('Activity saved and manually synced to cloud');
          } else {
            setSyncStatus('failed');
            console.log('Manual sync failed');
          }
        } catch (syncError) {
          console.error('Manual sync error:', syncError);
          setDebugInfo(prev => prev + `Manual sync error: ${syncError.message}\n`);
          setSyncStatus('failed');
        }
      } else if (!isLoggedIn) {
        setSyncStatus('local-only');
        console.log('Activity saved locally only (not logged in)');
      } else {
        setSyncStatus('local-only');
        console.log('Activity saved locally only (offline)');
      }
      
      // Show appropriate message
      setTimeout(() => {
        if (syncStatus === 'synced') {
          Alert.alert('Activity Saved', 'Your activity has been saved and synced to the cloud.');
        } else if (!isLoggedIn) {
          Alert.alert('Activity Saved Locally', 'Your activity has been saved locally. Log in to sync across devices.');
        } else if (!isConnected) {
          Alert.alert('Activity Saved Offline', 'Your activity has been saved locally and will sync when you reconnect.');
        } else {
          // Show debug option if sync failed
          Alert.alert(
            'Activity Saved With Issues', 
            'Your activity was saved locally but we had trouble syncing to the cloud. Would you like to see more details?',
            [
              { text: 'No, continue', onPress: () => navigation.replace('HikeHistory') },
              { text: 'Show details', onPress: () => setShowDebug(true) }
            ]
          );
          return;
        }
        
        // Navigate to history screen
        navigation.replace('HikeHistory');
      }, 1000);
      
    } catch (error) {
      console.error('Failed to save activity:', error);
      setDebugInfo(prev => prev + `Save error: ${error.message}\n${error.stack || ''}\n`);
      setSyncStatus('failed');
      Alert.alert(
        'Save Error', 
        'Could not save your activity. Would you like to see technical details?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Show details', onPress: () => setShowDebug(true) }
        ]
      );
    } finally {
      setSaving(false);
    }
  };

  // Render media thumbnail
  const renderMediaItem = ({ item, index }) => {
    const isVideo = item.type === 'video' || item.uri.endsWith('.mp4');
    
    return (
      <View style={styles.mediaThumbnailContainer}>
        <Image source={{ uri: item.uri }} style={styles.mediaThumbnail} />
        
        {isVideo && (
          <View style={styles.videoIndicator}>
            <Ionicons name="play" size={16} color="white" />
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.removeMediaButton}
          onPress={() => removeMediaItem(index)}
        >
          <Ionicons name="close-circle" size={22} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  // Render activity type option
  const renderActivityTypeOption = (item) => {
    return (
      <TouchableOpacity 
        style={[
          styles.optionItem,
          activityType === item.name && styles.selectedOptionItem
        ]}
        onPress={() => {
          setActivityType(item.name);
          setActivityTypeModalVisible(false);
        }}
      >
        <Ionicons 
          name={item.icon} 
          size={24} 
          color={activityType === item.name ? 'white' : '#2E7D32'} 
        />
        <Text style={[
          styles.optionText,
          activityType === item.name && styles.selectedOptionText
        ]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render feeling option
  const renderFeelingOption = (item) => {
    return (
      <TouchableOpacity 
        style={[
          styles.optionItem,
          feeling === item.name && styles.selectedOptionItem
        ]}
        onPress={() => {
          setFeeling(item.name);
          setFeelingModalVisible(false);
        }}
      >
        <Ionicons 
          name={item.icon} 
          size={24} 
          color={feeling === item.name ? 'white' : '#2E7D32'} 
        />
        <Text style={[
          styles.optionText,
          feeling === item.name && styles.selectedOptionText
        ]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render sync status indicator
  const renderSyncStatus = () => {
    if (syncStatus === 'pending') {
      return null;
    } else if (syncStatus === 'synced') {
      return (
        <View style={styles.syncStatusContainer}>
          <Ionicons name="cloud-done" size={18} color="#2E7D32" />
          <Text style={styles.syncStatusText}>Synced to cloud</Text>
        </View>
      );
    } else if (syncStatus === 'local-only') {
      return (
        <View style={styles.syncStatusContainer}>
          <Ionicons name="save" size={18} color="#FF9800" />
          <Text style={[styles.syncStatusText, {color: '#FF9800'}]}>Saved locally</Text>
        </View>
      );
    } else if (syncStatus === 'failed') {
      return (
        <View style={styles.syncStatusContainer}>
          <Ionicons name="warning" size={18} color="#F44336" />
          <Text style={[styles.syncStatusText, {color: '#F44336'}]}>Sync failed</Text>
        </View>
      );
    }
    return null;
  };

  // Modify the header to show save button with loading state
  const renderSaveButton = () => {
    if (saving) {
      return (
        <View style={styles.saveButton}>
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      );
    }
    
    return (
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>SAVE</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Save Activity</Text>
        
        {renderSaveButton()}
      </View>
      
      {/* Connection status indicator */}
      {!isConnected && (
        <View style={styles.offlineBar}>
          <Ionicons name="cloud-offline" size={16} color="white" />
          <Text style={styles.offlineText}>You are offline</Text>
        </View>
      )}
      
      {/* Show sync status if available */}
      {renderSyncStatus()}
      
      <KeyboardAvoidingView 
        style={styles.formContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Activity Title */}
          <TextInput
            style={styles.titleInput}
            placeholder="Title your activity"
            placeholderTextColor="#8BA989"
            value={title}
            onChangeText={setTitle}
          />
          
          {/* Activity Description */}
          <TextInput
            style={styles.descriptionInput}
            placeholder="How'd it go? Share more about your activity and use @ to tag someone."
            placeholderTextColor="#8BA989"
            multiline={true}
            numberOfLines={3}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
          
          {/* Activity Type Selector */}
          <TouchableOpacity 
            style={styles.selectorButton}
            onPress={() => setActivityTypeModalVisible(true)}
          >
            <Ionicons name="footsteps" size={22} color="#2E7D32" />
            <Text style={styles.selectorText}>{activityType}</Text>
            <Ionicons name="chevron-down" size={22} color="#8BA989" />
          </TouchableOpacity>
          
          {/* Media Gallery */}
          {mediaFiles.length > 0 && (
            <View style={styles.mediaGallery}>
              <FlatList
                data={mediaFiles}
                renderItem={renderMediaItem}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mediaGalleryContent}
              />
            </View>
          )}
          
          {/* Add Photos/Videos */}
          <TouchableOpacity 
            style={styles.mediaButton}
            onPress={pickMedia}
          >
            <Ionicons name="image" size={22} color="#2E7D32" />
            <Text style={styles.mediaButtonText}>Add Photos/Videos</Text>
          </TouchableOpacity>
          
          {/* Change Map Type */}
          <TouchableOpacity style={styles.mapButton}>
            <Text style={styles.mapButtonText}>Change Map Type</Text>
          </TouchableOpacity>
          
          {/* Details Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>Details</Text>
          </View>
          
          {/* Activity Type Detail */}
          <TouchableOpacity 
            style={styles.detailButton}
            onPress={() => setActivityTypeModalVisible(true)}
          >
            <Ionicons name="pulse" size={22} color="#8BA989" />
            <Text style={styles.detailButtonText}>Type of activity</Text>
            <Text style={styles.detailValueText}>{activityType}</Text>
            <Ionicons name="chevron-down" size={22} color="#8BA989" />
          </TouchableOpacity>
          
          {/* Feeling */}
          <TouchableOpacity 
            style={styles.detailButton}
            onPress={() => setFeelingModalVisible(true)}
          >
            <Ionicons name="happy-outline" size={22} color="#8BA989" />
            <Text style={styles.detailButtonText}>How did that activity feel?</Text>
            <Text style={styles.detailValueText}>{feeling || 'Select'}</Text>
            <Ionicons name="chevron-down" size={22} color="#8BA989" />
          </TouchableOpacity>
          
          {/* Private Notes */}
          <View style={styles.notesContainer}>
            <Ionicons name="lock-closed" size={22} color="#8BA989" />
            <TextInput
              style={styles.notesInput}
              placeholder="Jot down private notes here. Only you can see these."
              placeholderTextColor="#8BA989"
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
              value={privateNotes}
              onChangeText={setPrivateNotes}
            />
          </View>
          
          {/* Activity Stats Summary */}
          <View style={styles.statsSummary}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>{(stats.distance / 1000).toFixed(2)} km</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>
                {Math.floor(stats.duration / 60)}:{String(Math.floor(stats.duration % 60)).padStart(2, '0')}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Elevation</Text>
              <Text style={styles.statValue}>{stats.elevation.toFixed(0)} m</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Activity Type Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={activityTypeModalVisible}
        onRequestClose={() => setActivityTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Activity Type</Text>
              <TouchableOpacity
                onPress={() => setActivityTypeModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {activityTypes.map((item, index) => (
                <React.Fragment key={index}>
                  {renderActivityTypeOption(item)}
                  {index < activityTypes.length - 1 && <View style={styles.optionDivider} />}
                </React.Fragment>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Feeling Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={feelingModalVisible}
        onRequestClose={() => setFeelingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How did it feel?</Text>
              <TouchableOpacity
                onPress={() => setFeelingModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {feelingOptions.map((item, index) => (
                <React.Fragment key={index}>
                  {renderFeelingOption(item)}
                  {index < feelingOptions.length - 1 && <View style={styles.optionDivider} />}
                </React.Fragment>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Debug Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDebug}
        onRequestClose={() => setShowDebug(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.debugModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Technical Details</Text>
              <TouchableOpacity
                onPress={() => setShowDebug(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.debugScrollView}>
              <Text style={styles.debugText}>{debugInfo}</Text>
            </ScrollView>
            
            <View style={styles.debugActions}>
              <TouchableOpacity 
                style={styles.debugButton}
                onPress={() => checkSupabaseConnection()}
              >
                <Text style={styles.debugButtonText}>Test Connection</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.debugButton, styles.debugCloseButton]}
                onPress={() => {
                  setShowDebug(false);
                  navigation.replace('HikeHistory');
                }}
              >
                <Text style={styles.debugCloseButtonText}>Close & Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#2E7D32',
    borderBottomWidth: 1,
    borderBottomColor: '#266A2A',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  formContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  titleInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    color: '#333',
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    borderWidth: 1,
    borderColor: '#E0E5E0',
  },
  descriptionInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    color: '#333',
    padding: 16,
    fontSize: 16,
    height: 100,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    borderWidth: 1,
    borderColor: '#E0E5E0',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E5E0',
  },
  selectorText: {
    color: '#333',
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  // Media gallery styles
  mediaGallery: {
    marginBottom: 16,
  },
  mediaGalleryContent: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  mediaThumbnailContainer: {
    marginRight: 10,
    position: 'relative',
  },
  mediaThumbnail: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#E0E5E0',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2E7D32',
    borderStyle: 'dashed',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginBottom: 16,
  },
  mediaButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  mapButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E5E0',
  },
  mapButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  sectionHeader: {
    marginVertical: 16,
  },
  sectionHeaderText: {
    color: '#333',
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E5E0',
  },
  detailButtonText: {
    color: '#333',
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  detailValueText: {
    color: '#2E7D32',
    fontSize: 16,
    marginRight: 8,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E5E0',
  },
  notesInput: {
    color: '#333',
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  statsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E5E0',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#8BA989',
    fontSize: 14,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  statValue: {
    color: '#333',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E5E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  selectedOptionItem: {
    backgroundColor: '#2E7D32',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  selectedOptionText: {
    color: 'white',
    fontWeight: '500',
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#E0E5E0',
    marginVertical: 4,
  },
  // Add new styles for sync status
  syncStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  syncStatusText: {
    color: '#2E7D32',
    fontSize: 14,
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
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
  // Debug modal styles
  debugModalContent: {
    width: '90%',
    height: '80%',
  },
  debugScrollView: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 4,
  },
  debugText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#333',
  },
  debugActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  debugButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  debugCloseButton: {
    backgroundColor: '#666',
  },
  debugCloseButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});