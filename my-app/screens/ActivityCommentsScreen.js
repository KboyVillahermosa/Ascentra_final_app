import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabaseClient';

export default function ActivityCommentsScreen({ route, navigation }) {
  const { activityId, activityTitle } = route.params;
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});
  const [activitySocial, setActivitySocial] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    getCurrentUser();
    fetchActivitySocial();
  }, []);

  async function getCurrentUser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Fetch the current user's profile for avatar
      if (user) {
        fetchUserProfile(user.id);
      }
    } catch (error) {
      console.warn('Error fetching user profile:', error);
    }
  }

  async function fetchActivitySocial() {
    try {
      setLoading(true);

      // Check if activity exists in the activity_social table
      const result = await supabase
        .from('activity_social')
        .select('*')
        .eq('activity_id', activityId)
        .single();

      let { data } = result;
      const { error } = result;

      if (error) {
        // If not found, create a new entry
        if (error.code === 'PGRST116') {
          const { data: newData, error: insertError } = await supabase
            .from('activity_social')
            .insert([
              {
                activity_id: activityId,
                user_id: currentUser?.id,
                likes: 0,
                liked_by: [],
                comments: [],
              },
            ])
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }
          data = newData;
        } else {
          throw error;
        }
      }

      setActivitySocial(data);

      // Extract comments from the JSONB array
      const commentsList = data.comments || [];
      setComments(commentsList);

      // Fetch user profiles for all comment authors
      const userIds = Array.from(
        new Set(commentsList.map(comment => comment.user_id)),
      );
      userIds.forEach(userId => fetchUserProfile(userId));
    } catch (error) {
      // Create a default empty structure
      setActivitySocial({
        id: null,
        activity_id: activityId,
        comments: [],
      });
      setComments([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        throw error;
      }

      setUserProfiles(prev => ({
        ...prev,
        [userId]: data,
      }));
    } catch (error) {
      setUserProfiles(prev => ({
        ...prev,
        [userId]: { username: 'User', avatar_url: null },
      }));
    }
  }

  async function submitComment() {
    if (!newComment.trim() || !currentUser) {
      return;
    }

    try {
      setSubmitting(true);

      // Create a new comment object
      const newCommentObj = {
        id: Date.now().toString(),
        user_id: currentUser.id,
        content: newComment.trim(),
        created_at: new Date().toISOString(),
      };

      // Add to local state immediately for UI responsiveness
      const updatedComments = [newCommentObj, ...comments];
      setComments(updatedComments);

      // If we have an existing activity_social record
      if (activitySocial?.id) {
        const { error } = await supabase
          .from('activity_social')
          .update({
            comments: updatedComments,
            updated_at: new Date().toISOString(),
          })
          .eq('id', activitySocial.id);

        if (error) {
          throw error;
        }
      } else {
        // Create a new activity_social record
        const { error } = await supabase.from('activity_social').insert([
          {
            activity_id: activityId,
            user_id: currentUser.id,
            comments: updatedComments,
          },
        ]);

        if (error) {
          throw error;
        }
      }

      setNewComment('');
    } catch (error) {
      alert('Failed to post comment. Please try again.');
      // Revert the optimistic update
      setComments(comments);
    } finally {
      setSubmitting(false);
    }
  }

  const formatRelativeTime = dateString => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }

    return date.toLocaleDateString();
  };

  const renderComment = ({ item }) => {
    const profile = userProfiles[item.user_id] || {
      username: 'User',
      avatar_url: null,
    };

    return (
      <View style={styles.commentContainer}>
        <Image
          source={{
            uri: profile.avatar_url || 'https://www.gravatar.com/avatar/?d=mp',
          }}
          style={styles.commentAvatar}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUsername}>{profile.username}</Text>
            <Text style={styles.commentTime}>
              {formatRelativeTime(item.created_at)}
            </Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>Comments</Text>
        <View style={styles.headerRight} />
      </View>

      <Text style={styles.activityTitle}>{activityTitle}</Text>

      {loading ? (
        <ActivityIndicator style={styles.loader} size='large' color='#2E7D32' />
      ) : (
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.commentsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name='chatbubble-outline' size={50} color='#DDD' />
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>Be the first to comment!</Text>
            </View>
          }
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
        keyboardVerticalOffset={100}
      >
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder='Add a comment...'
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={500}
        />

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!newComment.trim() || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={submitComment}
          disabled={!newComment.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size='small' color='white' />
          ) : (
            <Ionicons name='send' size={20} color='white' />
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2E7D32',
    height: 60,
    paddingHorizontal: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    width: 40,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  commentsList: {
    padding: 10,
  },
  commentContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 14,
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#AAAAAA',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
});
