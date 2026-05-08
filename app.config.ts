import type { ExpoConfig } from 'expo/config';

export default (): ExpoConfig => ({
  name: 'RALB Codex Edition',
  slug: 'ralb-codex-edition',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'ralb',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  runtimeVersion: { policy: 'fingerprint' },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.ropeaccess.logbook.codex',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription: 'Attach work and certification photos to your logbook.',
      NSPhotoLibraryUsageDescription: 'Choose photos for logbook entries and certifications.',
      NSLocationWhenInUseUsageDescription: 'Optionally stamp a work entry with job-site location.',
    },
  },
  android: {
    package: 'com.ropeaccess.logbook.codex',
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#F8F6F1',
    },
  },
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#F8F6F1',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-router', 'expo-sqlite'],
  extra: {
    appFlavor: 'codex-edition',
    eas: {
      projectId: '33d8a7e1-907a-4e57-b61e-3c9a818c6c1f',
    },
  },
});
