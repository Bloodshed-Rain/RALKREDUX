// P2-4: fetchHostedRemoteSigningRequest must distinguish a genuine 404 (the
// request truly does not exist → null → verify screen shows "Request not found")
// from a transient 4xx/5xx backend error (→ throw → query lands in isError →
// verify screen shows "Couldn't connect" and the auto-sync poller backs off).
// Collapsing both into null tells a verifier with a valid link their code is
// wrong and makes the poller hammer a failing backend forever.

// The function under test uses fetch + EXPO_PUBLIC_* directly and never touches
// the Supabase client, but the module imports ./client at load — which pulls in
// async-storage (a native module unavailable under jest). Stub it so the module
// loads without the native dependency.
jest.mock('@/src/cloud/supabase/client', () => ({
  ensureSupabaseSession: jest.fn(),
  getSupabaseClient: jest.fn(() => null),
  isSupabaseConfigured: jest.fn(() => true),
}));

describe('fetchHostedRemoteSigningRequest error discrimination (P2-4)', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    jest.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function load() {
    // Required fresh so the module re-reads EXPO_PUBLIC_* at import time.
    return require('@/src/cloud/supabase/remote-signing');
  }

  it('returns null for a genuine 404 (missing request)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;
    const { fetchHostedRemoteSigningRequest } = load();
    await expect(fetchHostedRemoteSigningRequest('CODE', 'token')).resolves.toBeNull();
  });

  it('throws on a transient 5xx so the screen shows a connection error, not "not found"', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    const { fetchHostedRemoteSigningRequest } = load();
    await expect(fetchHostedRemoteSigningRequest('CODE', 'token')).rejects.toThrow();
  });

  it('throws on a 400 (internal error surfaced as bad request), not a silent null', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400 }) as unknown as typeof fetch;
    const { fetchHostedRemoteSigningRequest } = load();
    await expect(fetchHostedRemoteSigningRequest('CODE', 'token')).rejects.toThrow();
  });
});
