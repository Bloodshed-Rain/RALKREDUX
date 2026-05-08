# Current RALB Audit

Audited source: `C:\Users\MC\Desktop\RALB`
Date: 2026-05-08

## Product Shape

RALB is an Expo SDK 54 / React Native 0.81 TypeScript app for rope access technicians. It replaces a paper SPRAT/IRATA work logbook with offline entries, supervisor signatures, PDF/CSV/JSON export, cloud backup/restore, remote signing, paid subscription gating, local notifications, push notifications, and equipment inspection tracking.

## Repository Shape

The app is organized around a strong three-layer architecture:

- `src/db`: SQLite schema, migrations, Expo SQLite adapter, hash migration.
- `src/services`: domain factories for profile, entries, signing, backup, restore, supervisor connections, sign requests, subscriptions, notifications, gear, and readiness.
- `src/hooks`: React Query wrappers around services.
- `src/screens`, `src/components`, `src/primitives`, `src/theme`: React Native UI.
- `src/cloud`: Supabase and file-system abstractions.
- `supabase`: SQL migrations and Deno Edge Functions.
- `__tests__`: service-heavy Jest coverage using better-sqlite3 and in-memory cloud/file mocks.

Code/test scale observed: 180 TypeScript/SQL files under `src`, `__tests__`, and `supabase`, totaling about 24.6k source lines. The largest UI files are `RecordsScreen`, `MeScreen`, `EntryFormScreen`, `SignRequestDetailScreen`, and `NotificationsScreen`, which is a signal that route screens are doing too much composition and should be split earlier in the rebuild.

## Validation

I restored dependencies with `npm.cmd ci` because the existing `node_modules` was partial and missing `.bin` shims.

- `.\node_modules\.bin\tsc.cmd --noEmit`: passed.
- `.\node_modules\.bin\jest.cmd --runInBand`: one full-suite failure remained in `__tests__/services/gearService.test.ts`.
- `.\node_modules\.bin\jest.cmd __tests__/services/gearService.test.ts --runInBand`: passed.

The remaining Jest signal looks order-dependent or environment-pollution related, not a simple deterministic gear-service failure. Several tests leave noisy console output from Expo Notifications and RevenueCat fallback paths.

`npm ci` reported 10 audit findings: 5 low, 5 moderate.

## Strong Parts To Preserve

- Domain rules live mostly in services rather than screens.
- Signed entries are immutable, amendments are append-only, and hash versions are frozen carefully.
- Cloud backup uploads `snapshot.json` last, which is the right atomicity model.
- Restore is whole-logbook replacement, not implicit merge.
- Supabase RLS exists for user data and storage buckets.
- Tests cover core service invariants better than most mobile apps at this stage.
- Subscription lapse is treated as read-only UX, while export remains available.

## Main Risks

- Restore is lagging the newer profile model: the current restore insert writes a SPRAT-era subset of `profile`, so IRATA fields, avatar, supervisor capability, directory visibility, and subscription status can be lost or defaulted on restore.
- Cloud backup normalizes and uploads the SPRAT card, signatures, entry photos, gear photos, and inspection certs, but does not appear to handle avatar and IRATA card assets with the same completeness.
- Several route screens are large enough that UI behavior, query orchestration, and rendering concerns are hard to reason about.
- Test isolation is imperfect. Full-suite Jest can fail while the focused failing test passes.
- The package has no `test`, `typecheck`, or lint scripts, so the reliable commands are tribal knowledge.
- The generated recreation prompt in `outputs/ralb-recreation-prompt.md` is useful, but already drifted from code in important details such as hash version and current feature additions.
- Supabase sign-request storage policies allow insert/read but not update/delete for authenticated parties. Since the client uses storage uploads with `upsert: true`, retry paths may need explicit update policies or no-upsert semantics.
- Some older docs/spec files are deleted in the current worktree, while `CLAUDE.md` remains modified. I did not revert or clean any existing user changes.

## Rebuild Takeaway

The current app is not a throwaway prototype. It has a real product spine. I would rebuild it by preserving the invariants and tests, but changing the project shape around feature modules, explicit migrations, stricter test hygiene, and a cloud model that treats every field and asset as part of a versioned snapshot contract.

