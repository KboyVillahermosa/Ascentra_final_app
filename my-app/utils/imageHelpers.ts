import { ImageSourcePropType } from 'react-native';

interface HikingSpot {
  id: string | number;
  name: string;
  image_url?: string;
}

// Image cache for better performance
const imageCache = new Map<string, any>();

// Preload critical images
const CRITICAL_IMAGES = {
  default: require('../assets/images/spot1.jpg'),
  mountBabag: require('../assets/images/mount babag/thumbnail.webp'),
  budlaanFalls: require('../assets/images/budlaanfalls/thumbnail.jpg'),
};

// Optimized image map with lazy loading
function getImageFromMap(imagePath: string): any {
  if (imageCache.has(imagePath)) {
    return imageCache.get(imagePath);
  }

  const imageMap: { [key: string]: () => any } = {
    '../assets/images/spot1.jpg': () => require('../assets/images/spot1.jpg'),
    '../assets/images/spot2.jpg': () => require('../assets/images/spot2.jpg'),
    '../assets/images/spot3.jpg': () => require('../assets/images/spot3.jpg'),
    '../assets/images/spot4.jpg': () => require('../assets/images/spot4.jpg'),
    '../assets/images/spot5.jpg': () => require('../assets/images/spot5.jpg'),
    '../assets/images/spot6.jpg': () => require('../assets/images/spot6.jpg'),
    '../assets/images/budlaanfalls/thumbnail.jpg': () =>
      CRITICAL_IMAGES.budlaanFalls,
  };

  try {
    const imageLoader = imageMap[imagePath];
    if (imageLoader) {
      const image = imageLoader();
      imageCache.set(imagePath, image);
      return image;
    }
    return CRITICAL_IMAGES.default;
  } catch (error) {
    console.warn(`Image not found for ${imagePath}, using default`);
    return CRITICAL_IMAGES.default;
  }
}

// Get the appropriate image source for Mt. Babag
function getMountBabagImage(): any {
  const cacheKey = 'mount-babag-thumbnail';
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey);
  }

  try {
    const image = CRITICAL_IMAGES.mountBabag;
    imageCache.set(cacheKey, image);
    return image;
  } catch (error) {
    console.warn('Mt. Babag thumbnail not found, using fallback');
    return CRITICAL_IMAGES.default;
  }
}

/**
 * Get the appropriate image source for a hiking spot
 * Handles Mt. Babag special case and fallback images with caching
 */
export const getHikingSpotImageSource = (
  spot: HikingSpot,
): ImageSourcePropType => {
  // Check if this is Mt. Babag first and use its thumbnail (override any external URL)
  if (isMountBabag(spot)) {
    return getMountBabagImage();
  }

  // Check if it's already a valid URL
  if (
    spot.image_url &&
    (spot.image_url.startsWith('http://') ||
      spot.image_url.startsWith('https://'))
  ) {
    return { uri: spot.image_url };
  }

  // Handle local asset paths with caching
  if (spot.image_url) {
    return getImageFromMap(spot.image_url);
  }

  // Default fallback
  return getDefaultImage();
};

/**
 * Check if a hiking spot is Mt. Babag (simplified for 15 spots system)
 * Only checks for the specific Mt. Babag entry in our allowed spots
 */
export const isMountBabag = (spot: HikingSpot): boolean => {
  return (
    spot.name === 'Mt. Babag' ||
    spot.name === 'Mount Babag' ||
    spot.name.toLowerCase().includes('babag') ||
    spot.id === 3 ||
    spot.id === '3'
  );
};

/**
 * Get the default fallback image
 */
export const getDefaultImage = (): ImageSourcePropType => {
  return require('../assets/images/spot1.jpg');
};
