import { supabase } from './supabaseClient';

export interface Favorite {
  id: string;
  user_id: string;
  spot_id: string;
  created_at: string;
}

export interface HikingSpot {
  id: string;
  name: string;
  description?: string;
  difficulty_level?: 'easy' | 'moderate' | 'hard' | 'expert';
  distance?: number;
  elevation_gain?: number;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  photos?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_favorited?: boolean;
}

/**
 * Check if a hiking spot is favorited by the current user
 */
export async function isSpotFavorited(
  spotId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('spot_id', spotId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking favorite status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in isSpotFavorited:', error);
    return false;
  }
}

/**
 * Add a hiking spot to user's favorites
 */
export async function addToFavorites(
  spotId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('favorites').insert({
      user_id: userId,
      spot_id: spotId,
    });

    if (error) {
      console.error('Error adding to favorites:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in addToFavorites:', error);
    return { success: false, error: 'Failed to add to favorites' };
  }
}

/**
 * Remove a hiking spot from user's favorites
 */
export async function removeFromFavorites(
  spotId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('spot_id', spotId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing from favorites:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in removeFromFavorites:', error);
    return { success: false, error: 'Failed to remove from favorites' };
  }
}

/**
 * Toggle favorite status for a hiking spot
 */
export async function toggleFavorite(
  spotId: string,
  userId: string,
): Promise<{ success: boolean; isFavorited: boolean; error?: string }> {
  try {
    // Check current status
    const currentlyFavorited = await isSpotFavorited(spotId, userId);

    if (currentlyFavorited) {
      // Remove from favorites
      const result = await removeFromFavorites(spotId, userId);
      return {
        success: result.success,
        isFavorited: false,
        error: result.error,
      };
    } else {
      // Add to favorites
      const result = await addToFavorites(spotId, userId);
      return {
        success: result.success,
        isFavorited: true,
        error: result.error,
      };
    }
  } catch (error) {
    console.error('Error in toggleFavorite:', error);
    return {
      success: false,
      isFavorited: false,
      error: 'Failed to toggle favorite status',
    };
  }
}

/**
 * Get all favorite hiking spots for a user
 */
export async function getUserFavorites(
  userId: string,
): Promise<{ data: HikingSpot[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select(
        `
        spot_id,
        created_at,
        hiking_spots!fk_favorites_spot_id (
          id,
          name,
          description,
          difficulty_level,
          distance,
          elevation_gain,
          location_name,
          latitude,
          longitude,
          photos,
          created_by,
          created_at,
          updated_at
        )
      `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user favorites:', error);
      return { data: [], error: error.message };
    }

    // Transform the data to include is_favorited flag
    const favorites: HikingSpot[] =
      data?.map((favorite: any) => ({
        ...favorite.hiking_spots,
        is_favorited: true,
      })) || [];

    return { data: favorites };
  } catch (error) {
    console.error('Error in getUserFavorites:', error);
    return { data: [], error: 'Failed to fetch favorites' };
  }
}

/**
 * Get hiking spots with favorite status for a user
 */
export async function getHikingSpotsWithFavorites(
  userId?: string,
): Promise<{ data: HikingSpot[]; error?: string }> {
  try {
    const { data: spots, error: spotsError } = await supabase
      .from('hiking_spots')
      .select('*')
      .order('created_at', { ascending: false });

    if (spotsError) {
      console.error('Error fetching hiking spots:', spotsError);
      return { data: [], error: spotsError.message };
    }

    if (!userId) {
      // If no user, return spots without favorite status
      return { data: spots || [] };
    }

    // Get user's favorites
    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select('spot_id')
      .eq('user_id', userId);

    if (favoritesError) {
      console.error('Error fetching favorites:', favoritesError);
      // Return spots without favorite status if favorites fetch fails
      return { data: spots || [] };
    }

    const favoriteSpotIds = new Set(favorites?.map(f => f.spot_id) || []);

    // Add is_favorited flag to each spot
    const spotsWithFavorites: HikingSpot[] =
      spots?.map(spot => ({
        ...spot,
        is_favorited: favoriteSpotIds.has(spot.id),
      })) || [];

    return { data: spotsWithFavorites };
  } catch (error) {
    console.error('Error in getHikingSpotsWithFavorites:', error);
    return { data: [], error: 'Failed to fetch hiking spots' };
  }
}

/**
 * Get favorite count for a hiking spot
 */
export async function getFavoriteCount(
  spotId: string,
): Promise<{ count: number; error?: string }> {
  try {
    const { count, error } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('spot_id', spotId);

    if (error) {
      console.error('Error getting favorite count:', error);
      return { count: 0, error: error.message };
    }

    return { count: count || 0 };
  } catch (error) {
    console.error('Error in getFavoriteCount:', error);
    return { count: 0, error: 'Failed to get favorite count' };
  }
}
