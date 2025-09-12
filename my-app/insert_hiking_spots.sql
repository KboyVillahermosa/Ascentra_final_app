-- Insert 15 hiking spots into the database
-- Run this script in Supabase SQL Editor

-- Temporarily disable RLS for this operation (if needed)
-- ALTER TABLE hiking_spots DISABLE ROW LEVEL SECURITY;

INSERT INTO public.hiking_spots (
    name,
    description,
    latitude,
    longitude,
    difficulty,
    elevation,
    trail_length,
    estimated_duration,
    image_url,
    rating,
    review_count
) VALUES 
(
    'Burnaby Mountain',
    'A beautiful mountain with stunning views of the city and surrounding areas.',
    49.2781,
    -123.0442,
    'Easy',
    370.0,
    5.2,
    120,
    '../assets/images/spot1.jpg',
    4.5,
    128
),
(
    'Queen Elizabeth Park',
    'A scenic park with gardens, viewpoints, and recreational facilities.',
    49.2404,
    -123.1156,
    'Easy',
    152.0,
    3.1,
    90,
    '../assets/images/spot2.jpg',
    4.3,
    95
),
(
    'Grouse Mountain',
    'A challenging hike with rewarding panoramic views at the summit.',
    49.3834,
    -123.0834,
    'Hard',
    1231.0,
    8.9,
    240,
    '../assets/images/spot3.jpg',
    4.7,
    203
),
(
    'VanDusen Botanical Garden',
    'A peaceful garden setting perfect for leisurely walks and nature photography.',
    49.2389,
    -123.1323,
    'Easy',
    15.0,
    2.5,
    60,
    '../assets/images/spot4.jpg',
    4.2,
    87
),
(
    'Bloedel Conservatory',
    'An indoor tropical paradise with exotic plants and birds.',
    49.2404,
    -123.1167,
    'Easy',
    152.0,
    1.0,
    45,
    '../assets/images/spot5.jpg',
    4.1,
    76
),
(
    'Lynn Canyon Falls',
    'A spectacular waterfall accessible via scenic forest trails.',
    49.3456,
    -123.0234,
    'Moderate',
    200.0,
    4.2,
    150,
    '../assets/images/spot6.jpg',
    4.6,
    156
),
(
    'Mount Seymour',
    'A challenging mountain peak offering breathtaking panoramic views.',
    49.3667,
    -122.9500,
    'Hard',
    1449.0,
    12.5,
    300,
    '../assets/images/spot7.jpg',
    4.8,
    189
),
(
    'Capilano River Falls',
    'Beautiful waterfalls along the Capilano River with walking trails.',
    49.3428,
    -123.1207,
    'Easy',
    70.0,
    3.8,
    105,
    '../assets/images/spot8.jpg',
    4.4,
    112
),
(
    'Cypress Mountain',
    'A popular mountain destination with various trail options and scenic viewpoints.',
    49.3956,
    -123.2056,
    'Moderate',
    1325.0,
    7.3,
    210,
    '../assets/images/spot9.jpg',
    4.5,
    167
),
(
    'Mount Baker',
    'A challenging peak with stunning alpine scenery and glacier views.',
    48.7767,
    -121.8144,
    'Expert',
    3286.0,
    16.8,
    480,
    '../assets/images/spot10.jpg',
    4.9,
    234
),
(
    'Mount Rainier',
    'An iconic stratovolcano and the highest peak in Washington State.',
    46.8523,
    -121.7603,
    'Expert',
    4392.0,
    22.5,
    720,
    '../assets/images/spot11.jpg',
    4.8,
    298
),
(
    'Snoqualmie Falls',
    'A magnificent 268-foot waterfall with viewing platforms and trails.',
    47.5420,
    -121.8372,
    'Easy',
    134.0,
    2.1,
    75,
    '../assets/images/spot12.jpg',
    4.6,
    145
),
(
    'Mount Washington',
    'A prominent peak offering challenging hikes and spectacular views.',
    49.7500,
    -125.2667,
    'Hard',
    1588.0,
    11.2,
    360,
    '../assets/images/spot13.jpg',
    4.7,
    178
),
(
    'Brandywine Falls',
    'A stunning 70-meter waterfall surrounded by old-growth forest.',
    50.0333,
    -123.1167,
    'Moderate',
    914.0,
    6.4,
    180,
    '../assets/images/spot14.jpg',
    4.5,
    134
),
(
    'Mount Garibaldi',
    'A volcanic peak offering challenging alpine hiking and glacier views.',
    49.8500,
    -123.0000,
    'Expert',
    2678.0,
    18.0,
    540,
    '../assets/images/spot15.jpg',
    4.8,
    201
);

-- Re-enable RLS if it was disabled
-- ALTER TABLE hiking_spots ENABLE ROW LEVEL SECURITY;

SELECT 'Successfully inserted 15 hiking spots!' as status;
SELECT COUNT(*) as total_spots FROM hiking_spots;