import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading your adventure...',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Lightweight logo placeholder */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>🏔️</Text>
          <Text style={styles.appName}>Ascentra</Text>
        </View>

        <ActivityIndicator
          size='large'
          color='#2E7D32'
          style={styles.spinner}
        />

        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoText: {
    fontSize: 64,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    letterSpacing: 1,
  },
  spinner: {
    marginVertical: 32,
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 24,
  },
});
