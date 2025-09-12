import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Modal,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Trail route data for Budlaan Falls
const TRAIL_ROUTES = [
  // EASY DIFFICULTY
  {
    id: 'nature-walk',
    name: 'Nature Walk',
    difficulty: 'Easy',
    distance: '1.5 km',
    duration: '30–45 minutes',
    elevation: '+50m',
    description:
      'A short and gentle trail starting from Budlaan drop-off point leading directly to the falls with minimal elevation gain.',
    highlights: [
      'Scenic river crossing with small cascades',
      'Shaded forest path for a refreshing walk',
      'Quick access to Budlaan Falls',
    ],
    color: '#8BC34A',
  },
  // MODERATE TO CHALLENGING DIFFICULTY
  {
    id: 'riverside-trek',
    name: 'Riverside Trek',
    difficulty: 'Moderate to Challenging',
    distance: '3 km',
    duration: '1.5–2 hours',
    elevation: '+180m',
    description:
      'This trail follows the Budlaan River, involving multiple crossings, slippery rocks, and narrow paths before reaching the falls.',
    highlights: [
      'Adventurous river trekking experience',
      'Lush jungle surroundings with bird sounds',
      'Natural pools along the river to cool off',
    ],
    color: '#009688',
  },
  // HARD DIFFICULTY
  {
    id: 'adventure-trail',
    name: 'Adventure Trail',
    difficulty: 'Hard',
    distance: '4.2 km',
    duration: '3–4 hours',
    elevation: '+400m',
    description:
      'A demanding trail with steep inclines, boulders, and forested climbs leading to the top view before descending to Budlaan Falls.',
    highlights: [
      'Sweeping views of Cebu mountains',
      'Technical climbs and bouldering sections',
      'Rewarding descent to Budlaan Falls',
    ],
    color: '#FF9800',
  },
  // ADVANCED DIFFICULTY
  {
    id: 'peak-to-falls',
    name: 'Peak-to-Falls Traverse',
    difficulty: 'Advanced',
    distance: '6–7 km',
    duration: '5–6 hours',
    elevation: '+650m',
    description:
      'A challenging full-day hike starting from ridges near higher elevations, descending to Budlaan Falls through rugged forest terrain.',
    highlights: [
      'Panoramic ridge views overlooking Cebu City',
      'Remote and rugged path less traveled',
      'Epic finale at Budlaan Falls',
    ],
    color: '#F44336',
  },
];

const COLORS = {
  primary: '#388E3C',
  secondary: '#4CAF50',
  text: '#212121',
  textLight: '#616161',
  textMuted: '#9E9E9E',
  background: '#FFFFFF',
  card: '#F9F9F9',
  accent: '#FF6B35',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
};

