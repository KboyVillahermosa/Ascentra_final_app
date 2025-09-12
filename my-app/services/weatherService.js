import Constants from 'expo-constants';

// AccuWeather API configuration
const ACCUWEATHER_API_KEY =
  Constants.expoConfig?.extra?.accuWeatherApiKey ||
  process.env.EXPO_PUBLIC_ACCUWEATHER_API_KEY ||
  'your_accuweather_api_key';
const ACCUWEATHER_BASE_URL = 'http://dataservice.accuweather.com';

// Mount Babag specific coordinates
const MOUNT_BABAG_COORDS = {
  latitude: 10.3509,
  longitude: 123.8586,
  elevation: 752, // meters above sea level
};

/**
 * Get location key for AccuWeather API using coordinates
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<string|null>} Location key or null if failed
 */
export const getLocationKey = async (latitude, longitude) => {
  try {
    if (ACCUWEATHER_API_KEY === 'your_accuweather_api_key') {
      console.log(
        'Using mock location key. Get a free API key at https://developer.accuweather.com/',
      );
      return 'mock_location_key';
    }

    const response = await fetch(
      `${ACCUWEATHER_BASE_URL}/locations/v1/cities/geoposition/search?apikey=${ACCUWEATHER_API_KEY}&q=${latitude},${longitude}&details=true`,
    );

    if (!response.ok) {
      throw new Error(`AccuWeather location API error: ${response.status}`);
    }

    const data = await response.json();
    return data.Key;
  } catch (error) {
    console.error('Error getting AccuWeather location key:', error);
    return null;
  }
};

/**
 * Get current weather conditions from AccuWeather
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Object|null>} Weather data or null if failed
 */
export const getCurrentWeather = async (latitude, longitude) => {
  try {
    // Check if this is Mount Babag location
    const isMountBabag =
      Math.abs(latitude - MOUNT_BABAG_COORDS.latitude) < 0.01 &&
      Math.abs(longitude - MOUNT_BABAG_COORDS.longitude) < 0.01;

    if (ACCUWEATHER_API_KEY === 'your_accuweather_api_key') {
      console.log(
        'Using mock weather data for Mount Babag. Get a free API key at https://developer.accuweather.com/',
      );

      // Enhanced mock weather data specifically for Mount Babag
      return {
        temperature: isMountBabag ? 18 : 28, // Cooler at Mount Babag elevation
        description: isMountBabag
          ? 'Cool mountain breeze with clear skies'
          : 'Partly cloudy',
        humidity: isMountBabag ? 82 : 75, // Higher humidity in mountains
        windSpeed: isMountBabag ? 4.5 : 2.8, // Stronger winds at elevation
        windDirection: isMountBabag ? 'NE' : 'E',
        pressure: isMountBabag ? 925 : 1013, // Lower pressure at 752m elevation
        feelsLike: isMountBabag ? 19 : 30,
        uvIndex: isMountBabag ? 8 : 6, // Higher UV at elevation
        visibility: isMountBabag ? 15 : 10, // Better visibility in mountains
        cloudCover: isMountBabag ? 20 : 40,
        location: isMountBabag ? 'Mount Babag, Cebu City' : 'Cebu City',
        elevation: isMountBabag ? MOUNT_BABAG_COORDS.elevation : 0,
        weatherIcon: isMountBabag ? 1 : 3, // 1 = sunny, 3 = partly cloudy
        isDayTime: true,
        precipitationProbability: isMountBabag ? 10 : 20,
      };
    }

    // Get location key first
    const locationKey = await getLocationKey(latitude, longitude);
    if (!locationKey) {
      throw new Error('Could not get location key');
    }

    // Get current conditions
    const response = await fetch(
      `${ACCUWEATHER_BASE_URL}/currentconditions/v1/${locationKey}?apikey=${ACCUWEATHER_API_KEY}&details=true`,
    );

    if (!response.ok) {
      throw new Error(
        `AccuWeather current conditions API error: ${response.status}`,
      );
    }

    const data = await response.json();
    const currentCondition = data[0];

    if (!currentCondition) {
      throw new Error('No current weather data available');
    }

    // Transform AccuWeather data to our format
    return {
      temperature: Math.round(currentCondition.Temperature.Metric.Value),
      description: currentCondition.WeatherText,
      humidity: currentCondition.RelativeHumidity,
      windSpeed: currentCondition.Wind.Speed.Metric.Value,
      windDirection: currentCondition.Wind.Direction.Localized,
      pressure: currentCondition.Pressure.Metric.Value,
      feelsLike: Math.round(currentCondition.RealFeelTemperature.Metric.Value),
      uvIndex: currentCondition.UVIndex,
      visibility: currentCondition.Visibility.Metric.Value,
      cloudCover: currentCondition.CloudCover,
      location: isMountBabag ? 'Mount Babag, Cebu City' : 'Cebu City',
      elevation: isMountBabag ? MOUNT_BABAG_COORDS.elevation : 0,
      weatherIcon: currentCondition.WeatherIcon,
      isDayTime: currentCondition.IsDayTime,
      precipitationProbability:
        currentCondition.PrecipitationSummary?.Precipitation?.Metric?.Value ||
        0,
    };
  } catch (error) {
    console.error('Error fetching AccuWeather data:', error);

    // Fallback to enhanced mock data
    const isMountBabag =
      Math.abs(latitude - MOUNT_BABAG_COORDS.latitude) < 0.01 &&
      Math.abs(longitude - MOUNT_BABAG_COORDS.longitude) < 0.01;

    return {
      temperature: isMountBabag ? 18 : 28,
      description: isMountBabag
        ? 'Cool mountain breeze with clear skies'
        : 'Partly cloudy',
      humidity: isMountBabag ? 82 : 75,
      windSpeed: isMountBabag ? 4.5 : 2.8,
      windDirection: isMountBabag ? 'NE' : 'E',
      pressure: isMountBabag ? 925 : 1013,
      feelsLike: isMountBabag ? 19 : 30,
      uvIndex: isMountBabag ? 8 : 6,
      visibility: isMountBabag ? 15 : 10,
      cloudCover: isMountBabag ? 20 : 40,
      location: isMountBabag ? 'Mount Babag, Cebu City' : 'Cebu City',
      elevation: isMountBabag ? MOUNT_BABAG_COORDS.elevation : 0,
      weatherIcon: isMountBabag ? 1 : 3,
      isDayTime: true,
      precipitationProbability: isMountBabag ? 10 : 20,
    };
  }
};

