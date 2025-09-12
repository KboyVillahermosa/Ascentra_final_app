import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';

// Safe MapView component that only loads on native platforms
interface SafeMapViewProps {
  children?: React.ReactNode;
  style?: any;
  initialRegion?: any;
  region?: any;
  onRegionChange?: (region: any) => void;
  onRegionChangeComplete?: (region: any) => void;
  provider?: any;
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  [key: string]: any;
}

const SafeMapView: React.FC<SafeMapViewProps> = props => {
  // Only render MapView on native platforms
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webFallback, props.style]}>
        <Text style={styles.webText}>Map view not available on web</Text>
      </View>
    );
  }

  // Dynamically import MapView only on native platforms
  const MapView = React.useMemo(() => {
    try {
      return require('react-native-maps').default;
    } catch (error) {
      console.warn('react-native-maps not available:', error);
      return null;
    }
  }, []);

  if (!MapView) {
    return (
      <View style={[styles.fallback, props.style]}>
        <Text style={styles.fallbackText}>Map not available</Text>
      </View>
    );
  }

  return <MapView {...props} />;
};

// Safe Marker component
interface SafeMarkerProps {
  coordinate: any;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export const SafeMarker: React.FC<SafeMarkerProps> = props => {
  if (Platform.OS === 'web') {
    return null;
  }

  const Marker = React.useMemo(() => {
    try {
      return require('react-native-maps').Marker;
    } catch (error) {
      console.warn('react-native-maps Marker not available:', error);
      return null;
    }
  }, []);

  if (!Marker) {
    return null;
  }

  return <Marker {...props} />;
};

// Safe Polyline component
interface SafePolylineProps {
  coordinates: any[];
  strokeColor?: string;
  strokeWidth?: number;
  [key: string]: any;
}

export const SafePolyline: React.FC<SafePolylineProps> = props => {
  if (Platform.OS === 'web') {
    return null;
  }

  const Polyline = React.useMemo(() => {
    try {
      return require('react-native-maps').Polyline;
    } catch (error) {
      console.warn('react-native-maps Polyline not available:', error);
      return null;
    }
  }, []);

  if (!Polyline) {
    return null;
  }

  return <Polyline {...props} />;
};

// Export PROVIDER_GOOGLE safely
export const PROVIDER_GOOGLE =
  Platform.OS !== 'web'
    ? (() => {
        try {
          return require('react-native-maps').PROVIDER_GOOGLE;
        } catch (error) {
          console.warn('PROVIDER_GOOGLE not available:', error);
          return undefined;
        }
      })()
    : undefined;

const styles = StyleSheet.create({
  webFallback: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  webText: {
    color: '#666',
    fontSize: 16,
  },
  fallback: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  fallbackText: {
    color: '#666',
    fontSize: 16,
  },
});

export default SafeMapView;
