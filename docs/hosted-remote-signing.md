# Hosted Remote Signing Foundation

This note describes the first Supabase layer for remote verifier links. The current Expo app still uses the local-first verifier route, but the cloud contract is now present under `supabase/` so the next app pass can sync local requests to a hosted one-time link.

## Trust Model

- The technician must be authenticated before creating a hosted request.
- The mobile app sends the local request id, entry payload, entry hash, hash version, verifier identity, expiry, and raw signing token to the Edge Function.
- The Edge Function stores only the token hash and a short token hint.
- Verifiers read a request by opening a link with both `code` and `token`.
- Completing a request is one-time: the function updates only rows that are still `pending`.
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
  - Writes the completed signature payload only if the request is still pending.
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

1. Add a cloud remote-signing client under `src/cloud/supabase/`.
2. When a local pending request is created, upload a hosted request using the same request code and token.
3. Change the Share action to prefer the hosted verifier URL when cloud sync succeeds.
4. Add a sync poll or realtime listener that imports completed hosted signatures into local SQLite.
5. Keep local verifier preview available for development and offline/manual fallback.

The app now has the first piece of client wiring in `src/cloud/supabase/remote-signing.ts`. The entry detail Share action attempts a hosted sync when Supabase env vars, a user session, and `EXPO_PUBLIC_REMOTE_SIGNING_ORIGIN` are available, then falls back to the existing local verifier link when cloud is not ready.

The verifier route now also has a hosted fallback: `app/verify/[code].tsx` tries local SQLite first, then fetches `remote-signing-request` by code and token when local data is absent. Hosted verifier submission posts to `remote-signing-complete`. The technician-side import of completed hosted signatures is still pending, so hosted completion is not yet reflected back into local SQLite automatically.
