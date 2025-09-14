// Shared type definitions for the hiking app

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

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  profile_picture?: string;
  skill_level: string;
  cover_photo_url?: string;
  total_km_traveled?: number;
  created_at?: string;
  updated_at?: string;
}

export interface FavoriteSpot extends HikingSpot {
  favorited_at: string;
}