import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import {
  getUserFavorites,
  removeFavorite,
  HikingSpot,
} from '../services/databaseService';
// Using standard React Native components instead of missing design system components
import { getHikingSpotImageSource } from '../utils/imageHelpers';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.7; // TikTok-like full screen cards

interface FavoriteSpotCardProps {
  spot: HikingSpot;
  onPress: () => void;
  onRemoveFavorite: (spotId: string) => void;
}

const FavoriteSpotCard: React.FC<FavoriteSpotCardProps> = React.memo(
  ({ spot, onPress, onRemoveFavorite }) => {
    const [isRemoving, setIsRemoving] = useState(false);
    const imageSource = getHikingSpotImageSource(spot);

    const handleRemoveFavorite = async () => {
      Alert.alert(
        'Remove Favorite',
        `Remove "${spot.name}" from your favorites?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              setIsRemoving(true);
              try {
                await onRemoveFavorite(spot.id);
              } catch (error) {
                console.error('Error removing favorite:', error);
              } finally {
                setIsRemoving(false);
              }
            },
          },
        ],
      );
    };

    return (
      <TouchableOpacity onPress={onPress} style={styles.cardContainer}>
        <View style={styles.card}>
          <Image
            source={imageSource}
            style={styles.backgroundImage}
            resizeMode='cover'
          />

          {/* Gradient Overlay */}
          <View style={styles.gradientOverlay} />

          {/* Remove Favorite Button */}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemoveFavorite}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <ActivityIndicator size='small' color='#FFFFFF' />
            ) : (
              <Ionicons name='heart' size={24} color='#D32F2F' />
            )}
          </TouchableOpacity>

          {/* Content Overlay */}
          <View style={styles.contentOverlay}>
            <View style={styles.spotInfo}>
              <Text style={styles.spotName} numberOfLines={2}>
                {spot.name}
              </Text>
              <View style={styles.locationContainer}>
                <Ionicons name='location' size={16} color='#FFFFFF' />
                <Text style={styles.spotLocation} numberOfLines={1}>
                  {/* Location info not available in current interface */}
                </Text>
              </View>

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Ionicons name='star' size={16} color='#FFD700' />
                  <Text style={styles.statText}>
                    {spot.rating?.toFixed(1) || 'N/A'}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Ionicons name='people' size={16} color='#FFFFFF' />
                  <Text style={styles.statText}>
                    {spot.review_count || 0} reviews
                  </Text>
                </View>

                <View style={styles.difficultyBadge}>
                  <Text style={styles.difficultyText}>
                    {spot.difficulty || 'Unknown'}
                  </Text>
                </View>
              </View>

              <Text style={styles.description} numberOfLines={3}>
                {spot.description}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name='share-outline' size={24} color='#FFFFFF' />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name='bookmark-outline' size={24} color='#FFFFFF' />
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryActionButton}>
                <Ionicons name='navigate' size={20} color='#FFFFFF' />
                <Text style={styles.primaryActionText}>Explore</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);

type FavoritesScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Favorites'
>;

interface FavoritesScreenProps {
  navigation: FavoritesScreenNavigationProp;
}

const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ navigation }) => {
  const [favorites, setFavorites] = useState<HikingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async () => {
    try {
      const userFavorites = await getUserFavorites();
      setFavorites(userFavorites);
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to load your favorite spots. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  }, [loadFavorites]);

  const handleRemoveFavorite = useCallback(async (spotId: string) => {
    try {
      await removeFavorite(spotId);
      setFavorites(prev => prev.filter(spot => spot.id !== spotId));
    } catch (error) {
      Alert.alert('Error', 'Failed to remove favorite. Please try again.');
    }
  }, []);

  const handleSpotPress = useCallback(
    (spot: HikingSpot) => {
      navigation.navigate('HikingSpotDetails', { spot });
    },
    [navigation],
  );

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const renderItem = useCallback(
    ({ item }: { item: HikingSpot }) => (
      <FavoriteSpotCard
        spot={item}
        onPress={() => handleSpotPress(item)}
        onRemoveFavorite={handleRemoveFavorite}
      />
    ),
    [handleSpotPress, handleRemoveFavorite],
  );

  const keyExtractor = useCallback((item: HikingSpot) => item.id, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle='light-content' backgroundColor='#2E7D32' />
        <ActivityIndicator size='large' color='#2E7D32' />
        <Text style={styles.loadingText}>Loading your favorites...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='light-content' backgroundColor='#2E7D32' />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color='#FFFFFF' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Favorites</Text>
        <View style={styles.headerRight}>
          <Text style={styles.favoriteCount}>{favorites.length}</Text>
        </View>
      </View>

      {favorites.length > 0 ? (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={CARD_HEIGHT}
          decelerationRate='fast'
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2E7D32']}
              tintColor='#2E7D32'
            />
          }
          getItemLayout={(data, index) => ({
            length: CARD_HEIGHT,
            offset: CARD_HEIGHT * index,
            index,
          })}
          removeClippedSubviews={true}
          maxToRenderPerBatch={3}
          windowSize={5}
          initialNumToRender={2}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name='heart-outline' size={80} color='#666666' />
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptySubtitle}>
            Start exploring and save your favorite hiking spots!
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.exploreButtonText}>Explore Spots</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F8F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#2E7D32',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRight: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  favoriteCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardContainer: {
    height: CARD_HEIGHT,
    width: width,
  },
  card: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  removeButton: {
    position: 'absolute',
    top: 32,
    right: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 32,
    justifyContent: 'flex-end',
  },
  spotInfo: {
    marginBottom: 32,
  },
  spotName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  spotLocation: {
    fontSize: 18,
    color: '#FFFFFF',
    marginLeft: 4,
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    marginBottom: 4,
  },
  statText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  difficultyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
    opacity: 0.9,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionButton: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  exploreButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default FavoritesScreen;
