import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { supabase } from '../services/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';

export default function EditProfileScreen({ navigation }) {
  const { user } = useAuth();
  const {
    profile,
    updateProfile: updateProfileContext,
    loading: profileLoading,
    error,
  } = useProfile();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [skillLevel, setSkillLevel] = useState('rookie_rambler');
  const [uploading, setUploading] = useState(false);

  // Skill levels definition for the picker
  const SKILL_LEVELS_ARRAY = [
    {
      id: 'rookie_rambler',
      name: 'Rookie Rambler',
      emoji: '🌱',
      description: 'New to hiking, exploring local trails',
    },
    {
      id: 'climb_chaser',
      name: 'Climb Chaser',
      emoji: '🌄',
      description: 'Building endurance, tackling moderate trails',
    },
    {
      id: 'rock_scrambler',
      name: 'Rock Scrambler',
      emoji: '🔗',
      description: 'Experienced hiker, comfortable with challenging terrain',
    },
    {
      id: 'summit_strider',
      name: 'Summit Strider',
      emoji: '🧗',
      description: 'Advanced hiker, conquering peaks and long distances',
    },
    {
      id: 'earth_roamer',
      name: 'Earth Roamer',
      emoji: '🌍',
      description: 'Expert adventurer, exploring the most challenging trails',
    },
  ];

  // Load profile data when profile context updates
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url);
      setSkillLevel(profile.skill_level || 'rookie_rambler');
    }
  }, [profile]);

  async function handleUpdateProfile() {
    try {
      setLoading(true);

      if (!user) {
        throw new Error('No user found');
      }

      // Update the profile using global context
      const success = await updateProfileContext({
        username: username.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
        skill_level: skillLevel,
      });

      if (success) {
        Alert.alert('Success', 'Profile updated successfully!');
        // Navigate back with refresh parameter to trigger ProfileScreen refresh
        navigation.navigate('Profile', { refresh: true });
      } else {
        Alert.alert('Error', 'Failed to update profile.');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar() {
    try {
      // Request permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please grant permission to access your photos to upload an avatar.',
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        // Start upload
        setUploading(true);

        // Get the selected asset
        const asset = result.assets[0];

        // Validate file size (max 5MB)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            'File Too Large',
            'Please select an image smaller than 5MB.',
          );
          return;
        }

        // Read the file and convert to base64
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Create a filename with proper extension
        const fileExtension = asset.uri.split('.').pop() || 'jpg';
        const fileName = `avatar-${Date.now()}.${fileExtension}`;
        const filePath = `${user.id}/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(filePath, decode(base64), {
            contentType: asset.mimeType || 'image/jpeg',
            upsert: true,
          });

        if (error) {
          // Provide specific error messages
          if (error.message.includes('bucket')) {
            Alert.alert(
              'Storage Error',
              'Avatar storage is not properly configured. Please contact support.',
            );
          } else if (error.message.includes('policy')) {
            Alert.alert(
              'Permission Error',
              'You do not have permission to upload files. Please try logging out and back in.',
            );
          } else if (error.message.includes('size')) {
            Alert.alert(
              'File Size Error',
              'The selected image is too large. Please choose a smaller image.',
            );
          } else {
            Alert.alert(
              'Upload Error',
              `Failed to upload avatar: ${error.message}`,
            );
          }
          return;
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        if (!urlData?.publicUrl) {
          Alert.alert('Error', 'Failed to get avatar URL. Please try again.');
          return;
        }

        // Update state with the new avatar URL
        setAvatarUrl(urlData.publicUrl);

        Alert.alert('Success', 'Avatar uploaded successfully!');
      }
    } catch (error) {
      // Handle different types of errors
      if (error.message.includes('network')) {
        Alert.alert(
          'Network Error',
          'Please check your internet connection and try again.',
        );
      } else if (error.message.includes('permission')) {
        Alert.alert(
          'Permission Error',
          'Unable to access the selected image. Please try selecting a different image.',
        );
      } else {
        Alert.alert(
          'Error',
          `An error occurred while uploading your avatar: ${error.message}`,
        );
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor='#FFFFFF' />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color='#333' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>
                    {username ? username.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}

              {uploading ? (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color='#FFFFFF' size='small' />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.changeAvatarButton}
                  onPress={uploadAvatar}
                >
                  <Ionicons name='camera' size={18} color='#FFFFFF' />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder='Enter a username'
              placeholderTextColor='#AAAAAA'
              autoCapitalize='none'
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder='Tell us about yourself...'
              placeholderTextColor='#AAAAAA'
              multiline
              numberOfLines={4}
              textAlignVertical='top'
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Hiking Skill Level</Text>
            <View style={styles.skillLevelContainer}>
              {SKILL_LEVELS_ARRAY.map(level => (
                <TouchableOpacity
                  key={level.id}
                  style={[
                    styles.skillLevelOption,
                    skillLevel === level.id && styles.skillLevelSelected,
                  ]}
                  onPress={() => setSkillLevel(level.id)}
                >
                  <Text style={styles.skillLevelEmoji}>{level.emoji}</Text>
                  <Text
                    style={[
                      styles.skillLevelName,
                      skillLevel === level.id && styles.skillLevelNameSelected,
                    ]}
                  >
                    {level.name}
                  </Text>
                  <Text style={styles.skillLevelDescription}>
                    {level.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleUpdateProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color='#FFFFFF' size='small' />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 30,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
  },
  changeAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2E7D32',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F9F9F9',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skillLevelContainer: {
    gap: 12,
  },
  skillLevelOption: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#F9F9F9',
  },
  skillLevelSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E8',
  },
  skillLevelEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  skillLevelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  skillLevelNameSelected: {
    color: '#2E7D32',
  },
  skillLevelDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
});
