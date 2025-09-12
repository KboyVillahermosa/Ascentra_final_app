import React, { useEffect, useState, useCallback } from 'react';
import {
  Platform,
  AppState,
  AppStateStatus,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as Linking from 'expo-linking';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './services/supabaseClient';
import PlatformStorage from './utils/platformStorage';
import { linking } from './utils/linking';
import { Session } from '@supabase/supabase-js';
import {
  networkManager,
  preloadCriticalData,
} from './utils/loadingOptimization';
import EnhancedErrorBoundary from './components/EnhancedErrorBoundary';
import { LoadingScreen } from './components/LoadingScreen';
import PreloaderScreen from './components/PreloaderScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProfileProvider } from './contexts/ProfileContext';
import {
  PerformanceMonitor,
  runAfterInteractions,
} from './utils/performanceOptimizations';
import { performanceMonitor } from './utils/performanceMonitor';

// Navigation types
export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  EmailConfirmation: { email: string };
  EmailConfirmationSuccess: undefined;
  Posts: undefined;
  Comments: { postId: string };
  Profile: { userId?: string; refresh?: boolean };
  EditProfile: undefined;
  ChangePassword: undefined;
  HikingSpotDetails: { spot: any };
  ActivityDetails: { activity: any };
  Tracking: undefined;
  HikeHistory: { userId?: string | null };
  SaveActivity: { routeCoordinates: any[]; stats: any };
  MediaViewer: { mediaItems: any[]; initialIndex: number };
  HikeDetail: { hikeId: string };
  ActivityComments: { activityId: string };
  SaveConfirmation: { hikeId: string };
  InteractiveMap: undefined;
  Track: undefined;
  Favorites: undefined;
};

// Lazy-loaded screen imports for better performance
const LoginScreen = React.lazy(() => import('./screens/LoginScreen'));
const RegisterScreen = React.lazy(() => import('./screens/RegisterScreen'));
const HomeScreen = React.lazy(() => import('./screens/HomeScreen'));
const EmailConfirmationScreen = React.lazy(
  () => import('./screens/EmailConfirmationScreen'),
);
const EmailConfirmationSuccessScreen = React.lazy(
  () => import('./screens/EmailConfirmationSuccessScreen'),
);
const SaveActivityScreen = React.lazy(
  () => import('./screens/SaveActivityScreen'),
);
const HikeHistoryScreen = React.lazy(
  () => import('./screens/HikeHistoryScreen'),
);
const ProfileScreen = React.lazy(() => import('./screens/ProfileScreen'));
const HikingSpotDetailsScreen = React.lazy(
  () => import('./screens/HikingSpotDetailsScreen'),
);
const ActivityDetailsScreen = React.lazy(
  () => import('./screens/ActivityDetailsScreen'),
);
const TrackScreen = React.lazy(() => import('./screens/TrackScreen'));
const TrackingScreen = React.lazy(() => import('./screens/TrackingScreen'));
const PostsScreen = React.lazy(() => import('./screens/PostsScreen'));
const CommentsScreen = React.lazy(() => import('./screens/CommentsScreen'));
const EditProfileScreen = React.lazy(
  () => import('./screens/EditProfileScreen'),
);
const ChangePasswordScreen = React.lazy(
  () => import('./screens/ChangePasswordScreen'),
);
const MediaViewerScreen = React.lazy(
  () => import('./screens/MediaViewerScreen'),
);
const HikeDetailScreen = React.lazy(() => import('./screens/HikeDetailScreen'));
const ActivityCommentsScreen = React.lazy(
  () => import('./screens/ActivityCommentsScreen'),
);
const SaveConfirmationScreen = React.lazy(
  () => import('./screens/SaveConfirmationScreen'),
);
const InteractiveMapScreen = React.lazy(
  () => import('./screens/InteractiveTrailMapScreen'),
);
const FavoritesScreen = React.lazy(() => import('./screens/FavoritesScreen'));

// Individual hiking spot screens removed - using unified HikingSpotDetailsScreen instead

// Removed LazyScreen wrapper since we're using direct imports

const Stack = createNativeStackNavigator<RootStackParamList>();

// Helper function to store auth tokens securely
async function saveToken(key: string, value: string): Promise<void> {
  try {
    await PlatformStorage.setItemAsync(key, value);
  } catch (error) {
    console.log('Error saving token:', error);
  }
}

// Helper function to retrieve auth tokens
async function getToken(key: string): Promise<string | null> {
  try {
    return await PlatformStorage.getItemAsync(key);
  } catch (error) {
    console.log('Error getting token:', error);
    return null;
  }
}

interface AppContentProps {
  session: any;
  loading: boolean;
}

