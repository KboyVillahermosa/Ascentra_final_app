const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample hiking spots data
const hikingSpots = [
  {
    name: 'Temple of Leah',
    description: 'A beautiful Roman-inspired temple with stunning city views and architectural grandeur.',
    latitude: 10.3547,
    longitude: 123.9366,
    difficulty: 'Easy',
    amenities: ['Scenic Views', 'Historical Site', 'Photography'],
    image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
    rating: 4.5,
    review_count: 127
  },

  {
    name: 'Mount Kan-Irag',
    description: 'A challenging mountain hike offering breathtaking sunrise views and cool mountain air.',
    latitude: 10.3678,
    longitude: 123.9512,
    difficulty: 'Hard',
    amenities: ['Mountain Peak', 'Sunrise Views', 'Camping'],
    image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    rating: 4.7,
    review_count: 156
  },
  {
    name: 'La Vie Parisienne',
    description: 'A French-inspired garden restaurant with beautiful landscaping and mountain views.',
    latitude: 10.3423,
    longitude: 123.9234,
    difficulty: 'Easy',
    amenities: ['Garden', 'Restaurant', 'Scenic Views'],
    image_url: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800',
    rating: 4.2,
    review_count: 78
  },
];

async function insertHikingSpots() {
  try {
    console.log('Connecting to Supabase...');
    
    // Check if hiking spots already exist
    const { data: existingSpots, error: checkError } = await supabase
      .from('hiking_spots')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.error('Error checking existing data:', checkError);
      return;
    }
    
    if (existingSpots && existingSpots.length > 0) {
      console.log('Hiking spots already exist in database. Skipping insertion.');
      return;
    }
    
    console.log('Inserting hiking spots...');
    
    const { data, error } = await supabase
      .from('hiking_spots')
      .insert(hikingSpots)
      .select();
    
    if (error) {
      console.error('Error inserting hiking spots:', error);
    } else {
      console.log(`Successfully inserted ${data.length} hiking spots:`);
      data.forEach(spot => {
        console.log(`- ${spot.name} (${spot.location})`);
      });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

insertHikingSpots();