import React, { useState } from 'react';
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

const routes = [
  {
    id: 1,
    name: 'Main Trail',
    difficulty: 'Easy',
    duration: '2-3 hours',
    distance: '3.5 km',
    description:
      'The main trail to Kawasan Falls with well-maintained paths and clear signage.',
    highlights: ['Turquoise pools', 'Waterfall swimming', 'Bamboo rafting'],
  },
  {
    id: 2,
    name: 'Canyoneering Route',
    difficulty: 'Hard',
    duration: '4-6 hours',
    distance: '8 km',
    description:
      'Adventure route involving cliff jumping, swimming, and rappelling.',
    highlights: ['Cliff jumping', 'Natural slides', 'Cave exploration'],
  },
];

const KawasanFallsTrailMap = () => {
  const [selectedRoute, setSelectedRoute] = useState(routes[0]);
  const [showDetails, setShowDetails] = useState(false);

  const mapHtml = `
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
        .hard { background: #F44336; }
      </style>
    </head>
    <body>
      <div class="map-container">
        <h2>🏞️ Kawasan Falls Trail Map</h2>
        <p>📍 Badian, Cebu</p>
        
        <div class="trail ${selectedRoute.id === 1 ? 'selected' : ''}">
          <h3>🥾 Main Trail</h3>
          <span class="difficulty easy">Easy</span>
          <p>Well-maintained path to the falls</p>
        </div>
        
        <div class="trail ${selectedRoute.id === 2 ? 'selected' : ''}">
          <h3>🧗 Canyoneering Route</h3>
          <span class="difficulty hard">Hard</span>
          <p>Adventure route with cliff jumping</p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px;">
          <h4>💡 Tips</h4>
          <p>• Bring waterproof bags</p>
          <p>• Wear appropriate footwear</p>
          <p>• Start early to avoid crowds</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: mapHtml }}
        style={styles.webview}
        scrollEnabled={false}
      />

      <View style={styles.routeSelector}>
        {routes.map(route => (
          <TouchableOpacity
            key={route.id}
            style={[
              styles.routeButton,
              selectedRoute.id === route.id && styles.selectedRoute,
            ]}
            onPress={() => setSelectedRoute(route)}
          >
            <Text
              style={[
                styles.routeText,
                selectedRoute.id === route.id && styles.selectedRouteText,
              ]}
            >
              {route.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => setShowDetails(true)}
      >
        <Ionicons name='information-circle' size={20} color='white' />
        <Text style={styles.detailsButtonText}>Route Details</Text>
      </TouchableOpacity>

      <Modal
        visible={showDetails}
        animationType='slide'
        presentationStyle='pageSheet'
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedRoute.name}</Text>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Ionicons name='close' size={24} color='#333' />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.routeInfo}>
              <Text style={styles.infoLabel}>Difficulty:</Text>
              <Text style={styles.infoValue}>{selectedRoute.difficulty}</Text>
            </View>

            <View style={styles.routeInfo}>
              <Text style={styles.infoLabel}>Duration:</Text>
              <Text style={styles.infoValue}>{selectedRoute.duration}</Text>
            </View>

            <View style={styles.routeInfo}>
              <Text style={styles.infoLabel}>Distance:</Text>
              <Text style={styles.infoValue}>{selectedRoute.distance}</Text>
            </View>

            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.description}>{selectedRoute.description}</Text>

            <Text style={styles.highlightsTitle}>Highlights</Text>
            {selectedRoute.highlights.map((highlight, index) => (
              <Text key={index} style={styles.highlight}>
                • {highlight}
              </Text>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  routeSelector: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  routeButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedRoute: {
    backgroundColor: '#4CAF50',
  },
  routeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedRouteText: {
    color: 'white',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  detailsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  routeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  highlightsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  highlight: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
});

export default KawasanFallsTrailMap;
