import { supabase } from './supabaseClient';

// Get a user's profile by ID
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, bio, avatar_url')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// Get a user's recent hikes
export const getUserHikes = async (userId, limit = 3) => {
  try {
    const { data, error } = await supabase
      .from('hikes')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user hikes:', error);
    return [];
  }
};

// Get likes and comments for a hike
export const getHikeEngagement = async (hikeId, currentUserId) => {
  try {
    // Get like count
    const { count: likesCount } = await supabase
      .from('activity_likes')
      .select('id', { count: 'exact', head: true })
      .eq('activity_id', hikeId);
      
    // Check if current user has liked this activity
    const { data: userLike } = await supabase
      .from('activity_likes')
      .select('id')
      .eq('activity_id', hikeId)
      .eq('user_id', currentUserId)
      .maybeSingle();
      
    // Get comment count
    const { count: commentsCount } = await supabase
      .from('activity_comments')
      .select('id', { count: 'exact', head: true })
      .eq('activity_id', hikeId);
      
    return {
      likes: likesCount || 0,
      comments: commentsCount || 0,
      isLiked: !!userLike
    };
  } catch (error) {
    console.error('Error fetching hike engagement:', error);
    return { likes: 0, comments: 0, isLiked: false };
  }
};