/**
 * Get 5-day weather forecast from AccuWeather
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Array|null>} Forecast data or null if failed
 */
export const getWeatherForecast = async (latitude, longitude) => {
  try {
    if (ACCUWEATHER_API_KEY === 'your_accuweather_api_key') {
      console.log(
        'Using mock forecast data. Get a free API key at https://developer.accuweather.com/',
      );

      // Mock 5-day forecast for Mount Babag
      const isMountBabag =
        Math.abs(latitude - MOUNT_BABAG_COORDS.latitude) < 0.01 &&
        Math.abs(longitude - MOUNT_BABAG_COORDS.longitude) < 0.01;

      return Array.from({ length: 5 }, (_, index) => ({
        date: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        dayTemp: isMountBabag ? 22 + Math.random() * 4 : 30 + Math.random() * 4,
        nightTemp: isMountBabag
          ? 15 + Math.random() * 3
          : 24 + Math.random() * 3,
        description: isMountBabag ? 'Mountain breeze' : 'Partly cloudy',
        precipitationProbability: Math.floor(Math.random() * 30),
        windSpeed: isMountBabag ? 3 + Math.random() * 2 : 2 + Math.random() * 2,
      }));
    }

    const locationKey = await getLocationKey(latitude, longitude);
    if (!locationKey) {
      throw new Error('Could not get location key');
    }

    const response = await fetch(
      `${ACCUWEATHER_BASE_URL}/forecasts/v1/daily/5day/${locationKey}?apikey=${ACCUWEATHER_API_KEY}&details=true&metric=true`,
    );

    if (!response.ok) {
      throw new Error(`AccuWeather forecast API error: ${response.status}`);
    }

    const data = await response.json();

    return data.DailyForecasts.map(forecast => ({
      date: forecast.Date.split('T')[0],
      dayTemp: Math.round(forecast.Temperature.Maximum.Value),
      nightTemp: Math.round(forecast.Temperature.Minimum.Value),
      description: forecast.Day.IconPhrase,
      precipitationProbability: forecast.Day.PrecipitationProbability,
      windSpeed: forecast.Day.Wind.Speed.Value,
    }));
  } catch (error) {
    console.error('Error fetching AccuWeather forecast:', error);
    return null;
  }
};

/**
 * Get weather icon URL for AccuWeather icon number
 * @param {number} iconNumber
 * @param {boolean} isDayTime
 * @returns {string} Icon URL
 */
export const getWeatherIconUrl = (iconNumber, isDayTime = true) => {
  const iconSize = '100x100';
  const iconPadding = iconNumber < 10 ? '0' : '';
  return `https://developer.accuweather.com/sites/default/files/${iconSize}/${iconPadding}${iconNumber}-s.png`;
};

/**
 * Check if coordinates are Mount Babag location
 * @param {number} latitude
 * @param {number} longitude
 * @returns {boolean}
 */
export const isMountBabagLocation = (latitude, longitude) => {
  return (
    Math.abs(latitude - MOUNT_BABAG_COORDS.latitude) < 0.01 &&
    Math.abs(longitude - MOUNT_BABAG_COORDS.longitude) < 0.01
  );
};

export { MOUNT_BABAG_COORDS };
