import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { getSupabaseClient } from './client';

export type AuthProvider = 'apple' | 'google' | 'email';

const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '';

let googleConfigured = false;

// The native Google SDK evaluates `TurboModuleRegistry.getEnforcing('RNGoogleSignin')`
// at *import* time, which throws in any binary that doesn't contain the native
// module (e.g. Expo Go). A static `import` therefore crashes the whole app at
// boot — even in local-only mode where Google sign-in is never used. Loading it
// lazily + guarded keeps the app booting everywhere; Google sign-in is simply
// unavailable until you run a dev/standalone build that includes the module.
type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');
let googleModuleCache: GoogleSignInModule | null | undefined;
function getGoogleSignin(): GoogleSignInModule | null {
  if (googleModuleCache !== undefined) return googleModuleCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    googleModuleCache = require('@react-native-google-signin/google-signin') as GoogleSignInModule;
  } catch {
    googleModuleCache = null;
  }
  return googleModuleCache;
}

/** True when the native Google SDK is present in the current binary. */
export function isGoogleSignInSupported(): boolean {
  return getGoogleSignin() !== null;
}

/**
 * Returns the active Supabase client or throws `supabase_not_configured` when
 * the optional cloud layer is not wired up. Local SQLite remains canonical, so
 * every Supabase-touching auth call funnels through this guard.
 */
function requireSupabaseClient() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('supabase_not_configured');
  }
  return supabase;
}

/** Hex-encode random bytes for use as an OpenID Connect raw nonce. */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Configure the native Google sign-in module from the public client IDs.
 * Idempotent and intentionally decoupled from Supabase configuration: callers
 * may want native auth set up before (or without) the cloud layer. No-op when
 * both client IDs are empty.
 */
export function configureGoogleSignIn(): void {
  if (googleConfigured) return;
  if (!GOOGLE_WEB_CLIENT_ID && !GOOGLE_IOS_CLIENT_ID) return;

  const google = getGoogleSignin();
  if (!google) return; // native module absent (e.g. Expo Go) — no-op, don't crash boot

  google.GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
  });
  googleConfigured = true;
}

/** Apple sign-in is only offered on iOS. */
export function isAppleSignInSupported(): boolean {
  return Platform.OS === 'ios';
}

/** Send a 6-digit email OTP, creating the user if they don't exist yet. */
export async function sendEmailOtp(email: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

/** Verify a 6-digit email OTP and return the resulting session. */
export async function verifyEmailOtp(
  email: string,
  code: string,
): Promise<Session> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  });
  if (error) throw error;
  if (!data.session) throw new Error('auth_no_session');
  return data.session;
}

/**
 * Native "Sign in with Apple" using the secure nonce flow: a random raw nonce is
 * SHA-256 hashed and sent to Apple, while the raw nonce is handed to Supabase so
 * it can verify the returned identity token. User cancellation surfaces as
 * `auth_cancelled` so the UI can ignore it quietly.
 */
export async function signInWithApple(): Promise<Session> {
  const supabase = requireSupabaseClient();

  const rawNonce = toHex(Crypto.getRandomBytes(16));
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code: unknown }).code === 'ERR_REQUEST_CANCELED'
    ) {
      throw new Error('auth_cancelled');
    }
    throw e;
  }

  if (!credential.identityToken) {
    throw new Error('apple_no_identity_token');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
  if (!data.session) throw new Error('auth_no_session');
  return data.session;
}

/**
 * Native "Sign in with Google". v16 of the native module returns a discriminated
 * `{ type: 'success' | 'cancelled' }` response; we also catch the legacy thrown
 * `SIGN_IN_CANCELLED` form for cross-version safety. Both map to `auth_cancelled`.
 */
export async function signInWithGoogle(): Promise<Session> {
  const supabase = requireSupabaseClient();

  const google = getGoogleSignin();
  if (!google) throw new Error('google_signin_unavailable');
  const { GoogleSignin, isErrorWithCode, statusCodes } = google;

  let idToken: string | null | undefined;
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') {
      throw new Error('auth_cancelled');
    }
    idToken = response.data?.idToken;
  } catch (e) {
    if (e instanceof Error && e.message === 'auth_cancelled') {
      throw e;
    }
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error('auth_cancelled');
    }
    throw e;
  }

  if (!idToken) {
    throw new Error('google_no_id_token');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;
  if (!data.session) throw new Error('auth_no_session');
  return data.session;
}

/**
 * Sign out of the Supabase session. The native Google session is cleared on a
 * best-effort basis so a stale native session can't silently re-authenticate.
 */
export async function signOut(): Promise<void> {
  const supabase = requireSupabaseClient();

  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  try {
    const google = getGoogleSignin();
    if (google) await google.GoogleSignin.signOut();
  } catch {
    // Best-effort: ignore failures clearing the native Google session.
  }
}
