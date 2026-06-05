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
      backgroundColor: '#CACCC5',
    },
  },
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#CACCC5',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-apple-authentication',
    // NOTE: the `expo-notifications` config plugin is intentionally NOT listed. Its iOS
    // mod (withNotificationsIOS) unconditionally adds the `aps-environment` entitlement +
    // `remote-notification` background mode — both PUSH-only — which makes EAS require an
    // APNs push key and fails the build with "provisioning profile doesn't include the
    // aps-environment entitlement". This app uses LOCAL notifications only (no push
    // server/tokens), which need no entitlement: the native module autolinks and works
    // without the plugin, and Android POST_NOTIFICATIONS ships in the library's bundled
    // manifest. Notification channels are created at runtime in
    // src/notifications/scheduler.ts. Trade-off: the plugin's build-time Android small-icon
    // + accent-color customization is unavailable; revisit via a custom Android-only plugin
    // once a monochrome notification icon asset exists. See docs/notifications.md.
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
