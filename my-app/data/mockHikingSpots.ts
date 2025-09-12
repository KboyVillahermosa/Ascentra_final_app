// Mock hiking spots data - 15 amazing destinations
export interface HikingSpot {
  id: string;
  name: string;
  description: string;
  location: string;
  image_url: string;
  average_rating: number;
  rating_count: number;
  upvotes: number;
  downvotes: number;
  vote_score: number;
  combined_score: number;
  type: string;
  category: string;
  difficulty: string;
}

export const MOCK_HIKING_SPOTS: HikingSpot[] = [
  // EASY DIFFICULTY TRAILS
  {
    id: '15',
    name: 'Budlaan Falls',
    description:
      'A stunning multi-tiered waterfall nestled in lush tropical forest, offering refreshing natural pools and scenic hiking trails.',
    location: 'Budlaan, Cebu City, Philippines',
    image_url: '../assets/images/budlaanfalls/thumbnail.jpg',
    average_rating: 4.5,
    rating_count: 87,
    upvotes: 82,
    downvotes: 6,
    vote_score: 76,
    combined_score: 4.6,
    type: 'Falls',
    category: 'Falls & Trails',
    difficulty: 'Easy',
  },
  {
    id: '12',
    name: 'Kawasan Falls',
    description:
      'Multi-tiered waterfalls with crystal clear turquoise pools, perfect for swimming and canyoneering.',
    location: 'Badian, Cebu, Philippines',
    image_url: '../assets/images/spot12.jpg',
    average_rating: 4.9,
    rating_count: 203,
    upvotes: 195,
    downvotes: 4,
    vote_score: 191,
    combined_score: 5.0,
    type: 'Falls',
    category: 'Falls & Trails',
    difficulty: 'Easy',
  },
  // MODERATE DIFFICULTY TRAILS
  {
    id: '2',
    name: 'Mount Sirao',
    description:
      'Famous for its colorful flower gardens and cool mountain climate, perfect for nature lovers.',
    location: 'Cebu City, Philippines',
    image_url: '../assets/images/spot2.jpg',
    average_rating: 4.6,
    rating_count: 128,
    upvotes: 118,
    downvotes: 12,
    vote_score: 106,
    combined_score: 4.7,
    type: 'Peak',
    category: 'Peaks & Mountains',
    difficulty: 'Moderate',
  },
  {
    id: '4',
    name: 'Mount Naupa',
    description:
      'A moderate hike through lush forests leading to stunning valley views.',
    location: 'Cebu, Philippines',
    image_url: '../assets/images/spot4.jpg',
    average_rating: 4.4,
    rating_count: 67,
    upvotes: 61,
    downvotes: 8,
    vote_score: 53,
    combined_score: 4.5,
    type: 'Peak',
    category: 'Peaks & Mountains',
    difficulty: 'Moderate',
  },
  {
    id: '5',
    name: 'Mount Manunggal',
    description:
      'Historical mountain with memorial significance and beautiful hiking trails.',
    location: 'Cebu, Philippines',
    image_url: '../assets/images/spot5.jpg',
    average_rating: 4.5,
    rating_count: 94,
    upvotes: 87,
    downvotes: 9,
    vote_score: 78,
    combined_score: 4.6,
    type: 'Peak',
    category: 'Peaks & Mountains',
    difficulty: 'Moderate',
  },
  {
    id: '6',
    name: 'Mount Lantoy',
    description:
      'A scenic mountain trail with diverse ecosystems and panoramic coastal views.',
    location: 'Cebu, Philippines',
    image_url: '../assets/images/spot6.jpg',
    average_rating: 4.3,
    rating_count: 72,
    upvotes: 65,
    downvotes: 11,
    vote_score: 54,
    combined_score: 4.4,
    type: 'Peak',
    category: 'Peaks & Mountains',
    difficulty: 'Moderate',
  },
  {
    id: '8',
    name: 'Mount Kapayas',
    description:
      'A beautiful mountain hike through tropical forests with stunning summit views.',
    location: 'Cebu, Philippines',
    image_url: '../assets/images/spot8.jpg',
    average_rating: 4.2,
    rating_count: 45,
    upvotes: 41,
    downvotes: 7,
    vote_score: 34,
    combined_score: 4.3,
    type: 'Peak',
    category: 'Peaks & Mountains',
    difficulty: 'Moderate',
  },
  {
    id: '11',
    name: 'Mount Binacayan',
    description:
      'A hidden mountain gem with pristine trails and spectacular valley views.',
    location: 'Cebu, Philippines',
    image_url: '../assets/images/spot11.jpg',
    average_rating: 4.5,
    rating_count: 51,
    upvotes: 47,
    downvotes: 5,
    vote_score: 42,
    combined_score: 4.6,
    type: 'Peak',
    category: 'Peaks & Mountains',
    difficulty: 'Moderate',
  },
  {
    id: '14',
    name: 'Aguinid Falls',
    description:
      'A series of natural pools and waterfalls perfect for cliff jumping and swimming.',
    location: 'Samboan, Cebu, Philippines',
    image_url: '../assets/images/spot14.jpg',
    average_rating: 4.6,
    rating_count: 134,
    upvotes: 125,
    downvotes: 9,
    vote_score: 116,
    combined_score: 4.7,
    type: 'Falls',
    category: 'Falls & Trails',
    difficulty: 'Moderate',
  },
  // HARD DIFFICULTY TRAILS
  {
    id: '1',
    name: 'Mount Babag',
    description:
      'A challenging mountain hike with breathtaking panoramic views of Cebu City and surrounding islands.',
    location: 'Cebu City, Philippines',
    image_url: '../assets/images/spot1.jpg',
    average_rating: 4.8,
    rating_count: 156,
    upvotes: 142,
    downvotes: 8,
    vote_score: 134,
    combined_score: 4.9,
    type: 'Peak',
    category: 'Peaks & Mountains',
    difficulty: 'Hard',
  },
  {
    id: '3',
    name: 'Mount Kan-Irag',
    description:
      'An adventurous trail through dense forests with rewarding summit views.',
    location: 'Cebu, Philippines',
    image_url: '../assets/images/spot3.jpg',
    average_rating: 4.7,
    rating_count: 89,
    upvotes: 81,
    downvotes: 6,
    vote_score: 75,
    combined_score: 4.8,
    type: 'Peak',
    category: 'Peaks & Mountains',
    difficulty: 'Hard',
  },
  {
    id: '7',
    name: 'Mount Tagapo',
    description:
      'A challenging ascent through rugged terrain with spectacular panoramic views.',
    location: 'Cebu, Philippines',
    image_url: '../assets/images/spot7.jpg',
    average_rating: 4.4,
    rating_count: 63,
    upvotes: 57,
    downvotes: 8,
    vote_score: 49,
    combined_score: 4.5,
    type: 'Peak',
    category: 'Peaks & Mountains',
    difficulty: 'Hard',
  },
  {
    id: '9',
    name: 'Mount Mago',
    description:
      'A demanding trail with steep climbs and incredible views of the surrounding landscape.',
    location: 'Cebu, Philippines',
    image_url: '../assets/images/spot9.jpg',
    average_rating: 4.3,
    rating_count: 38,
    upvotes: 34,
    downvotes: 6,
    vote_score: 28,
    combined_score: 4.4,
    type: 'Peak',
    category: 'Peaks & Mountains',
    difficulty: 'Hard',
  },
  {
    id: '10',
    name: 'Mount Kalawisan',
    description:
      'An extreme hiking challenge with technical sections and breathtaking summit rewards.',
    location: 'Cebu, Philippines',
    image_url: '../assets/images/spot10.jpg',
    average_rating: 4.6,
    rating_count: 42,
    upvotes: 38,
    downvotes: 4,
    vote_score: 34,
    combined_score: 4.7,
    type: 'Peak',
    category: 'Peaks & Mountains',
    difficulty: 'Hard',
  },
  {
    id: '13',
    name: 'Tumalog Falls',
    description:
      'A mystical waterfall with curtain-like cascades in a serene forest setting.',
    location: 'Oslob, Cebu, Philippines',
    image_url: '../assets/images/spot13.jpg',
    average_rating: 4.7,
    rating_count: 167,
    upvotes: 152,
    downvotes: 11,
    vote_score: 141,
    combined_score: 4.8,
    type: 'Falls',
    category: 'Falls & Trails',
    difficulty: 'Easy',
  },
];

// Array of allowed hiking spot IDs (all 15 spots)
export const ALLOWED_HIKING_SPOTS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];

// Async function to load hiking spots data
export const loadHikingSpots = async (): Promise<HikingSpot[]> => {
  // Simulate network delay for realistic loading
  await new Promise(resolve => setTimeout(resolve, 100));
  return MOCK_HIKING_SPOTS;
};

// Function to get hiking spots by category
export const getHikingSpotsByCategory = async (
  category: string,
): Promise<HikingSpot[]> => {
  const spots = await loadHikingSpots();
  return spots.filter(spot => spot.category === category);
};

// Function to get hiking spots by difficulty
export const getHikingSpotsByDifficulty = async (
  difficulty: string,
): Promise<HikingSpot[]> => {
  const spots = await loadHikingSpots();
  return spots.filter(spot => spot.difficulty === difficulty);
};
