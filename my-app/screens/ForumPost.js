import { useState, useEffect, useRef } from 'react';
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
  Pressable
} from 'react-native';
import { supabase, uploadFileToSupabase } from '../utils/supabase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import uuid from 'react-native-uuid';

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
  
  // New state for fullscreen media viewer
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [currentMediaList, setCurrentMediaList] = useState([]);
  
  // Get current user on component mount
  useEffect(() => {
    getUser();
    fetchPosts();
  }, []);

  // Get current authenticated user
  async function getUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error getting user:', error);
    }
  }

  // Fetch forum posts from Supabase
  async function fetchPosts() {
    try {
      setLoading(true);
      
      // Get all posts
      const { data: postsData, error: postsError } = await supabase
        .from('forum_posts')
        .select(`
          id,
          content,
          title,
          created_at,
          user_id
        `)
        .order('created_at', { ascending: false });
      
      if (postsError) throw postsError;
      
      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }
      
      // Get all post media
      const { data: mediaData, error: mediaError } = await supabase
        .from('forum_post_media')
        .select('*')
        .in('post_id', postsData.map(post => post.id));
        
      if (mediaError) {
        console.error('Error fetching post media:', mediaError);
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
        console.error('Error fetching profiles:', profilesError);
      }
      
      // Create a map of user IDs to profiles for quick lookup
      const profilesMap = {};
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap[profile.id] = profile;
        });
      }
      
      // Attach profile data and media to each post
      const postsWithData = postsData.map(post => ({
        ...post,
        profiles: profilesMap[post.user_id] || null,
        media: mediaByPost[post.id] || []
      }));
      
      setPosts(postsWithData);
    } catch (error) {
      console.error('Error fetching forum posts:', error);
      Alert.alert('Error', 'Failed to load forum posts. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Add this helper function at the top of your component
  const getMediaTypeOption = (type) => {
    // Try different API versions
    try {
      // Check if MediaType exists (newer API)
      if (ImagePicker.MediaType) {
        return type === 'image' ? ImagePicker.MediaType.Images : ImagePicker.MediaType.Videos;
      }
      // Try MediaTypeOptions (older API)
      else if (ImagePicker.MediaTypeOptions) {
        return type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos;
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
        mediaTypes: "images", // Use string instead of enum
        allowsEditing: true,
        quality: 0.7,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Check if we already have maximum media files
        if (mediaFiles.length >= 5) {
          Alert.alert("Limit Reached", "You can only attach up to 5 media files per post.");
          return;
        }
        
        const asset = result.assets[0];
        
        // Add to media files - skip manipulation for now
        setMediaFiles([...mediaFiles, {
          uri: asset.uri,
          type: 'image',
          name: `image-${Date.now()}.jpg`,
          tempId: uuid.v4()
        }]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
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
          Alert.alert("Limit Reached", "You can only attach up to 5 media files per post.");
          return;
        }
        
        const asset = result.assets[0];
        
        // Generate thumbnail for video
        const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(
          asset.uri,
          { time: 1000 }
        );
        
        // Add to media files
        setMediaFiles([...mediaFiles, {
          uri: asset.uri,
          type: 'video',
          thumbnail: thumbnailUri,
          name: `video-${Date.now()}.mp4`,
          tempId: uuid.v4()
        }]);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  }

  // Remove media from selection
  function removeMedia(tempId) {
    setMediaFiles(mediaFiles.filter(media => media.tempId !== tempId));
  }

  // Upload media files to Supabase Storage
  async function uploadMediaFiles(postId) {
    if (mediaFiles.length === 0) return [];
    
    const uploadedMedia = [];
    
    for (const media of mediaFiles) {
      try {
        console.log(`Processing ${media.type} file...`);
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 10);
        const fileExt = media.uri.split('.').pop();
        const fileName = `${timestamp}_${randomId}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        let fileToUpload = media.uri;
        let contentType = media.type === 'image' ? 'image/jpeg' : 'video/mp4';
        
        // For images, we'll create a copy to ensure the file is accessible
        if (media.type === 'image') {
          try {
            console.log('Preparing image file...');
            // Copy the image to a known location with a simple name
            const newPath = FileSystem.documentDirectory + `temp_image_${randomId}.jpg`;
            await FileSystem.copyAsync({
              from: media.uri,
              to: newPath
            });
            fileToUpload = newPath;
            console.log('Image prepared at:', fileToUpload);
          } catch (copyError) {
            console.log('File preparation failed, using original:', copyError);
          }
        }
        
        // Upload the file
        console.log(`Uploading ${media.type} to path: ${filePath}`);
        const { url: mediaUrl } = await uploadFileToSupabase(
          'forum', 
          filePath, 
          fileToUpload,
          contentType
        );
        console.log('Upload successful, URL:', mediaUrl);
        
        // Handle thumbnail for videos
        let thumbnailUrl = null;
        if (media.type === 'video' && media.thumbnail) {
          const thumbTimestamp = Date.now();
          const thumbId = Math.random().toString(36).substring(2, 10);
          const thumbnailName = `thumb_${thumbTimestamp}_${thumbId}.jpg`;
          const thumbnailPath = `${user.id}/${thumbnailName}`;
          
          // Copy thumbnail to known location
          const thumbNewPath = FileSystem.documentDirectory + `temp_thumb_${thumbId}.jpg`;
          await FileSystem.copyAsync({
            from: media.thumbnail,
            to: thumbNewPath
          });
          
          const { url: thumbUrl } = await uploadFileToSupabase(
            'forum',
            thumbnailPath,
            thumbNewPath,
            'image/jpeg'
          );
          
          thumbnailUrl = thumbUrl;
        }
        
        // Add to media records
        uploadedMedia.push({
          post_id: postId,
          media_url: mediaUrl,
          media_type: media.type,
          thumbnail_url: thumbnailUrl
        });
      } catch (error) {
        console.error('Error uploading media:', error.message || JSON.stringify(error));
        Alert.alert(
          'Upload Error', 
          `Failed to upload ${media.type}. Please check your connection and try again.`
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
          content: newPostText.trim(),
          user_id: user.id
        })
        .select('id')
        .single();
      
      if (postError) throw postError;
      
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
  const handleVideoPress = (videoId) => {
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
    if (!mediaViewerVisible || currentMediaList.length === 0) return null;
    
    const currentMedia = currentMediaList[currentMediaIndex];
    const isVideo = currentMedia.media_type === 'video';
    
    return (
      <Modal
        visible={mediaViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMediaViewer}
      >
        <View style={styles.mediaViewerContainer}>
          <View style={styles.mediaViewerHeader}>
            <TouchableOpacity onPress={closeMediaViewer} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.mediaViewerCounter}>
              {currentMediaIndex + 1} / {currentMediaList.length}
            </Text>
          </View>
          
          <View style={styles.mediaViewerContent}>
            {isVideo ? (
              <Video
                source={{ uri: currentMedia.media_url }}
                rate={1.0}
                volume={1.0}
                isMuted={false}
                resizeMode="contain"
                shouldPlay={true}
                useNativeControls
                style={styles.fullscreenVideo}
              />
            ) : (
              <Image
                source={{ uri: currentMedia.media_url }}
                style={styles.fullscreenImage}
                resizeMode="contain"
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
                  currentMediaIndex === 0 && styles.navButtonDisabled
                ]}
              >
                <Ionicons 
                  name="chevron-back" 
                  size={30} 
                  color={currentMediaIndex === 0 ? "#888888" : "#FFFFFF"} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={goToNextMedia}
                disabled={currentMediaIndex === currentMediaList.length - 1}
                style={[
                  styles.navButton, 
                  currentMediaIndex === currentMediaList.length - 1 && styles.navButtonDisabled
                ]}
              >
                <Ionicons 
                  name="chevron-forward" 
                  size={30} 
                  color={currentMediaIndex === currentMediaList.length - 1 ? "#888888" : "#FFFFFF"} 
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
    if (mediaFiles.length === 0) return null;
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.mediaPreviewContainer}
      >
        {mediaFiles.map((media) => (
          <View key={media.tempId} style={styles.mediaPreviewItem}>
            {media.type === 'image' ? (
              <Image source={{ uri: media.uri }} style={styles.mediaPreviewImage} />
            ) : (
              <Image source={{ uri: media.thumbnail }} style={styles.mediaPreviewImage} />
            )}
            
            {media.type === 'video' && (
              <View style={styles.videoIndicator}>
                <Ionicons name="play-circle" size={20} color="#FFF" />
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.removeMediaButton}
              onPress={() => removeMedia(media.tempId)}
            >
              <Ionicons name="close-circle" size={22} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    );
  };

  // Improved media grid display for posts
  const renderPostMedia = (media) => {
    if (!media || media.length === 0) return null;
    
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
              resizeMode="cover"
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
                resizeMode="cover"
                isLooping
                onPlaybackStatusUpdate={status => {
                  if (status.didJustFinish) {
                    setPlayingVideoId(null);
                  }
                }}
                style={styles.video}
                shouldPlay={true}
              />
            ) : (
              <TouchableOpacity onPress={() => openMediaViewer(media, 0)}>
                <Image 
                  source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/300x200?text=Video' }} 
                  style={styles.videoThumbnail}
                />
                <View style={styles.playButtonOverlay}>
                  <Ionicons name="play-circle" size={50} color="#FFF" />
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
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.gridItemVideo}>
                  <Image 
                    source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/300x200?text=Video' }} 
                    style={styles.gridItemImage}
                    resizeMode="cover"
                  />
                  <View style={styles.playButtonSmall}>
                    <Ionicons name="play-circle" size={30} color="#FFF" />
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
                resizeMode="cover"
              />
            ) : (
              <View style={styles.gridItemVideo}>
                <Image 
                  source={{ uri: media[0].thumbnail_url || 'https://via.placeholder.com/300x200?text=Video' }} 
                  style={styles.gridItemImage}
                  resizeMode="cover"
                />
                <View style={styles.playButtonSmall}>
                  <Ionicons name="play-circle" size={30} color="#FFF" />
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
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.gridItemVideo}>
                    <Image 
                      source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/300x200?text=Video' }} 
                      style={styles.gridItemImage}
                      resizeMode="cover"
                    />
                    <View style={styles.playButtonSmall}>
                      <Ionicons name="play-circle" size={24} color="#FFF" />
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
                resizeMode="cover"
              />
            ) : (
              <View style={styles.gridItemVideo}>
                <Image 
                  source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/300x200?text=Video' }} 
                  style={styles.gridItemImage}
                  resizeMode="cover"
                />
                <View style={styles.playButtonSmall}>
                  <Ionicons name="play-circle" size={24} color="#FFF" />
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

  // Render a post item
  const renderPost = ({ item }) => {
    // Format date
    const date = new Date(item.created_at);
    const formattedDate = date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Get username and avatar
    const username = item.profiles?.username || 'Anonymous';
    const avatarUrl = item.profiles?.avatar_url;
    
    return (
      <View style={styles.postItem}>
        <View style={styles.postHeader}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          
          <View style={styles.postInfo}>
            <Text style={styles.username}>{username}</Text>
            <Text style={styles.date}>{formattedDate}</Text>
          </View>
        </View>
        
        {item.content && (
          <Text style={styles.postContent}>{item.content}</Text>
        )}
        
        {renderPostMedia(item.media)}
        
        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="heart-outline" size={20} color="#666" />
            <Text style={styles.actionText}>Like</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-social-outline" size={20} color="#666" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Add this function near the top of your component
  const checkConnectivity = async () => {
    // Simple fetch to test connectivity to Supabase
    try {
      const response = await fetch(`${supabase.supabaseUrl}/storage/v1/object/info/forum`);
      return response.status !== 500 && response.status !== 404;
    } catch (error) {
      console.error('Connectivity check failed:', error);
      return false;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hiking Forum</Text>
      </View>
      
      {/* Post input area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Share your hiking experiences, ask questions, or find trail buddies..."
          value={newPostText}
          onChangeText={setNewPostText}
          multiline
          placeholderTextColor="#9E9E9E"
        />
        
        {renderMediaPreview()}
        
        <View style={styles.inputActions}>
          <TouchableOpacity 
            style={styles.mediaButton}
            onPress={() => setMediaOptionsVisible(true)}
            disabled={uploading}
          >
            <Ionicons name="image" size={24} color="#2E7D32" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.postButton, (!newPostText.trim() && mediaFiles.length === 0) && styles.postButtonDisabled]}
            onPress={submitPost}
            disabled={(!newPostText.trim() && mediaFiles.length === 0) || uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
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
        animationType="fade"
        onRequestClose={() => setMediaOptionsVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setMediaOptionsVisible(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.mediaOption}
              onPress={pickImage}
            >
              <Ionicons name="image" size={24} color="#2E7D32" />
              <Text style={styles.mediaOptionText}>Upload Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.mediaOption}
              onPress={pickVideo}
            >
              <Ionicons name="videocam" size={24} color="#2E7D32" />
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
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.postsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2E7D32"]}
              tintColor="#2E7D32"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color="#DDD" />
              <Text style={styles.emptyTitle}>No Posts Yet</Text>
              <Text style={styles.emptyText}>Be the first to share your thoughts!</Text>
            </View>
          }
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
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#757575',
    marginTop: 15,
  },
  emptyText: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 5,
    textAlign: 'center',
  },
  
  // New and updated styles for responsive media grid
  singleMediaContainer: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
  },
  singleMediaImage: {
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