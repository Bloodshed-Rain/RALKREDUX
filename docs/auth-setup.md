# Authentication setup — Google / Apple / Email OTP

The app **hard-gates on a Supabase account**: an account is required to use it, but only the *first* sign-in needs connectivity — the persisted session lets a signed-in user back in fully offline (local SQLite stays the source of truth). Three methods: **Sign in with Apple** (iOS only), **Google** (iOS + Android), **email 6-digit OTP**.

The client code is implemented (`src/cloud/supabase/auth.ts`, `src/providers/auth-*.tsx`, `src/ui/auth/auth-screen.tsx`, `app/account.tsx`). This doc is the **external setup the code depends on** — without it the buttons render but fail.

> Native modules (`expo-apple-authentication`, `@react-native-google-signin/google-signin`) mean **Expo Go will not work** — you need an EAS dev-client build.

---

## 1. Supabase dashboard (Authentication → Providers)

**Email OTP**
- Enable the **Email** provider.
- Email Templates → confirm the template includes the code token `{{ .Token }}` (the default OTP email does).
- **Settings → SMTP — required before launch.** The built-in email sender is rate-limited (~4/hour) and not for production. Configure a real provider (Resend / Postmark / SendGrid).

**Apple**
- Enable the **Apple** provider.
- Add the app bundle id `com.ropeaccess.logbook` to **Authorized Client IDs** (so Supabase accepts the identity token minted by native iOS sign-in).
- For token verification, add the Services ID + Sign in with Apple key (see §3).

**Google**
- Enable the **Google** provider.
- **Client ID / Secret** = your **Web** OAuth client (from §2).
- **Authorized Client IDs** — add **both** the iOS and Web client IDs, so Supabase accepts the `idToken`s the native SDK mints.

## 2. Google Cloud Console (APIs & Services → Credentials)

Create OAuth client IDs and an OAuth consent screen:
| Client type | Used for | Maps to |
|---|---|---|
| **Web application** | Supabase Google provider Client ID + Secret; SDK `webClientId` | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| **iOS** (bundle `com.ropeaccess.logbook`) | native iOS sign-in | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` + reversed form → `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` (`com.googleusercontent.apps.…`) |
| **Android** (package `com.ropeaccess.logbook.codex` + signing SHA-1) | native Android sign-in — **required** or sign-in fails on-device with `DEVELOPER_ERROR` (see §6) | no code value; idToken mints against the **Web** client. SHA-1 from `eas credentials` |

## 3. Apple Developer

- App ID `com.ropeaccess.logbook` → enable the **Sign in with Apple** capability. (`usesAppleSignIn: true` + the `expo-apple-authentication` plugin add the entitlement at build time.)
- For Supabase to verify tokens: create a **Services ID** + a **Sign in with Apple key (.p8)**, then enter the Key ID, Team ID, and Services ID in the Supabase Apple provider.
- **App Store Guideline 4.8**: Sign in with Apple is **required because we offer Google**. The Apple button shows on iOS only; if you ever drop Google you can drop Apple.
- **First-sign-in only:** Apple returns the user's name/email only on the *very first* authorization; later sign-ins return `null` name and a private-relay email. We don't capture the name today — if you add display names later, persist them on first sign-in or they're gone for good.

## 4. Environment variables

Set in `.env` locally and as **EAS secrets** for builds (see `.env.example`):
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME=   # com.googleusercontent.apps.<reversed iOS id>
```
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` are already required for the cloud layer.

## 5. Build & test

```bash
eas build --profile development --platform ios       # or android
```
Then verify: Apple (iOS), Google (iOS + Android), and email OTP (check inbox for the 6-digit code → enter → signed in).

## 6. Android Google sign-in — verified setup & `DEVELOPER_ERROR`

Android identifies the app by **package name + signing-key SHA-1**, not a client ID (unlike iOS). If no **Android OAuth client** in the Google Cloud project (`665912221058`) matches, `GoogleSignin.signIn()` fails *on-device* with `DEVELOPER_ERROR` — Google's auth server returns *"This android application is not registered to use OAuth2.0…"* (visible in `adb logcat`, tag `Auth`/`GetTokenResponseHandler`). The token never mints, so **nothing reaches Supabase** and the auth logs stay silent — that silence is the tell that the failure is on-device, not an audience rejection.

Two things Android needs that iOS didn't:
1. **Android OAuth client** — Console-only (no public API to create OAuth client IDs): APIs & Services → Credentials → Create → OAuth client ID → **Android**, package `com.ropeaccess.logbook.codex`, SHA-1 of the installed build's signing key. No secret, no `.env`/code change.
2. **Supabase → Auth → Providers → Google → Authorized Client IDs** must include the **Web** client ID — on Android the idToken's `aud` is the Web client (iOS uses the iOS client). List both iOS + Web, comma-separated, or Android gets past the device and is rejected with `bad_id_token`.

**Verified SHA-1 for the current EAS-managed keystore** (signs every `eas build` dev/preview/internal APK — confirmed against installed preview build #8, 2026-06-01; full Google→Supabase chain verified working on Android):
```
02:D6:27:66:69:69:E6:CB:77:84:FA:FB:20:98:44:D8:35:62:07:3B
```
Re-derive only if the EAS keystore is ever regenerated: `eas credentials -p android` (interactive), or extract from any build APK's signing block. **Play Store:** shipping an AAB triggers Google Play re-signing with a *different* key — add **that** SHA-1 (Play Console → App integrity → App signing key) as a second Android-client fingerprint when you go to production.

---

## Behavior & invariants

- **Hard gate, offline-capable.** Account required; only the first sign-in needs a network. The persisted session (AsyncStorage) lets a signed-in user reopen the app offline.
- **Unconfigured = local-only.** If `EXPO_PUBLIC_SUPABASE_*` is unset (local dev, web preview, backend-less build), `AuthGate` falls through and the offline-first logbook works with no gate.
- **Anonymous auth is removed.** Hosted remote-signing now runs as the real signed-in user (`owner_id = auth.uid()`); the RLS policies and Edge Functions were already `authenticated`-scoped, so no backend change was needed.
- **Local data is device-local + single-profile.** Signing in is identity/billing only — it never swaps the local logbook.
- **Preview-stage fresh start.** Existing anonymous rows are not migrated/linked to new accounts (no production users yet).

## RevenueCat (when billing lands)

Create the Supabase user **first**, then `Purchases.logIn(supabaseUser.id)`. `user.id` is the durable identifier subscriptions bind to — don't pick a different one.
