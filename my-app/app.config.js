import 'dotenv/config';

export default {
  expo: {
    name: 'Ascentra Hiking App',
    slug: 'ascentra-hiking-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      accuWeatherApiKey: process.env.EXPO_PUBLIC_ACCUWEATHER_API_KEY,
      eas: {
        projectId: 'your-project-id',
      },
    },
  },
};
