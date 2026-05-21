const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

// @react-native-google-signin/google-signin v16 ships ESM (lib/module is
// `{"type":"module"}`) with extensionless internal re-exports
// (e.g. `export { GoogleSigninButton } from './buttons/GoogleSigninButton'`).
// Metro's SDK 54 package-exports resolver applies ESM strictness and fails to
// resolve those. Disabling package exports reverts to the classic resolver,
// which adds extensions. Safe here — every dependency also ships a `main`/
// `react-native` entry (this was the default before Expo SDK 53).
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
