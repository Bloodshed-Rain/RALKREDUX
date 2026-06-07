# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

RALB Codex Edition is an offline-first rope-access logbook (Expo / React Native, iOS + Android, web kept working for fast preview). Domain is SPRAT/IRATA technician logging: drafts, supervisor signatures, amendments, gear inventory, and audit-grade exports. Hosted remote-signing layer (Supabase Edge Functions + Postgres) is bolted on top of the local-first SQLite core — local SQLite is the source of truth.

## Commands

Day-to-day:

```bash
npm install
npm run start -- --host lan         # phone preview on same network
npm run web -- --host localhost --port 8091
npm run typecheck                   # tsc --noEmit
npm test                            # jest --runInBand (uses jest-expo + better-sqlite3 in __tests__/setup.ts)
npm test -- --testPathPattern=logbook-service   # single test file
npm run functions:check             # deno check + lint + fmt for supabase/functions
```

Native builds use EAS (`eas.json` defines `development`, `preview`, `production`). The Expo project id is in `app.config.ts` — do not generate a new one.

## Path alias

`@/*` resolves to the repo root (see `tsconfig.json` and `jest.config.js`). Import as `@/src/...` and `@/app/...`.

## Architecture

### Layering — strict

1. `app/` — Expo Router screens **only**. No business logic, no SQL.
2. `src/domain/<feature>/` — domain services (pure-ish, take a `DbClient`), TypeScript types, and `use-<feature>.ts` React Query hooks. Screens consume hooks; services own invariants.
3. `src/db/` — `DbClient` interface plus `expo-client.ts` (runtime, expo-sqlite) and a parallel `better-sqlite3` adapter built in `__tests__/setup.ts` for Node-side tests. Every schema change is a numbered migration in `src/db/migrations.ts`.
4. `src/cloud/supabase/` — hosted remote-signing client. Treat as optional/augmenting; the app must work without `EXPO_PUBLIC_SUPABASE_*` set.
5. `src/storage/` — thin device-local key/value prefs (AsyncStorage-backed: `local-prefs.ts`, `advisory-acks.ts`, `gear-catalog-pick.ts`). Outside the `DbClient`/SQLite source of truth — use only for UI/ephemeral state that doesn't belong in an audit-grade entry.
6. `src/ui/primitives/v2/` + `src/ui/theme/` — shared components and runtime theming. **Consume `const { tokens } = useTheme()` from `theme/theme-provider.tsx` and `type` from `theme/type.ts`; never hard-code hex/sizes in screens.** Theming is runtime-swappable across six palettes (`themes.ts`, light/dark) — there is no static `tokens.ts`. Primitives are mid-migration: import from `primitives/v2/` and don't mix v1 (`primitives/*`) and v2 in one screen. `src/ui/animation/` (`motion.ts`, `reveal.tsx`, `use-press-scale.ts`) is the intentional shared entrance/press motion layer.
7. `supabase/` — Edge Functions (Deno) and Postgres migrations. Excluded from the app's `tsconfig.json` — separate type-check via `npm run functions:check`.

### Local SQLite is canonical

`initializeDatabase()` in `src/db/initialize.ts` opens `ralb-codex.db` (in-memory fallback on web), enables WAL on native, then runs `runMigrations`. The schema ledger lives in `schema_migrations`; each migration runs in a transaction. Tests construct an isolated in-memory DB via `createTestClient()` in `__tests__/setup.ts` and run the full migration list — so adding/altering a migration must keep tests green from a clean DB.

### Signing model

