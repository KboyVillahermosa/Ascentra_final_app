import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatDuration, formatPace, formatDistance } from '../utils/formatters';

const HikeStats = ({ stats }) => {
  return (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{formatDistance(stats.distance)}</Text>
        <Text style={styles.statLabel}>Distance</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{formatDuration(stats.duration)}</Text>
        <Text style={styles.statLabel}>Duration</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{formatPace(stats.pace)}</Text>
        <Text style={styles.statLabel}>Pace</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.elevation.toFixed(0)}m</Text>
        <Text style={styles.statLabel}>Elevation</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
  }
});

export default HikeStats;