// Local-notifications-only: strip the iOS `aps-environment` (APNs/push) entitlement.
//
// Expo SDK 54 AUTO-APPLIES the config plugin of every installed package
// (config-plugin autolinking). So merely having `expo-notifications` as a
// dependency runs its `withNotificationsIOS` mod, which unconditionally adds
// `aps-environment` to the iOS entitlements — there is NO way to opt out via the
// plugin options, and omitting it from `plugins[]` does nothing. That entitlement
// is PUSH-only; this app schedules LOCAL notifications only (no push server / no
// APNs key), so the auto-generated AdHoc provisioning profile (no push capability)
// doesn't grant it and the iOS build fails codesigning with
// "provisioning profile doesn't include the aps-environment entitlement".
//
// This plugin removes `aps-environment` again. Ordering is load-bearing and works
// out: user `plugins[]` register during `getConfig` (before the autolinked SDK
// plugins), and entitlement mods execute outermost-first chaining inward via
// `nextMod` — so the sequence is: read file → expo-notifications ADDS aps-environment
// → THIS plugin (registered earliest, runs last) REMOVES it. The `delete` is a safe
// no-op if the key is ever absent. Local notifications need no entitlement, so this
// cannot break the feature. See docs/notifications.md.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withNoApsEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