- An entry is `draft` until signed, then `signed` or `amended` — **never edit a signed entry**. Amendments are new entries that point back via `amends_entry_id`.
- `entry-hash.ts` defines `ENTRY_HASH_VERSION` (currently `5`) and the canonical entry serialization. **If you add fields to `entries` that affect what a signature attests to, bump `ENTRY_HASH_VERSION` and include the field in `canonicalizeEntry`.** Otherwise old/new signatures hash identical entries differently and audit chains break. The Deno mirror `supabase/functions/_shared/remote-signing.ts` (`ENTRY_HASH_VERSION` + `canonicalizeEntryPayload`) must move in lockstep, and the live Edge Functions must be **redeployed** alongside the app build that produces the new version — `remote-signing-request` gates with a strict `hash_version !== ENTRY_HASH_VERSION` check, so a backend/app version skew rejects hosted requests with `hash_version_invalid`.
- Signatures form a hash chain via `previous_chain_hash` / `chain_hash` (`hashSignatureChain`). Don't bypass the chain when inserting signatures.
- Required-field gating before any sign/request action lives in `entry-readiness.ts` — surface `missingFields` rather than failing silently.

### Remote signing (two paths, same contract)

- Local-only path: verifier opens a `ralb://verify/<code>?token=...` deep link and SQLite on the technician's device handles completion.
- Hosted path: when `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_REMOTE_SIGNING_ORIGIN` are set, `syncHostedRemoteSigningRequest` uploads to the `remote-signing-request` Edge Function; the verifier opens an HTTPS link; technician taps `Sync` to import the completed signature back into local SQLite. See `docs/hosted-remote-signing.md` for the trust model.
- Edge Functions run with gateway JWT verification disabled; **all auth is in-function** (the signed-in user's Supabase session for `POST /remote-signing-request`, code+token for the verifier endpoints). Don't move that check to the gateway.
- The signing token is hashed before storage (`hashRemoteSigningToken`); only the hash + a short hint are persisted server-side. Don't log or persist the raw token anywhere else.

### Hooks/state

`@tanstack/react-query` is the only async/state layer. `AppProviders` waits for fonts and DB init before rendering. New domain hooks should follow the existing `use-<feature>.ts` pattern and invalidate the same query keys the service writes through.

## When changing things

- **Schema change** → add a new numbered migration in `src/db/migrations.ts` (never mutate an existing one), extend types in the relevant `src/domain/<feature>/types.ts`, and add coverage in `__tests__/db/migrations.test.ts` or the matching service test.
- **Entry shape change that signers attest to** → also bump `ENTRY_HASH_VERSION` and update `canonicalizeEntry`.
- **New domain service** → keep it `DbClient`-only (no expo-sqlite imports) so tests can run it under `better-sqlite3`.
- **Edge Function change** → run `npm run functions:check` (Deno type/lint/fmt). Functions are excluded from the app `tsconfig`.
- **Web preview** is a dev convenience, not a product target — never break iOS/Android to fix web.

## Things that are intentional (don't "fix")

- Raw SQL strings in services — explicit by design, no ORM.
- `expo-router` route directory layout (`app/(tabs)`, `app/(onboarding)`, `app/entry/[id]/*`); routes belong only in `app/`, reusable code under `src/`.
- `runtimeVersion: { policy: 'fingerprint' }` and the iOS bundle id `com.ropeaccess.logbook` — both tied to existing EAS/store identity.
- Real provider auth (Sign in with Apple / Google / email-OTP) **hard-gates** the app via `AuthGate`; a persisted session keeps it usable offline after the first sign-in. Anonymous Supabase auth was removed. When `EXPO_PUBLIC_SUPABASE_*` is unset the gate falls through to local-only mode. Setup: `docs/auth-setup.md`. Auth code lives in `src/cloud/supabase/auth.ts` + `src/providers/auth-*.tsx`.

## Compliance language

Do **not** describe the app as SPRAT- or IRATA-accepted in code, copy, or commits. The product is built toward audit-readiness; official acceptance is a separate workstream. See `docs/sprat-irata-compliance-roadmap.md`.

## Reference docs

- `docs/CODEX_HANDOFF.md` — running continuity log; check before assuming current state.
- `docs/hosted-remote-signing.md` — Supabase trust model and integration checklist.
- `docs/rebuild-blueprint.md` — original architecture intent.
- `docs/current-ralb-audit.md` — audit of the predecessor app this rebuild replaces.
- `docs/sprat-irata-compliance-roadmap.md` — compliance disclaimers and roadmap.
