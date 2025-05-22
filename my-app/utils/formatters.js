/**
 * Format distance in meters to Strava-like km display
 * @param {number} meters - Distance in meters
 * @returns {string} - Formatted distance string
 */
export const formatDistance = (meters) => {
  // Return 0.00 km if no distance or invalid
  if (!meters || isNaN(meters) || meters < 0) return '0.00 km';
  
  // Always show in kilometers with appropriate precision
  const km = meters / 1000;
  
  if (km < 10) {
    // For distances less than 10km, show two decimal places (e.g., 3.45 km)
    return `${km.toFixed(2)} km`;
  } else if (km < 100) {
    // For distances between 10-100km, show one decimal place (e.g., 15.4 km)
    return `${km.toFixed(1)} km`;
  } else {
    // For distances over 100km, show no decimal places (e.g., 103 km)
    return `${Math.round(km)} km`;
  }
};

// Format duration as MM:SS or HH:MM:SS depending on length
export const formatDuration = (seconds, strava = false) => {
  if (!seconds) return '0:00';
  
  if (strava) {
    // Strava-style simple format: 1m 34s or 1h 2m
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    } else {
      return `${mins}m ${secs}s`;
    }
  } else {
    // Original formatting
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  }
};

// Format pace as MM:SS/km
export const formatPace = (metersPerSecond) => {
  if (!metersPerSecond || metersPerSecond === 0) return '-:--/km';
  
  // Convert m/s to s/km
  const secondsPerKm = (1000 / metersPerSecond);
  
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.floor(secondsPerKm % 60);
  
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
};

// Format date
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format a date into a relative time string (e.g. "2 hours ago")
export function formatRelativeTime(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}