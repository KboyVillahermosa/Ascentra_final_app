import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { formatDuration, formatPace } from '../utils/formatters';

const HikeStats = ({ stats }) => {
  // Convert to kilometers for more readable display
  const distanceInKm = stats.distance / 1000;

  return (
    <View style={styles.container}>
      <View style={styles.statGroup}>
        <View style={[styles.statItem, styles.primaryStat]}>
          <View style={styles.statHeader}>
            <Ionicons name='speedometer-outline' size={20} color='#2E7D32' />
            <Text style={styles.statLabel}>DISTANCE</Text>
          </View>
          <View style={styles.distanceContainer}>
            <Text style={styles.primaryStatValue}>
              {distanceInKm < 10
                ? distanceInKm.toFixed(2)
                : distanceInKm < 100
                  ? distanceInKm.toFixed(1)
                  : Math.round(distanceInKm)}
            </Text>
            <Text style={styles.unitText}>km</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <Ionicons name='time-outline' size={20} color='#2E7D32' />
            <Text style={styles.statLabel}>DURATION</Text>
          </View>
          <Text style={styles.statValue}>{formatDuration(stats.duration)}</Text>
        </View>
      </View>

      <View style={styles.statGroup}>
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <MaterialIcons name='speed' size={20} color='#2E7D32' />
            <Text style={styles.statLabel}>PACE</Text>
          </View>
          <Text style={styles.statValue}>{formatPace(stats.pace)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <MaterialIcons name='terrain' size={20} color='#2E7D32' />
            <Text style={styles.statLabel}>ELEVATION</Text>
          </View>
          <Text style={styles.statValue}>{stats.elevation.toFixed(0)}m</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statGroup: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  primaryStat: {
    flex: 1.2, // Make distance take up more space
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#757575',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  primaryStatValue: {
    fontSize: 26, // Larger font for distance
    fontWeight: 'bold',
    color: '#2E7D32', // Forest green to emphasize
  },
  unitText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#2E7D32',
    marginLeft: 2,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E0E5E0',
    marginHorizontal: 10,
  },
});

export default HikeStats;
