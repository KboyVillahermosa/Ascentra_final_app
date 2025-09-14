-- =============================================
-- ASCENTRA HIKING APP - COMPLETE DATABASE SCHEMA
-- =============================================
-- This script creates the complete database schema for the Ascentra hiking mobile app
-- Compatible with Supabase PostgreSQL
-- Run this script on an empty database

-- =============================================
-- EXTENSIONS
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =============================================
-- CORE TABLES (in dependency order)
-- =============================================

-- Profiles table (references auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    profile_picture TEXT,
    skill_level TEXT DEFAULT 'rookie_rambler' CHECK (skill_level IN ('rookie_rambler', 'weekend_warrior', 'trail_master', 'summit_seeker')),
    bio TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hiking spots table
CREATE TABLE IF NOT EXISTS public.hiking_spots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    difficulty TEXT CHECK (difficulty IN ('easy', 'moderate', 'hard', 'expert')),
    distance DECIMAL(10,2),
    elevation_gain DECIMAL(10,2),
    rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER DEFAULT 0,
    photos TEXT[],
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities table
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('hiking', 'running', 'cycling', 'walking')),
    distance DECIMAL(10,2),
    duration INTEGER, -- in minutes
    elevation_gain DECIMAL(10,2),
    route_data JSONB,
    photos TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved activities table
CREATE TABLE IF NOT EXISTS public.saveactivity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_id)
);

-- Hikes table
CREATE TABLE IF NOT EXISTS public.hikes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    hiking_spot_id UUID REFERENCES public.hiking_spots(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    distance DECIMAL(10,2),
    duration INTEGER, -- in minutes
    difficulty TEXT CHECK (difficulty IN ('easy', 'moderate', 'hard', 'expert')),
    elevation_gain DECIMAL(10,2),
    photos TEXT[],
    gpx_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    spot_id UUID REFERENCES public.hiking_spots(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, spot_id)
);

-- =============================================
-- SOCIAL FEATURES TABLES
-- =============================================

-- Activity likes
CREATE TABLE IF NOT EXISTS public.activity_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(activity_id, user_id)
);

