# TestFlight deployment

The app is configured and verified for an iOS TestFlight build. The remaining
steps require **your Apple credentials** (interactive) and can't be automated
from CI without secrets, so they're documented here.

## Readiness state (verified)

- `app.config.ts`: bundle id `com.ropeaccess.logbook`, marketing `version` 0.1.0,
  `ITSAppUsesNonExemptEncryption: false` (skips the export-compliance prompt),
  `NSCameraUsageDescription` + `NSPhotoLibraryUsageDescription` (required by the
  evidence-photo feature), `usesAppleSignIn`, EAS `projectId`.
- `eas.json`: `production` profile = store distribution + `autoIncrement` +
  `appVersionSource: remote` (unique TestFlight build numbers), real Google iOS
  client id / URL scheme baked into `env`; `submit.production` block present.
- `npx expo-doctor` → 18/18. `npx expo config --type introspect` → exit 0
  (all config plugins resolve). `tsc` clean, `jest` green.

## Prerequisites (one-time)

- Apple Developer Program membership for the team that owns `com.ropeaccess.logbook`.
- Expo account with access to EAS project `ralb-codex-edition`
  (`33d8a7e1-907a-4e57-b61e-3c9a818c6c1f`).
- An App Store Connect app record for `com.ropeaccess.logbook` (EAS can create it
  during submit, or make it manually first).
- `npm i -g eas-cli` (or prefix the commands with `npx`).

## Build + submit (each release)

```bash
eas login
eas build --platform ios --profile production
# First run: EAS prompts for Apple Developer login and auto-creates the
# distribution cert, provisioning profile, bundle-id registration, and the
# "Sign in with Apple" capability. autoIncrement assigns the next build number.

eas submit --platform ios --profile production
# Uploads the .ipa to App Store Connect -> TestFlight. Prompts for Apple ID /
# app. To skip prompts, fill submit.production.ios in eas.json with
# { "appleId", "ascAppId", "appleTeamId" }.
```

Then in **App Store Connect → TestFlight**: wait for processing (~5–15 min) and
add internal testers (or a public link). No export-compliance prompt is expected
(declared exempt above).

## Notes

- Google Sign-In iOS client id + URL scheme are supplied via `eas.json`
  production `env` — no extra step at build time.
- Apple Sign In is offered (`AuthGate`), satisfying App Store guideline 4.8 for
  apps that also offer Google Sign-In.
- Bump `version` in `app.config.ts` for each external TestFlight round if you
  want a new marketing version; the build number auto-increments either way.
- Android/Play is a separate track. The `userInterfaceStyle` Android warning
  (would need `expo-system-ui`) does not affect iOS.
