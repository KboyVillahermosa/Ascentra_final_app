import { supabase } from './supabaseClient';

// Skill level thresholds in kilometers
const SKILL_LEVELS = {
  'Rookie Rambler': { min: 0, max: 25 },
  'Climb Chaser': { min: 25, max: 100 },
  'Rock Scrambler': { min: 100, max: 250 },
  'Summit Strider': { min: 250, max: 500 },
  'Earth Roamer': { min: 500, max: Infinity },
};

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

export class ProgressionService {
  /**
   * Calculate the appropriate skill level based on total distance
   */
  static calculateSkillLevel(totalKm: number): string {
    for (const [level, range] of Object.entries(SKILL_LEVELS)) {
      if (totalKm >= range.min && totalKm < range.max) {
        return level;
      }
    }
    return 'Earth Roamer'; // Default to highest level
  }

  /**
   * Get user's current stats from the database
   */
  static async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      // Get user's current profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('total_km_traveled, skill_level')
        .eq('id', userId)
        .single();

      if (profileError) {
        throw profileError;
      }

      // Get all hikes data for calculations
      const { data: hikes, error: hikesError } = await supabase
        .from('hikes')
        .select('distance_km, elevation_gain, duration_minutes')
        .eq('user_id', userId);

      if (hikesError) {
        throw hikesError;
      }

      // Calculate stats from hikes data
      const totalHikes = hikes?.length || 0;
      const totalElevation =
        hikes?.reduce((sum, hike) => sum + (hike.elevation_gain || 0), 0) || 0;
      const totalTime =
        hikes?.reduce((sum, hike) => sum + (hike.duration_minutes || 0), 0) ||
        0;
      const longestHike =
        hikes?.reduce((max, hike) => Math.max(max, hike.distance_km || 0), 0) ||
        0;
      const highestElevation =
        hikes?.reduce(
          (max, hike) => Math.max(max, hike.elevation_gain || 0),
          0,
        ) || 0;

