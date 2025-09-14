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
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useProfile } from '../contexts/ProfileContext';

const { width } = Dimensions.get('window');

interface FavoriteSpot {
  id: string;
  name: string;
  description?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  photos?: string[];
  difficulty_level?: string;
  distance?: number;
  elevation_gain?: number;
  favorited_at?: string;
  is_favorited?: boolean;
}

interface FavoritesComponentProps {
  navigation: any;
  userId: string;
}

export default function FavoritesComponent({
  navigation,
  userId,
}: FavoritesComponentProps) {
  const { favorites, favoritesLoading, refreshFavorites, removeFromFavorites } = useProfile();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObject | null>(null);

  useEffect(() => {
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

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await refreshFavorites();
    } catch (error) {
      console.error('Error refreshing favorites:', error);
      Alert.alert('Error', 'Failed to refresh favorites');
    } finally {
      setRefreshing(false);
    }
  }



  function handleAddFavorite() {
    Alert.alert(
      'Add Favorite',
      'To add favorites, please browse hiking spots and tap the heart icon on spots you want to save.',
      [{ text: 'OK' }]
    );
    setShowAddModal(false);
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
              const success = await removeFromFavorites(spotId);
              if (!success) {
                Alert.alert('Error', 'Failed to remove favorite spot.');
              }
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

  const renderFavoriteSpot = (spot: FavoriteSpot) => {
    const imageUrl = spot.photos && spot.photos.length > 0 ? spot.photos[0] : null;
    
    return (
      <View key={spot.id} style={styles.spotCard}>
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.spotImage} />
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

          {spot.location_name && (
            <View style={styles.locationRow}>
              <Ionicons name='location-outline' size={16} color='#666' />
              <Text style={styles.spotLocation}>{spot.location_name}</Text>
            </View>
          )}

          {spot.description && <Text style={styles.spotNotes}>{spot.description}</Text>}
          
          {spot.difficulty_level && (
            <Text style={styles.spotDifficulty}>Difficulty: {spot.difficulty_level}</Text>
          )}
          
          {spot.distance && (
            <Text style={styles.spotDistance}>Distance: {spot.distance} miles</Text>
          )}

          <View style={styles.spotFooter}>
            {spot.favorited_at && (
              <Text style={styles.spotDate}>
                Added {formatDate(spot.favorited_at)}
              </Text>
            )}

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
  };

  if (favoritesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#2E7D32' />
        <Text style={styles.loadingText}>Loading your favorite spots...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
        <Ionicons name='information-circle-outline' size={24} color='#FFF' />
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
            <TouchableOpacity onPress={handleAddFavorite}>
              <Text style={styles.saveText}>OK</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.messageContainer}>
              <Ionicons name='information-circle-outline' size={48} color='#2E7D32' />
              <Text style={styles.messageTitle}>Add Favorites</Text>
              <Text style={styles.messageText}>
                To add hiking spots to your favorites, browse the available trails and tap the heart icon on any spot you'd like to save.
              </Text>
              <Text style={styles.messageSubtext}>
                Your favorited spots will appear here for easy access.
              </Text>
            </View>
          </View>
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
  spotDifficulty: {
    fontSize: 12,
    color: '#FF6B35',
    marginTop: 2,
    fontWeight: '600',
  },
  spotDistance: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 2,
    fontWeight: '500',
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
  messageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#F8F9FA',
    margin: 20,
    borderRadius: 12,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  messageSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});