-- Activity comments
CREATE TABLE IF NOT EXISTS public.activity_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forum posts
CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'trails', 'gear', 'safety', 'events')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forum post media
CREATE TABLE IF NOT EXISTS public.forum_post_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forum comments
CREATE TABLE IF NOT EXISTS public.forum_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forum likes
CREATE TABLE IF NOT EXISTS public.forum_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- General posts (social feed)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    media_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- General likes
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- General comments
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hiking spot comments
CREATE TABLE IF NOT EXISTS public.hiking_spot_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hiking_spot_id UUID REFERENCES public.hiking_spots(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Avatars table
CREATE TABLE IF NOT EXISTS public.avatars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    avatar_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a spot is favorited by a user
CREATE OR REPLACE FUNCTION is_spot_favorited(spot_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.favorites 
        WHERE spot_id = spot_uuid AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle favorite status
CREATE OR REPLACE FUNCTION toggle_favorite(spot_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$ -- Returns true if added, false if removed
DECLARE
    favorite_exists BOOLEAN;
BEGIN
    -- Check if favorite already exists
    SELECT EXISTS(
        SELECT 1 FROM public.favorites 
        WHERE spot_id = spot_uuid AND user_id = user_uuid
    ) INTO favorite_exists;
    
    IF favorite_exists THEN
        -- Remove favorite
        DELETE FROM public.favorites 
        WHERE spot_id = spot_uuid AND user_id = user_uuid;
        RETURN false;
    ELSE
        -- Add favorite
        INSERT INTO public.favorites (user_id, spot_id) 
        VALUES (user_uuid, spot_uuid);
        RETURN true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Triggers for updated_at timestamps
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER hikes_updated_at BEFORE UPDATE ON public.hikes FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER hiking_spots_updated_at BEFORE UPDATE ON public.hiking_spots FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER activity_comments_updated_at BEFORE UPDATE ON public.activity_comments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER forum_posts_updated_at BEFORE UPDATE ON public.forum_posts FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER forum_comments_updated_at BEFORE UPDATE ON public.forum_comments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER hiking_spot_comments_updated_at BEFORE UPDATE ON public.hiking_spot_comments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER avatars_updated_at BEFORE UPDATE ON public.avatars FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saveactivity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiking_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiking_spot_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Activities policies
CREATE POLICY "Users can view all activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Users can insert own activities" ON public.activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activities" ON public.activities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own activities" ON public.activities FOR DELETE USING (auth.uid() = user_id);

-- Saved activities policies
CREATE POLICY "Users can view own saved activities" ON public.saveactivity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved activities" ON public.saveactivity FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved activities" ON public.saveactivity FOR DELETE USING (auth.uid() = user_id);

-- Hikes policies
CREATE POLICY "Users can view all hikes" ON public.hikes FOR SELECT USING (true);
CREATE POLICY "Users can insert own hikes" ON public.hikes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own hikes" ON public.hikes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own hikes" ON public.hikes FOR DELETE USING (auth.uid() = user_id);

-- Hiking spots policies
CREATE POLICY "Users can view all hiking spots" ON public.hiking_spots FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert hiking spots" ON public.hiking_spots FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update hiking spots they created" ON public.hiking_spots FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete hiking spots they created" ON public.hiking_spots FOR DELETE USING (auth.uid() = created_by);

-- Favorites policies
CREATE POLICY "Users can view all favorites" ON public.favorites FOR SELECT USING (true);
CREATE POLICY "Users can insert own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Activity likes policies
CREATE POLICY "Users can view all activity likes" ON public.activity_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert own activity likes" ON public.activity_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own activity likes" ON public.activity_likes FOR DELETE USING (auth.uid() = user_id);

-- Activity comments policies
CREATE POLICY "Users can view all activity comments" ON public.activity_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert own activity comments" ON public.activity_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activity comments" ON public.activity_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own activity comments" ON public.activity_comments FOR DELETE USING (auth.uid() = user_id);

-- Forum posts policies
CREATE POLICY "Users can view all forum posts" ON public.forum_posts FOR SELECT USING (true);
CREATE POLICY "Users can insert own forum posts" ON public.forum_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own forum posts" ON public.forum_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own forum posts" ON public.forum_posts FOR DELETE USING (auth.uid() = user_id);

-- Forum post media policies
CREATE POLICY "Users can view all forum post media" ON public.forum_post_media FOR SELECT USING (true);
CREATE POLICY "Users can insert forum post media for own posts" ON public.forum_post_media FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.forum_posts WHERE id = post_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete forum post media for own posts" ON public.forum_post_media FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.forum_posts WHERE id = post_id AND user_id = auth.uid())
);

-- Forum comments policies
CREATE POLICY "Users can view all forum comments" ON public.forum_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert own forum comments" ON public.forum_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own forum comments" ON public.forum_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own forum comments" ON public.forum_comments FOR DELETE USING (auth.uid() = user_id);

-- Forum likes policies
CREATE POLICY "Users can view all forum likes" ON public.forum_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert own forum likes" ON public.forum_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own forum likes" ON public.forum_likes FOR DELETE USING (auth.uid() = user_id);

-- Posts policies
CREATE POLICY "Users can view all posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can insert own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Users can view all likes" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can insert own likes" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Users can view all comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can insert own comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Hiking spot comments policies
CREATE POLICY "Users can view all hiking spot comments" ON public.hiking_spot_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert own hiking spot comments" ON public.hiking_spot_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own hiking spot comments" ON public.hiking_spot_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own hiking spot comments" ON public.hiking_spot_comments FOR DELETE USING (auth.uid() = user_id);

-- Avatars policies
CREATE POLICY "Users can view all avatars" ON public.avatars FOR SELECT USING (true);
CREATE POLICY "Users can insert own avatar" ON public.avatars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own avatar" ON public.avatars FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own avatar" ON public.avatars FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_skill_level ON public.profiles(skill_level);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON public.activities(activity_type);

-- Hiking spots indexes
CREATE INDEX IF NOT EXISTS idx_hiking_spots_location ON public.hiking_spots(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_hiking_spots_difficulty ON public.hiking_spots(difficulty);
CREATE INDEX IF NOT EXISTS idx_hiking_spots_created_by ON public.hiking_spots(created_by);
CREATE INDEX IF NOT EXISTS idx_hiking_spots_rating ON public.hiking_spots(rating DESC);

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_spot_id ON public.favorites(spot_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_spot ON public.favorites(user_id, spot_id);

-- Social features indexes
CREATE INDEX IF NOT EXISTS idx_activity_likes_activity_id ON public.activity_likes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_likes_user_id ON public.activity_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON public.activity_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON public.forum_posts(category);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON public.forum_posts(created_at DESC);

-- =============================================
-- HELPFUL VIEWS
-- =============================================

-- Activity feed view
CREATE VIEW activity_feed AS
SELECT 
    a.id,
    a.title,
    a.description,
    a.activity_type,
    a.distance,
    a.duration,
    a.created_at,
    p.username,
    p.full_name,
    p.avatar_url,
    COUNT(al.id) as like_count,
    COUNT(ac.id) as comment_count
FROM public.activities a
JOIN public.profiles p ON a.user_id = p.id
LEFT JOIN public.activity_likes al ON a.id = al.activity_id
LEFT JOIN public.activity_comments ac ON a.id = ac.activity_id
GROUP BY a.id, a.title, a.description, a.activity_type, a.distance, a.duration, a.created_at, p.username, p.full_name, p.avatar_url
ORDER BY a.created_at DESC;

-- Hiking spot details view
CREATE VIEW hiking_spot_details AS
SELECT 
    hs.id,
    hs.name,
    hs.description,
    hs.location,
    hs.latitude,
    hs.longitude,
    hs.difficulty,
    hs.rating,
    hs.review_count,
    hs.created_at,
    p.username as created_by_username
FROM public.hiking_spots hs
LEFT JOIN public.profiles p ON hs.created_by = p.id
ORDER BY hs.created_at DESC;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

-- Insert a success message (this will appear in the results)
SELECT 'Database schema deployed successfully! All tables, triggers, policies, and views have been created.' as status;

-- Show table count
SELECT 
    schemaname,
    COUNT(*) as table_count
FROM pg_tables 
WHERE schemaname = 'public'
GROUP BY schemaname;