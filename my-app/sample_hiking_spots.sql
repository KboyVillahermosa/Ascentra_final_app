-- Sample Hiking Spots Data for Cebu Region
-- Run this script in Supabase SQL Editor to populate hiking spots

INSERT INTO public.hiking_spots (
    name, 
    description, 
    location, 
    region, 
    latitude, 
    longitude, 
    difficulty, 
    features, 
    image_url, 
    average_rating, 
    rating_count
) VALUES 
(
    'Temple of Leah',
    'A beautiful Roman-inspired temple offering panoramic views of Cebu City. Perfect for sunrise and sunset photography.',
    'Busay, Cebu City',
    'Cebu',
    10.3467,
    123.9442,
    'easy',
    ARRAY['viewpoint', 'photography', 'architecture'],
    '../assets/images/spot1.jpg',
    4.5,
    127
),
(
    'Sirao Flower Garden',
    'Colorful flower garden known as the "Little Amsterdam of Cebu" with stunning celosia flowers and mountain views.',
    'Sirao, Cebu City',
    'Cebu',
    10.3512,
    123.9456,
    'easy',
    ARRAY['flowers', 'photography', 'viewpoint'],
    '../assets/images/spot2.jpg',
    4.3,
    98
),
(
    'Mount Babag',
    'A challenging hike with rewarding 360-degree views of Cebu. Popular among serious hikers and adventure seekers.',
    'Babag, Cebu City',
    'Cebu',
    10.3789,
    123.9234,
    'hard',
    ARRAY['summit', 'viewpoint', 'challenging'],
    '../assets/images/spot3.jpg',
    4.7,
    156
),
(
    'La Vie Parisienne',
    'French-inspired garden restaurant with hiking trails and beautiful landscape views.',
    'Lahug, Cebu City',
    'Cebu',
    10.3445,
    123.9123,
    'easy',
    ARRAY['restaurant', 'garden', 'relaxation'],
    '../assets/images/spot4.jpg',
    4.2,
    89
),
(
    'Jumalon Museum and Butterfly Sanctuary',
    'Nature sanctuary with butterfly garden and short hiking trails through native flora.',
    'Basak, Lapu-Lapu City',
    'Cebu',
    10.3123,
    123.9567,
    'easy',
    ARRAY['wildlife', 'butterflies', 'nature'],
    '../assets/images/spot5.jpg',
    4.1,
    67
),
(
    'Kawasan Falls',
    'Multi-tiered waterfall system with turquoise pools, perfect for swimming and canyoneering.',
    'Badian, Cebu',
    'Cebu',
    9.8567,
    123.3789,
    'moderate',
    ARRAY['waterfall', 'swimming', 'canyoneering'],
    '../assets/images/spot1.jpg',
    4.8,
    234
),
(
    'Oslob Whale Shark Watching',
    'World-famous whale shark interaction site with nearby hiking trails to viewpoints.',
    'Oslob, Cebu',
    'Cebu',
    9.4567,
    123.3912,
    'easy',
    ARRAY['wildlife', 'marine life', 'viewpoint'],
    '../assets/images/spot2.jpg',
    4.6,
    189
),
(
    'Tumalog Falls',
    'Curtain-like waterfall with misty cascades, accessible via short hike through tropical forest.',
    'Oslob, Cebu',
    'Cebu',
    9.4523,
    123.3856,
    'easy',
    ARRAY['waterfall', 'mist', 'tropical'],
    '../assets/images/spot3.jpg',
    4.4,
    145
),
(
    'Mount Lanaya',
    'Highest peak in Cebu with challenging trails and spectacular sunrise views.',
    'Alegria, Cebu',
    'Cebu',
    9.7234,
    123.4567,
    'expert',
    ARRAY['summit', 'sunrise', 'challenging'],
    '../assets/images/spot4.jpg',
    4.9,
    78
),
(
    'Bantayan Island Nature Park',
    'Coastal hiking trails with mangrove forests and pristine beaches.',
    'Bantayan Island, Cebu',
    'Cebu',
    11.2345,
    123.7890,
    'moderate',
    ARRAY['coastal', 'mangroves', 'beaches'],
    '../assets/images/spot5.jpg',
    4.3,
    112
),
(
    'Malapascua Island Trails',
    'Island hiking with lighthouse viewpoints and thresher shark diving spots.',
    'Malapascua Island, Cebu',
    'Cebu',
    11.3456,
    124.1234,
    'moderate',
    ARRAY['island', 'lighthouse', 'marine life'],
    '../assets/images/spot1.jpg',
    4.5,
    134
),
(
    'Camotes Islands Trek',
    'Multi-island hiking adventure with caves, lakes, and coastal trails.',
    'Camotes Islands, Cebu',
    'Cebu',
    10.5678,
    124.3456,
    'moderate',
    ARRAY['islands', 'caves', 'lakes'],
    '../assets/images/spot2.jpg',
    4.4,
    98
),
(
    'Moalboal Pescador Island',
    'Coastal hiking with sardine run viewing and coral reef exploration.',
    'Moalboal, Cebu',
    'Cebu',
    9.9234,
    123.4012,
    'easy',
    ARRAY['coastal', 'marine life', 'coral'],
    '../assets/images/spot3.jpg',
    4.6,
    167
),
(
    'Bohol-Cebu Bridge Viewpoint',
    'Scenic hiking trail to viewpoint overlooking the new Bohol-Cebu bridge.',
    'Cordova, Cebu',
    'Cebu',
    10.2534,
    123.9567,
    'easy',
    ARRAY['viewpoint', 'bridge', 'scenic'],
    '../assets/images/spot4.jpg',
    4.2,
    87
),
(
    'Dalaguete Flower Fields',
    'Seasonal flower fields with hiking trails through colorful blooms and mountain views.',
    'Dalaguete, Cebu',
    'Cebu',
    9.7567,
    123.5234,
    'easy',
    ARRAY['flowers', 'seasonal', 'photography'],
    '../assets/images/spot5.jpg',
    4.3,
    76
),
(
    'Argao Nature Park',
    'Protected forest area with waterfalls, caves, and diverse wildlife trails.',
    'Argao, Cebu',
    'Cebu',
    9.8789,
    123.6012,
    'moderate',
    ARRAY['forest', 'waterfalls', 'wildlife'],
    '../assets/images/spot1.jpg',
    4.4,
    103
),
(
    'Carcar Heritage Trail',
    'Historical hiking trail through heritage sites and traditional Filipino architecture.',
    'Carcar, Cebu',
    'Cebu',
    10.1023,
    123.6345,
    'easy',
    ARRAY['heritage', 'historical', 'architecture'],
    '../assets/images/spot2.jpg',
    4.1,
    65
),
(
    'Minglanilla Eco-Park',
    'Urban eco-park with nature trails, bird watching, and environmental education.',
    'Minglanilla, Cebu',
    'Cebu',
    10.2456,
    123.7890,
    'easy',
    ARRAY['eco-park', 'birds', 'education'],
    '../assets/images/spot3.jpg',
    4.0,
    54
),
(
    'Talisay Mountain Resort',
    'Mountain resort with hiking trails, zip lines, and adventure activities.',
    'Talisay, Cebu',
    'Cebu',
    10.2789,
    123.8456,
    'moderate',
    ARRAY['resort', 'adventure', 'zip line'],
    '../assets/images/spot4.jpg',
    4.3,
    91
),
(
    'Consolacion Hills',
    'Rolling hills with panoramic views of northern Cebu and nearby islands.',
    'Consolacion, Cebu',
    'Cebu',
    10.3789,
    123.9123,
    'moderate',
    ARRAY['hills', 'panoramic', 'islands'],
    '../assets/images/spot5.jpg',
    4.2,
    82
);

-- Update the hiking_spot_comments table with the correct column name
ALTER TABLE public.hiking_spot_comments 
RENAME COLUMN spot_id TO hiking_spot_id;

-- Add some sample comments for the hiking spots
INSERT INTO public.hiking_spot_comments (
    user_id,
    hiking_spot_id,
    content,
    rating
) 
SELECT 
    (SELECT id FROM auth.users LIMIT 1),
    hs.id,
    'Amazing place! Highly recommended for hiking enthusiasts.',
    5
FROM public.hiking_spots hs
WHERE hs.name IN ('Temple of Leah', 'Mount Babag', 'Kawasan Falls')
LIMIT 3;

SELECT 'Sample hiking spots data inserted successfully! 20 hiking spots have been added to Cebu region.' as status;