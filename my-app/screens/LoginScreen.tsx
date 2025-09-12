import React, { useState } from 'react';
import type { JSX } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ImageBackground,
  Dimensions,
  ScrollView,
} from 'react-native';
// Removed broken design system import
import { supabase, isInDemoMode } from '../services/supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';
import { handlePostAuthProfile } from '../utils/auth';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

const { width, height } = Dimensions.get('window');

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({
  navigation,
}: LoginScreenProps): JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  async function signInWithEmail(): Promise<void> {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Handle demo mode
    if (isInDemoMode) {
      Alert.alert(
        '🎭 Demo Mode',
        'Login is disabled in demo mode.\n\nTo enable login:\n1. Create a Supabase project\n2. Update your .env file\n3. Restart the app\n\nSee FIX_REGISTRATION_NOW.md for instructions.',
      );
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      // Check if the error is related to email confirmation
      if (
        error.message.toLowerCase().includes('email not confirmed') ||
        error.message.toLowerCase().includes('confirm your email') ||
        error.message.toLowerCase().includes('email confirmation')
      ) {
        Alert.alert(
          'Email Not Confirmed',
          'Please check your email and click the confirmation link before signing in.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Resend Email',
              onPress: () =>
                navigation.navigate('EmailConfirmation', { email: email }),
            },
          ],
        );
      } else {
        Alert.alert('Error', error.message);
      }
    } else if (data.user) {
      // Login successful - ensure user has a profile
      try {
        const profileResult = await handlePostAuthProfile(
          data.user,
          'email'
        );
        
        if (!profileResult.success) {
          console.warn('Profile creation failed during login:', profileResult.error);
          // Continue anyway, profile can be created later
        }
      } catch (profileError) {
        console.warn('Error creating profile during login:', profileError);
      }
      
      // Login successful - the AuthContext will handle the session state
      // and App.tsx will automatically navigate to the main app
      console.log('Login successful for user:', data.user.email);
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar translucent backgroundColor='transparent' />

      {/* Header with background image */}
      <View style={styles.headerContainer}>
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=1000',
          }}
          style={styles.headerBackground}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)', 'transparent']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <Text style={styles.headerText}>Welcome To</Text>
              <Text style={styles.headerTitle}>Ascentra</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>

      {/* Content section */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -64 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Image
                  source={require('../assets/images/ascentra.png')}
                  style={styles.logo}
                />
              </View>
              <Text style={styles.subtitle}>
                Discover trails. Share experiences.
              </Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.formLabel}>EMAIL</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  onChangeText={text => setEmail(text)}
                  value={email}
                  placeholder='your@email.com'
                  placeholderTextColor='#A0A0A0'
                  autoCapitalize='none'
                  keyboardType='email-address'
                />
              </View>

              <Text style={styles.formLabel}>PASSWORD</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  onChangeText={text => setPassword(text)}
                  value={password}
                  secureTextEntry={true}
                  placeholder='Your password'
                  placeholderTextColor='#A0A0A0'
                  autoCapitalize='none'
                />
              </View>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() =>
                  Alert.alert(
                    'Reset Password',
                    'Password reset functionality will be implemented here',
                  )
                }
                accessibilityRole='button'
                accessibilityLabel='Forgot Password'
                accessibilityHint='Opens password reset dialog'
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => signInWithEmail()}
                disabled={loading}
                accessibilityRole='button'
                accessibilityLabel={loading ? 'Logging in' : 'Log in'}
                accessibilityHint='Logs you into your account'
                accessibilityState={{ disabled: loading }}
              >
                {loading ? (
                  <ActivityIndicator color='#FFFFFF' />
                ) : (
                  <Text style={styles.loginButtonText}>LOG IN</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                accessibilityRole='button'
                accessibilityLabel='Sign Up'
                accessibilityHint='Navigate to registration screen'
              >
                <Text style={styles.registerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8F5',
  },
  headerContainer: {
    height: height * 0.25, // Reduced header height
    width: width,
  },
  headerBackground: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  headerContent: {
    padding: 20,
    paddingBottom: 20, // Reduced padding
  },
  headerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  card: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24, // Extra padding for iOS
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20, // Reduced margin
    marginTop: 10,
  },
  logoCircle: {
    width: 80, // Smaller logo
    height: 80, // Smaller logo
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 12, // Reduced margin
  },
  logo: {
    width: 60, // Smaller logo
    height: 60, // Smaller logo
    resizeMode: 'contain',
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    marginTop: 4,
  },
  formContainer: {
    width: '100%',
    marginBottom: 20, // Reduced margin
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555555',
    marginBottom: 6, // Reduced margin
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  inputContainer: {
    marginBottom: 16, // Reduced margin
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F7F7FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  input: {
    padding: 14, // Reduced padding
    fontSize: 16,
    color: '#333333',
    height: 50, // Fixed height
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20, // Reduced margin
  },
  forgotPasswordText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    height: 50, // Reduced height
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16, // Reduced margin
  },
  footerText: {
    fontSize: 15,
    color: '#666666',
  },
  registerLink: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
});
