import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

type EmailConfirmationSuccessScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EmailConfirmationSuccess'
>;

interface EmailConfirmationSuccessScreenProps {
  navigation: EmailConfirmationSuccessScreenNavigationProp;
}

export default function EmailConfirmationSuccessScreen({
  navigation,
}: EmailConfirmationSuccessScreenProps) {
  const scaleValue = new Animated.Value(0);
  const fadeValue = new Animated.Value(0);

  React.useEffect(() => {
    // Animate the success icon
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 600,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleContinueToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle='light-content' backgroundColor='#2E7D32' />

      <LinearGradient
        colors={['#2E7D32', '#4CAF50', '#66BB6A']}
        style={styles.gradient}
      >
        {/* Decorative circles */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />

        <SafeAreaView style={styles.content}>
          <View style={styles.iconContainer}>
            <Animated.View
              style={[
                styles.successIconContainer,
                {
                  transform: [{ scale: scaleValue }],
                },
              ]}
            >
              <Ionicons name='checkmark-circle' size={120} color='#FFFFFF' />
            </Animated.View>
          </View>

          <Animated.View style={[styles.textContainer, { opacity: fadeValue }]}>
            <Text style={styles.title}>Email Verified!</Text>

            <Text style={styles.description}>
              Congratulations! Your email has been successfully verified. You
              can now log in to your account and start exploring.
            </Text>

            <Text style={styles.subtitle}>
              Welcome to Ascentra - your hiking adventure begins now!
            </Text>
          </Animated.View>

          <Animated.View
            style={[styles.buttonContainer, { opacity: fadeValue }]}
          >
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleContinueToLogin}
            >
              <Text style={styles.loginButtonText}>Continue to Login</Text>
              <Ionicons
                name='arrow-forward'
                size={20}
                color='#2E7D32'
                style={styles.buttonIcon}
              />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={[styles.footerContainer, { opacity: fadeValue }]}
          >
            <View style={styles.featureContainer}>
              <View style={styles.featureItem}>
                <Ionicons name='map' size={24} color='rgba(255,255,255,0.9)' />
                <Text style={styles.featureText}>Discover Trails</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons
                  name='camera'
                  size={24}
                  color='rgba(255,255,255,0.9)'
                />
                <Text style={styles.featureText}>Share Experiences</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons
                  name='people'
                  size={24}
                  color='rgba(255,255,255,0.9)'
                />
                <Text style={styles.featureText}>Connect with Hikers</Text>
              </View>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    overflow: 'hidden',
  },
  // Decorative circles
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -50,
    right: -60,
  },
  circle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: 100,
    left: -40,
  },
  circle3: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -100,
    right: -100,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 40,
  },
  successIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 40,
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonText: {
    color: '#2E7D32',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  footerContainer: {
    width: '100%',
  },
  featureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});
