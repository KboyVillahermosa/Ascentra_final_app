import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  FlatList,
  Image,
  StatusBar,
  Platform,
  Modal,
  Dimensions,
  Pressable,
  Share,
} from 'react-native';
import { supabase } from '../services/supabaseClient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import uuid from 'react-native-uuid';
import { decode } from 'base-64';
import { ProductionLogger as pLog } from '../utils/productionLogger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ForumPost() {
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);

  // Media states
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaOptionsVisible, setMediaOptionsVisible] = useState(false);
  const videoRef = useRef(null);
  const [playingVideoId, setPlayingVideoId] = useState(null);

  // Post visibility state
  const [postVisibility, setPostVisibility] = useState('public');

  // New state for fullscreen media viewer
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [currentMediaList, setCurrentMediaList] = useState([]);

  // New states for comments and likes
  const [commentText, setCommentText] = useState('');
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentingActive, setCommentingActive] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState({});
  const [postComments, setPostComments] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [userLikedPosts, setUserLikedPosts] = useState({});
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingLike, setSubmittingLike] = useState(false);

  // Get current user on component mount
  useEffect(() => {
    getUser();
    fetchPosts();
  }, []);

  // Get current authenticated user
  async function getUser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      pLog.error('Error getting user:', error);
    }
  }

  // Fetch forum posts from Supabase
  async function fetchPosts() {
    try {
      setLoading(true);

      // Get only public posts for forum display
      const { data: postsData, error: postsError } = await supabase
        .from('forum_posts')
        .select(
          `
          id,
          content,
          title,
          created_at,
          user_id,
          visibility
        `,
        )
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      if (postsError) {
        throw postsError;
      }

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      // Get all post media
      const { data: mediaData, error: mediaError } = await supabase
        .from('forum_post_media')
        .select('*')
        .in(
          'post_id',
          postsData.map(post => post.id),
        );

      if (mediaError) {
        pLog.error('Error fetching post media:', mediaError);
      }

      // Group media by post_id
      const mediaByPost = {};
      if (mediaData) {
        mediaData.forEach(media => {
          if (!mediaByPost[media.post_id]) {
            mediaByPost[media.post_id] = [];
          }
          mediaByPost[media.post_id].push(media);
        });
      }

      // Extract all unique user IDs from posts
      const userIds = [...new Set(postsData.map(post => post.user_id))];

      // Get all profiles for these users in a single query
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        pLog.error('Error fetching profiles:', profilesError);
      }

      // Create a map of user IDs to profiles for quick lookup
      const profilesMap = {};
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap[profile.id] = profile;
        });
      }

      // Fetch like counts for all posts
      const { data: likeData, error: likeError } = await supabase
        .from('forum_likes')
        .select('post_id, id')
        .in(
          'post_id',
          postsData.map(post => post.id),
        );

      if (likeError) {
        pLog.error('Error fetching likes:', likeError);
      }

      // Count likes by post
      const likesByPost = {};
      if (likeData) {
        likeData.forEach(like => {
          if (!likesByPost[like.post_id]) {
            likesByPost[like.post_id] = 0;
          }
          likesByPost[like.post_id]++;
        });
      }
      setLikeCounts(likesByPost);

      // Check which posts the current user has liked
      if (user) {
        const { data: userLikes, error: userLikesError } = await supabase
          .from('forum_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in(
            'post_id',
            postsData.map(post => post.id),
          );

        if (userLikesError) {
          pLog.error('Error fetching user likes:', userLikesError);
        }

        const userLikedPostsMap = {};
        if (userLikes) {
          userLikes.forEach(like => {
            userLikedPostsMap[like.post_id] = true;
          });
        }
        setUserLikedPosts(userLikedPostsMap);
      }

      // Fetch comment counts for all posts
      const { data: commentCountData, error: commentCountError } =
        await supabase
          .from('forum_comments')
          .select('post_id, id')
          .in(
            'post_id',
            postsData.map(post => post.id),
          );

      if (commentCountError) {
        pLog.error('Error fetching comment counts:', commentCountError);
      }

      // Count comments by post
      const commentsByPost = {};
      if (commentCountData) {
        commentCountData.forEach(comment => {
          if (!commentsByPost[comment.post_id]) {
            commentsByPost[comment.post_id] = 0;
          }
          commentsByPost[comment.post_id]++;
        });
      }
      setCommentCounts(commentsByPost);

      // Attach profile data and media to each post
      const postsWithData = postsData.map(post => ({
        ...post,
        profiles: profilesMap[post.user_id] || null,
        media: mediaByPost[post.id] || [],
      }));

      setPosts(postsWithData);
    } catch (error) {
      pLog.error('Error fetching forum posts:', error);
      Alert.alert(
        'Error',
        'Failed to load forum posts. Please try again later.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Add this helper function at the top of your component
  const getMediaTypeOption = type => {
    // Try different API versions
    try {
      // Check if MediaType exists (newer API)
      if (ImagePicker.MediaType) {
        return type === 'image'
          ? ImagePicker.MediaType.Images
          : ImagePicker.MediaType.Videos;
      }
      // Try MediaTypeOptions (older API)
      else if (ImagePicker.MediaTypeOptions) {
        return type === 'image'
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos;
      }
      // Fallback to string values (safest option)
      return type === 'image' ? 'images' : 'videos';
    } catch (e) {
      // Final fallback to strings
      return type === 'image' ? 'images' : 'videos';
    }
  };

  // Pick image from gallery
  async function pickImage() {
    setMediaOptionsVisible(false);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images', // Use string instead of enum
        allowsEditing: true,
        quality: 0.7,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Check if we already have maximum media files
        if (mediaFiles.length >= 5) {
          Alert.alert(
            'Limit Reached',
            'You can only attach up to 5 media files per post.',
          );
          return;
        }

        const asset = result.assets[0];

        // Add to media files - skip manipulation for now
        setMediaFiles([
          ...mediaFiles,
          {
            uri: asset.uri,
            type: 'image',
            name: `image-${Date.now()}.jpg`,
            tempId: uuid.v4(),
          },
        ]);
      }
    } catch (error) {
      pLog.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  }

  // Pick video from gallery
  async function pickVideo() {
    setMediaOptionsVisible(false);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: getMediaTypeOption('video'),
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Check if we already have maximum media files
        if (mediaFiles.length >= 5) {
          Alert.alert(
            'Limit Reached',
            'You can only attach up to 5 media files per post.',
          );
          return;
        }

        const asset = result.assets[0];

        // Generate thumbnail for video
        const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(
          asset.uri,
          { time: 1000 },
        );

        // Add to media files
        setMediaFiles([
          ...mediaFiles,
          {
            uri: asset.uri,
            type: 'video',
            thumbnail: thumbnailUri,
            name: `video-${Date.now()}.mp4`,
            tempId: uuid.v4(),
          },
        ]);
      }
    } catch (error) {
      pLog.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  }

  // Remove media from selection
  function removeMedia(tempId) {
    setMediaFiles(mediaFiles.filter(media => media.tempId !== tempId));
  }

  // Upload media files to Supabase Storage
  async function uploadMediaFiles(postId) {
    if (mediaFiles.length === 0) {
      return [];
    }

    const uploadedMedia = [];

    for (const media of mediaFiles) {
      try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 10);
        const fileExt = media.uri.split('.').pop();
        const fileName = `${timestamp}_${randomId}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        let fileToUpload = media.uri;
        const contentType = media.type === 'image' ? 'image/jpeg' : 'video/mp4';

        // For images, we'll create a copy to ensure the file is accessible
        if (media.type === 'image') {
          try {
            // Copy the image to a known location with a simple name
            const newPath =
              FileSystem.documentDirectory + `temp_image_${randomId}.jpg`;
            await FileSystem.copyAsync({
              from: media.uri,
              to: newPath,
            });
            fileToUpload = newPath;
          } catch (copyError) {
            console.warn('Error copying file:', copyError);
          }
        }

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(fileToUpload, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Upload the file to Supabase Storage

        const { data, error } = await supabase.storage
          .from('forum')
          .upload(filePath, decode(base64), {
            contentType: contentType,
            upsert: true,
          });

        if (error) {
          throw error;
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('forum')
          .getPublicUrl(filePath);

        const mediaUrl = urlData?.publicUrl;

        // Handle thumbnail for videos
        let thumbnailUrl = null;
        if (media.type === 'video' && media.thumbnail) {
          const thumbTimestamp = Date.now();
          const thumbId = Math.random().toString(36).substring(2, 10);
          const thumbnailName = `thumb_${thumbTimestamp}_${thumbId}.jpg`;
          const thumbnailPath = `${user.id}/${thumbnailName}`;

          // Copy thumbnail to known location
          const thumbNewPath =
            FileSystem.documentDirectory + `temp_thumb_${thumbId}.jpg`;
          await FileSystem.copyAsync({
            from: media.thumbnail,
            to: thumbNewPath,
          });

          // Read thumbnail as base64
          const thumbBase64 = await FileSystem.readAsStringAsync(thumbNewPath, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Upload thumbnail to Supabase Storage
          const { data: thumbData, error: thumbError } = await supabase.storage
            .from('forum')
            .upload(thumbnailPath, decode(thumbBase64), {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (thumbError) {
            throw thumbError;
          }

          // Get thumbnail public URL
          const { data: thumbUrlData } = supabase.storage
            .from('forum')
            .getPublicUrl(thumbnailPath);

          const thumbUrl = thumbUrlData?.publicUrl;

          thumbnailUrl = thumbUrl;
        }

        // Add to media records
        uploadedMedia.push({
          post_id: postId,
          media_url: mediaUrl,
          media_type: media.type,
          thumbnail_url: thumbnailUrl,
        });
      } catch (error) {
        console.error(
          'Error uploading media:',
          error.message || JSON.stringify(error),
        );
        Alert.alert(
          'Upload Error',
          `Failed to upload ${media.type}. Please check your connection and try again.`,
        );
      }
    }

    return uploadedMedia;
  }

  // Submit a new post to Supabase
  async function submitPost() {
    if (!newPostText.trim() && mediaFiles.length === 0) {
      Alert.alert('Error', 'Post cannot be empty. Please add text or media.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to post');
      return;
    }

    try {
      setUploading(true);

      // Insert new post to Supabase
      const { data: postData, error: postError } = await supabase
        .from('forum_posts')
        .insert({
          title: newPostText.trim().substring(0, 100) || 'Forum Post', // Use first 100 chars as title or default
          content: newPostText.trim(),
          user_id: user.id,
          visibility: postVisibility,
        })
        .select('id')
        .single();

      if (postError) {
        throw postError;
      }

      // Upload media files if any
      if (mediaFiles.length > 0) {
        const uploadedMedia = await uploadMediaFiles(postData.id);

        // Insert media references to database
        if (uploadedMedia.length > 0) {
          const { error: mediaError } = await supabase
            .from('forum_post_media')
            .insert(uploadedMedia);

          if (mediaError) {
            console.error('Error inserting media references:', mediaError);
          }
        }
      }

      // Clear input and media files
      setNewPostText('');
      setMediaFiles([]);
      setPostVisibility('public');

      // Refresh posts
      fetchPosts();

      Alert.alert('Success', 'Your post has been published!');
    } catch (error) {
      console.error('Error creating forum post:', error);
      Alert.alert('Error', 'Failed to publish post. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  // Handle video playback state
  const handleVideoPress = videoId => {
    if (playingVideoId === videoId) {
      // If this video is already playing, pause it
      if (videoRef.current) {
        videoRef.current.pauseAsync();
      }
      setPlayingVideoId(null);
    } else {
      // If another video is playing, pause it first
      if (videoRef.current && playingVideoId) {
        videoRef.current.pauseAsync();
      }
      // Play this video
      setPlayingVideoId(videoId);
    }
  };

  // Open media in fullscreen viewer
  const openMediaViewer = (mediaItems, index) => {
    setCurrentMediaList(mediaItems);
    setCurrentMediaIndex(index);
    setMediaViewerVisible(true);

    // Pause any playing video
    if (videoRef.current && playingVideoId) {
      videoRef.current.pauseAsync();
      setPlayingVideoId(null);
    }
  };

  // Close media viewer
  const closeMediaViewer = () => {
    setMediaViewerVisible(false);
  };

  // Navigate to next media in viewer
  const goToNextMedia = () => {
    if (currentMediaIndex < currentMediaList.length - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1);
    }
  };

  // Navigate to previous media in viewer
  const goToPrevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1);
    }
  };

  // Render fullscreen media viewer modal
  const renderMediaViewer = () => {
    if (!mediaViewerVisible || currentMediaList.length === 0) {
      return null;
    }

    const currentMedia = currentMediaList[currentMediaIndex];
    const isVideo = currentMedia.media_type === 'video';

    return (
      <Modal
        visible={mediaViewerVisible}
        transparent={true}
        animationType='fade'
        onRequestClose={closeMediaViewer}
      >
        <View style={styles.mediaViewerContainer}>
          <View style={styles.mediaViewerHeader}>
            <TouchableOpacity
              onPress={closeMediaViewer}
              style={styles.closeButton}
            >
              <Ionicons name='close' size={28} color='#FFFFFF' />
            </TouchableOpacity>
            <Text style={styles.mediaViewerCounter}>
              {currentMediaIndex + 1} / {currentMediaList.length}
            </Text>
          </View>

          <View style={styles.mediaViewerContent}>
            {isVideo ? (
              <Video
                source={{ uri: currentMedia.media_url }}
                resizeMode='contain'
                useNativeControls
                style={styles.fullscreenVideo}
                shouldPlay
              />
            ) : (
              <Image
                source={{ uri: currentMedia.media_url }}
                style={styles.fullscreenImage}
                resizeMode='contain'
              />
            )}
          </View>

          {currentMediaList.length > 1 && (
            <View style={styles.mediaViewerNavigation}>
              <TouchableOpacity
                onPress={goToPrevMedia}
                disabled={currentMediaIndex === 0}
                style={[
                  styles.navButton,
                  currentMediaIndex === 0 && styles.navButtonDisabled,
                ]}
              >
                <Ionicons
                  name='chevron-back'
                  size={30}
                  color={currentMediaIndex === 0 ? '#888888' : '#FFFFFF'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={goToNextMedia}
                disabled={currentMediaIndex === currentMediaList.length - 1}
                style={[
                  styles.navButton,
                  currentMediaIndex === currentMediaList.length - 1 &&
                    styles.navButtonDisabled,
                ]}
              >
                <Ionicons
                  name='chevron-forward'
                  size={30}
                  color={
                    currentMediaIndex === currentMediaList.length - 1
                      ? '#888888'
                      : '#FFFFFF'
                  }
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    );
  };

  // Render media preview for uploads
  const renderMediaPreview = () => {
    if (mediaFiles.length === 0) {
      return null;
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.mediaPreviewContainer}
      >
        {mediaFiles.map(media => (
          <View key={media.tempId} style={styles.mediaPreviewItem}>
            {media.type === 'image' ? (
              <Image
                source={{ uri: media.uri }}
                style={styles.mediaPreviewImage}
              />
            ) : (
              <Image
                source={{ uri: media.thumbnail }}
                style={styles.mediaPreviewImage}
              />
            )}

            {media.type === 'video' && (
              <View style={styles.videoIndicator}>
                <Ionicons name='play-circle' size={20} color='#FFF' />
              </View>
            )}

            <TouchableOpacity
              style={styles.removeMediaButton}
              onPress={() => removeMedia(media.tempId)}
            >
              <Ionicons name='close-circle' size={22} color='#FF3B30' />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    );
  };

  // Improved media grid display for posts
  const renderPostMedia = media => {
    if (!media || media.length === 0) {
      return null;
    }

    // If there's only one media item
    if (media.length === 1) {
      const item = media[0];

      if (item.media_type === 'image') {
        return (
          <TouchableOpacity
            onPress={() => openMediaViewer(media, 0)}
            style={styles.singleMediaContainer}
          >
            <Image
              source={{ uri: item.media_url }}
              style={styles.singleMediaImage}
              resizeMode='cover'
            />
          </TouchableOpacity>
        );
      } else if (item.media_type === 'video') {
        return (
          <View style={styles.videoContainer}>
            {playingVideoId === item.id ? (
              <Video
                ref={videoRef}
                source={{ uri: item.media_url }}
                useNativeControls
                resizeMode='cover'
                style={styles.video}
                shouldPlay={true}
              />
            ) : (
              <TouchableOpacity onPress={() => openMediaViewer(media, 0)}>
                <Image
                  source={{
                    uri:
                      item.thumbnail_url ||
                      'https://via.placeholder.com/300x200?text=Video',
                  }}
                  style={styles.videoThumbnail}
                />
                <View style={styles.playButtonOverlay}>
                  <Ionicons name='play-circle' size={50} color='#FFF' />
                </View>
              </TouchableOpacity>
            )}
          </View>
        );
      }
    }

    // For 2 media items - side by side
    if (media.length === 2) {
      return (
        <View style={styles.mediaGrid}>
          {media.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={styles.gridItem2}
              onPress={() => openMediaViewer(media, index)}
            >
              {item.media_type === 'image' ? (
                <Image
                  source={{ uri: item.media_url }}
                  style={styles.gridItemImage}
                  resizeMode='cover'
                />
              ) : (
                <View style={styles.gridItemVideo}>
                  <Image
                    source={{
                      uri:
                        item.thumbnail_url ||
                        'https://via.placeholder.com/300x200?text=Video',
                    }}
                    style={styles.gridItemImage}
                    resizeMode='cover'
                  />
                  <View style={styles.playButtonSmall}>
                    <Ionicons name='play-circle' size={30} color='#FFF' />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    // For 3 media items - 1 large + 2 small
    if (media.length === 3) {
      return (
        <View style={styles.mediaGrid}>
          <TouchableOpacity
            style={styles.gridItemLarge}
            onPress={() => openMediaViewer(media, 0)}
          >
            {media[0].media_type === 'image' ? (
              <Image
                source={{ uri: media[0].media_url }}
                style={styles.gridItemImage}
                resizeMode='cover'
              />
            ) : (
              <View style={styles.gridItemVideo}>
                <Image
                  source={{
                    uri:
                      media[0].thumbnail_url ||
                      'https://via.placeholder.com/300x200?text=Video',
                  }}
                  style={styles.gridItemImage}
                  resizeMode='cover'
                />
                <View style={styles.playButtonSmall}>
                  <Ionicons name='play-circle' size={30} color='#FFF' />
                </View>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.gridItemSmallContainer}>
            {media.slice(1, 3).map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={styles.gridItemSmall}
                onPress={() => openMediaViewer(media, index + 1)}
              >
                {item.media_type === 'image' ? (
                  <Image
                    source={{ uri: item.media_url }}
                    style={styles.gridItemImage}
                    resizeMode='cover'
                  />
                ) : (
                  <View style={styles.gridItemVideo}>
                    <Image
                      source={{
                        uri:
                          item.thumbnail_url ||
                          'https://via.placeholder.com/300x200?text=Video',
                      }}
                      style={styles.gridItemImage}
                      resizeMode='cover'
                    />
                    <View style={styles.playButtonSmall}>
                      <Ionicons name='play-circle' size={24} color='#FFF' />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    // For 4 or more media items - grid layout with "more" indicator
    return (
      <View style={styles.mediaGrid}>
        {media.slice(0, 4).map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={styles.gridItem4}
            onPress={() => openMediaViewer(media, index)}
          >
            {item.media_type === 'image' ? (
              <Image
                source={{ uri: item.media_url }}
                style={styles.gridItemImage}
                resizeMode='cover'
              />
            ) : (
              <View style={styles.gridItemVideo}>
                <Image
                  source={{
                    uri:
                      item.thumbnail_url ||
                      'https://via.placeholder.com/300x200?text=Video',
                  }}
                  style={styles.gridItemImage}
                  resizeMode='cover'
                />
                <View style={styles.playButtonSmall}>
                  <Ionicons name='play-circle' size={24} color='#FFF' />
                </View>
              </View>
            )}

            {index === 3 && media.length > 4 && (
              <View style={styles.moreOverlay}>
                <Text style={styles.moreText}>+{media.length - 4}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Toggle like on post
  const toggleLike = async postId => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to like posts');
      return;
    }

    if (submittingLike) {
      return;
    }

    try {
      setSubmittingLike(true);

      if (userLikedPosts[postId]) {
        // User already liked this post, so remove the like
        const { error } = await supabase
          .from('forum_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        // Update local state
        setUserLikedPosts(prev => {
          const newState = { ...prev };
          delete newState[postId];
          return newState;
        });

        setLikeCounts(prev => ({
          ...prev,
          [postId]: (prev[postId] || 1) - 1,
        }));
      } else {
        // User hasn't liked this post, so add a like
        const { error } = await supabase.from('forum_likes').insert({
          post_id: postId,
          user_id: user.id,
        });

        if (error) {
          throw error;
        }

        // Update local state
        setUserLikedPosts(prev => ({
          ...prev,
          [postId]: true,
        }));

        setLikeCounts(prev => ({
          ...prev,
          [postId]: (prev[postId] || 0) + 1,
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like. Please try again.');
    } finally {
      setSubmittingLike(false);
    }
  };

  // Handle sharing a post
  const handleShare = async post => {
    try {
      const shareContent = {
        message: `Check out this hiking post: ${post.content || post.title || 'Hiking adventure'}`,
        title: 'Hiking Post Share',
      };

      const result = await Share.share(shareContent);

      if (result.action === Share.sharedAction) {
        // Post was shared successfully
        console.log('Post shared successfully');
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'Failed to share post. Please try again.');
    }
  };

  // Fetch comments for a post
  const fetchComments = async postId => {
    try {
      // Don't re-fetch if we already have comments and they're visible
      if (postComments[postId] && commentsVisible[postId]) {
        setCommentsVisible(prev => ({
          ...prev,
          [postId]: false,
        }));
        return;
      }

      // If we're toggling to show comments, but don't have them yet
      if (!postComments[postId]) {
        const { data, error } = await supabase
          .from('forum_comments')
          .select(
            `
            id,
            content,
            created_at,
            user_id
          `,
          )
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        // Get all unique commenter user IDs
        const commenterIds = [...new Set(data.map(comment => comment.user_id))];

        // Get profile data for commenters
        const { data: commenterProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', commenterIds);

        if (profileError) {
          console.error('Error fetching commenter profiles:', profileError);
        }

        // Create a map of user IDs to profiles
        const profileMap = {};
        if (commenterProfiles) {
          commenterProfiles.forEach(profile => {
            profileMap[profile.id] = profile;
          });
        }

        // Attach profile data to comments
        const commentsWithProfiles = data.map(comment => ({
          ...comment,
          profile: profileMap[comment.user_id] || null,
        }));

        // Update comments state
        setPostComments(prev => ({
          ...prev,
          [postId]: commentsWithProfiles,
        }));
      }

      // Toggle visibility
      setCommentsVisible(prev => ({
        ...prev,
        [postId]: !prev[postId],
      }));

      // Set active commenting post
      setActiveCommentPostId(postId);
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Error', 'Failed to load comments. Please try again.');
    }
  };

  // Submit a new comment
  const submitComment = async () => {
    if (!commentText.trim() || !activeCommentPostId || !user) {
      return;
    }

    try {
      setSubmittingComment(true);

      // Insert comment to database
      const { data, error } = await supabase
        .from('forum_comments')
        .insert({
          post_id: activeCommentPostId,
          user_id: user.id,
          content: commentText.trim(),
        })
        .select('id, created_at')
        .single();

      if (error) {
        throw error;
      }

      // Add the new comment to state
      const newComment = {
        id: data.id,
        content: commentText.trim(),
        user_id: user.id,
        created_at: data.created_at,
        profile: {
          id: user.id,
          username: user.email, // fallback to email if profile not loaded
          avatar_url: null,
        },
      };

      // If we have the user's profile, use it
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();

      if (profileData) {
        newComment.profile.username = profileData.username;
        newComment.profile.avatar_url = profileData.avatar_url;
      }

      // Update comments in state
      setPostComments(prev => ({
        ...prev,
        [activeCommentPostId]: [
          ...(prev[activeCommentPostId] || []),
          newComment,
        ],
      }));

      // Update comment count
      setCommentCounts(prev => ({
        ...prev,
        [activeCommentPostId]: (prev[activeCommentPostId] || 0) + 1,
      }));

      // Clear input
      setCommentText('');
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Render a single comment
  const renderComment = comment => {
    const date = new Date(comment.created_at);
    const formattedDate =
      date.toLocaleDateString() +
      ' at ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View key={comment.id} style={styles.commentItem}>
        <View style={styles.commentHeader}>
          {comment.profile?.avatar_url ? (
            <Image
              source={{ uri: comment.profile.avatar_url }}
              style={styles.commentAvatar}
            />
          ) : (
            <View style={styles.commentAvatarPlaceholder}>
              <Text style={styles.commentAvatarText}>
                {comment.profile?.username
                  ? comment.profile.username.charAt(0).toUpperCase()
                  : '?'}
              </Text>
            </View>
          )}

          <View style={styles.commentInfo}>
            <Text style={styles.commentUsername}>
              {comment.profile?.username || 'Anonymous'}
            </Text>
            <Text style={styles.commentDate}>{formattedDate}</Text>
          </View>
        </View>

        <Text style={styles.commentContent}>{comment.content}</Text>
      </View>
    );
  };

  // Render comments section for a post
  const renderCommentsSection = postId => {
    if (!commentsVisible[postId]) {
      return null;
    }

    const comments = postComments[postId] || [];

    return (
      <View style={styles.commentsContainer}>
        <View style={styles.commentsDivider} />

        <View style={styles.commentsHeader}>
          <Text style={styles.commentsTitle}>
            Comments ({commentCounts[postId] || 0})
          </Text>
        </View>

        {comments.length === 0 ? (
          <Text style={styles.noCommentsText}>
            No comments yet. Be the first to share your thoughts!
          </Text>
        ) : (
          <View style={styles.commentsList}>{comments.map(renderComment)}</View>
        )}

        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder='Write a comment...'
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[
              styles.commentSubmitButton,
              (!commentText.trim() || submittingComment) &&
                styles.commentSubmitButtonDisabled,
            ]}
            onPress={submitComment}
            disabled={!commentText.trim() || submittingComment}
          >
            {submittingComment ? (
              <ActivityIndicator size='small' color='#FFF' />
            ) : (
              <Ionicons name='send' size={18} color='#FFF' />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render a post item
  const renderPost = ({ item }) => {
    // Format date
    const date = new Date(item.created_at);
    const formattedDate =
      date.toLocaleDateString() +
      ' at ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Get username and avatar
    const username = item.profiles?.username || 'Anonymous';
    const avatarUrl = item.profiles?.avatar_url;

    // Get like and comment counts
    const likeCount = likeCounts[item.id] || 0;
    const commentCount = commentCounts[item.id] || 0;
    const userLiked = userLikedPosts[item.id] || false;

    return (
      <View style={styles.postItem}>
        <View style={styles.postHeader}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.postInfo}>
            <Text style={styles.username}>{username}</Text>
            <Text style={styles.date}>{formattedDate}</Text>
          </View>
        </View>

        {item.content && <Text style={styles.postContent}>{item.content}</Text>}

        {renderPostMedia(item.media)}

        <View style={styles.postActionStats}>
          {likeCount > 0 && (
            <View style={styles.statItem}>
              <Ionicons name='heart' size={12} color='#FF3B30' />
              <Text style={styles.statText}>{likeCount}</Text>
            </View>
          )}

          {commentCount > 0 && (
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => fetchComments(item.id)}
            >
              <Text style={styles.statText}>{commentCount} comments</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.postActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              userLiked && styles.actionButtonActive,
            ]}
            onPress={() => toggleLike(item.id)}
            disabled={submittingLike}
          >
            <Ionicons
              name={userLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={userLiked ? '#FF3B30' : '#666'}
            />
            <Text
              style={[styles.actionText, userLiked && styles.actionTextActive]}
            >
              {userLiked ? 'Liked' : 'Like'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              commentsVisible[item.id] && styles.actionButtonActive,
            ]}
            onPress={() => fetchComments(item.id)}
          >
            <Ionicons
              name={
                commentsVisible[item.id] ? 'chatbubble' : 'chatbubble-outline'
              }
              size={20}
              color={commentsVisible[item.id] ? '#2E7D32' : '#666'}
            />
            <Text
              style={[
                styles.actionText,
                commentsVisible[item.id] && styles.actionTextActive,
              ]}
            >
              Comment
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShare(item)}
          >
            <Ionicons name='share-social-outline' size={20} color='#666' />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>

        {renderCommentsSection(item.id)}
      </View>
    );
  };

  // Add this function near the top of your component
  const checkConnectivity = async () => {
    // Simple fetch to test connectivity to Supabase
    try {
      const response = await fetch(
        `${supabase.supabaseUrl}/storage/v1/object/info/forum`,
      );
      return response.status !== 500 && response.status !== 404;
    } catch (error) {
      console.error('Connectivity check failed:', error);
      return false;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor='#FFFFFF' />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hiking Forum</Text>
      </View>

      {/* Post input area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder='Share your hiking experiences, ask questions, or find trail buddies...'
          value={newPostText}
          onChangeText={setNewPostText}
          multiline
          placeholderTextColor='#9E9E9E'
        />

        {renderMediaPreview()}

        {/* Visibility options */}
        <View style={styles.visibilityContainer}>
          <Text style={styles.visibilityLabel}>Post Visibility:</Text>
          <View style={styles.visibilityButtons}>
            <TouchableOpacity
              style={[
                styles.visibilityButton,
                postVisibility === 'public' && styles.visibilityButtonActive,
              ]}
              onPress={() => setPostVisibility('public')}
            >
              <Ionicons
                name='globe-outline'
                size={16}
                color={postVisibility === 'public' ? '#FFFFFF' : '#2E7D32'}
              />
              <Text
                style={[
                  styles.visibilityButtonText,
                  postVisibility === 'public' &&
                    styles.visibilityButtonTextActive,
                ]}
              >
                Public
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilityButton,
                postVisibility === 'private' && styles.visibilityButtonActive,
              ]}
              onPress={() => setPostVisibility('private')}
            >
              <Ionicons
                name='lock-closed-outline'
                size={16}
                color={postVisibility === 'private' ? '#FFFFFF' : '#2E7D32'}
              />
              <Text
                style={[
                  styles.visibilityButtonText,
                  postVisibility === 'private' &&
                    styles.visibilityButtonTextActive,
                ]}
              >
                Private
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputActions}>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => setMediaOptionsVisible(true)}
            disabled={uploading}
          >
            <Ionicons name='image' size={24} color='#2E7D32' />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.postButton,
              !newPostText.trim() &&
                mediaFiles.length === 0 &&
                styles.postButtonDisabled,
            ]}
            onPress={submitPost}
            disabled={
              (!newPostText.trim() && mediaFiles.length === 0) || uploading
            }
          >
            {uploading ? (
              <ActivityIndicator size='small' color='#FFFFFF' />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Media options modal */}
      <Modal
        visible={mediaOptionsVisible}
        transparent={true}
        animationType='fade'
        onRequestClose={() => setMediaOptionsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMediaOptionsVisible(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.mediaOption} onPress={pickImage}>
              <Ionicons name='image' size={24} color='#2E7D32' />
              <Text style={styles.mediaOptionText}>Upload Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mediaOption} onPress={pickVideo}>
              <Ionicons name='videocam' size={24} color='#2E7D32' />
              <Text style={styles.mediaOptionText}>Upload Video</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelOption}
              onPress={() => setMediaOptionsVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Posts list */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color='#2E7D32' />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.postsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2E7D32']}
              tintColor='#2E7D32'
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name='chatbubbles-outline' size={60} color='#DDD' />
              <Text style={styles.emptyTitle}>No Posts Yet</Text>
              <Text style={styles.emptyText}>
                Be the first to share your thoughts!
              </Text>
            </View>
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          initialNumToRender={8}
          windowSize={10}
          getItemLayout={(data, index) => ({
            length: 200,
            offset: 200 * index,
            index,
          })}
        />
      )}

      {/* Render the fullscreen media viewer modal */}
      {renderMediaViewer()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 30,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#212121',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  mediaButton: {
    padding: 8,
  },
  postButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 25,
    minWidth: 100,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  mediaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  mediaOptionText: {
    fontSize: 16,
    color: '#212121',
    marginLeft: 15,
  },
  cancelOption: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF3B30',
  },
  mediaPreviewContainer: {
    marginTop: 15,
    marginBottom: 5,
  },
  mediaPreviewItem: {
    width: 80,
    height: 80,
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  visibilityContainer: {
    marginTop: 15,
    marginBottom: 10,
  },
  visibilityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  visibilityButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  visibilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2E7D32',
    backgroundColor: '#FFFFFF',
  },
  visibilityButtonActive: {
    backgroundColor: '#2E7D32',
  },
  visibilityButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  visibilityButtonTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#757575',
  },
  postsList: {
    padding: 15,
  },
  postItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
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
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  postInfo: {
    marginLeft: 10,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  date: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  postContent: {
    fontSize: 16,
    color: '#424242',
    lineHeight: 22,
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  postMediaContainer: {
    marginBottom: 15,
  },
  postMediaItem: {
    width: 200,
    height: 150,
    marginLeft: 15,
    marginRight: 5,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  postMediaImage: {
    width: '100%',
    height: '100%',
  },
  singleMediaImage: {
    width: '100%',
    height: 300,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -15,
    marginTop: -15,
  },
  videoContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -25,
    marginTop: -25,
  },
  activeVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  postActionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  actionTextActive: {
    color: '#333',
    fontWeight: '500',
  },

  // Comment section styles
  commentsContainer: {
    padding: 10,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  commentsDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 5,
  },
  commentsHeader: {
    paddingVertical: 10,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
  },
  noCommentsText: {
    color: '#9E9E9E',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 15,
  },
  commentsList: {
    marginTop: 10,
  },
  commentItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  commentAvatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  commentInfo: {
    marginLeft: 8,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },
  commentDate: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  commentContent: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
    marginLeft: 38, // Align with username
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    paddingRight: 5,
  },
  commentInput: {
    flex: 1,
    padding: 10,
    maxHeight: 80,
    fontSize: 14,
  },
  commentSubmitButton: {
    backgroundColor: '#2E7D32',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSubmitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },

  // New and updated styles for responsive media grid
  singleMediaContainer: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
  },
  fullSizeMediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  gridItem2: {
    width: '49.5%',
    height: 200,
    margin: '0.25%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridItem4: {
    width: '49.5%',
    height: 150,
    margin: '0.25%',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  gridItemLarge: {
    width: '100%',
    height: 200,
    marginBottom: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridItemSmallContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  gridItemSmall: {
    width: '49.5%',
    height: 150,
    margin: '0.25%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridItemImage: {
    width: '100%',
    height: '100%',
  },
  gridItemVideo: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  playButtonSmall: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -15,
    marginTop: -15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 5,
  },
  moreOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },

  // Media viewer modal
  mediaViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mediaViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
  },
  closeButton: {
    padding: 8,
  },
  mediaViewerCounter: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  mediaViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  fullscreenVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  mediaViewerNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  navButton: {
    padding: 10,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
});
