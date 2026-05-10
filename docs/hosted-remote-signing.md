# Hosted Remote Signing Foundation

This note describes the Supabase layer for remote verifier links. The Expo app remains local-first, but it can now upload a local request to hosted Edge Functions, share a public code+token verifier link, and import the completed hosted signature back into local SQLite.

## Trust Model

- The technician must be authenticated before creating a hosted request.
- The mobile app sends the local request id, entry payload, entry hash, hash version, verifier identity, expiry, and raw signing token to the Edge Function.
- The Edge Function stores only the token hash and a short token hint.
- Verifiers read a request by opening a link with both `code` and `token`.
- Completing a request is one-time: the function updates only rows that are still `pending`.
- The completion function builds the stored signature payload from the hosted request row plus validated verifier fields. The client cannot override entry ids, entry hashes, hash versions, method, or request ids.
- Expired links are marked `expired` before read or completion responses are returned.
- Direct database access is protected with RLS; anonymous verifier access goes through Edge Functions.

## Supabase Objects

- `supabase/migrations/20260509085611_hosted_remote_signing.sql`
  - Creates `public.remote_signing_requests`.
  - Enables RLS.
  - Allows authenticated owners to create/read their own hosted requests.
  - Keeps verifier token checks server-side through Edge Functions.

- `supabase/functions/remote-signing-request`
  - `POST` creates or refreshes a hosted request for the authenticated owner.
  - `GET ?code=...&token=...` validates the token hash, marks `viewed_at`, expires stale requests, and returns verifier-safe request data.
  - JWT verification is disabled at the gateway so public verifier links can open; the function still requires an authenticated user for `POST`.

- `supabase/functions/remote-signing-complete`
  - `POST` validates `request_code` and `signing_token`.
  - Writes a server-shaped completed signature payload only if the request is still pending.
  - Stores completion timestamp plus hashed IP and user-agent metadata for audit context.
  - JWT verification is disabled at the gateway because the verifier is authorized by the one-time code and token.

## Environment

Edge Functions need these secrets:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

The service-role key must stay server-side. It is only for Edge Functions and deployment automation, never for Expo client code.

## Validation

Run the Edge Function static checks with:

```bash
npm run functions:check
```

This runs Deno type checking for both functions, Deno lint, and Deno format checking against `supabase/functions/deno.json`.

## App Integration To Do

Done:

- Add a cloud remote-signing client under `src/cloud/supabase/`.
- Let the Share action upload a hosted request using the same request code and token when Supabase auth/env are available.
- Prefer the hosted verifier URL when hosted sync succeeds, with local verifier links kept as development and offline/manual fallback.
- Bootstrap and persist an anonymous Supabase Auth session for hosted request upload when the project has anonymous sign-ins enabled.
- Add an entry-detail `Sync` action that checks the hosted request by code+token and imports a completed hosted signature into local SQLite.

Still pending:

1. Decide whether anonymous technician sessions are acceptable for the first preview, or replace them with an explicit email/OAuth technician account flow.
2. Add automatic polling or realtime refresh around the manual `Sync` action.
3. Validate Edge Functions against local/linked Supabase once project secrets are available.
4. Enable Anonymous Sign-Ins in the Supabase project if keeping the current preview bootstrap.

The app now has the first client wiring in `src/cloud/supabase/remote-signing.ts`. The entry detail Share action attempts a hosted sync when Supabase env vars and `EXPO_PUBLIC_REMOTE_SIGNING_ORIGIN` are available. If no session exists, `src/cloud/supabase/client.ts` attempts `signInAnonymously()` and persists that session through AsyncStorage. If cloud is not ready, sharing falls back to the existing local verifier link.

The verifier route now also has a hosted fallback: `app/verify/[code].tsx` tries local SQLite first, then fetches `remote-signing-request` by code and token when local data is absent. Hosted verifier submission posts to `remote-signing-complete`. The technician device can tap `Sync` on the pending entry to pull a completed hosted signature back into local SQLite; automatic polling/realtime refresh is still pending.
