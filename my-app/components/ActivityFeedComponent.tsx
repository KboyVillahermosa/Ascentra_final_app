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
  Share,
} from 'react-native';
import { supabase } from '../services/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

interface Post {
  id: string;
  content?: string;
  image_url?: string;
  created_at: string;
  user_id: string;
  privacy: 'public' | 'private';
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  username?: string;
  avatar_url?: string;
}

interface ActivityFeedComponentProps {
  navigation: any;
  userId?: string;
  showCreatePost?: boolean;
}

export default function ActivityFeedComponent({
  navigation,
  userId,
  showCreatePost = true,
}: ActivityFeedComponentProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [postPrivacy, setPostPrivacy] = useState<'public' | 'private'>(
    'public',
  );
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    getUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user, userId]);

  async function getUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
  }

  async function fetchPosts() {
    if (!user) {
      return;
    }

    setRefreshing(true);

    try {
      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      // If userId is provided, filter posts for that user
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        // For general feed, show public posts and user's own posts
        query = query.or(`privacy.eq.public,user_id.eq.${user.id}`);
      }

      const { data: postsData, error: postsError } = await query;

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        Alert.alert('Error', 'Failed to load posts');
        return;
      }

      // Get user likes
      const { data: userLikes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id);

      const likedPostIds = new Set(userLikes?.map(like => like.post_id) || []);

      // Enrich posts with user data and stats
      const enrichedPosts = await Promise.all(
        postsData.map(async post => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', post.user_id)
            .single();

          const { count: likeCount } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { count: commentCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          return {
            ...post,
            username: profileData?.username || 'Unknown User',
            avatar_url: profileData?.avatar_url,
            likeCount: likeCount || 0,
            commentCount: commentCount || 0,
            isLiked: likedPostIds.has(post.id),
          };
        }),
      );

      setPosts(enrichedPosts);
    } catch (error) {
      console.error('Error in fetchPosts:', error);
      Alert.alert('Error', 'Failed to load posts');
    } finally {
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
      aspect: [4, 3],
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

      const fileName = `post_${Date.now()}.jpg`;
      const filePath = `posts/${fileName}`;

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

  async function createPost() {
    if (!newPostText.trim() && !selectedImage) {
      Alert.alert('Error', 'Please add some content or an image to your post.');
      return;
    }

    setIsPosting(true);

    try {
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
        if (!imageUrl) {
          Alert.alert('Error', 'Failed to upload image. Please try again.');
          setIsPosting(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('posts')
        .insert({
          content: newPostText.trim() || null,
          image_url: imageUrl,
          user_id: user.id,
          privacy: postPrivacy,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Reset form
      setNewPostText('');
      setSelectedImage(null);
      setPostPrivacy('public');

      // Refresh posts
      await fetchPosts();

      Alert.alert('Success', 'Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  }

  async function toggleLike(postId: string) {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) {
        return;
      }

      if (post.isLiked) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        // Like
        await supabase.from('likes').insert({
          post_id: postId,
          user_id: user.id,
        });
      }

      // Update local state
      setPosts(
        posts.map(p =>
          p.id === postId
            ? {
                ...p,
                isLiked: !p.isLiked,
                likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1,
              }
            : p,
        ),
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }

  async function handleShare(post: Post) {
    try {
      const shareContent = {
        message: `Check out this hiking post by ${post.username || 'a fellow hiker'}!\n\n${post.content || 'Amazing hiking adventure!'}`,
        title: 'Hiking Adventure Share',
      };

      const result = await Share.share(shareContent);

      if (result.action === Share.sharedAction) {
        console.log('Post shared successfully');
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'Failed to share post. Please try again.');
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  const renderPost = (post: Post) => (
    <View key={post.id} style={styles.postCard}>
      <View style={styles.postHeader}>
        <Image
          source={{
            uri: post.avatar_url || 'https://www.gravatar.com/avatar/?d=mp',
          }}
          style={styles.avatar}
        />
        <View style={styles.postHeaderInfo}>
          <View style={styles.postHeaderTop}>
            <Text style={styles.username}>{post.username}</Text>
            {post.privacy === 'private' && (
              <Ionicons
                name='lock-closed'
                size={14}
                color='#666'
                style={styles.privacyIcon}
              />
            )}
          </View>
          <Text style={styles.timestamp}>{formatDate(post.created_at)}</Text>
        </View>
      </View>

      {post.content && <Text style={styles.postContent}>{post.content}</Text>}

      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={styles.postImage} />
      )}

      <View style={styles.postStats}>
        <Text style={styles.statsText}>
          {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'} •{' '}
          {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
        </Text>
      </View>

      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => toggleLike(post.id)}
        >
          <Ionicons
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={post.isLiked ? '#FF3B30' : '#666'}
          />
          <Text style={[styles.actionText, post.isLiked && styles.likedText]}>
            Like
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Comments', { postId: post.id })}
        >
          <Ionicons name='chatbubble-outline' size={20} color='#666' />
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleShare(post)}
        >
          <Ionicons name='share-social-outline' size={20} color='#666' />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={fetchPosts} />
      }
    >
      {showCreatePost && (
        <View style={styles.createPostContainer}>
          <TextInput
            style={styles.postInput}
            placeholder='Share your hiking adventure...'
            value={newPostText}
            onChangeText={setNewPostText}
            multiline
            maxLength={500}
          />

          {selectedImage && (
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
          )}

          <View style={styles.postActionBar}>
            <View style={styles.mediaButtons}>
              <TouchableOpacity
                style={styles.addMediaButton}
                onPress={pickImage}
              >
                <Ionicons name='camera' size={20} color='#2E7D32' />
                <Text style={styles.addMediaText}>Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.privacyButton}
                onPress={() => setShowPrivacyModal(true)}
              >
                <Ionicons
                  name={
                    postPrivacy === 'public'
                      ? 'globe-outline'
                      : 'lock-closed-outline'
                  }
                  size={16}
                  color='#666'
                />
                <Text style={styles.privacyText}>
                  {postPrivacy === 'public' ? 'Public' : 'Private'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.postButton,
                !newPostText.trim() &&
                  !selectedImage &&
                  styles.postButtonDisabled,
              ]}
              onPress={createPost}
              disabled={isPosting || (!newPostText.trim() && !selectedImage)}
            >
              {isPosting ? (
                <ActivityIndicator size='small' color='#FFF' />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {posts.length > 0 ? (
        posts.map(renderPost)
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons name='images-outline' size={60} color='#ccc' />
          <Text style={styles.emptyStateText}>No posts yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Share your hiking adventures!
          </Text>
        </View>
      )}

      {/* Privacy Selection Modal */}
      <Modal
        visible={showPrivacyModal}
        transparent
        animationType='fade'
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Post Privacy</Text>

            <TouchableOpacity
              style={[
                styles.privacyOption,
                postPrivacy === 'public' && styles.selectedPrivacyOption,
              ]}
              onPress={() => {
                setPostPrivacy('public');
                setShowPrivacyModal(false);
              }}
            >
              <Ionicons name='globe-outline' size={24} color='#2E7D32' />
              <View style={styles.privacyOptionText}>
                <Text style={styles.privacyOptionTitle}>Public</Text>
                <Text style={styles.privacyOptionDescription}>
                  Anyone can see this post
                </Text>
              </View>
              {postPrivacy === 'public' && (
                <Ionicons name='checkmark-circle' size={24} color='#2E7D32' />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.privacyOption,
                postPrivacy === 'private' && styles.selectedPrivacyOption,
              ]}
              onPress={() => {
                setPostPrivacy('private');
                setShowPrivacyModal(false);
              }}
            >
              <Ionicons name='lock-closed-outline' size={24} color='#666' />
              <View style={styles.privacyOptionText}>
                <Text style={styles.privacyOptionTitle}>Private</Text>
                <Text style={styles.privacyOptionDescription}>
                  Only you can see this post
                </Text>
              </View>
              {postPrivacy === 'private' && (
                <Ionicons name='checkmark-circle' size={24} color='#2E7D32' />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPrivacyModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  createPostContainer: {
    backgroundColor: '#FFF',
    margin: 10,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  postInput: {
    minHeight: 80,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: 10,
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
  postActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  mediaButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#F0F8F0',
  },
  addMediaText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
    color: '#2E7D32',
  },
  privacyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  privacyText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  postButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
  postButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  postCard: {
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
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postHeaderInfo: {
    flex: 1,
  },
  postHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },
  privacyIcon: {
    marginLeft: 6,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  postContent: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  postStats: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
  },
  postActions: {
    flexDirection: 'row',
    padding: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  likedText: {
    color: '#FF3B30',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedPrivacyOption: {
    borderColor: '#2E7D32',
    backgroundColor: '#F0F8F0',
  },
  privacyOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  privacyOptionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modalCloseButton: {
    marginTop: 10,
    padding: 15,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});
