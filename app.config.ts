import type { ExpoConfig } from 'expo/config';

export default (): ExpoConfig => ({
  name: 'Rope Access Logbook',
  slug: 'ralb-codex-edition',
  version: '0.2.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'ralb',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  updates: {
    url: 'https://u.expo.dev/33d8a7e1-907a-4e57-b61e-3c9a818c6c1f',
  },
  runtimeVersion: { policy: 'fingerprint' },
  ios: {
    supportsTablet: true,
    // App Store Connect app record 6775173582 is bound to this bundle id. The bare
    // `com.ropeaccess.logbook` is unavailable to ASC app records, and `.signin` was a
    // Services ID (no provisioning possible). Android keeps `com.ropeaccess.logbook`.
    bundleIdentifier: 'com.ropeaccess.logbook.app',
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription: 'Attach work and certification photos to your logbook.',
      NSPhotoLibraryUsageDescription: 'Choose photos for logbook entries and certifications.',
    },
  },
  android: {
    package: 'com.ropeaccess.logbook',
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: ['com.android.vending.BILLING'],
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#F5F1E7',
    },
  },
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#281E17',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-font',
    'expo-apple-authentication',
    './plugins/with-android-billing-launch-mode',
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
    [
      'expo-build-properties',
      {
        ios: {
          // GoogleSignIn's AppCheckCore (Swift) imports these ObjC pods; under
          // static-library linking they must generate module maps or pod install
          // fails with "cannot yet be integrated as static libraries".
          extraPods: [
            { name: 'GoogleUtilities', modular_headers: true },
            { name: 'RecaptchaInterop', modular_headers: true },
          ],
        },
      },
    ],
  ],
  extra: {
    appFlavor: 'codex-edition',
    revenueCat: {
      appleApiKey:
        process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY?.trim() ||
        process.env.REVENUECAT_APPLE_KEY?.trim() ||
        '',
      googleApiKey:
        process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY?.trim() ||
        process.env.REVENUECAT_GOOGLE_KEY?.trim() ||
        '',
      entitlementId:
        process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() ||
        process.env.REVENUECAT_ENTITLEMENT_ID?.trim() ||
        'pro',
      offeringId:
        process.env.EXPO_PUBLIC_REVENUECAT_OFFERING_ID?.trim() ||
        process.env.REVENUECAT_OFFERING_ID?.trim() ||
        '',
      iosProductIds:
        process.env.EXPO_PUBLIC_REVENUECAT_IOS_PRODUCT_IDS?.trim() ||
        process.env.REVENUECAT_IOS_PRODUCT_IDS?.trim() ||
        'RALBSub',
      androidProductIds:
        process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_PRODUCT_IDS?.trim() ||
        process.env.REVENUECAT_ANDROID_PRODUCT_IDS?.trim() ||
        'monthly_subscription',
    },
    eas: {
      projectId: '33d8a7e1-907a-4e57-b61e-3c9a818c6c1f',
    },
  },
});
