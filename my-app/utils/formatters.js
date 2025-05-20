// Format distance in meters to km or m
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
};

// Format duration in seconds to hh:mm:ss
export const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  let result = '';
  
  if (hrs > 0) {
    result += `${hrs}h `;
  }
  
  if (mins > 0 || hrs > 0) {
    result += `${mins}m `;
  }
  
  result += `${secs}s`;
  
  return result.trim();
};

// Format pace (min per km)
export const formatPace = (pace) => {
  if (!pace || isNaN(pace) || pace === 0) {
    return '--:--';
  }
  
  const mins = Math.floor(pace);
  const secs = Math.floor((pace - mins) * 60);
  
  return `${mins}:${secs < 10 ? '0' : ''}${secs}/km`;
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