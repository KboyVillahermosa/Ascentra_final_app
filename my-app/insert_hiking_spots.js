import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const hikingSpots = [
  {
    name: 'Burnaby Mountain',
    description:
      'A beautiful mountain with stunning views of the city and surrounding areas.',
    latitude: 49.2781,
    longitude: -123.0442,
    difficulty: 'Easy',
    elevation: 370.0,
    trail_length: 5.2,
    estimated_duration: 120,
    image_url: '../assets/images/spot1.jpg',
    rating: 4.5,
    review_count: 128,
  },
  {
    name: 'Queen Elizabeth Park',
    description:
      'A scenic park with gardens, viewpoints, and recreational facilities.',
    latitude: 49.2404,
    longitude: -123.1156,
    difficulty: 'Easy',
    elevation: 152.0,
    trail_length: 3.1,
    estimated_duration: 90,
    image_url: '../assets/images/spot2.jpg',
    rating: 4.3,
    review_count: 95,
  },
  {
    name: 'Grouse Mountain',
    description:
      'A challenging hike with rewarding panoramic views at the summit.',
    latitude: 49.3834,
    longitude: -123.0834,
    difficulty: 'Hard',
    elevation: 1231.0,
    trail_length: 8.9,
    estimated_duration: 240,
    image_url: '../assets/images/spot3.jpg',
    rating: 4.7,
    review_count: 203,
  },
  {
    name: 'VanDusen Botanical Garden',
    description:
      'A peaceful garden setting perfect for leisurely walks and nature photography.',
    latitude: 49.2389,
    longitude: -123.1323,
    difficulty: 'Easy',
    elevation: 15.0,
    trail_length: 2.5,
    estimated_duration: 60,
    image_url: '../assets/images/spot4.jpg',
    rating: 4.2,
    review_count: 87,
  },
  {
    name: 'Bloedel Conservatory',
    description: 'An indoor tropical paradise with exotic plants and birds.',
    latitude: 49.2404,
    longitude: -123.1167,
    difficulty: 'Easy',
    elevation: 152.0,
    trail_length: 1.0,
    estimated_duration: 45,
    image_url: '../assets/images/spot5.jpg',
    rating: 4.1,
    review_count: 76,
  },
  {
    name: 'Lynn Canyon Falls',
    description: 'A spectacular waterfall accessible via scenic forest trails.',
    latitude: 49.3456,
    longitude: -123.0234,
    difficulty: 'Moderate',
    elevation: 200.0,
    trail_length: 4.2,
    estimated_duration: 150,
    image_url: '../assets/images/spot6.jpg',
    rating: 4.6,
    review_count: 156,
  },
  {
    name: 'Mount Seymour',
    description:
      'A challenging mountain peak offering breathtaking panoramic views.',
    latitude: 49.3667,
    longitude: -122.95,
    difficulty: 'Hard',
    elevation: 1449.0,
    trail_length: 12.5,
    estimated_duration: 300,
    image_url: '../assets/images/spot7.jpg',
    rating: 4.8,
    review_count: 189,
  },
  {
    name: 'Capilano River Falls',
    description:
      'Beautiful waterfalls along the Capilano River with walking trails.',
    latitude: 49.3428,
    longitude: -123.1207,
    difficulty: 'Easy',
    elevation: 70.0,
    trail_length: 3.8,
    estimated_duration: 105,
    image_url: '../assets/images/spot8.jpg',
    rating: 4.4,
    review_count: 112,
  },
  {
    name: 'Cypress Mountain',
    description:
      'A popular mountain destination with various trail options and scenic viewpoints.',
    latitude: 49.3956,
    longitude: -123.2056,
    difficulty: 'Moderate',
    elevation: 1325.0,
    trail_length: 7.3,
    estimated_duration: 210,
    image_url: '../assets/images/spot9.jpg',
    rating: 4.5,
    review_count: 167,
  },
  {
    name: 'Mount Baker',
    description:
      'A challenging peak with stunning alpine scenery and glacier views.',
    latitude: 48.7767,
    longitude: -121.8144,
    difficulty: 'Expert',
    elevation: 3286.0,
    trail_length: 16.8,
    estimated_duration: 480,
    image_url: '../assets/images/spot10.jpg',
    rating: 4.9,
    review_count: 234,
  },
  {
    name: 'Mount Rainier',
    description:
      'An iconic stratovolcano and the highest peak in Washington State.',
    latitude: 46.8523,
    longitude: -121.7603,
    difficulty: 'Expert',
    elevation: 4392.0,
    trail_length: 22.5,
    estimated_duration: 720,
    image_url: '../assets/images/spot11.jpg',
    rating: 4.8,
    review_count: 298,
  },
  {
    name: 'Snoqualmie Falls',
    description:
      'A magnificent 268-foot waterfall with viewing platforms and trails.',
    latitude: 47.542,
    longitude: -121.8372,
    difficulty: 'Easy',
    elevation: 134.0,
    trail_length: 2.1,
    estimated_duration: 75,
    image_url: '../assets/images/spot12.jpg',
    rating: 4.6,
    review_count: 145,
  },
  {
    name: 'Mount Washington',
    description:
      'A prominent peak offering challenging hikes and spectacular views.',
    latitude: 49.75,
    longitude: -125.2667,
    difficulty: 'Hard',
    elevation: 1588.0,
    trail_length: 11.2,
    estimated_duration: 360,
    image_url: '../assets/images/spot13.jpg',
    rating: 4.7,
    review_count: 178,
  },
  {
    name: 'Brandywine Falls',
    description:
      'A stunning 70-meter waterfall surrounded by old-growth forest.',
    latitude: 50.0333,
    longitude: -123.1167,
    difficulty: 'Moderate',
    elevation: 914.0,
    trail_length: 6.4,
    estimated_duration: 180,
    image_url: '../assets/images/spot14.jpg',
    rating: 4.5,
    review_count: 134,
  },
  {
    name: 'Mount Garibaldi',
    description:
      'A volcanic peak offering challenging alpine hiking and glacier views.',
    latitude: 49.85,
    longitude: -123.0,
    difficulty: 'Expert',
    elevation: 2678.0,
    trail_length: 18.0,
    estimated_duration: 540,
    image_url: '../assets/images/spot15.jpg',
    rating: 4.8,
    review_count: 201,
  },
];

async function insertHikingSpots() {
  try {
    console.log('Inserting hiking spots...');

    // First, let's try to get the current user or use service role
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.log('No authenticated user, attempting with service role...');
    }

    // Add created_by field to each hiking spot if we have a user
    const spotsWithCreator = hikingSpots.map(spot => ({
      ...spot,
      created_by: userData?.user?.id || null,
    }));

    const { data, error } = await supabase
      .from('hiking_spots')
      .insert(spotsWithCreator);

    if (error) {
      console.error('Error inserting hiking spots:', error);
      return;
    }

    console.log('Successfully inserted hiking spots!');
    console.log(`Inserted ${hikingSpots.length} hiking spots`);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

insertHikingSpots();
