import type { ExpoConfig } from 'expo/config';

export default (): ExpoConfig => ({
  name: 'Rope Access Logbook',
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
    bundleIdentifier: 'com.ropeaccess.logbook',
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription: 'Attach work and certification photos to your logbook.',
      NSPhotoLibraryUsageDescription: 'Choose photos for logbook entries and certifications.',
    },
  },
  android: {
    package: 'com.ropeaccess.logbook.codex',
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1E232A',
    },
  },
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#1E232A',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-font',
    'expo-apple-authentication',
    [
      '@react-native-google-signin/google-signin',
      {
        // Reversed iOS OAuth client ID. Set EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
        // before an iOS build; the placeholder only keeps config valid in dev.
        iosUrlScheme:
          process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim() ||
          'com.googleusercontent.apps.PLACEHOLDER',
      },
    ],
  ],
  extra: {
    appFlavor: 'codex-edition',
    eas: {
      projectId: '33d8a7e1-907a-4e57-b61e-3c9a818c6c1f',
    },
  },
});
