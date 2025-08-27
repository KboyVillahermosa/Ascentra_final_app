-- Ascentra Hiking App - Complete Database Schema Deployment
-- Copy and paste this entire script into Supabase SQL Editor and run it

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CORE TABLES
-- =============================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities table (hiking records)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    activity_type TEXT NOT NULL DEFAULT 'hike',
    distance DECIMAL(10,2),
    duration INTEGER, -- in minutes
    elevation_gain DECIMAL(10,2),
    difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'moderate', 'hard', 'expert')),
    location_name TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    photos TEXT[], -- array of photo URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved activities (bookmarks)
CREATE TABLE IF NOT EXISTS public.saveactivity (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_id)
);

-- Hikes table (planned or completed hikes)
CREATE TABLE IF NOT EXISTS public.hikes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy', 'moderate', 'hard', 'expert')),
    distance DECIMAL(10,2),
    estimated_duration INTEGER, -- in minutes
    elevation_gain DECIMAL(10,2),
    trail_type TEXT,
    best_season TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    photos TEXT[],
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SOCIAL FEATURES
-- =============================================

-- Activity likes
CREATE TABLE IF NOT EXISTS public.activity_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_id)
);

-- Activity comments
CREATE TABLE IF NOT EXISTS public.activity_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- FORUM SYSTEM
-- =============================================

-- Forum posts
CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'trails', 'gear', 'safety', 'events', 'photos')),
    tags TEXT[],
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forum comments
CREATE TABLE IF NOT EXISTS public.forum_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forum likes
CREATE TABLE IF NOT EXISTS public.forum_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- =============================================
-- GENERAL SOCIAL FEATURES
-- =============================================

-- Posts (general social posts)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    photos TEXT[],
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post likes
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- Post comments
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- LOCATION & DISCOVERY
-- =============================================

-- Hiking spots (points of interest)
CREATE TABLE IF NOT EXISTS public.hiking_spots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('easy', 'moderate', 'hard', 'expert')),
    features TEXT[], -- ['waterfall', 'viewpoint', 'wildlife', 'camping']
    photos TEXT[],
    rating DECIMAL(3,2) DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hiking spot comments/reviews
CREATE TABLE IF NOT EXISTS public.hiking_spot_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    spot_id UUID REFERENCES public.hiking_spots(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    photos TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Avatar storage
CREATE TABLE IF NOT EXISTS public.avatars (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    avatar_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_hikes_updated_at
    BEFORE UPDATE ON public.hikes
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_activity_comments_updated_at
    BEFORE UPDATE ON public.activity_comments
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_forum_posts_updated_at
    BEFORE UPDATE ON public.forum_posts
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_forum_comments_updated_at
    BEFORE UPDATE ON public.forum_comments
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_hiking_spots_updated_at
    BEFORE UPDATE ON public.hiking_spots
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_hiking_spot_comments_updated_at
    BEFORE UPDATE ON public.hiking_spot_comments
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saveactivity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiking_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiking_spot_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

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

-- Hiking spots policies
CREATE POLICY "Users can view all hiking spots" ON public.hiking_spots FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert hiking spots" ON public.hiking_spots FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update hiking spots they created" ON public.hiking_spots FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete hiking spots they created" ON public.hiking_spots FOR DELETE USING (auth.uid() = created_by);

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
-- HELPFUL VIEWS
-- =============================================

-- Activity feed view
CREATE OR REPLACE VIEW activity_feed AS
SELECT 
    a.id,
    a.title,
    a.description,
    a.activity_type,
    a.distance,
    a.duration,
    a.elevation_gain,
    a.difficulty_level,
    a.location_name,
    a.photos,
    a.created_at,
    p.username,
    p.full_name,
    p.avatar_url,
    COUNT(al.id) as like_count,
    COUNT(ac.id) as comment_count
FROM activities a
JOIN profiles p ON a.user_id = p.id
LEFT JOIN activity_likes al ON a.id = al.activity_id
LEFT JOIN activity_comments ac ON a.id = ac.activity_id
GROUP BY a.id, p.username, p.full_name, p.avatar_url
ORDER BY a.created_at DESC;

-- Hiking spot details view
CREATE OR REPLACE VIEW hiking_spot_details AS
SELECT 
    hs.id,
    hs.name,
    hs.description,
    hs.location,
    hs.latitude,
    hs.longitude,
    hs.difficulty,
    hs.features,
    hs.photos,
    hs.rating,
    hs.review_count,
    hs.created_at,
    p.username as created_by_username,
    COUNT(hsc.id) as total_comments
FROM hiking_spots hs
LEFT JOIN profiles p ON hs.created_by = p.id
LEFT JOIN hiking_spot_comments hsc ON hs.id = hsc.spot_id
GROUP BY hs.id, p.username
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