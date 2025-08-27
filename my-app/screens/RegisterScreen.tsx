import React, { useState } from 'react'
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
  Dimensions
} from 'react-native'
import { supabase, isInDemoMode } from '../services/supabaseClient'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { testSupabaseConnection, testBasicNetworkConnectivity } from '../utils/networkTest'
import { runValidation } from '../utils/validateSetup'

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
};

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

interface RegisterScreenProps {
  navigation: RegisterScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [username, setUsername] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  async function signUpWithEmail(): Promise<void> {
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }

    // Handle demo mode
    if (isInDemoMode) {
      Alert.alert(
        '🎭 Demo Mode', 
        'Registration is disabled in demo mode.\n\nTo enable registration:\n1. Create a Supabase project\n2. Update your .env file\n3. Restart the app\n\nSee FIX_REGISTRATION_NOW.md for instructions.',
        [
          { text: 'OK', style: 'default' },
          { text: 'Go to Login', onPress: () => navigation.navigate('Login') }
        ]
      )
      return
    }

    setLoading(true)
    
    try {
      console.log('Attempting to register user with email:', email)
      console.log('Supabase URL configured:', !!supabase.supabaseUrl)
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username
          }
        }
      })

      if (authError) {
        console.error('Supabase auth error:', authError)
        console.error('Auth error details:', {
          message: authError.message,
          status: authError.status,
          statusCode: authError.status,
        })
        
        // Run comprehensive diagnostics for auth errors
        console.log('Running comprehensive diagnostics due to auth error...');
        try {
          await testBasicNetworkConnectivity();
          await testSupabaseConnection();
          await runValidation();
        } catch (diagError) {
          console.error('Diagnostic error:', diagError);
        }
        
        Alert.alert('Registration Error', `${authError.message}\n\nPlease check your internet connection and try again.\n\nNetwork diagnostics have been logged to the console.`)
        setLoading(false)
        return
      }

      console.log('Registration successful:', authData)
      // The user has been created but may need email verification
      Alert.alert('Success', 'Registration successful! Please check your email for confirmation.')
      navigation.navigate('Login')
      
    } catch (error) {
      console.error('Network or unexpected error during registration:', error)
      
      // Run comprehensive diagnostics
      console.log('Running comprehensive diagnostics...');
      await testBasicNetworkConnectivity();
      await testSupabaseConnection();
      await runValidation();
      
      Alert.alert(
        'Connection Error', 
        'Unable to connect to the server. Please check your internet connection and try again.\n\nNetwork diagnostics have been logged to the console. If the problem persists, please contact support.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Decorative circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      <View style={styles.circle3} />
      
      {/* Top navigation */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </SafeAreaView>
      
      {/* Content section */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                style={styles.input}
                onChangeText={(text) => setUsername(text)}
                value={username}
                placeholder="Choose a username"
                placeholderTextColor="#BBBBBB"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.input}
                onChangeText={(text) => setEmail(text)}
                value={email}
                placeholder="your@email.com"
                placeholderTextColor="#BBBBBB"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.formLabel}>Password</Text>
              <TextInput
                style={styles.input}
                onChangeText={(text) => setPassword(text)}
                value={password}
                secureTextEntry={true}
                placeholder="Create a password"
                placeholderTextColor="#BBBBBB"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.formLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                onChangeText={(text) => setConfirmPassword(text)}
                value={confirmPassword}
                secureTextEntry={true}
                placeholder="Re-enter your password"
                placeholderTextColor="#BBBBBB"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity 
              style={styles.registerButton}
              onPress={() => signUpWithEmail()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  // Circular design elements with hiking-inspired colors
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(46, 125, 50, 0.15)', // Forest Green
    top: -50,
    right: -60,
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(25, 118, 210, 0.12)', // Mountain Blue
    top: 80,
    left: -40,
  },
  circle3: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(141, 110, 99, 0.08)', // Earthy Brown
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
    backgroundColor: '#EEEEEE',
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
    color: '#1976D2', // Mountain Blue for links
  }
})