// Trail Service - Manages trail data and operations

// Trail difficulty levels
export const DIFFICULTY_LEVELS = {
  EASY: 'Easy',
  MODERATE: 'Moderate',
  HARD: 'Hard',
  EXPERT: 'Expert',
};

// Trail types
export const TRAIL_TYPES = {
  LOOP: 'Loop',
  OUT_AND_BACK: 'Out & Back',
  POINT_TO_POINT: 'Point to Point',
};

// Comprehensive trail data for Cebu hiking spots
export const TRAILS_DATA = [
  {
    id: '1',
    name: 'Mount Babag via Malubog',
    difficulty: DIFFICULTY_LEVELS.MODERATE,
    distance: '5.6 miles',
    distanceKm: 9.0,
    estimatedTime: '3-4 hours',
    elevationGain: '1,496 ft',
    elevationGainM: 456,
    trailType: TRAIL_TYPES.OUT_AND_BACK,
    description:
      'A scenic trail with beautiful views of Cebu City and surrounding islands. The trail offers moderate challenges with rewarding panoramic vistas at the summit.',
    features: [
      'Scenic Views',
      'City Overlook',
      'Mountain Summit',
      'Photo Spots',
    ],
    bestTime: 'Early morning (5:00-7:00 AM)',
    startPoint: {
      latitude: 10.3795765,
      longitude: 123.8711162,
      title: 'Malubog Trailhead',
      description: 'Main starting point with parking area',
      elevation: 200,
    },
    endPoint: {
      latitude: 10.3770829,
      longitude: 123.8550829,
      title: 'Mount Babag Summit',
      description: 'Summit with 360-degree views',
      elevation: 656,
    },
    coordinates: [
      { latitude: 10.3795765, longitude: 123.8711162 },
      { latitude: 10.3785, longitude: 123.868 },
      { latitude: 10.3775, longitude: 123.865 },
      { latitude: 10.377, longitude: 123.862 },
      { latitude: 10.3770829, longitude: 123.8550829 },
    ],
    waypoints: [
      {
        latitude: 10.3785,
        longitude: 123.868,
        title: 'Rest Stop 1',
        description: 'Shaded area with benches',
        type: 'rest',
      },
      {
        latitude: 10.3775,
        longitude: 123.865,
        title: 'Scenic Viewpoint',
        description: 'Great photo opportunity',
        type: 'viewpoint',
      },
    ],
    color: '#FF6B6B',
    rating: 4.5,
    reviews: 127,
  },
  {
    id: '2',
    name: 'Temple of Leah Trail',
    difficulty: DIFFICULTY_LEVELS.EASY,
    distance: '2.3 miles',
    distanceKm: 3.7,
    estimatedTime: '1-2 hours',
    elevationGain: '650 ft',
    elevationGainM: 198,
    trailType: TRAIL_TYPES.OUT_AND_BACK,
    description:
      'A gentle trail leading to the famous Temple of Leah with panoramic city views. Perfect for beginners and families.',
    features: [
      'Historical Site',
      'City Views',
      'Family Friendly',
      'Paved Path',
    ],
    bestTime: 'Late afternoon (4:00-6:00 PM)',
    startPoint: {
      latitude: 10.34,
      longitude: 123.865,
      title: 'Temple Access Road',
      description: 'Parking available near entrance',
      elevation: 300,
    },
    endPoint: {
      latitude: 10.345,
      longitude: 123.87,
      title: 'Temple of Leah',
      description: 'Roman-inspired temple with gardens',
      elevation: 498,
    },
    coordinates: [
      { latitude: 10.34, longitude: 123.865 },
      { latitude: 10.342, longitude: 123.8665 },
      { latitude: 10.3435, longitude: 123.868 },
      { latitude: 10.345, longitude: 123.87 },
    ],
    waypoints: [
      {
        latitude: 10.342,
        longitude: 123.8665,
        title: 'Garden Entrance',
        description: 'Beautiful flower gardens',
        type: 'attraction',
      },
    ],
    color: '#4ECDC4',
    rating: 4.2,
    reviews: 89,
  },
  {
    id: '3',
    name: 'Sirao Flower Garden Trail',
    difficulty: DIFFICULTY_LEVELS.EASY,
    distance: '1.8 miles',
    distanceKm: 2.9,
    estimatedTime: '1 hour',
    elevationGain: '400 ft',
    elevationGainM: 122,
    trailType: TRAIL_TYPES.LOOP,
    description:
      'A colorful trail through flower gardens with cool mountain air. Features seasonal blooms and Instagram-worthy spots.',
    features: [
      'Flower Gardens',
      'Cool Climate',
      'Photography',
      'Seasonal Blooms',
    ],
    bestTime: 'Morning (8:00-10:00 AM)',
    startPoint: {
      latitude: 10.36,
      longitude: 123.85,
      title: 'Sirao Entrance',
      description: 'Main entrance with visitor center',
      elevation: 800,
    },
    endPoint: {
      latitude: 10.365,
      longitude: 123.855,
      title: 'Garden Viewpoint',
      description: 'Highest point with panoramic views',
      elevation: 922,
    },
    coordinates: [
      { latitude: 10.36, longitude: 123.85 },
      { latitude: 10.362, longitude: 123.8515 },
      { latitude: 10.3635, longitude: 123.853 },
      { latitude: 10.365, longitude: 123.855 },
      { latitude: 10.364, longitude: 123.852 },
      { latitude: 10.361, longitude: 123.8505 },
      { latitude: 10.36, longitude: 123.85 },
    ],
    waypoints: [
      {
        latitude: 10.362,
        longitude: 123.8515,
        title: 'Celosia Garden',
        description: 'Colorful celosia flowers',
        type: 'attraction',
      },
      {
        latitude: 10.3635,
        longitude: 123.853,
        title: 'Sunflower Field',
        description: 'Seasonal sunflower display',
        type: 'attraction',
      },
    ],
    color: '#45B7D1',
    rating: 4.0,
    reviews: 156,
  },
  {
    id: '4',
    name: 'Tops Lookout Trail',
    difficulty: DIFFICULTY_LEVELS.MODERATE,
    distance: '4.2 miles',
    distanceKm: 6.8,
    estimatedTime: '2-3 hours',
    elevationGain: '1,200 ft',
    elevationGainM: 366,
    trailType: TRAIL_TYPES.OUT_AND_BACK,
    description:
      "Popular trail leading to one of Cebu's most famous viewpoints. Offers stunning sunset and city lights views.",
    features: ['Sunset Views', 'City Lights', 'Popular Spot', 'Restaurant'],
    bestTime: 'Late afternoon (3:00-6:00 PM)',
    startPoint: {
      latitude: 10.35,
      longitude: 123.86,
      title: 'Busay Road Start',
      description: 'Roadside parking available',
      elevation: 400,
    },
    endPoint: {
      latitude: 10.3706253,
      longitude: 123.8708697,
      title: 'Tops Lookout',
      description: 'Famous viewpoint with facilities',
      elevation: 766,
    },
    coordinates: [
      { latitude: 10.35, longitude: 123.86 },
      { latitude: 10.355, longitude: 123.863 },
      { latitude: 10.36, longitude: 123.866 },
      { latitude: 10.365, longitude: 123.869 },
      { latitude: 10.3706253, longitude: 123.8708697 },
    ],
    waypoints: [
      {
        latitude: 10.36,
        longitude: 123.866,
        title: 'Midway Rest',
        description: 'Shaded rest area',
        type: 'rest',
      },
    ],
    color: '#9B59B6',
    rating: 4.7,
    reviews: 203,
  },
  {
    id: '5',
    name: 'La Vie Parisienne Trail',
    difficulty: DIFFICULTY_LEVELS.EASY,
    distance: '1.5 miles',
    distanceKm: 2.4,
    estimatedTime: '45 minutes',
    elevationGain: '300 ft',
    elevationGainM: 91,
    trailType: TRAIL_TYPES.LOOP,
    description:
      'A short, pleasant walk through a French-inspired area with cafes and boutiques. Great for a leisurely stroll.',
    features: ['French Theme', 'Cafes', 'Shopping', 'Easy Walk'],
    bestTime: 'Anytime',
    startPoint: {
      latitude: 10.33,
      longitude: 123.875,
      title: 'La Vie Entrance',
      description: 'Main entrance with parking',
      elevation: 250,
    },
    endPoint: {
      latitude: 10.332,
      longitude: 123.877,
      title: 'Cafe Area',
      description: 'French-style cafe and shops',
      elevation: 341,
    },
    coordinates: [
      { latitude: 10.33, longitude: 123.875 },
      { latitude: 10.331, longitude: 123.876 },
      { latitude: 10.332, longitude: 123.877 },
      { latitude: 10.3315, longitude: 123.8765 },
      { latitude: 10.3305, longitude: 123.8755 },
      { latitude: 10.33, longitude: 123.875 },
    ],
    waypoints: [
      {
        latitude: 10.331,
        longitude: 123.876,
        title: 'Boutique Area',
        description: 'Local shops and crafts',
        type: 'attraction',
      },
    ],
    color: '#E74C3C',
    rating: 3.8,
    reviews: 67,
  },
];

