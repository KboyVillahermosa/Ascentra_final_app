import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllHikes, syncUnsentHikes, debugStorage } from '../services/databaseService';
import { formatDate, formatDistance, formatDuration } from '../utils/formatters';

export default function HistoryScreen({ navigation }) {
  const [hikes, setHikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const isFocused = useIsFocused();

  // Load hikes from local storage
  const loadHikes = useCallback(async () => {
    try {
      console.log('Starting to load hikes from local storage...');
      setLoading(true);
      
      // Debug storage first to see what's there
      await debugStorage();
      
      const allHikes = await getAllHikes();
      console.log(`Successfully loaded ${allHikes.length} hikes`);
      
      // Sort hikes by date (newest first)
      const sortedHikes = allHikes.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });
      
      console.log('Hikes sorted by date, setting state...');
      setHikes(sortedHikes);
    } catch (error) {
      console.error('Error loading hikes:', error);
      Alert.alert('Error', 'Failed to load hike history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Check network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    
    return () => unsubscribe();
  }, []);

  // Load hikes when the screen comes into focus
  useEffect(() => {
    if (isFocused) {
      loadHikes();
    }
  }, [isFocused, loadHikes]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHikes();
  }, [loadHikes]);

  // Try to sync unsynced hikes with the server
  const handleSync = async () => {
    if (!isConnected) {
      Alert.alert('Offline', 'You need an internet connection to sync hikes.');
      return;
    }
    
    try {
      const result = await syncUnsentHikes();
      Alert.alert('Sync Complete', result.message);
      loadHikes(); // Reload hikes after sync attempt
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Sync Error', 'Failed to sync hikes with server.');
    }
  };

  // Test function to check what's in storage
  const testLocalStorage = async () => {
    try {
      const hikesStr = await AsyncStorage.getItem('@ascentra_hikes');
      console.log('Raw AsyncStorage data:', hikesStr ? hikesStr.substring(0, 100) + '...' : 'null');
      
      Alert.alert(
        'Storage Debug', 
        `Raw data exists: ${hikesStr ? 'Yes' : 'No'}\n` +
        `Number of items: ${hikesStr ? JSON.parse(hikesStr).length : 0}`
      );
      
      // Force reload after checking
      loadHikes();
    } catch (error) {
      console.error('Test storage error:', error);
      Alert.alert('Error', 'Failed to test storage: ' + error.message);
    }
  };

  // View details of a specific hike
  const viewHikeDetails = (hike) => {
    // You can implement a details screen later
    // For now, just show basic info
    Alert.alert(
      'Hike Details',
      `Date: ${formatDate(hike.date)}\n` +
      `Distance: ${formatDistance(hike.distance)}\n` +
      `Duration: ${formatDuration(hike.duration)}\n` +
      `Elevation gain: ${hike.elevation.toFixed(0)}m`
    );
  };

  // Render each hike item
  const renderHikeItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.hikeItem} 
      onPress={() => viewHikeDetails(item)}
    >
      <View style={styles.hikeHeader}>
        <Text style={styles.hikeDate}>{formatDate(item.date)}</Text>
        {item.synced === 0 && (
          <View style={styles.syncStatusBadge}>
            <Text style={styles.syncStatusText}>Not Synced</Text>
          </View>
        )}
      </View>
      
      <View style={styles.hikeStats}>
        <View style={styles.statItem}>
          <Ionicons name="navigate" size={18} color="#3498db" />
          <Text style={styles.statValue}>{formatDistance(item.distance)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="time" size={18} color="#3498db" />
          <Text style={styles.statValue}>{formatDuration(item.duration)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="trending-up" size={18} color="#3498db" />
          <Text style={styles.statValue}>{item.elevation.toFixed(0)}m</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render empty state when no hikes are available
  const renderEmptyList = () => (
    <View style={styles.emptyState}>
      <Ionicons name="footsteps-outline" size={64} color="#bdc3c7" />
      <Text style={styles.emptyStateText}>No hikes recorded yet</Text>
      <Text style={styles.emptyStateSubText}>
        Your hikes will appear here once you track some activities
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hike History</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.syncButton} 
            onPress={handleSync}
            disabled={!isConnected}
          >
            <Ionicons 
              name="sync" 
              size={24} 
              color={isConnected ? "#3498db" : "#bdc3c7"} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.debugButton} onPress={testLocalStorage}>
            <Ionicons name="bug" size={24} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading hikes...</Text>
        </View>
      ) : (
        <FlatList
          data={hikes}
          renderItem={renderHikeItem}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={renderEmptyList}
          contentContainerStyle={hikes.length === 0 ? styles.listEmptyContainer : styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#3498db"]}
            />
          }
        />
      )}
      
      {!isConnected && (
        <View style={styles.offlineIndicator}>
          <Ionicons name="cloud-offline" size={16} color="white" />
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButton: {
    padding: 8,
    marginRight: 4,
  },
  debugButton: {
    padding: 8,
  },
  hikeItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 12,
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
  hikeDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginTop: 16,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 8,
  },
  listContainer: {
    padding: 16,
  },
  listEmptyContainer: {
    flex: 1,
  },
  offlineIndicator: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineText: {
    color: 'white',
    marginLeft: 6,
    fontWeight: 'bold',
  },
});