import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { supabase } from '../services/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

interface FavoriteSpot {
  id: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  image_url?: string;
  notes?: string;
  created_at: string;
  user_id: string;
}

interface FavoritesComponentProps {
  navigation: any;
  userId: string;
}

export default function FavoritesComponent({
  navigation,
  userId,
}: FavoritesComponentProps) {
  const [favorites, setFavorites] = useState<FavoriteSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSpot, setNewSpot] = useState({
    name: '',
    location: '',
    notes: '',
    image_url: '',
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObject | null>(null);

  useEffect(() => {
    fetchFavorites();
    getCurrentLocation();
  }, []);

  async function getCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location);
    } catch (error) {
      console.log('Error getting location:', error);
    }
  }

  async function fetchFavorites() {
    try {
      setRefreshing(true);

      const { data, error } = await supabase
        .from('favorite_spots')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching favorites:', error);
        Alert.alert('Error', 'Failed to load favorite spots');
        return;
      }

      setFavorites(data || []);
    } catch (error) {
      console.error('Error in fetchFavorites:', error);
      Alert.alert('Error', 'Failed to load favorite spots');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please grant camera roll permissions to upload images.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  }

  async function uploadImage(uri: string): Promise<string | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileName = `favorite_spot_${Date.now()}.jpg`;
      const filePath = `favorites/${fileName}`;

      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
        });

      if (error) {
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('media').getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }

  async function addFavoriteSpot() {
    if (!newSpot.name.trim() || !newSpot.location.trim()) {
      Alert.alert('Error', 'Please enter both name and location.');
      return;
    }

    setIsAdding(true);

    try {
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
        if (!imageUrl) {
          Alert.alert('Error', 'Failed to upload image. Please try again.');
          setIsAdding(false);
          return;
        }
      }

      // Try to geocode the location if we have current location
      let latitude = null;
      let longitude = null;

      if (currentLocation) {
        // For now, we'll use the current location as coordinates
        // In a real app, you'd want to geocode the entered location
        latitude = currentLocation.coords.latitude;
        longitude = currentLocation.coords.longitude;
      }

      const { data, error } = await supabase
        .from('favorite_spots')
        .insert({
          name: newSpot.name.trim(),
          location: newSpot.location.trim(),
          notes: newSpot.notes.trim() || null,
          image_url: imageUrl,
          latitude,
          longitude,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Reset form
      setNewSpot({ name: '', location: '', notes: '', image_url: '' });
      setSelectedImage(null);
      setShowAddModal(false);

      // Refresh favorites
      await fetchFavorites();

      Alert.alert('Success', 'Favorite spot added successfully!');
    } catch (error) {
      console.error('Error adding favorite spot:', error);
      Alert.alert('Error', 'Failed to add favorite spot. Please try again.');
    } finally {
      setIsAdding(false);
    }
  }

  async function removeFavoriteSpot(spotId: string) {
    Alert.alert(
      'Remove Favorite',
      'Are you sure you want to remove this favorite spot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('favorite_spots')
                .delete()
                .eq('id', spotId);

              if (error) {
                throw error;
              }

              await fetchFavorites();
            } catch (error) {
              console.error('Error removing favorite:', error);
              Alert.alert('Error', 'Failed to remove favorite spot.');
            }
          },
        },
      ],
    );
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  const renderFavoriteSpot = (spot: FavoriteSpot) => (
    <View key={spot.id} style={styles.spotCard}>
      {spot.image_url && (
        <Image source={{ uri: spot.image_url }} style={styles.spotImage} />
      )}

      <View style={styles.spotContent}>
        <View style={styles.spotHeader}>
          <Text style={styles.spotName}>{spot.name}</Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFavoriteSpot(spot.id)}
          >
            <Ionicons name='heart' size={20} color='#FF3B30' />
          </TouchableOpacity>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name='location-outline' size={16} color='#666' />
          <Text style={styles.spotLocation}>{spot.location}</Text>
        </View>

        {spot.notes && <Text style={styles.spotNotes}>{spot.notes}</Text>}

        <View style={styles.spotFooter}>
          <Text style={styles.spotDate}>
            Added {formatDate(spot.created_at)}
          </Text>

          {spot.latitude && spot.longitude && (
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={() => {
                // Open maps app with directions
                const url = `https://maps.google.com/?q=${spot.latitude},${spot.longitude}`;
                // In a real app, you'd use Linking.openURL(url)
                Alert.alert('Directions', `Would open: ${url}`);
              }}
            >
              <Ionicons name='navigate-outline' size={16} color='#2E7D32' />
              <Text style={styles.directionsText}>Directions</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#2E7D32' />
        <Text style={styles.loadingText}>Loading favorites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchFavorites} />
        }
      >
        {favorites.length > 0 ? (
          favorites.map(renderFavoriteSpot)
        ) : (
          <View style={styles.emptyStateContainer}>
            <Ionicons name='heart-outline' size={60} color='#ccc' />
            <Text style={styles.emptyStateText}>No favorite spots yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Save your favorite hiking locations!
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name='add' size={24} color='#FFF' />
      </TouchableOpacity>

      {/* Add Favorite Modal */}
      <Modal
        visible={showAddModal}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Favorite Spot</Text>
            <TouchableOpacity
              onPress={addFavoriteSpot}
              disabled={
                isAdding || !newSpot.name.trim() || !newSpot.location.trim()
              }
            >
              <Text
                style={[
                  styles.saveText,
                  (!newSpot.name.trim() || !newSpot.location.trim()) &&
                    styles.saveTextDisabled,
                ]}
              >
                {isAdding ? 'Adding...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder='Enter spot name'
                value={newSpot.name}
                onChangeText={text => setNewSpot({ ...newSpot, name: text })}
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location *</Text>
              <TextInput
                style={styles.textInput}
                placeholder='Enter location or address'
                value={newSpot.location}
                onChangeText={text =>
                  setNewSpot({ ...newSpot, location: text })
                }
                maxLength={200}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                placeholder='Add notes about this spot...'
                value={newSpot.notes}
                onChangeText={text => setNewSpot({ ...newSpot, notes: text })}
                multiline
                maxLength={500}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Photo</Text>

              {selectedImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.imagePreview}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Ionicons name='close-circle' size={24} color='#FF3B30' />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={pickImage}
                >
                  <Ionicons name='camera-outline' size={24} color='#2E7D32' />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  spotCard: {
    backgroundColor: '#FFF',
    margin: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  spotImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  spotContent: {
    padding: 15,
  },
  spotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  spotName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  removeButton: {
    padding: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  spotLocation: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  spotNotes: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  spotFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spotDate: {
    fontSize: 12,
    color: '#888',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  directionsText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
    backgroundColor: '#FFF',
    margin: 10,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  saveTextDisabled: {
    color: '#999',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F8F8F8',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2E7D32',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    backgroundColor: '#F0F8F0',
  },
  addPhotoText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '500',
  },
});
