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
    duration: '4-5 hours',
    distance: '6 km',
    description:
      'The main hiking trail to Mount Manunggal summit with moderate difficulty.',
    highlights: [
      'Historical significance',
      'Panoramic views',
      'Cool mountain air',
    ],
  },
  {
    id: 2,
    name: 'Heritage Trail',
    difficulty: 'Easy',
    duration: '2-3 hours',
    distance: '3 km',
    description:
      'Educational trail focusing on the historical importance of Mount Manunggal.',
    highlights: ['Monument site', 'Historical markers', 'Educational stops'],
  },
];

const MountManunggalTrailMap = () => {
  const [selectedRoute, setSelectedRoute] = useState(routes[0]);
  const [showDetails, setShowDetails] = useState(false);

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        .map-container { background: #f0f8ff; border-radius: 10px; padding: 20px; text-align: center; }
        .trail { margin: 10px 0; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .trail.selected { border: 2px solid #2196F3; }
        .trail h3 { margin: 0 0 10px 0; color: #1976D2; }
        .difficulty { padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; }
        .easy { background: #4CAF50; }
        .moderate { background: #FF9800; }
      </style>
    </head>
    <body>
      <div class="map-container">
        <h2>⛰️ Mount Manunggal Trail Map</h2>
        <p>📍 Balamban, Cebu</p>
        
        <div class="trail ${selectedRoute.id === 1 ? 'selected' : ''}">
          <h3>🥾 Main Trail</h3>
          <span class="difficulty moderate">Moderate</span>
          <p>Summit trail with historical significance</p>
        </div>
        
        <div class="trail ${selectedRoute.id === 2 ? 'selected' : ''}">
          <h3>🏛️ Heritage Trail</h3>
          <span class="difficulty easy">Easy</span>
          <p>Educational trail to monument site</p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px;">
          <h4>📚 Historical Note</h4>
          <p>• Site of President Magsaysay's plane crash</p>
          <p>• National historical landmark</p>
          <p>• Memorial monument at summit</p>
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
    backgroundColor: '#2196F3',
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
    backgroundColor: '#FF9800',
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

export default MountManunggalTrailMap;
