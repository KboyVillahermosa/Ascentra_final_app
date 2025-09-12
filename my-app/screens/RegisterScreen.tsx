import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  ImageBackground,
  Dimensions,
} from 'react-native';
// Removed broken design system import
import { supabase, isInDemoMode } from '../services/supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { handlePostAuthProfile } from '../utils/auth';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  EmailConfirmation: { email: string };
};

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Register'
>;

interface RegisterScreenProps {
  navigation: RegisterScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');

interface ValidationErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  skillLevel?: string;
}

interface SkillLevel {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

const SKILL_LEVELS: SkillLevel[] = [
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

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [skillLevel, setSkillLevel] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Real-time validation
  useEffect(() => {
    validateForm();
  }, [username, email, password, confirmPassword, skillLevel]);

  const validateForm = () => {
    const newErrors: ValidationErrors = {};

    // Username validation
    if (touched.username && username) {
      if (username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      }
    }

    // Email validation
    if (touched.email && email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Password validation
    if (touched.password && password) {
      if (password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        newErrors.password =
          'Password must contain uppercase, lowercase, and number';
      }
    }

    // Confirm password validation
    if (touched.confirmPassword && confirmPassword) {
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // Skill level validation
    if (touched.skillLevel && !skillLevel) {
      newErrors.skillLevel = 'Please select your hiking skill level';
    }

    setErrors(newErrors);
  };

  const handleFieldBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const isFormValid = () => {
    return (
      username.length >= 3 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
      password.length >= 6 &&
      /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password) &&
      password === confirmPassword &&
      skillLevel.trim() !== '' &&
      Object.keys(errors).length === 0
    );
  };

  async function signUpWithEmail(): Promise<void> {
    // Mark all fields as touched for validation display
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
      skillLevel: true,
    });

    if (!username || !email || !password || !confirmPassword || !skillLevel) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isFormValid()) {
      Alert.alert(
        'Error',
        'Please fix the validation errors before continuing',
      );
      return;
    }