      return {
        totalDistance: profile.total_km_traveled || 0,
        totalHikes,
        totalElevation,
        totalTime,
        longestHike,
        highestElevation,
        currentSkillLevel: profile.skill_level || 'Rookie Rambler',
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }
  }

  /**
   * Calculate total distance from all completed hikes
   */
  static async calculateTotalDistance(userId: string): Promise<number> {
    try {
      const { data: hikes, error } = await supabase
        .from('hikes')
        .select('distance')
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (error) {
        throw error;
      }

      return (
        hikes?.reduce((total, hike) => total + (hike.distance || 0), 0) || 0
      );
    } catch (error) {
      console.error('Error calculating total distance:', error);
      return 0;
    }
  }

  /**
   * Update user's progression after completing a hike
   */
  static async updateUserProgression(
    userId: string,
    hikeDistance: number,
  ): Promise<ProgressionUpdate | null> {
    try {
      // Get current stats
      const currentStats = await this.getUserStats(userId);
      if (!currentStats) {
        throw new Error('Could not fetch current user stats');
      }

      // Calculate new total distance
      const newTotalKm = currentStats.totalDistance + hikeDistance;

      // Calculate new skill level
      const newSkillLevel = this.calculateSkillLevel(newTotalKm);
      const leveledUp = newSkillLevel !== currentStats.currentSkillLevel;

      // Update the profile in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          total_km_traveled: newTotalKm,
          skill_level: newSkillLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      // Log the progression update for analytics/history
      await this.logProgressionUpdate(userId, {
        previous_total_km: currentStats.totalDistance,
        new_total_km: newTotalKm,
        previous_skill_level: currentStats.currentSkillLevel,
        new_skill_level: newSkillLevel,
        hike_distance: hikeDistance,
        leveled_up: leveledUp,
      });

      return {
        newTotalKm,
        newSkillLevel,
        leveledUp,
        previousLevel: leveledUp ? currentStats.currentSkillLevel : undefined,
      };
    } catch (error) {
      console.error('Error updating user progression:', error);
      return null;
    }
  }

  /**
   * Recalculate and sync user's total progression from all hikes
   * Useful for data consistency and migration
   */
  static async syncUserProgression(
    userId: string,
  ): Promise<ProgressionUpdate | null> {
    try {
      // Calculate actual total from all completed hikes
      const actualTotal = await this.calculateTotalDistance(userId);

      // Calculate correct skill level
      const correctSkillLevel = this.calculateSkillLevel(actualTotal);

      // Get current profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('total_km_traveled, skill_level')
        .eq('id', userId)
        .single();

      if (profileError) {
        throw profileError;
      }

      const currentTotal = profile.total_km_traveled || 0;
      const currentLevel = profile.skill_level || 'Rookie Rambler';

      // Only update if there's a discrepancy
      if (actualTotal !== currentTotal || correctSkillLevel !== currentLevel) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            total_km_traveled: actualTotal,
            skill_level: correctSkillLevel,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateError) {
          throw updateError;
        }

        return {
          newTotalKm: actualTotal,
          newSkillLevel: correctSkillLevel,
          leveledUp: correctSkillLevel !== currentLevel,
          previousLevel:
            correctSkillLevel !== currentLevel ? currentLevel : undefined,
        };
      }

      return {
        newTotalKm: actualTotal,
        newSkillLevel: correctSkillLevel,
        leveledUp: false,
      };
    } catch (error) {
      console.error('Error syncing user progression:', error);
      return null;
    }
  }

  /**
   * Log progression updates for analytics and history
   */
  private static async logProgressionUpdate(
    userId: string,
    updateData: any,
  ): Promise<void> {
    try {
      await supabase.from('progression_logs').insert({
        user_id: userId,
        ...updateData,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      // Don't throw error for logging failures, just log it
      console.error('Error logging progression update:', error);
    }
  }

  /**
   * Get the next skill level and distance needed to reach it
   */
  static getNextLevelInfo(currentTotalKm: number): {
    nextLevel: string | null;
    distanceNeeded: number;
  } {
    const currentLevel = this.calculateSkillLevel(currentTotalKm);

    const levelEntries = Object.entries(SKILL_LEVELS);
    const currentLevelIndex = levelEntries.findIndex(
      ([level]) => level === currentLevel,
    );

    if (
      currentLevelIndex === -1 ||
      currentLevelIndex === levelEntries.length - 1
    ) {
      // Already at max level or level not found
      return { nextLevel: null, distanceNeeded: 0 };
    }

    const nextLevelEntry = levelEntries[currentLevelIndex + 1];
    const distanceNeeded = nextLevelEntry[1].min - currentTotalKm;

    return {
      nextLevel: nextLevelEntry[0],
      distanceNeeded: Math.max(0, distanceNeeded),
    };
  }

  /**
   * Get skill level progress as a percentage
   */
  static getSkillLevelProgress(totalKm: number): {
    level: string;
    progress: number;
    nextLevel: string | null;
  } {
    const currentLevel = this.calculateSkillLevel(totalKm);
    const currentRange =
      SKILL_LEVELS[currentLevel as keyof typeof SKILL_LEVELS];

    if (!currentRange) {
      return { level: currentLevel, progress: 100, nextLevel: null };
    }

    // Calculate progress within current level
    const levelDistance =
      currentRange.max === Infinity ? 0 : currentRange.max - currentRange.min;
    const progressInLevel = totalKm - currentRange.min;
    const progress =
      levelDistance > 0
        ? Math.min(100, (progressInLevel / levelDistance) * 100)
        : 100;

    const { nextLevel } = this.getNextLevelInfo(totalKm);

    return {
      level: currentLevel,
      progress: Math.round(progress),
      nextLevel,
    };
  }

  /**
   * Get all skill levels with their requirements
   */
  static getAllSkillLevels(): Array<{
    name: string;
    minKm: number;
    maxKm: number | null;
  }> {
    return Object.entries(SKILL_LEVELS).map(([name, range]) => ({
      name,
      minKm: range.min,
      maxKm: range.max === Infinity ? null : range.max,
    }));
  }
}

export default ProgressionService;
