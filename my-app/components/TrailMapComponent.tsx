import React, { useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface TrailRoute {
  id: number;
  name: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  duration: string;
  distance: string;
  description: string;
  highlights: string[];
}

interface TrailMapProps {
  title: string;
  location: string;
  icon: string;
  routes: TrailRoute[];
  onRouteSelect?: (route: TrailRoute) => void;
  selectedRoute?: TrailRoute;
}

const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'Easy':
      return '#4CAF50';
    case 'Moderate':
      return '#FF9800';
    case 'Hard':
      return '#F44336';
    default:
      return '#9E9E9E';
  }
};

const TrailMapComponent: React.FC<TrailMapProps> = memo(({
  title,
  location,
  icon,
  routes,
  onRouteSelect,
  selectedRoute,
}) => {
  const [currentRoute, setCurrentRoute] = useState(routes[0]);
  const [showDetails, setShowDetails] = useState(false);

  const generateMapHtml = (): string => {
    const routeElements = routes
      .map(
        (route, index) => `
        <div class="trail ${index === 0 ? 'selected' : ''}">
          <h3>🥾 ${route.name}</h3>
          <span class="difficulty ${route.difficulty.toLowerCase()}">${route.difficulty}</span>
          <p>${route.description}</p>
        </div>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
          .map-container { background: #e8f5e8; border-radius: 10px; padding: 20px; text-align: center; }
          .trail { margin: 10px 0; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .trail.selected { border: 2px solid #4CAF50; }
          .trail h3 { margin: 0 0 10px 0; color: #2E7D32; }
          .difficulty { padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; }
          .easy { background: #4CAF50; }
          .moderate { background: #FF9800; }
          .hard { background: #F44336; }
        </style>
      </head>
      <body>
        <div class="map-container">
          <h2>${icon} ${title}</h2>
          <p>📍 ${location}</p>
          ${routeElements}
        </div>
      </body>
      </html>
    `;
  };

  const handleRouteSelect = (route: TrailRoute) => {
    setCurrentRoute(route);
    onRouteSelect?.(route);
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: generateMapHtml() }}
        style={styles.webView}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => setShowDetails(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.detailsButtonText}>View Trail Details</Text>
        <Ionicons name="information-circle" size={20} color="white" />
      </TouchableOpacity>

      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Trail Information</Text>
            <TouchableOpacity
              onPress={() => setShowDetails(false)}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.routeCard}>
              <Text style={styles.routeName}>{currentRoute.name}</Text>
              
              <View style={styles.routeMetrics}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Difficulty</Text>
                  <View
                    style={[
                      styles.difficultyBadge,
                      { backgroundColor: getDifficultyColor(currentRoute.difficulty) },
                    ]}
                  >
                    <Text style={styles.difficultyText}>{currentRoute.difficulty}</Text>
                  </View>
                </View>
                
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Duration</Text>
                  <Text style={styles.metricValue}>{currentRoute.duration}</Text>
                </View>
                
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Distance</Text>
                  <Text style={styles.metricValue}>{currentRoute.distance}</Text>
                </View>
              </View>

              <Text style={styles.description}>{currentRoute.description}</Text>

              {currentRoute.highlights && currentRoute.highlights.length > 0 && (
                <View style={styles.highlightsSection}>
                  <Text style={styles.highlightsTitle}>Trail Highlights</Text>
                  {currentRoute.highlights.map((highlight, index) => (
                    <Text key={index} style={styles.highlightItem}>
                      • {highlight}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  webView: {
    flex: 1,
  },
  detailsButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  detailsButtonText: {
    color: 'white',
    marginRight: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  routeName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2E7D32',
  },
  routeMetrics: {
    marginBottom: 16,
  },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginBottom: 16,
  },
  highlightsSection: {
    marginTop: 8,
  },
  highlightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  highlightItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
});

TrailMapComponent.displayName = 'TrailMapComponent';

export default TrailMapComponent;