// Global cache for HTML content to prevent re-creation
let cachedHTML = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const BudlaanFallsTrailMap = ({
  onRouteSelect,
  containerStyle,
  navigation,
}) => {
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [webViewOpacity, setWebViewOpacity] = useState(0);
  const [htmlContent, setHtmlContent] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedRouteDetails, setSelectedRouteDetails] = useState(null);
  const [showRouteModal, setShowRouteModal] = useState(false);

  // Animation values for smooth modal transitions
  // Removed modalOpacity and modalScale - no longer using animations
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const webViewRef = useRef(null);
  const fullscreenWebViewRef = useRef(null);
  const loadingTimeoutRef = useRef(null);
  const skeletonTimeoutRef = useRef(null);
  const preloadTimeoutRef = useRef(null);

  // Advanced preloading and performance optimization
  useEffect(() => {
    // Immediate loading without skeleton to prevent flickering
    setShowSkeleton(false);
    setWebViewOpacity(1);
    setIsPreloaded(true);
    setIsMapReady(true);
    setLoading(false);

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Ensure all timeouts are cleared on unmount
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (skeletonTimeoutRef.current) {
        clearTimeout(skeletonTimeoutRef.current);
      }
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, []);

  // Route selection handlers
  const handleRouteSelection = useCallback(
    route => {
      setSelectedRoute(route);
      setSelectedRouteDetails(route);

      if (onRouteSelect) {
        onRouteSelect(route);
      }

      // Send route selection message to both WebViews
      const message = JSON.stringify({
        type: 'selectRoute',
        routeId: route.id,
      });

      // Send to regular WebView
      if (webViewRef.current) {
        webViewRef.current.postMessage(message);
      }

      // Send to fullscreen WebView if it exists
      if (fullscreenWebViewRef.current) {
        fullscreenWebViewRef.current.postMessage(message);
      }
    },
    [onRouteSelect],
  );

  const clearRouteSelection = useCallback(() => {
    setSelectedRoute(null);

    // Clear route selection in both WebViews
    const message = JSON.stringify({
      type: 'clearRoute',
    });

    // Send to regular WebView
    if (webViewRef.current) {
      webViewRef.current.postMessage(message);
    }

    // Send to fullscreen WebView if it exists
    if (fullscreenWebViewRef.current) {
      fullscreenWebViewRef.current.postMessage(message);
    }
  }, []);

  const getDifficultyColor = useCallback(difficulty => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return '#4CAF50';
      case 'moderate':
        return '#FF9800';
      case 'hard':
        return '#F44336';
      case 'expert':
        return '#9C27B0';
      default:
        return '#757575';
    }
  }, []);

  // Optimized Leaflet + OpenStreetMap HTML with aggressive caching
  const trailforksHTML = useMemo(
    () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
      <meta http-equiv="Cache-Control" content="max-age=31536000">
      <link rel="preload" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
      <link rel="preload" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" as="script">
      <link rel="dns-prefetch" href="//unpkg.com">
      <link rel="dns-prefetch" href="//tile.openstreetmap.org">
      <noscript><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"></noscript>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
        }
        
        .container {
          width: 100%;
          height: 100vh;
          position: relative;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          will-change: auto;
        }
        
        
        #map {
          width: 100%;
          height: 100vh;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          will-change: auto;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
          -webkit-user-select: none;
          -moz-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        

      </style>
    </head>
    <body>
      <div class="container">
        <div id="map"></div>

      </div>
      
      <script>
        // Preload Leaflet library
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = function() {
          initializeMap();
        };
        document.head.appendChild(script);
        
        function initializeMap() {
// Initialize map
const map = L.map('map', {
  zoomControl: true
});

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Center map on Budlaan Falls area
const budlaanCenter = [10.377, 123.886]; // approximate center
map.setView(budlaanCenter, 14);

// Budlaan Falls Routes
const routes = {
  'nature-walk': {
    name: 'Nature Walk',
    distance: '1.5 km',
    elevation: '+50m',
    difficulty: 'Easy',
    color: '#2196F3',
    start: [10.3857, 123.8802], // Budlaan Drop-off
    end: [10.372925, 123.891063], // Budlaan Falls
    path: [
      [10.3857, 123.8802],
      [10.3830, 123.8820],
      [10.3800, 123.8850],
      [10.3780, 123.8875],
      [10.372925, 123.891063]
    ]
  },
  'riverside-trek': {
    name: 'Riverside Trek',
    distance: '3 km',
    elevation: '+180m',
    difficulty: 'Moderate to Challenging',
    color: '#4CAF50',
    start: [10.3857, 123.8802],
    end: [10.372925, 123.891063],
    path: [
      [10.3857, 123.8802],
      [10.3840, 123.8815],
      [10.3820, 123.8840],
      [10.3790, 123.8865],
      [10.3760, 123.8890],
      [10.372925, 123.891063]
    ]
  },
  'adventure-trail': {
    name: 'Adventure Trail',
    distance: '4.2 km',
    elevation: '+400m',
    difficulty: 'Hard',
    color: '#FF9800',
    start: [10.3857, 123.8802],
    end: [10.372925, 123.891063],
    path: [
      [10.3857, 123.8802],
      [10.3845, 123.8825],
      [10.3830, 123.8855],
      [10.3810, 123.8875],
      [10.3785, 123.8895],
      [10.3750, 123.8905],
      [10.372925, 123.891063]
    ]
  },
  'peak-falls-traverse': {
    name: 'Peak-to-Falls Traverse',
    distance: '6.5 km',
    elevation: '+650m / -650m',
    difficulty: 'Advanced',
    color: '#E91E63',
    start: [10.403568, 123.867799], // Sirao Peak
    end: [10.372925, 123.891063],
    path: [
      [10.403568, 123.867799],
      [10.4000, 123.8700],
      [10.3970, 123.8750],
      [10.3920, 123.8800],
      [10.3870, 123.8850],
      [10.3820, 123.8880],
      [10.372925, 123.891063]
    ]
  }
};

         
         // Variables for current route display
         let currentPolyline = null;
         let startMarker = null;
         let endMarker = null;
         let currentRoute = null;
         
         // Custom icons for start and end points
         const startIcon = L.divIcon({
           className: 'custom-marker start-marker',
           html: '<div style="background-color: #4CAF50; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
           iconSize: [16, 16],
           iconAnchor: [8, 8]
         });
         
         const endIcon = L.divIcon({
           className: 'custom-marker end-marker',
           html: '<div style="background-color: #F44336; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
           iconSize: [16, 16],
           iconAnchor: [8, 8]
         });
         
         function selectRoute(routeId) {
           const route = routes[routeId];
           if (!route) return;
           
           // Clear previous route
           if (currentPolyline) {
             map.removeLayer(currentPolyline);
           }
           if (startMarker) {
             map.removeLayer(startMarker);
           }
           if (endMarker) {
             map.removeLayer(endMarker);
           }
           
           // Add new route
           currentPolyline = L.polyline(route.path, {
             color: route.color,
             weight: 4,
             opacity: 0.8
           }).addTo(map);
           
           // Add start and end markers
           startMarker = L.marker(route.start, { icon: startIcon }).addTo(map);
           endMarker = L.marker(route.end, { icon: endIcon }).addTo(map);
           
           // Fit map to route bounds
           const group = new L.featureGroup([currentPolyline, startMarker, endMarker]);
           map.fitBounds(group.getBounds(), { padding: [20, 20] });
           
           // Update UI
           document.querySelectorAll('.route-option').forEach(option => {
             option.classList.remove('active');
           });
           document.querySelector('[data-route="' + routeId + '"]').classList.add('active');
           

           currentRoute = route;
           
           // Send route data to React Native
           if (window.ReactNativeWebView) {
             window.ReactNativeWebView.postMessage(JSON.stringify({
               type: 'routeSelected',
               routeId: routeId
             }));
           }
         }
         
         // Route selector event listeners
         document.querySelectorAll('.route-option').forEach(option => {
           option.addEventListener('click', () => {
             const routeId = option.getAttribute('data-route');
             selectRoute(routeId);
           });
         });
         
         // Function to clear all routes from map
         function clearAllRoutes() {
           // Clear all route layers
           Object.keys(routes).forEach(routeId => {
             if (window.routeLayers && window.routeLayers[routeId]) {
               map.removeLayer(window.routeLayers[routeId]);
             }
             if (window.routeMarkers && window.routeMarkers[routeId]) {
               window.routeMarkers[routeId].forEach(marker => map.removeLayer(marker));
             }
           });
           
           // Clear UI selection
           document.querySelectorAll('.route-option').forEach(option => {
             option.classList.remove('selected');
           });
           
           // Reset map view to default
           map.setView([10.3157, 123.9054], 14);
         }
         
         // Handle messages from React Native
         document.addEventListener('message', function(event) {
           try {
             const data = JSON.parse(event.data);
             if (data.type === 'selectRoute' && data.routeId) {
               selectRoute(data.routeId);
             } else if (data.type === 'clearRoute') {
               clearAllRoutes();
             }
           } catch (e) {
          // Message parsing error - silently ignore
        }
         });
         
         // Also listen for window messages as fallback
         window.addEventListener('message', function(event) {
           try {
             const data = JSON.parse(event.data);
             if (data.type === 'selectRoute' && data.routeId) {
               selectRoute(data.routeId);
             } else if (data.type === 'clearRoute') {
               clearAllRoutes();
             }
           } catch (e) {
          // Window message parsing error - silently ignore
        }
         });
         
         // Initialize map without auto-selecting route
         let mapInitialized = false;
         
         map.whenReady(() => {
           if (!mapInitialized) {
             mapInitialized = true;
             // Don't auto-select route - wait for React Native to send selection
           }
         });
         
         // Signal that map is ready
         window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
           type: 'mapReady'
         }));
       } // End of initializeMap function
       </script>
     </body>
    </html>
  `,
    [],
  );

  // Functions referenced in the HTML template literal
  const handleLegendRouteClick = useCallback(
    routeId => {
      const route = TRAIL_ROUTES.find(r => r.id === routeId);
      if (route) {
        setSelectedRouteDetails(route);
        setShowRouteModal(true);
        if (onRouteSelect) {
          onRouteSelect(route);
        }
      }
    },
    [onRouteSelect],
  );

  const selectRoute = useCallback(routeId => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'selectRoute',
          routeId: routeId,
        }),
      );
    }
  }, []);

  const clearCurrentRoute = useCallback(() => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'clearRoute',
        }),
      );
    }
  }, []);

  const handleWebViewMessage = useCallback(
    event => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.type === 'mapReady') {
          // Map is fully loaded and ready - ensure smooth transition
          setIsMapReady(true);
          setLoading(false);
          setIsPreloaded(true);

          // Clear any pending loading timeouts
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
        } else if (data.type === 'domReady') {
          // DOM is ready but map might still be initializing
          // Don't change loading states here to prevent flickering
        } else if (data.type === 'routeSelected') {
          // Handle route selection from HTML
          const route = TRAIL_ROUTES.find(r => r.id === data.routeId);
          if (route) {
            setSelectedRouteDetails(route);
            setShowRouteModal(true);
            if (onRouteSelect) {
              onRouteSelect(route);
            }
          }
        }
      } catch (error) {
        // Error parsing WebView message - silently ignore
      }
    },
    [onRouteSelect],
  );

  // Intelligent HTML caching to prevent re-creation and improve loading
  const memoizedHTML = useMemo(() => {
    const now = Date.now();

    // Use cached HTML if available and not expired
    if (cachedHTML && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION) {
      return cachedHTML;
    }

    // Create new HTML and cache it
    cachedHTML = trailforksHTML;
    cacheTimestamp = now;

    return cachedHTML;
  }, []);

  // Preload HTML content on component mount
  useEffect(() => {
    // Always ensure HTML content is available
    setHtmlContent(memoizedHTML);
  }, [memoizedHTML]);

  // Advanced fullscreen toggle with debouncing and state stability
  const handleFullscreenToggle = useCallback(
    fullscreen => {
      // Prevent rapid state changes that cause flickering
      if (isFullscreen === fullscreen) {
        return;
      }

      // Clear any existing debounce timer
      if (handleFullscreenToggle.debounceTimer) {
        clearTimeout(handleFullscreenToggle.debounceTimer);
      }

      // Immediate state change to prevent loops
      if (fullscreen) {
        setIsFullscreen(true);
        // Fade out main container
        Animated.timing(containerOpacity, {
          toValue: 0.3,
          duration: 100,
          useNativeDriver: true,
        }).start();
      } else {
        setIsFullscreen(false);
        // Fade main container back in
        Animated.timing(containerOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }
    },
    [containerOpacity],
  );

  // Prevent unnecessary re-renders with optimized WebView props
  const webViewProps = useMemo(
    () => ({
      javaScriptEnabled: true,
      domStorageEnabled: true,
      startInLoadingState: false,
      scalesPageToFit: true,
      scrollEnabled: true,
      bounces: false,
      showsHorizontalScrollIndicator: false,
      showsVerticalScrollIndicator: false,
      mixedContentMode: 'compatibility',
      allowsInlineMediaPlayback: true,
      mediaPlaybackRequiresUserAction: false,
      overScrollMode: 'never',
      cacheEnabled: true, // Enable aggressive caching
      incognito: false,
      thirdPartyCookiesEnabled: true, // Allow for better caching
      sharedCookiesEnabled: true, // Enable shared cookies for caching
      androidHardwareAccelerationDisabled: false,
      androidLayerType: 'hardware',
      renderToHardwareTextureAndroid: true,
      nestedScrollEnabled: false,
      setSupportMultipleWindows: false,
      allowsBackForwardNavigationGestures: false,
      allowsLinkPreview: false,
      decelerationRate: 0.998,
      minimumZoomScale: 0.5,
      maximumZoomScale: 3.0,
      zoomEnabled: true,
      // Instant loading handlers - no delays
      onLoadStart: () => {
        // Don't show loading state for instant perception
        setLoading(false);
        setIsMapReady(true);
      },
      onLoadEnd: () => {
        // Ensure everything is ready instantly
        setLoading(false);
        setIsMapReady(true);
      },
      onError: () => {
        setLoading(false);
        setIsMapReady(true); // Show content even on error
      },
      onHttpError: () => {
        setLoading(false);
        setIsMapReady(true); // Show content even on HTTP error
      },
      onMessage: handleWebViewMessage,
      // Optimized injected JavaScript for instant loading
      injectedJavaScript: `
      // Immediate visibility and performance optimization
      (function() {
        // Set immediate visibility
        document.documentElement.style.visibility = 'visible';
        document.body.style.visibility = 'visible';
        document.documentElement.style.opacity = '1';
        document.body.style.opacity = '1';
        
        // Performance optimizations
        document.documentElement.style.webkitBackfaceVisibility = 'hidden';
        document.body.style.webkitBackfaceVisibility = 'hidden';
        document.documentElement.style.webkitTransform = 'translate3d(0,0,0)';
        document.body.style.webkitTransform = 'translate3d(0,0,0)';
        
        // Preload critical resources
        const preloadScript = document.createElement('link');
        preloadScript.rel = 'prefetch';
        preloadScript.href = 'https://tile.openstreetmap.org/1/0/0.png';
        document.head.appendChild(preloadScript);
        
        // Signal ready state immediately
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'domReady',
            timestamp: Date.now()
          }));
        }
      })();
      true;
    `,
    }),
    [handleWebViewMessage],
  );

  // Route Selector Component
  const RouteSelector = () => {
    return (
      <View style={styles.routeSelector}>
        <Text style={styles.routeSelectorTitle}>Trail Routes</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.routeList}
          contentContainerStyle={{ paddingHorizontal: 12 }}
        >
          {TRAIL_ROUTES.map(route => {
            return (
              <TouchableOpacity
                key={route.id}
                style={[
                  styles.routeCard,
                  selectedRoute?.id === route.id && {
                    borderColor: route.color,
                    borderWidth: 2,
                    backgroundColor: `${route.color}15`,
                  },
                ]}
                onPress={() => {
                  handleRouteSelection(route);
                }}
              >
                <View
                  style={[
                    styles.routeColorIndicator,
                    { backgroundColor: route.color },
                  ]}
                />
                <Text style={styles.routeName}>{route.name}</Text>
                <Text
                  style={[
                    styles.routeDifficulty,
                    { color: getDifficultyColor(route.difficulty) },
                  ]}
                >
                  {route.difficulty}
                </Text>
                <Text style={styles.routeDistance}>{route.distance}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {selectedRoute && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearRouteSelection}
          >
            <Text style={styles.clearButtonText}>Clear Selection</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const FullscreenModal = () => {
    const [fullscreenWebViewReady, setFullscreenWebViewReady] = useState(false);
    const [fullscreenInitialized, setFullscreenInitialized] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [webViewOpacityFS, setWebViewOpacityFS] = useState(0);
    const initTimeoutRef = useRef(null);
    const readyTimeoutRef = useRef(null);
    const modalTransitionRef = useRef(null);

    // Advanced modal state management with smooth animations
    useEffect(() => {
      if (isFullscreen) {
        // Clear any existing timeouts
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
        }
        if (readyTimeoutRef.current) {
          clearTimeout(readyTimeoutRef.current);
        }
        if (modalTransitionRef.current) {
          clearTimeout(modalTransitionRef.current);
        }

        // Instant fullscreen setup - no loading states
        setModalVisible(true);
        setFullscreenInitialized(true);
        setFullscreenWebViewReady(true); // Instant ready state
        setWebViewOpacityFS(1); // Full opacity immediately

        // No animations - instant display
      } else {
        // Simple exit - no complex animations
        setModalVisible(false);
        setFullscreenWebViewReady(false);
        setFullscreenInitialized(false);
        setWebViewOpacityFS(0);

        // Clear timeouts
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
        }
        if (readyTimeoutRef.current) {
          clearTimeout(readyTimeoutRef.current);
        }
      }

      // Cleanup on unmount
      return () => {
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
        }
        if (readyTimeoutRef.current) {
          clearTimeout(readyTimeoutRef.current);
        }
        if (modalTransitionRef.current) {
          clearTimeout(modalTransitionRef.current);
        }
      };
    }, [isFullscreen]);

    return (
      <Modal
        visible={modalVisible}
        animationType='none'
        transparent={false}
        onRequestClose={() => handleFullscreenToggle(false)}
        supportedOrientations={['portrait', 'landscape']}
        statusBarTranslucent
        hardwareAccelerated={true}
        presentationStyle='fullScreen'
        onShow={() => {
          // Simple modal show - no complex state changes
        }}
      >
        <View style={styles.fullscreenContainer}>
          <View style={styles.fullscreenHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                if (navigation) {
                  navigation.goBack();
                } else {
                  handleFullscreenToggle(false);
                }
              }}
            >
              <Ionicons name='close' size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.fullscreenTitle}>Map</Text>
            <View style={styles.placeholder} />
          </View>

          {/* No loading overlay for instant fullscreen */}

          {/* Isolated WebView for fullscreen - only render when initialized */}
          {fullscreenInitialized && (
            <WebView
              ref={fullscreenWebViewRef}
              key={`fullscreen-${Date.now()}`} // Force new instance
              source={{ html: memoizedHTML }}
              style={[
                styles.fullscreenWebView,
                {
                  opacity: webViewOpacityFS,
                  backgroundColor: COLORS.background,
                  flex: 0,
                  height: screenHeight - 200, // Leave space for header and route selector
                },
              ]}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={false}
              scalesPageToFit={true}
              scrollEnabled={true}
              bounces={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              mixedContentMode='compatibility'
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              overScrollMode='never'
              cacheEnabled={true}
              incognito={false}
              androidHardwareAccelerationDisabled={false}
              androidLayerType='hardware'
              renderToHardwareTextureAndroid={true}
              nestedScrollEnabled={true}
              setSupportMultipleWindows={false}
              allowsBackForwardNavigationGestures={false}
              allowsLinkPreview={false}
              decelerationRate={0.998}
              minimumZoomScale={0.5}
              maximumZoomScale={3.0}
              zoomEnabled={true}
              shouldRasterizeIOS={true}
              onLoadStart={() => {
                // No state changes to prevent flickering
              }}
              onLoadEnd={() => {
                // Keep ready state - no changes needed
                // Force garbage collection hint
                if (global.gc) {
                  global.gc();
                }

                // Sync the currently selected route to fullscreen WebView
                if (selectedRoute && fullscreenWebViewRef.current) {
                  const message = JSON.stringify({
                    type: 'selectRoute',
                    routeId: selectedRoute.id,
                  });

                  // Longer delay to ensure WebView map is fully initialized
                  setTimeout(() => {
                    if (fullscreenWebViewRef.current) {
                      fullscreenWebViewRef.current.postMessage(message);
                    }
                  }, 500);
                }
              }}
              onError={error => {
                // Keep ready state - no changes to prevent flickering
              }}
              onHttpError={error => {
                // Keep ready state - no changes to prevent flickering
              }}
              onMemoryWarning={() => {
                // Handle memory warnings by clearing caches
                if (fullscreenWebViewRef.current) {
                  fullscreenWebViewRef.current.injectJavaScript(`
                    // Clear any cached data
                    if (window.map) {
                      window.map.invalidateSize();
                    }
                    // Force garbage collection in WebView
                    if (window.gc) {
                      window.gc();
                    }
                    true;
                  `);
                }
              }}
              injectedJavaScript={`
                // Simple optimization for immediate visibility
                (function() {
                  document.documentElement.style.visibility = 'visible';
                  document.body.style.visibility = 'visible';
                  
                  // Ensure map container is visible
                  const mapContainer = document.getElementById('map');
                  if (mapContainer) {
                    mapContainer.style.visibility = 'visible';
                  }
                  
                  // Signal readiness
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'fullscreenReady',
                      timestamp: Date.now()
                    }));
                  }
                   
                 })();
                 true;
               `}
              onMessage={handleWebViewMessage}
            />
          )}

          {/* Route Selector in Fullscreen */}
          <RouteSelector />
        </View>
      </Modal>
    );
  };

  return (
    <View>
      {/* Separate Title Section */}
      <View style={styles.titleSection}>
        <View style={styles.titlePlaceholder} />
        <TouchableOpacity
          style={styles.fullscreenButton}
          onPress={() => handleFullscreenToggle(true)}
        >
          <MaterialIcons name='fullscreen' size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Map Container */}
      <Animated.View
        style={[
          styles.container,
          containerStyle,
          { opacity: containerOpacity },
        ]}
      >
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: memoizedHTML }}
            style={[styles.webView, { opacity: webViewOpacity }]}
            onLoadStart={() => {
              // Prevent unnecessary re-renders during fullscreen mode
              if (isFullscreen) {
                return;
              }

              // Reset opacity for smooth loading
              if (!isMapReady) {
                setWebViewOpacity(0);
              }
            }}
            onLoadEnd={() => {
              // Skip processing if in fullscreen mode to prevent interference
              if (isFullscreen) {
                return;
              }

              // Clear any pending timeouts
              if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
              }

              // Smooth transition to visible state with stable rendering
              requestAnimationFrame(() => {
                setWebViewOpacity(1);
                setLoading(false);

                // Hide skeleton after WebView is fully loaded
                setTimeout(() => {
                  setShowSkeleton(false);
                  setIsMapReady(true);
                }, 150); // Optimized timing
              });
            }}
            onError={syntheticEvent => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView error: ', nativeEvent);

              // Clear any pending timeouts
              if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
              }
              setLoading(false);
            }}
            onHttpError={syntheticEvent => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView HTTP error: ', nativeEvent);

              // Clear any pending timeouts
              if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
              }
              setLoading(false);
            }}
            {...webViewProps}
          />

          {/* Skeleton Screen */}
          {showSkeleton && (
            <View style={styles.skeletonOverlay}>
              <View style={styles.skeletonHeader}>
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonButton} />
              </View>
              <View style={styles.skeletonMap}>
                <View style={styles.skeletonMapContent}>
                  <ActivityIndicator size='large' color={COLORS.primary} />
                  <Text style={styles.skeletonText}>
                    Loading Interactive Map...
                  </Text>
                </View>
              </View>
              <View style={styles.skeletonRoutes}>
                {[1, 2, 3].map(item => (
                  <View key={item} style={styles.skeletonRoute} />
                ))}
              </View>
            </View>
          )}

          {/* Fallback loading indicator */}
          {loading && !showSkeleton && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size='small' color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading map...</Text>
            </View>
          )}
        </View>

        {/* Route Selector */}
        <RouteSelector />
      </Animated.View>

      <FullscreenModal />
    </View>
  );
};

const styles = StyleSheet.create({
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  titlePlaceholder: {
    flex: 1,
  },
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  fullscreenButton: {
    padding: 4,
  },
  mapContainer: {
    height: 250,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    opacity: 0.8,
  },
  detailsButton: {
    position: 'absolute',
    bottom: 70,
    right: 12,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  detailsButtonText: {
    fontSize: 12,
    color: COLORS.background,
    fontWeight: '500',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    // Anti-flicker optimizations
    overflow: 'hidden',
    // Prevent layout shifts
    position: 'relative',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 0,
    shadowOpacity: 0,
    // Stable header positioning
    zIndex: 10,
  },
  closeButton: {
    padding: 4,
  },
  fullscreenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  placeholder: {
    width: 32,
  },
  fullscreenWebView: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
    opacity: 1,
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 0,
    margin: 0,
    padding: 0,
    // Prevent layout shifts during transitions
    position: 'relative',
    // Optimize for smooth scrolling
    scrollEventThrottle: 16,
  },
  fullscreenLoadingOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 10,
  },
  fullscreenLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
  },

  // Skeleton Screen Styles
  skeletonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    zIndex: 999,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  skeletonTitle: {
    width: 150,
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonButton: {
    width: 24,
    height: 24,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
  },
  skeletonMap: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonMapContent: {
    alignItems: 'center',
    gap: 12,
  },
  skeletonText: {
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  skeletonRoutes: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: COLORS.background,
  },
  skeletonRoute: {
    width: 120,
    height: 80,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
  },
  routeSelector: {
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  routeSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  routeList: {
    paddingVertical: 4,
  },
  routeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    width: 140,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  routeColorIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginBottom: 6,
  },
  routeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  routeDifficulty: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  routeDistance: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '500',
  },
  clearButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'center',
    marginTop: 8,
  },
  clearButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default BudlaanFallsTrailMap;
