# App Optimization Scripts

## Cache Clearing Commands

### Clear Expo Cache

```bash
# Clear Expo development cache
npx expo start --clear

# Alternative: Clear all caches
npx expo start -c
```

### Clear React Native Cache (if using bare workflow)

```bash
# Clear React Native cache
npx react-native-clean-project

# Manual cache clearing
rm -rf node_modules
npm cache clean --force
npm install
```

### Clear Metro Cache

```bash
# Clear Metro bundler cache
npx expo start --clear

# Or manually
rm -rf .expo
rm -rf node_modules/.cache
```

## Production Build Commands

### Build for Production (Expo)

```bash
# Build for Android
npx expo build:android --type apk

# Build for iOS
npx expo build:ios --type archive

# Using EAS Build (recommended)
npx eas build --platform android
npx eas build --platform ios
```

### Optimize Bundle Size

```bash
# Analyze bundle size
npx expo export --dump-assetmap

# Enable production optimizations
export NODE_ENV=production
npx expo start --no-dev --minify
```

## Performance Testing

### Test Loading Performance

```bash
# Start with performance monitoring
npx expo start --dev=false --minify

# Test on physical device
npx expo start --tunnel
```

### Bundle Analysis

```bash
# Generate bundle report
npx expo export --dump-assetmap

# Check bundle size
du -sh .expo-shared/assets.json
```

## Troubleshooting

### If app still loads slowly:

1. Clear all caches: `npx expo start --clear`
2. Restart Metro: `npx expo start --reset-cache`
3. Reinstall dependencies: `rm -rf node_modules && npm install`
4. Check for circular dependencies: `npx madge --circular src/`

### If build fails:

1. Update Expo CLI: `npm install -g @expo/cli`
2. Update dependencies: `npx expo install --fix`
3. Clear caches and rebuild
