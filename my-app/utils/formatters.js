// Format distance to show as km with one decimal, or in meters if small
export const formatDistance = (meters, strava = false) => {
  if (!meters) return '0 m';
  
  if (strava) {
    // Strava-style formatting
    if (meters < 1000) {
      return `${meters.toFixed(0)} m`;
    } else {
      const km = meters / 1000;
      return `${km.toFixed(2)} km`;
    }
  } else {
    // Original formatting
    if (meters < 1000) {
      return `${meters.toFixed(0)} m`;
    } else {
      const km = meters / 1000;
      return `${km.toFixed(2)} km`;
    }
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