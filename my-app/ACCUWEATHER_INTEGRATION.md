# AccuWeather API Integration

This document explains the AccuWeather API integration for real-time weather conditions in the Ascentra Hiking App, specifically optimized for Mount Babag location.

## Overview

The app now uses AccuWeather API to provide accurate, real-time weather data with enhanced information for mountain hiking conditions. The integration is specifically optimized for Mount Babag (10.3509° N, 123.8586° E, 752m elevation) in Cebu City, Philippines.

## Features

### Enhanced Weather Data

- **Temperature & Feels Like**: Current temperature with real-feel calculation
- **Weather Description**: Detailed weather conditions
- **Humidity**: Relative humidity percentage
- **Wind Information**: Speed and direction
- **Atmospheric Pressure**: Barometric pressure in hPa
- **UV Index**: Sun exposure level for outdoor activities
- **Visibility**: Atmospheric visibility in kilometers
- **Precipitation Probability**: Chance of rain percentage
- **Elevation Display**: Shows Mount Babag's 752m elevation
- **Location-Specific Data**: Optimized for mountain weather conditions

### Mount Babag Specific Features

- Coordinates: 10.3509° N, 123.8586° E
- Elevation: 752 meters (2,467 ft) above sea level
- Location: Barangay Babag, Cebu City, Philippines
- Enhanced mock data when API is unavailable
- Mountain-specific weather patterns and conditions

## Setup Instructions

### 1. Get AccuWeather API Key

1. Visit [AccuWeather Developer Portal](https://developer.accuweather.com/)
2. Create a free account
3. Create a new app to get your API key
4. Free tier provides 50 API calls per day

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` file and add your API key:

   ```env
   EXPO_PUBLIC_ACCUWEATHER_API_KEY=your_actual_api_key_here
   ```

3. Restart your development server:
   ```bash
   npx expo start --clear
   ```

## API Usage

### Weather Service (`services/weatherService.js`)

The weather service provides several functions:

```javascript
import {
  getCurrentWeather,
  MOUNT_BABAG_COORDS,
  isMountBabagLocation,
} from '../services/weatherService';

// Get current weather for any location
const weather = await getCurrentWeather(latitude, longitude);

// Check if coordinates are Mount Babag
const isMountBabag = isMountBabagLocation(latitude, longitude);

// Mount Babag coordinates
console.log(MOUNT_BABAG_COORDS); // { latitude: 10.3509, longitude: 123.8586, elevation: 752 }
```

### Weather Data Structure

```javascript
{
  temperature: 18,                    // °C
  description: "Cool mountain breeze with clear skies",
  humidity: 82,                       // %
  windSpeed: 4.5,                     // m/s
  windDirection: "NE",                // Cardinal direction
  pressure: 925,                      // hPa (lower at elevation)
  feelsLike: 19,                      // °C
  uvIndex: 8,                         // UV index (higher at elevation)
  visibility: 15,                     // km
  cloudCover: 20,                     // %
  location: "Mount Babag, Cebu City",
  elevation: 752,                     // meters
  isDayTime: true,
  precipitationProbability: 10,       // %
  weatherIcon: 1                      // AccuWeather icon number
}
```

## Fallback Behavior

### Mock Data

When the API key is not configured or API calls fail, the app uses enhanced mock weather data:

- **Mount Babag**: Cooler temperatures (18°C), higher humidity (82%), stronger winds (4.5 m/s)
- **Other Locations**: Standard tropical weather (28°C, 75% humidity, 2.8 m/s wind)
- **Mountain Conditions**: Accounts for elevation effects on pressure, temperature, and UV exposure

### Error Handling

- Graceful fallback to mock data on API failures
- User-friendly error messages
- Automatic retry mechanisms
- Offline capability with cached data

## UI Enhancements

### Weather Display

- **Location with Elevation**: Shows "Mount Babag, Cebu City • 752m elevation"
- **Responsive Grid Layout**: Adapts to different screen sizes
- **Additional Weather Cards**: UV Index, Visibility, Rain Chance
- **Wind Direction**: Shows both speed and direction (e.g., "Wind NE")
- **Real-time Updates**: Refresh button with timestamp

### Visual Improvements

- Flexible grid layout for weather cards
- Consistent card sizing and spacing
- Mountain-specific icons and styling
- Enhanced typography for readability

## Technical Implementation

### Files Modified

1. **`services/weatherService.js`** - New AccuWeather API service
2. **`screens/HikingSpotDetailsScreen.js`** - Updated weather integration
3. **`app.config.js`** - Environment variable configuration
4. **`.env.example`** - API key setup instructions

### API Endpoints Used

- **Location Search**: `/locations/v1/cities/geoposition/search`
- **Current Conditions**: `/currentconditions/v1/{locationKey}`
- **5-Day Forecast**: `/forecasts/v1/daily/5day/{locationKey}` (available for future use)

## Performance Considerations

### API Rate Limits

- Free tier: 50 calls per day
- Cached responses to minimize API usage
- Smart refresh intervals
- Location-based optimization

### Optimization Features

- Automatic Mount Babag detection
- Efficient coordinate comparison
- Minimal API calls with maximum data extraction
- Graceful degradation on rate limit exceeded

## Future Enhancements

### Planned Features

- 5-day weather forecast
- Weather alerts and warnings
- Historical weather data
- Weather-based hiking recommendations
- Push notifications for weather changes

### Additional Integrations

- Weather radar integration
- Sunrise/sunset times
- Moon phase information
- Air quality index
- Weather-based trail condition updates

## Troubleshooting

### Common Issues

1. **"Using mock weather data" message**
   - Check if API key is properly set in `.env` file
   - Verify API key is valid and active
   - Restart development server after adding API key

2. **Weather not updating**
   - Check internet connection
   - Verify API rate limits not exceeded
   - Check console for error messages

3. **Location not detected as Mount Babag**
   - Verify coordinates are within tolerance (±0.01 degrees)
   - Check GPS accuracy and permissions

### Debug Information

- Weather service logs API calls and responses
- Mock data clearly identified in console
- Error messages provide specific failure reasons
- Network status monitoring included

## Support

For issues related to AccuWeather integration:

1. Check the console logs for detailed error messages
2. Verify API key configuration
3. Test with mock data first
4. Review AccuWeather API documentation
5. Check network connectivity and rate limits

---

**Note**: This integration provides enhanced weather information specifically optimized for Mount Babag hiking conditions, including elevation-adjusted data and mountain-specific weather patterns.
