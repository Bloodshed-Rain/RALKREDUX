# Android beta deployment (Play internal testing)

Companion to `docs/testflight-deploy.md`. Android beta distribution runs
through the **Play Console internal testing track** — that's the only way to
exercise real Google Play Billing (the RevenueCat `monthly_subscription`
product) before production.

## Readiness state (verified 2026-07-03)

- `app.config.ts`: Android package `com.ropeaccess.logbook` (existing Play
  Console identity — iOS deliberately differs, see CLAUDE.md),
  `com.android.vending.BILLING` permission, billing launch-mode config plugin
  (`plugins/with-android-billing-launch-mode.js`), EAS `projectId`.
- `eas.json` `production` profile: AAB (default `buildType`), `autoIncrement`
  (remote `versionCode`), channel `production`.
- EAS server env (`eas env:list production`): `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY`
  present, plus entitlement/offering ids — billing is live-configured in
  production builds. (The `preview` profile builds sideload APKs; Play Billing
  will NOT work in a sideloaded build — always beta-test billing through the
  Play track.)
- Android keystore: managed by EAS (`Build Credentials t8jbLQm0Wm`). The same
  keystore's SHA-1 is registered on the Google OAuth Android client, so Google
  Sign-In works in EAS builds (see the 2026-06-01 fix).

## Build (each release)

```bash
eas login                     # bloodshed_ra1n
eas build --platform android --profile production
# autoIncrement assigns the next versionCode. Output artifact is an .aab.
```

## Upload to the internal testing track

**First upload (or if `eas submit` has no service account yet) — manual:**

1. Download the `.aab` from the EAS build page.
2. Play Console → Rope Access Logbook (`com.ropeaccess.logbook`) → Testing →
   **Internal testing** → Create new release → upload the `.aab`.
3. If Play App Signing complains about the upload key, the Console app record
   was created with a different upload key than the EAS keystore — resolve via
   Play Console → Setup → App signing (register the EAS upload key or request
   an upload-key reset) before anything else.
4. Add a tester email list (up to 100 for internal testing) and roll out.
   Testers install via the opt-in link Play generates.

**Automated (after one-time service-account setup):**

1. Google Cloud Console → create a service account; Play Console → Users &
   permissions → invite the service account with release-manager permission.
2. Download its JSON key, keep it OUT of the repo, and reference it:

```jsonc
// eas.json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "../play-service-account.json",
      "track": "internal"
    }
  }
}
```

```bash
eas submit --platform android --profile production
```

## Testing billing in the beta

- Add tester Google accounts under Play Console → Setup → **License testing**
  so subscription purchases run against test instruments (no real charge,
  accelerated renewal clock).
- The `monthly_subscription` product must be **Active** in Play Console →
  Monetize → Subscriptions, and the app must be published to at least the
  internal track for purchases to resolve.
- RevenueCat: the Play package + service credentials must be configured in the
  RevenueCat dashboard for the `goog_…` public key baked into the build.

## Notes

- Sideloaded `preview` APKs are fine for UI/flow testing but will report
  billing unavailable / product-not-found — that's expected, not a bug.
- Google requires closed-testing time before production for newer personal
  accounts; internal testing has no review delay and is the fastest loop.
- Subscription paywall posture: only a store-confirmed lack of entitlement
  blocks the app; offline/unverifiable states pass through (offline-first
  invariant). Test both by toggling airplane mode after first launch.