    // Handle demo mode
    if (isInDemoMode) {
      Alert.alert(
        '🎭 Demo Mode',
        'Registration is disabled in demo mode.\n\nTo enable registration:\n1. Create a Supabase project\n2. Update your .env file\n3. Restart the app\n\nSee FIX_REGISTRATION_NOW.md for instructions.',
        [
          { text: 'OK', style: 'default' },
          { text: 'Go to Login', onPress: () => navigation.navigate('Login') },
        ],
      );
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username,
          },
        },
      });

      if (authError) {
        // Handle specific error cases
        if (
          authError.message.toLowerCase().includes('user already registered') ||
          authError.message.toLowerCase().includes('already been registered') ||
          authError.status === 422
        ) {
          Alert.alert(
            'Account Already Exists',
            "An account with this email already exists. You can either sign in with your existing account or check your email for a confirmation link if you haven't verified your account yet.",
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Go to Sign In',
                onPress: () => navigation.navigate('Login'),
              },
              {
                text: 'Resend Confirmation',
                onPress: () =>
                  navigation.navigate('EmailConfirmation', { email: email }),
              },
            ],
          );
        } else {
          Alert.alert('Registration Error', authError.message);
        }
        setLoading(false);
        return;
      }

      if (authData.user) {
        // Create user profile
        const profileResult = await handlePostAuthProfile(
          authData.user,
          'email',
          username,
          skillLevel,
        );

        if (!profileResult.success) {
          // Continue anyway, profile can be created later
        }

        if (!authData.user.email_confirmed_at) {
          // User needs email confirmation
          navigation.navigate('EmailConfirmation', { email: email });
        } else {
          // User is confirmed, go to main app
          Alert.alert('Success', 'Registration successful!');
          navigation.navigate('Home');
        }
      }
    } catch (error) {
      Alert.alert(
        'Connection Error',
        'Unable to connect to the server. Please check your internet connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor='#FFFFFF' />

      {/* Decorative circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      <View style={styles.circle3} />

      {/* Top navigation */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          accessibilityHint='Returns to the previous screen'
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Content section */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Join Ascentra</Text>
          <Text style={styles.subtitle}>Create your account</Text>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.formLabel}>Username</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.username && touched.username
                    ? styles.inputError
                    : undefined,
                ]}
                onChangeText={text => setUsername(text)}
                onBlur={() => handleFieldBlur('username')}
                value={username}
                placeholder='Choose a username'
                placeholderTextColor='#BBBBBB'
                autoCapitalize='none'
              />
              {errors.username && touched.username && (
                <Text style={styles.errorText}>{errors.username}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.email && touched.email ? styles.inputError : undefined,
                ]}
                onChangeText={text => setEmail(text)}
                onBlur={() => handleFieldBlur('email')}
                value={email}
                placeholder='your@email.com'
                placeholderTextColor='#BBBBBB'
                autoCapitalize='none'
                keyboardType='email-address'
              />
              {errors.email && touched.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.formLabel}>Password</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.password && touched.password
                    ? styles.inputError
                    : undefined,
                ]}
                onChangeText={text => setPassword(text)}
                onBlur={() => handleFieldBlur('password')}
                value={password}
                secureTextEntry={true}
                placeholder='Create a password'
                placeholderTextColor='#BBBBBB'
                autoCapitalize='none'
              />
              {errors.password && touched.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.formLabel}>Confirm Password</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.confirmPassword && touched.confirmPassword
                    ? styles.inputError
                    : undefined,
                ]}
                onChangeText={text => setConfirmPassword(text)}
                onBlur={() => handleFieldBlur('confirmPassword')}
                value={confirmPassword}
                secureTextEntry={true}
                placeholder='Re-enter your password'
                placeholderTextColor='#BBBBBB'
                autoCapitalize='none'
              />
              {errors.confirmPassword && touched.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>

            {/* Skill Level Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.formLabel}>Hiking Skill Level</Text>
              <View style={styles.skillLevelContainer}>
                {SKILL_LEVELS.map(level => (
                  <TouchableOpacity
                    key={level.id}
                    style={[
                      styles.skillLevelOption,
                      skillLevel === level.id && styles.skillLevelSelected,
                    ]}
                    onPress={() => {
                      setSkillLevel(level.id);
                      handleFieldBlur('skillLevel');
                    }}
                  >
                    <Text style={styles.skillLevelEmoji}>{level.emoji}</Text>
                    <Text
                      style={[
                        styles.skillLevelName,
                        skillLevel === level.id &&
                          styles.skillLevelNameSelected,
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
              {errors.skillLevel && touched.skillLevel && (
                <Text style={styles.errorText}>{errors.skillLevel}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.registerButton,
                (!isFormValid() || loading) && styles.registerButtonDisabled,
              ]}
              onPress={() => signUpWithEmail()}
              disabled={!isFormValid() || loading}
              accessibilityRole='button'
              accessibilityLabel={
                loading ? 'Creating account' : 'Create Account'
              }
              accessibilityHint='Creates a new account with the provided information'
              accessibilityState={{ disabled: !isFormValid() || loading }}
            >
              {loading ? (
                <ActivityIndicator color='#FFFFFF' />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              accessibilityRole='button'
              accessibilityLabel='Sign In'
              accessibilityHint='Navigate to login screen'
            >
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8F5',
    overflow: 'hidden',
  },
  // Circular design elements with simple colors
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 122, 255, 0.1)', // iOS Blue
    top: -50,
    right: -60,
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(142, 142, 147, 0.1)', // iOS Gray
    top: 80,
    left: -40,
  },
  circle3: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 122, 255, 0.05)', // Light iOS Blue
    bottom: -100,
    right: -100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#333',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  formContainer: {
    width: '100%',
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    borderBottomWidth: 1.5, // Slightly thicker border
    borderBottomColor: '#DDDDDD',
    paddingVertical: 10,
    fontSize: 16,
    color: '#222222',
  },
  inputError: {
    borderBottomColor: '#E53E3E',
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#2E7D32', // Forest Green as primary action color
    borderRadius: 30,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35, // More pronounced shadow
    shadowRadius: 10,
    elevation: 6, // Stronger elevation for Android
  },
  registerButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold', // Bolder text
    letterSpacing: 0.5,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    fontSize: 15,
    color: '#666',
  },
  loginLink: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  skillLevelContainer: {
    gap: 12,
  },
  skillLevelOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skillLevelSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#F1F8E9',
  },
  skillLevelEmoji: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  skillLevelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 4,
  },
  skillLevelNameSelected: {
    color: '#2E7D32',
  },
  skillLevelDescription: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
  },
});
