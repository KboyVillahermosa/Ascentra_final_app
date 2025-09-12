import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../services/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useProgression from '../hooks/useProgression';

const { width } = Dimensions.get('window');

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  unit: string;
  category: 'distance' | 'hikes' | 'elevation' | 'time' | 'special';
  color: string[];
  isUnlocked: boolean;
  progress: number;
  unlockedAt?: string;
}

interface UserStats {
  totalDistance: number;
  totalHikes: number;
  totalElevation: number;
  totalTime: number;
  longestHike: number;
  highestElevation: number;
}

interface AchievementsComponentProps {
  userId: string;
}

export default function AchievementsComponent({
  userId,
}: AchievementsComponentProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalDistance: 0,
    totalHikes: 0,
    totalElevation: 0,
    totalTime: 0,
    longestHike: 0,
    highestElevation: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Use progression hook for enhanced stats
  const progressionHook = useProgression();
  const progressionStats = progressionHook.userStats;
  const progressionLoading = progressionHook.loading;
  const fetchProgressionStats = progressionHook.fetchUserStats;

  // Define achievement milestones
  const achievementTemplates: Omit<
    Achievement,
    'isUnlocked' | 'progress' | 'unlockedAt'
  >[] = [
    // Distance Achievements
    {
      id: 'first_km',
      title: 'First Steps',
      description: 'Complete your first kilometer',
      icon: 'footsteps',
      requirement: 1,
      unit: 'km',
      category: 'distance',
      color: ['#4CAF50', '#8BC34A'],
    },
    {
      id: 'explorer',
      title: 'Explorer',
      description: 'Hike 10 kilometers',
      icon: 'compass',
      requirement: 10,
      unit: 'km',
      category: 'distance',
      color: ['#2196F3', '#03DAC6'],
    },
    {
      id: 'adventurer',
      title: 'Adventurer',
      description: 'Hike 50 kilometers',
      icon: 'map',
      requirement: 50,
      unit: 'km',
      category: 'distance',
      color: ['#FF9800', '#FFC107'],
    },
    {
      id: 'trailblazer',
      title: 'Trailblazer',
      description: 'Hike 100 kilometers',
      icon: 'trail-sign',
      requirement: 100,
      unit: 'km',
      category: 'distance',
      color: ['#9C27B0', '#E91E63'],
    },
    {
      id: 'mountain_master',
      title: 'Mountain Master',
      description: 'Hike 250 kilometers',
      icon: 'mountain',
      requirement: 250,
      unit: 'km',
      category: 'distance',
      color: ['#FF5722', '#F44336'],
    },
    {
      id: 'legend',
      title: 'Hiking Legend',
      description: 'Hike 500 kilometers',
      icon: 'trophy',
      requirement: 500,
      unit: 'km',
      category: 'distance',
      color: ['#FFD700', '#FFA000'],
    },

    // Hike Count Achievements
    {
      id: 'first_hike',
      title: 'First Adventure',
      description: 'Complete your first hike',
      icon: 'flag',
      requirement: 1,
      unit: 'hikes',
      category: 'hikes',
      color: ['#4CAF50', '#8BC34A'],
    },
    {
      id: 'regular_hiker',
      title: 'Regular Hiker',
      description: 'Complete 10 hikes',
      icon: 'calendar',
      requirement: 10,
      unit: 'hikes',
      category: 'hikes',
      color: ['#2196F3', '#03DAC6'],
    },
    {
      id: 'dedicated_hiker',
      title: 'Dedicated Hiker',
      description: 'Complete 25 hikes',
      icon: 'medal',
      requirement: 25,
      unit: 'hikes',
      category: 'hikes',
      color: ['#FF9800', '#FFC107'],
    },
    {
      id: 'hiking_enthusiast',
      title: 'Hiking Enthusiast',
      description: 'Complete 50 hikes',
      icon: 'star',
      requirement: 50,
      unit: 'hikes',
      category: 'hikes',
      color: ['#9C27B0', '#E91E63'],
    },

    // Special Achievements
    {
      id: 'early_bird',
      title: 'Early Bird',
      description: 'Start a hike before 6 AM',
      icon: 'sunny',
      requirement: 1,
      unit: 'times',
      category: 'special',
      color: ['#FF9800', '#FFC107'],
    },
    {
      id: 'night_owl',
      title: 'Night Owl',
      description: 'Complete a hike after 8 PM',
      icon: 'moon',
      requirement: 1,
      unit: 'times',
      category: 'special',
      color: ['#3F51B5', '#9C27B0'],
    },
    {
      id: 'marathon_hiker',
      title: 'Marathon Hiker',
      description: 'Complete a 20km+ hike in one day',
      icon: 'fitness',
      requirement: 20,
      unit: 'km single',
      category: 'distance',
      color: ['#FF5722', '#F44336'],
    },
  ];

  useEffect(() => {
    fetchUserStats();
  }, []);

  // Update stats when progression data changes
  useEffect(() => {
    if (progressionStats) {
      const enhancedStats: UserStats = {
        totalDistance: progressionStats.totalDistance,
        totalHikes: progressionStats.totalHikes,
        totalElevation: progressionStats.totalElevation,
        totalTime: progressionStats.totalTime,
        longestHike: progressionStats.longestHike,
        highestElevation: progressionStats.highestElevation,
      };
      setUserStats(enhancedStats);
      // Recalculate achievements with enhanced stats
      calculateAchievements(enhancedStats, []);
    }
  }, [progressionStats]);

  async function fetchUserStats() {
    try {
      setRefreshing(true);

      // Fetch user's hiking data
      const { data: hikes, error: hikesError } = await supabase
        .from('hikes')
        .select('distance, elevation_gain, duration, created_at')
        .eq('user_id', userId);

      if (hikesError) {
        console.error('Error fetching hikes:', hikesError);
        return;
      }

      // Calculate stats
      const stats: UserStats = {
        totalDistance: 0,
        totalHikes: hikes?.length || 0,
        totalElevation: 0,
        totalTime: 0,
        longestHike: 0,
        highestElevation: 0,
      };

      if (hikes && hikes.length > 0) {
        stats.totalDistance = hikes.reduce(
          (sum, hike) => sum + (hike.distance || 0),
          0,
        );
        stats.totalElevation = hikes.reduce(
          (sum, hike) => sum + (hike.elevation_gain || 0),
          0,
        );
        stats.totalTime = hikes.reduce(
          (sum, hike) => sum + (hike.duration || 0),
          0,
        );
        stats.longestHike = Math.max(...hikes.map(hike => hike.distance || 0));
        stats.highestElevation = Math.max(
          ...hikes.map(hike => hike.elevation_gain || 0),
        );
      }

      setUserStats(stats);
      calculateAchievements(stats, hikes || []);
    } catch (error) {
      console.error('Error in fetchUserStats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function calculateAchievements(stats: UserStats, hikes: any[]) {
    const calculatedAchievements: Achievement[] = achievementTemplates.map(
      template => {
        let progress = 0;
        let isUnlocked = false;

        switch (template.category) {
          case 'distance':
            if (template.id === 'marathon_hiker') {
              progress = stats.longestHike;
            } else {
              progress = stats.totalDistance;
            }
            break;
          case 'hikes':
            progress = stats.totalHikes;
            break;
          case 'elevation':
            progress = stats.totalElevation;
            break;
          case 'time':
            progress = stats.totalTime;
            break;
          case 'special':
            // For special achievements, we'd need to check specific conditions
            // For now, we'll set them as locked
            progress = 0;
            break;
        }

        isUnlocked = progress >= template.requirement;

        return {
          ...template,
          isUnlocked,
          progress: Math.min(progress, template.requirement),
          unlockedAt: isUnlocked ? new Date().toISOString() : undefined,
        };
      },
    );

    // Sort achievements: unlocked first, then by requirement
    calculatedAchievements.sort((a, b) => {
      if (a.isUnlocked && !b.isUnlocked) {
        return -1;
      }
      if (!a.isUnlocked && b.isUnlocked) {
        return 1;
      }
      return a.requirement - b.requirement;
    });

    setAchievements(calculatedAchievements);
  }

  function formatDistance(distance: number): string {
    return `${distance.toFixed(1)} km`;
  }

  function formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  const renderStatsCard = () => (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>Your Hiking Stats</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Ionicons name='footsteps' size={24} color='#2E7D32' />
          <Text style={styles.statValue}>
            {formatDistance(userStats.totalDistance)}
          </Text>
          <Text style={styles.statLabel}>Total Distance</Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name='flag' size={24} color='#2E7D32' />
          <Text style={styles.statValue}>{userStats.totalHikes}</Text>
          <Text style={styles.statLabel}>Total Hikes</Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name='trending-up' size={24} color='#2E7D32' />
          <Text style={styles.statValue}>
            {userStats.totalElevation.toFixed(0)}m
          </Text>
          <Text style={styles.statLabel}>Total Elevation</Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name='time' size={24} color='#2E7D32' />
          <Text style={styles.statValue}>
            {formatTime(userStats.totalTime)}
          </Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
      </View>
    </View>
  );

  const renderAchievement = (achievement: Achievement) => {
    const gradientColors = achievement.isUnlocked
      ? achievement.color.length >= 2
        ? (achievement.color as [string, string, ...string[]])
        : ([
            achievement.color[0] || '#2E7D32',
            achievement.color[0] || '#2E7D32',
          ] as [string, string])
      : (['#F5F5F5', '#E0E0E0'] as [string, string]);

    return (
      <TouchableOpacity key={achievement.id} style={styles.achievementCard}>
        <LinearGradient
          colors={gradientColors}
          style={styles.achievementGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.achievementContent}>
            <View style={styles.achievementIcon}>
              <Ionicons
                name={achievement.icon as any}
                size={32}
                color={achievement.isUnlocked ? '#FFF' : '#999'}
              />
            </View>

            <View style={styles.achievementInfo}>
              <Text
                style={[
                  styles.achievementTitle,
                  { color: achievement.isUnlocked ? '#FFF' : '#666' },
                ]}
              >
                {achievement.title}
              </Text>
              <Text
                style={[
                  styles.achievementDescription,
                  { color: achievement.isUnlocked ? '#F0F0F0' : '#999' },
                ]}
              >
                {achievement.description}
              </Text>

              {!achievement.isUnlocked && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${(achievement.progress / achievement.requirement) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {achievement.progress.toFixed(1)} /{' '}
                    {achievement.requirement} {achievement.unit}
                  </Text>
                </View>
              )}

              {achievement.isUnlocked && achievement.unlockedAt && (
                <Text style={styles.unlockedText}>
                  Unlocked{' '}
                  {new Date(achievement.unlockedAt).toLocaleDateString()}
                </Text>
              )}
            </View>

            {achievement.isUnlocked && (
              <View style={styles.checkmarkContainer}>
                <Ionicons name='checkmark-circle' size={24} color='#FFF' />
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#2E7D32' />
        <Text style={styles.loadingText}>Loading achievements...</Text>
      </View>
    );
  }

  const unlockedCount = achievements.filter(a => a.isUnlocked).length;
  const totalCount = achievements.length;

  const onRefresh = async () => {
    setRefreshing(true);
    const refreshPromises = [fetchUserStats()];

    // Add progression refresh if available
    if (fetchProgressionStats) {
      refreshPromises.push(fetchProgressionStats());
    }

    await Promise.all(refreshPromises);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || progressionLoading}
          onRefresh={onRefresh}
        />
      }
    >
      {renderStatsCard()}

      <View style={styles.achievementsHeader}>
        <Text style={styles.achievementsTitle}>Achievements</Text>
        <Text style={styles.achievementsProgress}>
          {unlockedCount} / {totalCount} unlocked
        </Text>
      </View>

      <View style={styles.achievementsList}>
        {achievements.map(renderAchievement)}
      </View>

      {achievements.length === 0 && (
        <View style={styles.emptyStateContainer}>
          <Ionicons name='trophy-outline' size={60} color='#ccc' />
          <Text style={styles.emptyStateText}>No achievements yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start hiking to unlock achievements!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  statsCard: {
    backgroundColor: '#FFF',
    margin: 10,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  achievementsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  achievementsProgress: {
    fontSize: 14,
    color: '#666',
  },
  achievementsList: {
    paddingHorizontal: 10,
  },
  achievementCard: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  achievementGradient: {
    padding: 15,
  },
  achievementContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 5,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2E7D32',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#999',
  },
  unlockedText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  checkmarkContainer: {
    marginLeft: 10,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
    backgroundColor: '#FFF',
    margin: 10,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
});
