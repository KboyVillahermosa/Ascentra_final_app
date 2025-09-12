import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '../services/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { Video } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const PostsScreen = React.memo(({ navigation }) => {
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    getUser();
    checkTablesExist();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchPosts();
    }, [user]),
  );

  const getUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
  }, []);

  const fetchPosts = useCallback(async () => {
    if (!user) {
      return;
    }

    setRefreshing(true);

    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) {
        Alert.alert('Error', 'Failed to load posts');
        return;
      }

      const { data: userLikes, error: userLikesError } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id);

      if (userLikesError && userLikesError.code !== 'PGRST116') {
        console.warn('Error fetching user likes:', userLikesError);
      }

      const likedPostIds = new Set(userLikes?.map(like => like.post_id) || []);

      // Optimize database queries by batching them instead of individual queries per post
      const userIds = [...new Set(postsData.map(post => post.user_id))];
      const postIds = postsData.map(post => post.id);

      // Batch fetch all profiles at once
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError && profilesError.code !== 'PGRST116') {
        console.warn('Error fetching profiles:', profilesError);
      }

      // Batch fetch all like counts at once
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('post_id')
        .in('post_id', postIds);

      if (likesError && likesError.code !== 'PGRST116') {
        console.warn('Error fetching likes:', likesError);
      }

      // Batch fetch all comment counts at once
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds);

      if (commentsError && commentsError.code !== 'PGRST116') {
        console.warn('Error fetching comments:', commentsError);
      }

      // Create lookup maps for efficient data access
      const profilesMap = new Map(
        profilesData?.map(profile => [profile.id, profile]) || [],
      );
      const likesCountMap = new Map();
      const commentsCountMap = new Map();

      // Count likes per post
      likesData?.forEach(like => {
        likesCountMap.set(
          like.post_id,
          (likesCountMap.get(like.post_id) || 0) + 1,
        );
      });

      // Count comments per post
      commentsData?.forEach(comment => {
        commentsCountMap.set(
          comment.post_id,
          (commentsCountMap.get(comment.post_id) || 0) + 1,
        );
      });

      // Map posts with enriched data using lookup maps
      const enrichedPosts = postsData.map(post => {
        const profile = profilesMap.get(post.user_id) || {
          username: 'User',
          avatar_url: null,
        };
        const likeCount = likesCountMap.get(post.id) || 0;
        const commentCount = commentsCountMap.get(post.id) || 0;
        const isLiked = likedPostIds.has(post.id);

        return {
          ...post,
          profiles: profile,
          likeCount,
          commentCount,
          isLiked,
        };
      });

      setPosts(enrichedPosts);
    } catch (err) {
      console.warn('Error fetching posts:', err);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  const checkTablesExist = useCallback(async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .limit(1);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('*')
        .limit(1);

      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .limit(1);

      if (user) {
        const { data: userProfile, error: userProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userProfileError && userProfileError.code === 'PGRST116') {
          const { data, error } = await supabase
            .from('profiles')
            .insert([
              { id: user.id, username: 'User' + user.id.substring(0, 4) },
            ]);
        }
      }

      const { data: buckets, error: bucketsError } =
        await supabase.storage.listBuckets();

      if (bucketsError) {
        return;
      }

      const storageBucketExists =
        buckets && buckets.some(bucket => bucket.name === 'storage');
    } catch (error) {
      console.warn('Error checking storage bucket:', error);
    }
  }, [user]);

  const pickMedia = useCallback(async (mediaType = 'all') => {
    const { status: mediaLibraryStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (mediaLibraryStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your media library',
      );
      return;
    }

    if (mediaType === 'video' || mediaType === 'all') {
      const { status: cameraRollStatus } =
        await ImagePicker.requestCameraPermissionsAsync();
      if (cameraRollStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your camera',
        );
        return;
      }
    }

    const options = {
      mediaTypes:
        mediaType === 'image'
          ? ImagePicker.MediaTypeOptions.Images
          : mediaType === 'video'
            ? ImagePicker.MediaTypeOptions.Videos
            : ImagePicker.MediaTypeOptions.All,
      allowsEditing: mediaType !== 'all',
      aspect: [4, 3],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    };

    const result = await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets) {
      setSelectedMedia(prevMedia => {
        const combinedMedia = [
          ...prevMedia,
          ...result.assets.map(asset => ({
            uri: asset.uri,
            type:
              asset.type || (asset.uri.endsWith('.mp4') ? 'video' : 'image'),
            filename: asset.fileName || `file-${Date.now()}`,
          })),
        ];

        return combinedMedia.slice(0, 10);
      });
    }
  }, []);

  const uploadMedia = useCallback(
    async mediaFiles => {
      const bucketName = 'storage';

      const uploadPromises = mediaFiles.map(async (media, index) => {
        const base64 = await FileSystem.readAsStringAsync(media.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const isVideo = media.type === 'video';
        const extension = isVideo ? 'mp4' : 'jpg';
        const contentType = isVideo ? 'video/mp4' : 'image/jpeg';

        const folderPath = isVideo ? 'videos' : 'images';
        const filePath = `${folderPath}/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, decode(base64), { contentType });

        if (error) {
          throw error;
        }

        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        const publicUrl = urlData?.publicUrl;

        return {
          url: publicUrl,
          type: media.type,
        };
      });

      const results = await Promise.all(uploadPromises);

      return results;
    },
    [user],
  );

  const createPost = useCallback(async () => {
    if (!newPostText.trim() && selectedMedia.length === 0) {
      Alert.alert(
        'Empty Post',
        'Please add some text or media to create a post',
      );
      return;
    }

    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to create a post');
      return;
    }

    setIsPosting(true);

    try {
      let mediaUrls = [];

      if (selectedMedia.length > 0) {
        try {
          mediaUrls = await uploadMedia(selectedMedia);
        } catch (uploadError) {
          Alert.alert(
            'Upload Error',
            'Failed to upload media. Please try again later or check your internet connection.',
          );
          setIsPosting(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            user_id: user.id,
            content: newPostText.trim(),
            media: mediaUrls.length > 0 ? mediaUrls : null,
          },
        ])
        .select();

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Your post has been created!');
      setNewPostText('');
      setSelectedMedia([]);
      fetchPosts();
    } catch (error) {
      Alert.alert('Error', 'Failed to create post. Please try again later.');
    } finally {
      setIsPosting(false);
    }
  }, [newPostText, selectedMedia, user, uploadMedia, fetchPosts]);

  const toggleLike = useCallback(
    async (postId, isLiked) => {
      if (!user) {
        Alert.alert('Authentication Required', 'Please log in to like posts');
        return;
      }

      try {
        const currentPost = posts.find(post => post.id === postId);
        if (!currentPost) {
          return;
        }

        if (currentPost.likeInProgress) {
          return;
        }

        setPosts(
          posts.map(post => {
            if (post.id === postId) {
              return { ...post, likeInProgress: true };
            }
            return post;
          }),
        );

        if (isLiked) {
          const { error } = await supabase
            .from('likes')
            .delete()
            .eq('user_id', user.id)
            .eq('post_id', postId);

          if (error) {
            throw error;
          }
        } else {
          const { data: existingLike } = await supabase
            .from('likes')
            .select('*')
            .eq('user_id', user.id)
            .eq('post_id', postId)
            .single();

          if (!existingLike) {
            const { error } = await supabase.from('likes').insert([
              {
                user_id: user.id,
                post_id: postId,
              },
            ]);

            if (error) {
              throw error;
            }
          }
        }

        setPosts(
          posts.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                likeCount: isLiked
                  ? Math.max(0, post.likeCount - 1)
                  : post.likeCount + 1,
                isLiked: !isLiked,
                likeInProgress: false,
              };
            }
            return post;
          }),
        );
      } catch (error) {
        setPosts(
          posts.map(post => {
            if (post.id === postId) {
              return { ...post, likeInProgress: false };
            }
            return post;
          }),
        );
      }
    },
    [user, posts],
  );

  const navigateToComments = useCallback(
    postId => {
      navigation.navigate('Comments', { postId });
    },
    [navigation],
  );

  const navigateToProfile = useCallback(
    userId => {
      navigation.navigate('Profile', { userId });
    },
    [navigation],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <LinearGradient
          colors={['#2C5F2D', '#3A7F40']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name='chevron-back' size={24} color='#fff' />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Trails & Adventures</Text>
            <Ionicons
              name='leaf'
              size={18}
              color='rgba(255,255,255,0.7)'
              style={styles.headerIcon}
            />
          </View>

          <TouchableOpacity style={styles.headerRight}>
            <Ionicons name='search-outline' size={22} color='#fff' />
          </TouchableOpacity>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchPosts} />
        }
      >
        <View style={styles.createPostContainer}>
          <TextInput
            style={styles.postInput}
            placeholder='Share your hiking adventure...'
            placeholderTextColor='#A0A0A0'
            multiline={true}
            value={newPostText}
            onChangeText={setNewPostText}
          />

          {selectedMedia.length > 0 && (
            <View style={styles.mediaPreviewContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mediaPreviewScrollContent}
              >
                {selectedMedia.map((media, index) => (
                  <View key={index} style={styles.mediaPreviewWrapper}>
                    {media.type === 'video' ? (
                      <View style={styles.mediaPreviewVideoContainer}>
                        <Video
                          source={{ uri: media.uri }}
                          style={styles.mediaPreview}
                          resizeMode='cover'
                        />
                        <View style={styles.mediaTypeIndicator}>
                          <Ionicons name='videocam' size={14} color='#FFFFFF' />
                        </View>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: media.uri }}
                        style={styles.mediaPreview}
                      />
                    )}
                    <TouchableOpacity
                      style={styles.removeMediaButton}
                      onPress={() => {
                        setSelectedMedia(prevMedia =>
                          prevMedia.filter((_, i) => i !== index),
                        );
                      }}
                    >
                      <Ionicons
                        name='close-circle-sharp'
                        size={22}
                        color='#FFF'
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.postActionBar}>
            <View style={styles.mediaButtons}>
              <TouchableOpacity
                style={styles.addMediaButton}
                onPress={() => pickMedia('image')}
              >
                <Ionicons name='image-outline' size={20} color='#4A6572' />
                <Text style={styles.addMediaText}>Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addMediaButton}
                onPress={() => pickMedia('video')}
              >
                <Ionicons name='videocam-outline' size={20} color='#4A6572' />
                <Text style={styles.addMediaText}>Video</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addMediaButton}
                onPress={() => pickMedia('all')}
              >
                <Ionicons name='images-outline' size={20} color='#4A6572' />
                <Text style={styles.addMediaText}>Gallery</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.postButton,
                !newPostText.trim() &&
                  selectedMedia.length === 0 &&
                  styles.postButtonDisabled,
              ]}
              onPress={createPost}
              disabled={
                isPosting || (!newPostText.trim() && selectedMedia.length === 0)
              }
            >
              {isPosting ? (
                <ActivityIndicator size='small' color='#fff' />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {posts.map(post => (
          <View key={post.id} style={styles.postCard}>
            <TouchableOpacity
              style={styles.postHeader}
              onPress={() => navigateToProfile(post.user_id)}
            >
              <Image
                source={{
                  uri:
                    post.profiles?.avatar_url ||
                    'https://www.gravatar.com/avatar/?d=mp',
                }}
                style={styles.avatar}
              />
              <View>
                <Text style={styles.username}>
                  {post.profiles?.username || 'User'}
                </Text>
                <Text style={styles.timestamp}>
                  {new Date(post.created_at).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>

            {post.content && (
              <Text style={styles.postContent}>{post.content}</Text>
            )}

            {(post.media || post.media_urls) && (
              <View style={styles.postMediaContainer}>
                {(() => {
                  const mediaArray = post.media || post.media_urls || [];
                  if (!mediaArray || mediaArray.length === 0) {
                    return null;
                  }

                  if (mediaArray.length === 1) {
                    const media = mediaArray[0];
                    return media.type === 'video' ? (
                      <View style={styles.videoWrapper}>
                        <Video
                          source={{ uri: media.url }}
                          style={styles.singlePostMedia}
                          useNativeControls
                          resizeMode='contain'
                        />
                        <View style={styles.singleVideoIndicator}>
                          <Ionicons name='play-circle' size={40} color='#fff' />
                        </View>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: media.url }}
                        style={styles.singlePostMedia}
                        resizeMode='cover'
                      />
                    );
                  }

                  if (mediaArray.length === 2) {
                    return (
                      <View style={styles.mediaGrid}>
                        {mediaArray.map((media, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.gridItemHalf}
                            onPress={() =>
                              navigation.navigate('MediaViewer', {
                                media: mediaArray,
                                initialIndex: index,
                              })
                            }
                          >
                            {media.type === 'video' ? (
                              <View style={styles.videoContainer}>
                                <Image
                                  source={{ uri: media.url }}
                                  style={styles.gridMedia}
                                />
                                <View style={styles.videoIndicator}>
                                  <Ionicons
                                    name='play-circle'
                                    size={28}
                                    color='#fff'
                                  />
                                </View>
                              </View>
                            ) : (
                              <Image
                                source={{ uri: media.url }}
                                style={styles.gridMedia}
                              />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  }

                  if (mediaArray.length === 3) {
                    return (
                      <View style={styles.mediaGridThree}>
                        <TouchableOpacity
                          style={styles.gridItemLarge}
                          onPress={() =>
                            navigation.navigate('MediaViewer', {
                              media: mediaArray,
                              initialIndex: 0,
                            })
                          }
                        >
                          {mediaArray[0].type === 'video' ? (
                            <View style={styles.videoContainer}>
                              <Image
                                source={{ uri: mediaArray[0].url }}
                                style={styles.gridMedia}
                              />
                              <View style={styles.videoIndicator}>
                                <Ionicons
                                  name='play-circle'
                                  size={28}
                                  color='#fff'
                                />
                              </View>
                            </View>
                          ) : (
                            <Image
                              source={{ uri: mediaArray[0].url }}
                              style={styles.gridMedia}
                            />
                          )}
                        </TouchableOpacity>

                        <View style={styles.gridItemStackContainer}>
                          {mediaArray.slice(1, 3).map((media, index) => (
                            <TouchableOpacity
                              key={index}
                              style={styles.gridItemStack}
                              onPress={() =>
                                navigation.navigate('MediaViewer', {
                                  media: mediaArray,
                                  initialIndex: index + 1,
                                })
                              }
                            >
                              {media.type === 'video' ? (
                                <View style={styles.videoContainer}>
                                  <Image
                                    source={{ uri: media.url }}
                                    style={styles.gridMedia}
                                  />
                                  <View style={styles.videoIndicator}>
                                    <Ionicons
                                      name='play-circle'
                                      size={22}
                                      color='#fff'
                                    />
                                  </View>
                                </View>
                              ) : (
                                <Image
                                  source={{ uri: media.url }}
                                  style={styles.gridMedia}
                                />
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    );
                  }

                  return (
                    <View style={styles.mediaGridFour}>
                      {mediaArray.slice(0, 4).map((media, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.gridItemQuarter}
                          onPress={() =>
                            navigation.navigate('MediaViewer', {
                              media: mediaArray,
                              initialIndex: index,
                            })
                          }
                        >
                          {media.type === 'video' ? (
                            <View style={styles.videoContainer}>
                              <Image
                                source={{ uri: media.url }}
                                style={styles.gridMedia}
                              />
                              <View style={styles.videoIndicator}>
                                <Ionicons
                                  name='play-circle'
                                  size={22}
                                  color='#fff'
                                />
                              </View>
                            </View>
                          ) : (
                            <Image
                              source={{ uri: media.url }}
                              style={styles.gridMedia}
                            />
                          )}

                          {mediaArray.length > 4 && index === 3 && (
                            <View style={styles.moreIndicator}>
                              <Text style={styles.moreIndicatorText}>
                                +{mediaArray.length - 4}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })()}
              </View>
            )}

            <View style={styles.postStats}>
              <Text style={styles.statsText}>
                {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'} •{' '}
                {post.commentCount}{' '}
                {post.commentCount === 1 ? 'comment' : 'comments'}
              </Text>
            </View>

            <View style={styles.postActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  post.likeInProgress && styles.actionButtonDisabled,
                ]}
                onPress={() => toggleLike(post.id, post.isLiked)}
                disabled={post.likeInProgress}
              >
                <Ionicons
                  name={post.isLiked ? 'heart' : 'heart-outline'}
                  size={20}
                  color={post.isLiked ? '#E57373' : '#757575'}
                />
                <Text
                  style={[styles.actionText, post.isLiked && styles.likedText]}
                >
                  Like
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigateToComments(post.id)}
              >
                <Ionicons name='chatbubble-outline' size={20} color='#757575' />
                <Text style={styles.actionText}>Comment</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {posts.length === 0 && !refreshing && (
          <View style={styles.emptyStateContainer}>
            <Ionicons name='trail-sign-outline' size={56} color='#CFD8DC' />
            <Text style={styles.emptyStateText}>No posts yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Be the first to share your hiking adventure!
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

export default PostsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    overflow: 'hidden',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    marginBottom: 5,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 50 : 12,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerIcon: {
    marginLeft: 6,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  createPostContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 6,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3A5A40', // Medium forest green accent
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  postInput: {
    minHeight: 85,
    fontSize: 16,
    color: '#37474F',
    textAlignVertical: 'top',
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  mediaPreviewContainer: {
    marginTop: 12,
    marginBottom: 6,
  },
  mediaPreviewScrollContent: {
    paddingRight: 6,
  },
  mediaPreviewWrapper: {
    position: 'relative',
    marginRight: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E5E0',
  },
  mediaPreviewVideoContainer: {
    position: 'relative',
  },
  mediaPreview: {
    width: 110,
    height: 110,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  mediaTypeIndicator: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 3,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: 2,
  },
  postActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E5E0',
  },
  mediaButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: '#F0F4F0',
  },
  addMediaText: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: '500',
    color: '#2C5F2D', // Dark forest green
  },
  postButton: {
    backgroundColor: '#4A7C59', // Medium forest green
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#A3B18A', // Light forest green
    opacity: 0.7,
  },
  postButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
    borderTopWidth: 3,
    borderTopColor: '#3A5A40', // Medium forest green
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FCFCFC',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#4A7C59', // Medium forest green
  },
  username: {
    fontWeight: '600',
    fontSize: 16,
    color: '#263238',
  },
  timestamp: {
    fontSize: 12,
    color: '#78909C',
    marginTop: 2,
  },
  postContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontSize: 15,
    color: '#37474F',
    lineHeight: 22,
  },
  postMediaContainer: {
    width: '100%',
  },
  singlePostMedia: {
    width: '100%',
    height: 320,
    resizeMode: 'cover',
  },
  videoWrapper: {
    position: 'relative',
  },
  singleVideoIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    zIndex: 1,
  },
  mediaGrid: {
    flexDirection: 'row',
    width: '100%',
    height: 300,
  },
  gridItemHalf: {
    width: '50%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#fff',
  },
  mediaGridThree: {
    flexDirection: 'row',
    width: '100%',
    height: 300,
  },
  gridItemLarge: {
    width: '66.66%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#fff',
  },
  gridItemStackContainer: {
    width: '33.33%',
    height: '100%',
  },
  gridItemStack: {
    width: '100%',
    height: '50%',
    borderWidth: 1,
    borderColor: '#fff',
  },
  mediaGridFour: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: 300,
  },
  gridItemQuarter: {
    width: '50%',
    height: '50%',
    borderWidth: 1,
    borderColor: '#fff',
  },
  gridMedia: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -14 }, { translateY: -14 }],
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
  },
  moreIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreIndicatorText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  postStats: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E5E0',
    backgroundColor: '#FCFCFC',
  },
  statsText: {
    fontSize: 13,
    color: '#4A7C59', // Medium forest green
    fontWeight: '500',
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
    paddingVertical: 10,
    marginHorizontal: 4,
    backgroundColor: '#F5F7F5',
    borderRadius: 8,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#4A7C59', // Medium forest green
  },
  likedText: {
    color: '#2C5F2D', // Dark forest green
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A7C59', // Medium forest green
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#90A4AE',
    textAlign: 'center',
    marginTop: 6,
  },
});
