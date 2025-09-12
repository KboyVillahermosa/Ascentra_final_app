import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import ProgressionService from '../services/progressionService';
import { useAuth } from '../contexts/AuthContext';

interface UserStats {
  totalDistance: number;
  totalHikes: number;
  totalElevation: number;
  totalTime: number;
  longestHike: number;
  highestElevation: number;
  currentSkillLevel: string;
}

interface ProgressionUpdate {
  newTotalKm: number;
  newSkillLevel: string;
  leveledUp: boolean;
  previousLevel?: string;
}

interface SkillLevelProgress {
  level: string;
  progress: number;
  nextLevel: string | null;
}

interface NextLevelInfo {
  nextLevel: string | null;
  distanceNeeded: number;
}

export function useProgression() {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user's current progression stats
   */
  const fetchUserStats = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const stats = await ProgressionService.getUserStats(user.id);
      if (stats) {
        setUserStats(stats);
      } else {
        setError('Failed to fetch user stats');
      }
    } catch (err) {
      setError('Error fetching user stats');
      console.error('Error in fetchUserStats:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Update user progression after completing a hike
   */
  const updateProgression = useCallback(
    async (hikeDistance: number): Promise<ProgressionUpdate | null> => {
      if (!user?.id) {
        setError('User not authenticated');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const update = await ProgressionService.updateUserProgression(
          user.id,
          hikeDistance,
        );

        if (update) {
          // Refresh all stats after update
          await fetchUserStats();

          // Show level up notification if applicable
          if (update.leveledUp) {
            showLevelUpAlert(update.previousLevel!, update.newSkillLevel);
          }

          return update;
        } else {
          setError('Failed to update progression');
          return null;
        }
      } catch (err) {
        setError('Error updating progression');
        console.error('Error in updateProgression:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id],
  );

  /**
   * Sync user progression (recalculate from all hikes)
   */
  const syncProgression =
    useCallback(async (): Promise<ProgressionUpdate | null> => {
      if (!user?.id) {
        setError('User not authenticated');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const update = await ProgressionService.syncUserProgression(user.id);

        if (update) {
          // Update local state
          setUserStats(prev =>
            prev
              ? {
                  ...prev,
                  totalDistance: update.newTotalKm,
                  currentSkillLevel: update.newSkillLevel,
                }
              : null,
          );

          return update;
        } else {
          setError('Failed to sync progression');
          return null;
        }
      } catch (err) {
        setError('Error syncing progression');
        console.error('Error in syncProgression:', err);
        return null;
      } finally {
        setLoading(false);
      }
    }, [user?.id]);

  /**
   * Get skill level progress information
   */
  const getSkillLevelProgress = useCallback((): SkillLevelProgress | null => {
    if (!userStats) {
      return null;
    }
    return ProgressionService.getSkillLevelProgress(userStats.totalDistance);
  }, [userStats]);

  /**
   * Get next level information
   */
  const getNextLevelInfo = useCallback((): NextLevelInfo | null => {
    if (!userStats) {
      return null;
    }
    return ProgressionService.getNextLevelInfo(userStats.totalDistance);
  }, [userStats]);

  /**
   * Get all skill levels with requirements
   */
  const getAllSkillLevels = useCallback(() => {
    return ProgressionService.getAllSkillLevels();
  }, []);

  /**
   * Show level up alert to user
   */
  const showLevelUpAlert = useCallback(
    (previousLevel: string, newLevel: string) => {
      Alert.alert(
        '🎉 Level Up!',
        `Congratulations! You've progressed from ${previousLevel} to ${newLevel}!`,
        [
          {
            text: 'Awesome!',
            style: 'default',
          },
        ],
        { cancelable: true },
      );
    },
    [],
  );

  /**
   * Calculate skill level from distance (utility function)
   */
  const calculateSkillLevel = useCallback((totalKm: number): string => {
    return ProgressionService.calculateSkillLevel(totalKm);
  }, []);

  // Fetch user stats on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      fetchUserStats();
    } else {
      setUserStats(null);
      setError(null);
    }
  }, [user?.id, fetchUserStats]);

  return {
    // State
    userStats,
    loading,
    error,

    // Actions
    fetchUserStats,
    updateProgression,
    syncProgression,

    // Computed values
    skillLevelProgress: getSkillLevelProgress(),
    nextLevelInfo: getNextLevelInfo(),

    // Utilities
    getAllSkillLevels,
    calculateSkillLevel,
    showLevelUpAlert,
  };
}

export default useProgression;
