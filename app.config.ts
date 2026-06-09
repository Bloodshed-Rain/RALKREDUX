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
    // Local-notifications-only: strip the iOS `aps-environment` (push) entitlement.
    // Expo SDK 54 AUTO-APPLIES every installed package's config plugin, so
    // `expo-notifications` runs `withNotificationsIOS` (which unconditionally adds
    // `aps-environment`) whether or not it's listed here — omitting it does nothing.
    // That entitlement is APNs/push-only; this app schedules LOCAL notifications only
    // (no push server/key), so the no-push AdHoc profile doesn't grant it and the iOS
    // build fails codesigning. The plugin below removes it again (it runs last in the
    // entitlements mod chain). Local notifications need no entitlement, so this is safe.
    // The native module still autolinks; Android POST_NOTIFICATIONS ships in the
    // library's manifest and channels are created at runtime in scheduler.ts. Trade-off:
    // the plugin's build-time Android small-icon/accent-color is unavailable — revisit via
    // a custom Android-only plugin once a monochrome icon asset exists. See docs/notifications.md.
    './plugins/with-no-aps-entitlement',
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
