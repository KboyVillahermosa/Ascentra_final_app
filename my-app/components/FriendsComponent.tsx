import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabaseClient';

interface Friend {
  id: string;
  username: string;
  profile_picture?: string;
  skill_level?: string;
  status:
    | 'friends'
    | 'pending_sent'
    | 'pending_received'
    | 'following'
    | 'none';
  mutual_friends?: number;
}

interface FriendsComponentProps {
  userId: string;
  navigation: any;
}

const FriendsComponent: React.FC<FriendsComponentProps> = ({
  userId,
  navigation,
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>(
    'friends',
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, [userId]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('friendships')
        .select(
          `
          *,
          friend:profiles!friendships_friend_id_fkey(
            id,
            username,
            profile_picture,
            skill_level
          ),
          user:profiles!friendships_user_id_fkey(
            id,
            username,
            profile_picture,
            skill_level
          )
        `,
        )
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (error) {
        throw error;
      }

      const friendsList =
        data?.map(friendship => {
          const friend =
            friendship.user_id === userId ? friendship.friend : friendship.user;
          return {
            id: friend.id,
            username: friend.username,
            profile_picture: friend.profile_picture,
            skill_level: friend.skill_level,
            status: friendship.status,
            mutual_friends: 0, // TODO: Calculate mutual friends
          };
        }) || [];

      setFriends(friendsList);
    } catch (error) {
      console.error('Error fetching friends:', error);
      Alert.alert('Error', 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, profile_picture, skill_level')
        .ilike('username', `%${query}%`)
        .neq('id', userId)
        .limit(20);

      if (error) {
        throw error;
      }

      // Check friendship status for each user
      const usersWithStatus = await Promise.all(
        data?.map(async user => {
          const { data: friendship } = await supabase
            .from('friendships')
            .select('status')
            .or(
              `and(user_id.eq.${userId},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${userId})`,
            )
            .single();

          return {
            ...user,
            status: friendship?.status || 'none',
            mutual_friends: 0,
          };
        }) || [],
      );

      setSearchResults(usersWithStatus);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase.from('friendships').insert({
        user_id: userId,
        friend_id: friendId,
        status: 'pending',
      });

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Friend request sent!');
      searchUsers(searchQuery); // Refresh search results
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const respondToFriendRequest = async (friendId: string, accept: boolean) => {
    try {
      if (accept) {
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('user_id', friendId)
          .eq('friend_id', userId);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('friendships')
          .delete()
          .eq('user_id', friendId)
          .eq('friend_id', userId);

        if (error) {
          throw error;
        }
      }

      Alert.alert(
        'Success',
        accept ? 'Friend request accepted!' : 'Friend request declined',
      );
      fetchFriends();
    } catch (error) {
      console.error('Error responding to friend request:', error);
      Alert.alert('Error', 'Failed to respond to friend request');
    }
  };

  const removeFriend = async (friendId: string) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('friendships')
                .delete()
                .or(
                  `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`,
                );

              if (error) {
                throw error;
              }

              Alert.alert('Success', 'Friend removed');
              fetchFriends();
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', 'Failed to remove friend');
            }
          },
        },
      ],
    );
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={styles.friendCard}>
      <Image
        source={{
          uri:
            item.profile_picture ||
            'https://via.placeholder.com/50x50.png?text=User',
        }}
        style={styles.profileImage}
      />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.username}</Text>
        {item.skill_level && (
          <Text style={styles.skillLevel}>{item.skill_level}</Text>
        )}
        {item.mutual_friends && item.mutual_friends > 0 && (
          <Text style={styles.mutualFriends}>
            {item.mutual_friends} mutual friends
          </Text>
        )}
      </View>
      <View style={styles.actionButtons}>
        {item.status === 'friends' && (
          <>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => {
                // TODO: Implement chat functionality
                Alert.alert(
                  'Coming Soon',
                  'Chat functionality will be available in a future update.',
                );
              }}
            >
              <Ionicons name='chatbubble-outline' size={20} color='#007AFF' />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeFriend(item.id)}
            >
              <Ionicons
                name='person-remove-outline'
                size={20}
                color='#FF3B30'
              />
            </TouchableOpacity>
          </>
        )}
        {item.status === 'pending_received' && (
          <>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => respondToFriendRequest(item.id, true)}
            >
              <Ionicons name='checkmark' size={20} color='#34C759' />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => respondToFriendRequest(item.id, false)}
            >
              <Ionicons name='close' size={20} color='#FF3B30' />
            </TouchableOpacity>
          </>
        )}
        {item.status === 'pending_sent' && (
          <Text style={styles.pendingText}>Pending</Text>
        )}
        {item.status === 'none' && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => sendFriendRequest(item.id)}
          >
            <Ionicons name='person-add-outline' size={20} color='#007AFF' />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFriends();
    setRefreshing(false);
  };

  const getFriendsData = () => {
    switch (activeTab) {
      case 'friends':
        return friends.filter(f => f.status === 'friends');
      case 'requests':
        return friends.filter(f => f.status === 'pending_received');
      case 'search':
        return searchResults;
      default:
        return [];
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'friends' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('friends')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'friends' && styles.activeTabText,
            ]}
          >
            Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'requests' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('requests')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'requests' && styles.activeTabText,
            ]}
          >
            Requests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'search' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('search')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'search' && styles.activeTabText,
            ]}
          >
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar for Search Tab */}
      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder='Search for friends...'
            value={searchQuery}
            onChangeText={text => {
              setSearchQuery(text);
              searchUsers(text);
            }}
          />
          <Ionicons
            name='search'
            size={20}
            color='#666'
            style={styles.searchIcon}
          />
        </View>
      )}

      {/* Friends List */}
      <FlatList
        data={getFriendsData()}
        renderItem={renderFriend}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={
                activeTab === 'friends'
                  ? 'people-outline'
                  : activeTab === 'requests'
                    ? 'mail-outline'
                    : 'search-outline'
              }
              size={60}
              color='#ccc'
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'friends'
                ? 'No Friends Yet'
                : activeTab === 'requests'
                  ? 'No Friend Requests'
                  : 'Search for Friends'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'friends'
                ? 'Start connecting with other hikers!'
                : activeTab === 'requests'
                  ? 'No pending friend requests'
                  : 'Find and connect with other hikers'}
            </Text>
          </View>
        }
        contentContainerStyle={
          getFriendsData().length === 0 ? styles.emptyList : undefined
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        initialNumToRender={8}
        windowSize={10}
        getItemLayout={(data, index) => ({
          length: 80,
          offset: 80 * index,
          index,
        })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  searchIcon: {
    marginLeft: 8,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  skillLevel: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  mutualFriends: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageButton: {
    padding: 8,
    marginRight: 8,
  },
  removeButton: {
    padding: 8,
  },
  acceptButton: {
    padding: 8,
    marginRight: 8,
  },
  declineButton: {
    padding: 8,
  },
  addButton: {
    padding: 8,
  },
  pendingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default FriendsComponent;
