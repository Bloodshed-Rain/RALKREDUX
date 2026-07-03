// RevenueCat purchase flows can send the customer to another app for payment
// verification. Keep MainActivity on a purchase-safe launch mode so Android
// resumes the transaction instead of cancelling it when the user returns.
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

module.exports = function withAndroidBillingLaunchMode(config) {
  return withAndroidManifest(config, (cfg) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    mainActivity.$['android:launchMode'] = 'singleTop';
    return cfg;
  });
};
