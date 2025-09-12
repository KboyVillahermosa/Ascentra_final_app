import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import * as Font from 'expo-font';
import { Asset } from 'expo-asset';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface PreloaderScreenProps {
  onLoadingComplete: () => void;
  children: React.ReactNode;
}

interface LoadingState {
  fonts: boolean;
  icons: boolean;
  images: boolean;
  complete: boolean;
}

const PreloaderScreen: React.FC<PreloaderScreenProps> = ({
  onLoadingComplete,
  children,
}) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    fonts: false,
    icons: false,
    images: false,
    complete: false,
  });

  const [progress] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(1));
  const [fadeComplete, setFadeComplete] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('Initializing...');

  // Critical assets to preload
  const criticalImages = [
    require('../assets/images/ascentra.png'),
    require('../assets/images/logo.png'),
    require('../assets/icon.png'),
    require('../assets/splash-icon.png'),
  ];

  const loadFonts = async (): Promise<void> => {
    try {
      setCurrentMessage('Loading fonts...');

      // Load system fonts if needed (most are already available)
      // For Expo, most fonts are pre-loaded, but we can ensure they're ready
      await Font.loadAsync({
        // Add any custom fonts here if needed
        // 'custom-font': require('../assets/fonts/custom-font.ttf'),
      });

      setLoadingState(prev => ({ ...prev, fonts: true }));
    } catch (error) {
      console.warn('Font loading error:', error);
      // Continue even if fonts fail to load
      setLoadingState(prev => ({ ...prev, fonts: true }));
    }
  };

  const loadIcons = async (): Promise<void> => {
    try {
      setCurrentMessage('Loading icons...');

      // Preload critical icon fonts
      await Promise.all([
        Ionicons.loadFont(),
        MaterialIcons.loadFont(),
        FontAwesome.loadFont(),
      ]);

      setLoadingState(prev => ({ ...prev, icons: true }));
    } catch (error) {
      console.warn('Icon loading error:', error);
      // Continue even if icons fail to load
      setLoadingState(prev => ({ ...prev, icons: true }));
    }
  };

  const loadImages = async (): Promise<void> => {
    try {
      setCurrentMessage('Loading images...');

      // Preload critical images
      const imageAssets = criticalImages.map(image => {
        return Asset.fromModule(image).downloadAsync();
      });

      await Promise.all(imageAssets);

      setLoadingState(prev => ({ ...prev, images: true }));
    } catch (error) {
      console.warn('Image loading error:', error);
      // Continue even if images fail to load
      setLoadingState(prev => ({ ...prev, images: true }));
    }
  };

  const updateProgress = (newProgress: number) => {
    Animated.timing(progress, {
      toValue: newProgress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    const loadAssets = async () => {
      try {
        // Load assets in parallel for better performance
        await Promise.all([loadFonts(), loadIcons(), loadImages()]);

        setCurrentMessage('Almost ready...');

        // Small delay to ensure smooth transition
        setTimeout(() => {
          setLoadingState(prev => ({ ...prev, complete: true }));
        }, 500);
      } catch (error) {
        console.error('Asset loading error:', error);
        // Continue to app even if some assets fail
        setLoadingState(prev => ({ ...prev, complete: true }));
      }
    };

    loadAssets();
  }, []);

  // Update progress based on loading state
  useEffect(() => {
    const { fonts, icons, images } = loadingState;
    let progressValue = 0;

    if (fonts) {
      progressValue += 0.33;
    }
    if (icons) {
      progressValue += 0.33;
    }
    if (images) {
      progressValue += 0.34;
    }

    updateProgress(progressValue);
  }, [loadingState]);

  // Handle completion
  useEffect(() => {
    if (loadingState.complete) {
      setCurrentMessage('Ready!');
      updateProgress(1);

      // Fade out and call completion callback
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setFadeComplete(true);
          onLoadingComplete();
        });
      }, 200);
    }
  }, [loadingState.complete, fadeAnim, onLoadingComplete]);

  if (loadingState.complete && fadeComplete) {
    return <>{children}</>;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        {/* App Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>🏔️</Text>
          <Text style={styles.appName}>Ascentra</Text>
          <Text style={styles.tagline}>Your Hiking Adventure Awaits</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Progress Percentage */}
          <Animated.Text style={styles.progressText}>
            {progress
              .interpolate({
                inputRange: [0, 1],
                outputRange: [0, 100],
              })
              .interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              })}
          </Animated.Text>
        </View>

        {/* Loading Message */}
        <Text style={styles.message}>{currentMessage}</Text>

        {/* Loading Indicators */}
        <View style={styles.indicatorsContainer}>
          <View style={styles.indicator}>
            <View
              style={[
                styles.indicatorDot,
                loadingState.fonts && styles.indicatorDotActive,
              ]}
            />
            <Text style={styles.indicatorText}>Fonts</Text>
          </View>

          <View style={styles.indicator}>
            <View
              style={[
                styles.indicatorDot,
                loadingState.icons && styles.indicatorDotActive,
              ]}
            />
            <Text style={styles.indicatorText}>Icons</Text>
          </View>

          <View style={styles.indicator}>
            <View
              style={[
                styles.indicatorDot,
                loadingState.images && styles.indicatorDotActive,
              ]}
            />
            <Text style={styles.indicatorText}>Images</Text>
          </View>
        </View>
      </View>
    </Animated.View>
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
    paddingHorizontal: 32,
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoText: {
    fontSize: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#2E7D32',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '500',
  },
  progressContainer: {
    width: '80%',
    alignItems: 'center',
    marginBottom: 32,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2E7D32',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  indicatorsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
  },
  indicator: {
    alignItems: 'center',
  },
  indicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CCCCCC',
    marginBottom: 4,
  },
  indicatorDotActive: {
    backgroundColor: '#2E7D32',
  },
  indicatorText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
});

export default PreloaderScreen;
