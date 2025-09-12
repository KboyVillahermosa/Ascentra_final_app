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
    difficulty: 'Moderate',
    duration: '2-3 hours',
    distance: '3 km',
    description:
      'Moderate trail to Lantoy Falls with beautiful cascading water and natural pools.',
    highlights: ['Cascading falls', 'Natural pools', 'Forest trail'],
  },
];

const LantoyFallsTrailMap = ({ onRouteSelect, selectedRoute }) => {
  const [currentRoute, setCurrentRoute] = useState(routes[0]);
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
        .moderate { background: #FF9800; }
      </style>
    </head>
    <body>
      <div class="map-container">
        <h2>🏞️ Lantoy Falls Trail Map</h2>
        <p>📍 Cebu</p>
        
        <div class="trail selected">
          <h3>🥾 Main Trail</h3>
          <span class="difficulty moderate">Moderate</span>
          <p>Trail to cascading waterfall</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: mapHtml }}
        style={styles.webView}
        scrollEnabled={false}
      />

      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => setShowDetails(true)}
      >
        <Text style={styles.detailsButtonText}>View Trail Details</Text>
        <Ionicons name='information-circle' size={20} color='white' />
      </TouchableOpacity>

      <Modal visible={showDetails} animationType='slide'>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Trail Information</Text>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Ionicons name='close' size={24} color='#333' />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.routeName}>{currentRoute.name}</Text>
            <Text style={styles.routeInfo}>
              Difficulty: {currentRoute.difficulty}
            </Text>
            <Text style={styles.routeInfo}>
              Duration: {currentRoute.duration}
            </Text>
            <Text style={styles.routeInfo}>
              Distance: {currentRoute.distance}
            </Text>
            <Text style={styles.description}>{currentRoute.description}</Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

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
    padding: 8,
    borderRadius: 20,
  },
  detailsButtonText: {
    color: 'white',
    marginRight: 5,
    fontSize: 12,
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  routeName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  routeInfo: {
    fontSize: 16,
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
});

export default LantoyFallsTrailMap;