function AppContent({ session, loading }: AppContentProps): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Initialize performance monitoring and preload critical data
  useEffect(() => {
    async function initializePerformance() {
      PerformanceMonitor.startTimer('app_initialization');

      try {
        // Defer critical data preloading to avoid blocking initial render
        if (session) {
          setTimeout(() => {
            preloadCriticalData().catch(error => {
              console.error('Preload error:', error);
            });
          }, 100);
        }

        PerformanceMonitor.endTimer('app_initialization');
      } catch (error) {
        console.warn('Performance initialization error:', error);
        PerformanceMonitor.endTimer('app_initialization');
      }
    }

    initializePerformance();

    // Log performance metrics after app loads
    runAfterInteractions(() => {
      setTimeout(() => {
        PerformanceMonitor.logMetrics();
      }, 3000);
    });
  }, [session]);

  useEffect(() => {
    if (!loading) {
      // Small delay to ensure smooth transition
      setTimeout(() => setIsReady(true), 200);
    }
  }, [loading]);

  const handleAssetsLoaded = () => {
    setAssetsLoaded(true);
  };

  // State to track if we should show email confirmation success
  const [showEmailConfirmationSuccess, setShowEmailConfirmationSuccess] =
    useState<boolean>(false);

  // Simplified deep link handler
  const handleDeepLink = async ({ url }: { url: string }): Promise<void> => {
    if (!url) {
      return;
    }

    console.log('Received deep link:', url);

    if (url.includes('auth/callback') || url.includes('login')) {
      try {
        const parsedUrl = Linking.parse(url);

        if (parsedUrl.queryParams?.access_token) {
          const accessToken = Array.isArray(parsedUrl.queryParams.access_token)
            ? parsedUrl.queryParams.access_token[0]
            : parsedUrl.queryParams.access_token;
          const refreshToken = Array.isArray(
            parsedUrl.queryParams.refresh_token,
          )
            ? parsedUrl.queryParams.refresh_token[0]
            : parsedUrl.queryParams.refresh_token || '';

          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error && data?.session) {
            console.log('Session established via deep link');
            // Session will be automatically updated by AuthContext

            // Check if this is an email confirmation
            if (
              url.includes('type=signup') ||
              parsedUrl.queryParams?.type === 'signup'
            ) {
              console.log('Email confirmation detected via deep link');
              setShowEmailConfirmationSuccess(true);

              // Clear the flag after a short delay to allow navigation
              setTimeout(() => {
                setShowEmailConfirmationSuccess(false);
              }, 100);
            }
          }
        } else {
          // If no access token but this is an auth callback, it might be an error
          console.log('Auth callback received but no access token found');
        }
      } catch (e) {
        console.error('Error handling deep link:', e);
      }
    }
  };

  useEffect(() => {
    // Handle deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check for initial link
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => subscription.remove();
  }, []);

  if (loading || !isReady) {
    return <LoadingScreen message='Preparing your hiking adventure...' />;
  }

  if (!assetsLoaded) {
    return (
      <PreloaderScreen onLoadingComplete={handleAssetsLoaded}>
        <></>
      </PreloaderScreen>
    );
  }

  // For debugging purposes, log the screens we have available
  console.log('Available screens in navigator:', [
    'Home',
    'HikingSpotDetails',
    'ActivityDetails',
    'Tracking',
    'HikeHistory',
    'SaveActivity',
    'Login',
    'Register',
    'EmailConfirmation',
    'Posts',
    'Comments',
    'Profile',
    'EditProfile',
    'ChangePassword',
    'MediaViewer',
  ]);

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator>
        {session ? (
          showEmailConfirmationSuccess ? (
            // Show email confirmation success screen first, then allow navigation to main app
            <Stack.Screen
              name='EmailConfirmationSuccess'
              options={{ headerShown: false }}
            >
              {props => (
                <React.Suspense
                  fallback={<LoadingScreen message='Loading success...' />}
                >
                  <EmailConfirmationSuccessScreen {...props} />
                </React.Suspense>
              )}
            </Stack.Screen>
          ) : (
            <>
              {/* Core screens - individual Suspense boundaries */}
              <Stack.Screen name='Home' options={{ headerShown: false }}>
                {props => (
                  <React.Suspense
                    fallback={<LoadingScreen message='Loading home...' />}
                  >
                    <HomeScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
              <Stack.Screen name='Posts' options={{ headerShown: false }}>
                {props => (
                  <React.Suspense
                    fallback={<LoadingScreen message='Loading posts...' />}
                  >
                    <PostsScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
              <Stack.Screen name='Comments' options={{ headerShown: false }}>
                {props => (
                  <React.Suspense
                    fallback={<LoadingScreen message='Loading comments...' />}
                  >
                    <CommentsScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
              <Stack.Screen name='Profile' options={{ headerShown: false }}>
                {props => (
                  <React.Suspense
                    fallback={<LoadingScreen message='Loading profile...' />}
                  >
                    <ProfileScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
              <Stack.Screen name='EditProfile' options={{ headerShown: false }}>
                {props => (
                  <React.Suspense
                    fallback={<LoadingScreen message='Loading editor...' />}
                  >
                    <EditProfileScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
              <Stack.Screen
                name='ChangePassword'
                options={{ headerShown: false }}
              >
                {props => (
                  <React.Suspense
                    fallback={<LoadingScreen message='Loading settings...' />}
                  >
                    <ChangePasswordScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
              {/* Secondary screens - individual Suspense boundaries */}
              <Stack.Screen
                name='HikingSpotDetails'
                options={{ headerShown: false }}
              >
                {props => (
                  <React.Suspense
                    fallback={
                      <LoadingScreen message='Loading spot details...' />
                    }
                  >
                    <HikingSpotDetailsScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
              <Stack.Screen
                name='ActivityDetails'
                options={{ headerShown: false }}
              >
                {props => (
                  <React.Suspense
                    fallback={<LoadingScreen message='Loading activity...' />}
                  >
                    <ActivityDetailsScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
              <Stack.Screen name='Tracking' options={{ headerShown: false }}>
                {props => (
                  <React.Suspense
                    fallback={<LoadingScreen message='Loading tracker...' />}
                  >
                    <TrackingScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
              <Stack.Screen
                name='HikeHistory'
                options={{ headerShown: false }}
                initialParams={{ userId: null }}
              >
                {props => (
                  <React.Suspense
                    fallback={<LoadingScreen message='Loading history...' />}
                  >
                    <HikeHistoryScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
              <Stack.Screen
                name='SaveActivity'
                options={{ headerShown: false }}
              >
                {props => (
                  <React.Suspense
                    fallback={<LoadingScreen message='Saving activity...' />}
                  >
                    <SaveActivityScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
              <Stack.Screen name='MediaViewer' options={{ headerShown: false }}>
                {props => (
                  <React.Suspense
                    fallback={<LoadingScreen message='Loading media...' />}
                  >
                    <MediaViewerScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
              <Stack.Screen name='HikeDetail' options={{ headerShown: false }}>
                {props => (
                  <React.Suspense
                    fallback={
                      <LoadingScreen message='Loading hike details...' />
                    }
                  >
                    <HikeDetailScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
              <Stack.Screen
                name='ActivityComments'
                options={{ headerShown: false }}
              >
                {props => (
                  <React.Suspense
                    fallback={<LoadingScreen message='Loading comments...' />}
                  >
                    <ActivityCommentsScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
              <Stack.Screen
                name='SaveConfirmation'
                options={{ headerShown: false }}
              >
                {props => (
                  <React.Suspense
                    fallback={
                      <LoadingScreen message='Loading confirmation...' />
                    }
                  >
                    <SaveConfirmationScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
              <Stack.Screen
                name='InteractiveMap'
                options={{ headerShown: false }}
              >
                {props => (
                  <React.Suspense
                    fallback={<LoadingScreen message='Loading map...' />}
                  >
                    <InteractiveMapScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
              <Stack.Screen name='Track' options={{ headerShown: false }}>
                {() => (
                  <React.Suspense
                    fallback={<LoadingScreen message='Loading tracker...' />}
                  >
                    <TrackScreen />
                  </React.Suspense>
                )}
              </Stack.Screen>
              <Stack.Screen name='Favorites' options={{ headerShown: false }}>
                {props => (
                  <React.Suspense
                    fallback={<LoadingScreen message='Loading favorites...' />}
                  >
                    <FavoritesScreen {...props} />
                  </React.Suspense>
                )}
              </Stack.Screen>
            </>
          )
        ) : (
          <>
            <Stack.Screen name='Login' options={{ headerShown: false }}>
              {props => (
                <React.Suspense
                  fallback={<LoadingScreen message='Loading login...' />}
                >
                  <LoginScreen {...props} />
                </React.Suspense>
              )}
            </Stack.Screen>
            <Stack.Screen name='Register' options={{ headerShown: false }}>
              {props => (
                <React.Suspense
                  fallback={<LoadingScreen message='Loading registration...' />}
                >
                  <RegisterScreen {...props} />
                </React.Suspense>
              )}
            </Stack.Screen>
            <Stack.Screen
              name='EmailConfirmation'
              options={{ headerShown: false }}
            >
              {props => (
                <React.Suspense
                  fallback={<LoadingScreen message='Loading confirmation...' />}
                >
                  <EmailConfirmationScreen {...props} />
                </React.Suspense>
              )}
            </Stack.Screen>
            <Stack.Screen
              name='EmailConfirmationSuccess'
              options={{ headerShown: false }}
            >
              {props => (
                <React.Suspense
                  fallback={<LoadingScreen message='Loading success...' />}
                >
                  <EmailConfirmationSuccessScreen {...props} />
                </React.Suspense>
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AppWrapper(): React.JSX.Element {
  const { session, loading } = useAuth();

  return <AppContent session={session} loading={loading} />;
}

export default function App(): React.JSX.Element {
  return (
    <EnhancedErrorBoundary
      onError={(error, errorInfo) => {
        console.error('App Error Boundary:', error, errorInfo);
        performanceMonitor.recordInteraction(
          'app_error_boundary',
          Date.now() - Date.now(),
        );
      }}
    >
      <AuthProvider>
        <ProfileProvider>
          <AppWrapper />
        </ProfileProvider>
      </AuthProvider>
    </EnhancedErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