// Utility functions for trail operations
export const getTrailById = id => {
  return TRAILS_DATA.find(trail => trail.id === id);
};

export const getTrailsByDifficulty = difficulty => {
  return TRAILS_DATA.filter(trail => trail.difficulty === difficulty);
};

export const getTrailsByDistance = maxKm => {
  return TRAILS_DATA.filter(trail => trail.distanceKm <= maxKm);
};

export const getTrailsByTime = maxHours => {
  return TRAILS_DATA.filter(trail => {
    const timeStr = trail.estimatedTime;
    const hours =
      parseInt(timeStr.split('-')[0]) || parseInt(timeStr.split(' ')[0]);
    return hours <= maxHours;
  });
};

export const searchTrails = query => {
  const lowercaseQuery = query.toLowerCase();
  return TRAILS_DATA.filter(
    trail =>
      (trail.name && trail.name.toLowerCase().includes(lowercaseQuery)) ||
      (trail.description &&
        trail.description.toLowerCase().includes(lowercaseQuery)) ||
      (trail.features &&
        trail.features.some(
          feature => feature && feature.toLowerCase().includes(lowercaseQuery),
        )),
  );
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

export const calculateTravelTime = distanceKm => {
  const drivingSpeed = 40; // km/h average city driving
  const cyclingSpeed = 15; // km/h average cycling speed
  const walkingSpeed = 5; // km/h average walking speed

  const drivingHours = distanceKm / drivingSpeed;
  const cyclingHours = distanceKm / cyclingSpeed;
  const walkingHours = distanceKm / walkingSpeed;

  const formatTime = hours => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return {
    drivingTime: formatTime(drivingHours),
    cyclingTime: formatTime(cyclingHours),
    walkingTime: formatTime(walkingHours),
  };
};

export const getDifficultyColor = difficulty => {
  switch (difficulty) {
    case DIFFICULTY_LEVELS.EASY:
      return '#4CAF50';
    case DIFFICULTY_LEVELS.MODERATE:
      return '#FF9800';
    case DIFFICULTY_LEVELS.HARD:
      return '#F44336';
    case DIFFICULTY_LEVELS.EXPERT:
      return '#9C27B0';
    default:
      return '#757575';
  }
};

export const getTrailTypeIcon = trailType => {
  switch (trailType) {
    case TRAIL_TYPES.LOOP:
      return 'refresh';
    case TRAIL_TYPES.OUT_AND_BACK:
      return 'swap-horizontal';
    case TRAIL_TYPES.POINT_TO_POINT:
      return 'arrow-forward';
    default:
      return 'trail-sign';
  }
};

// Get trails within a certain radius of a location
export const getTrailsNearLocation = (userLat, userLon, radiusKm = 50) => {
  return TRAILS_DATA.filter(trail => {
    const distance = calculateDistance(
      userLat,
      userLon,
      trail.startPoint.latitude,
      trail.startPoint.longitude,
    );
    return distance <= radiusKm;
  })
    .map(trail => ({
      ...trail,
      distanceFromUser: calculateDistance(
        userLat,
        userLon,
        trail.startPoint.latitude,
        trail.startPoint.longitude,
      ),
    }))
    .sort((a, b) => a.distanceFromUser - b.distanceFromUser);
};

export default {
  TRAILS_DATA,
  DIFFICULTY_LEVELS,
  TRAIL_TYPES,
  getTrailById,
  getTrailsByDifficulty,
  getTrailsByDistance,
  getTrailsByTime,
  searchTrails,
  calculateDistance,
  calculateTravelTime,
  getDifficultyColor,
  getTrailTypeIcon,
  getTrailsNearLocation,
};
