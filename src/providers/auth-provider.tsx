import React from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '@/src/cloud/supabase/client';
import { configureGoogleSignIn, signOut as authSignOut } from '@/src/cloud/supabase/auth';
import { PrefKeys, readPref, writePref } from '@/src/storage/local-prefs';

export type AuthStatus = 'loading' | 'signed_in' | 'signed_out';

interface AuthContextValue {
  /** Whether the optional Supabase cloud layer is wired up at all. */
  configured: boolean;
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = React.useState<Session | null>(null);
  // When the cloud layer is absent there's nothing to wait for — treat it as
  // resolved-signed-out so the gate falls through to local-only mode.
  const [status, setStatus] = React.useState<AuthStatus>(configured ? 'loading' : 'signed_out');

  React.useEffect(() => {
    if (!configured) return;
    configureGoogleSignIn();
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let active = true;

    (async () => {
      // getSession() tries to refresh an expired access token over the network
      // and returns null when that refresh FAILS (e.g. offline). To keep the app
      // usable offline after the first sign-in, fall back to a persisted
      // "has authenticated" flag: a previously signed-in user stays in until a
      // definitive SIGNED_OUT (explicit sign-out or a server-confirmed invalid
      // token), which only happens when there's connectivity.
      const [{ data }, authedBefore] = await Promise.all([
        supabase.auth.getSession(),
        readPref<boolean>(PrefKeys.authedBefore, false),
      ]);
      if (!active) return;
      if (data.session) {
        setSession(data.session);
        setStatus('signed_in');
        void writePref(PrefKeys.authedBefore, true);
      } else {
        setSession(null);
        setStatus(authedBefore ? 'signed_in' : 'signed_out');
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (nextSession) {
        setSession(nextSession);
        setStatus('signed_in');
        void writePref(PrefKeys.authedBefore, true);
      } else if (event === 'SIGNED_OUT') {
        // Definitive: explicit sign-out, or the server rejected the refresh
        // token (revoked / expired). Network failures do NOT emit this.
        setSession(null);
        setStatus('signed_out');
        void writePref(PrefKeys.authedBefore, false);
      }
      // A null session on INITIAL_SESSION / other events (offline with an
      // expired token) is intentionally ignored so we don't evict a known user.
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  const signOut = React.useCallback(async () => {
    // Revoke FIRST, then persist the flag. authSignOut() throws on a failed or
    // offline revoke (Supabase's _signOut swallows only AuthApiError 404/401/403,
    // not a retryable network error). Writing authedBefore=false before the
    // revoke would durably poison the flag, so the next offline cold start would
    // resolve to signed_out and hard-gate an established technician out of their
    // canonical local logbook. This order leaves offline access intact when the
    // server can't be reached, while a successful revoke still clears the flag.
    await authSignOut();
    await writePref(PrefKeys.authedBefore, false);
    setSession(null);
    setStatus('signed_out');
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({ configured, status, session, user: session?.user ?? null, signOut }),
    [configured, status, session, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
