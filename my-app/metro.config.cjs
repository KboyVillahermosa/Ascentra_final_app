const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add resolver configuration to handle Node.js modules
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Block problematic Node.js modules and ws library
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/react-native\/.*/,
  /node_modules\/ws\/.*/,
  /node_modules\/@expo\/ws-tunnel\/.*/,
];

// Add module map for Node.js polyfills and block ws
config.resolver.alias = {
  ...config.resolver.alias,
  'stream': 'stream-browserify',
  'util': 'util',
  'crypto': 'react-native-crypto',
  'buffer': '@craftzdog/react-native-buffer',
  'ws': false,
  '@expo/ws-tunnel': false,
};

// Additional resolver options
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Block ws and related modules completely
  if (moduleName === 'ws' || moduleName.includes('ws/lib') || moduleName === '@expo/ws-tunnel') {
    return {
      type: 'empty',
    };
  }
  
  // Use default resolver for other modules
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;