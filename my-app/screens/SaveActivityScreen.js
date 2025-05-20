import React, { useState } from 'react';
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
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { saveHikeToLocalDB } from '../services/databaseService';

export default function SaveActivityScreen({ navigation, route }) {
  // Get hike data from route params
  const { routeCoordinates, stats, date } = route.params;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityType, setActivityType] = useState('Hiking');
  const [feeling, setFeeling] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);

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

  // Handle save activity
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Process media files to extract just the necessary data
      const processedMedia = mediaFiles.map(media => ({
        uri: media.uri,
        type: media.type || (media.uri.endsWith('.mp4') ? 'video' : 'image'),
        name: media.fileName || media.uri.split('/').pop()
      }));
      
      console.log('Processed media files:', processedMedia.length, 'items');
      processedMedia.forEach((item, i) => {
        console.log(`Media #${i}: ${item.type} - ${item.uri}`);
      });
      
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
        synced: 1, // Mark as already synced
        stats: {
          distance: stats.distance || 0,
          duration: stats.duration || 0,
          pace: stats.pace || 0,
          elevation: stats.elevation || 0
        }
      };
      
      console.log('Saving hike with enriched data:', {
        title: hikeData.title,
        date: hikeData.date,
        distance: hikeData.stats.distance,
        routePoints: hikeData.routeCoordinates.length,
        mediaCount: hikeData.media.length
      });
      
      // Save to local storage
      const savedId = await saveHikeToLocalDB(hikeData);
      console.log('Successfully saved hike with ID:', savedId);
      
      // Navigate to history screen
      navigation.replace('HikeHistory');
    } catch (error) {
      console.error('Failed to save activity:', error);
      alert('Could not save your activity. Please try again.');
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#212121" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Save Activity</Text>
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>SAVE</Text>
        </TouchableOpacity>
      </View>
      
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
            placeholderTextColor="#999"
            value={title}
            onChangeText={setTitle}
          />
          
          {/* Activity Description */}
          <TextInput
            style={styles.descriptionInput}
            placeholder="How'd it go? Share more about your activity and use @ to tag someone."
            placeholderTextColor="#999"
            multiline={true}
            numberOfLines={3}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
          
          {/* Activity Type Selector */}
          <TouchableOpacity style={styles.selectorButton}>
            <Ionicons name="footsteps" size={22} color="#FC4C02" />
            <Text style={styles.selectorText}>{activityType}</Text>
            <Ionicons name="chevron-down" size={22} color="#AAA" />
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
            <Ionicons name="image" size={22} color="#FC4C02" />
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
          <TouchableOpacity style={styles.detailButton}>
            <Ionicons name="pulse" size={22} color="#AAA" />
            <Text style={styles.detailButtonText}>Type of activity</Text>
            <Ionicons name="chevron-down" size={22} color="#AAA" />
          </TouchableOpacity>
          
          {/* Feeling */}
          <TouchableOpacity style={styles.detailButton}>
            <Ionicons name="happy-outline" size={22} color="#AAA" />
            <Text style={styles.detailButtonText}>How did that activity feel?</Text>
            <Ionicons name="chevron-down" size={22} color="#AAA" />
          </TouchableOpacity>
          
          {/* Private Notes */}
          <View style={styles.notesContainer}>
            <Ionicons name="lock-closed" size={22} color="#AAA" />
            <TextInput
              style={styles.notesInput}
              placeholder="Jot down private notes here. Only you can see these."
              placeholderTextColor="#999"
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#212121',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
    color: '#FC4C02',
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
    backgroundColor: '#333',
    borderRadius: 8,
    color: 'white',
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  descriptionInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    color: 'white',
    padding: 16,
    fontSize: 16,
    height: 100,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  selectorText: {
    color: 'white',
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
    backgroundColor: '#444',
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
    backgroundColor: '#FC4C02',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FC4C02',
    borderStyle: 'dashed',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginBottom: 16,
  },
  mediaButtonText: {
    color: '#FC4C02',
    fontSize: 16,
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  mapButton: {
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 24,
  },
  mapButtonText: {
    color: '#FC4C02',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  sectionHeader: {
    marginVertical: 16,
  },
  sectionHeaderText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  detailButtonText: {
    color: 'white',
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  notesInput: {
    color: 'white',
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  statsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  statValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
});