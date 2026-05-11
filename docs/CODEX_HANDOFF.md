# Codex Handoff: RALB Codex Edition

Last updated: 2026-05-11

This file is the continuity note for future Codex sessions working from `C:\Users\MC\Desktop\RALB-Codex-Edition`, including sessions started from the user's phone.

## Latest Handoff For New Chat

Most recent landings on `main`:

- Auto-sync polling for pending hosted remote-signing requests. New `useAutoSyncHostedRemoteSignature` hook in `src/cloud/supabase/use-remote-signing-sync.ts` polls every 5 s via `useFocusEffect` while the open entry has a pending hosted request, calls the same import path the manual `Sync` button used, and stops on success, on expiry, on entry status change, on screen unfocus, or after 3 consecutive failures. Manual `Sync` button stays as the recovery affordance. Tests in `__tests__/cloud/remote-signing.test.ts` cover the polling decision (configured/unconfigured, draft/signed, pending/completed, expired).
- Tunnel-aware hosted verifier link. `buildHostedVerifierLink` now derives its origin from `Linking.createURL` at runtime, so switching between LAN and tunnel preview no longer requires a `.env` edit. `EXPO_PUBLIC_REMOTE_SIGNING_ORIGIN` is now only honored when it starts with `http://` or `https://`, reserving it for a future hosted verifier web app.
- Two-phone hosted smoke succeeded over Expo `--tunnel` with auto-sync: Pixel emulator (technician) created a request, iPhone (verifier) opened the shared link and signed, the technician device imported the completed signature without tapping `Sync`.
- Watch item: stale or wrong verifier links land on the generic `Request closed` card with no detail about why (completed/expired/cancelled). This is the next UX target.

Earlier in this chat (prior to the auto-sync work):

- Replaced the app palette with `#222121`, `#398F30`, `#CACCC5`, and `#1D2B46`; committed and pushed `70d1f2e Apply RALB brand palette`.
- Continued the hosted remote-signing layer toward true two-device testing:
  - Added `@react-native-async-storage/async-storage` for persisted Supabase Auth sessions.
  - Updated `src/cloud/supabase/client.ts` to persist sessions and bootstrap an anonymous session with `signInAnonymously()` when hosted upload needs auth.
  - Added hosted completion mapping in `src/cloud/supabase/remote-signing.ts`.
  - Added `src/cloud/supabase/use-remote-signing-sync.ts` so the technician device can import a completed hosted signature into local SQLite.
  - Added a `Sync` action beside `Share` and `Preview` on pending remote requests in `app/entry/[id].tsx`.
  - Added `__tests__/cloud/remote-signing.test.ts` for hosted completion mapping.
- Linked this checkout to the Supabase project `zooxewiwaurbfmulkwia` (`Rope Access Logbook`).
- Applied `supabase/migrations/20260509085611_hosted_remote_signing.sql` to the linked Supabase database and marked migration history as applied.
- Deployed `remote-signing-request` and `remote-signing-complete` Edge Functions with gateway JWT verification disabled; both are active and use the function-body token/auth checks.
- Enabled anonymous sign-ins for the current preview auth bootstrap, while restoring the previous auth settings shown by the CLI diff.
- Created a local, gitignored `.env` with public Supabase client settings and `EXPO_PUBLIC_REMOTE_SIGNING_ORIGIN=exp://172.20.10.8:8081/--` for the current LAN Expo Go preview.
- Live hosted backend smoke passed: anonymous auth, hosted request create, token-gated read, completion, one-time replay rejection (`409`), and smoke-row cleanup.
- Validation after these code changes: TypeScript passed, Jest passed with 44 tests, `npm run functions:check` passed, and `expo config --type public` passed.
- Watch item: the first auth config push applied Supabase CLI defaults, then the important prior auth settings were restored. The CLI could not restore `external.apple.enabled = true` without a local Apple client id, so re-enable Apple auth in the dashboard if that provider was intentionally active.

Recent user-tested remote-signature fixes:

- iOS verifier sharing now works. The entry detail `Share` action passes the verifier link as the native iOS `url` payload instead of burying it inside message text.
- Verifier links remain token-gated. Opening a request code alone should show the secure-link-required state; opening the full shared link should authorize the remote verifier view.
- Native verifier links preserve the token; web verifier links remove the visible token from the URL only after request details load.
- Verifier screens reset local state when moving from one request code to another, so signing one request should not poison the next request.
- Signature drawing is much better on phone. The shared `Screen` wrapper now disables scrolling only while the signature pad is actively capturing a stroke, and otherwise lets the page scroll normally.
- Verifier pages can scroll, including down to the submit button and footer area.
- After a remote signature completes, the user returns to the entry detail for confirmation. Signed/amended entry detail footers now include a `Records` button so the user is not trapped with only `PDF`, `Packet`, and `Amend`.

Immediate next-chat smoke test:

1. Run `npm.cmd run start -- --tunnel` (LAN works too; tunnel survives bad Wi-Fi).
2. With the new tunnel-aware verifier link there is no longer a `.env` edit per session; just confirm both phones connect to the same Expo Go session.
3. On phone A (technician), create a fresh draft entry and remote request.
4. Tap `Share`; the hosted sync runs before the share sheet opens and the shared link uses the current dev origin.
5. Open the full verifier link on phone B (verifier) and submit the remote signature.
6. Back on phone A, watch the pending request flip to signed automatically within ~5 s without tapping `Sync` (manual `Sync` is still there as the fallback).
7. Confirm signature drawing does not drag the page and the verifier page still scrolls when not drawing.

## Project Intent

`RALB-Codex-Edition` is a clean rebuild of the user's existing Desktop `RALB` rope-access logbook app. The original app is an Expo / React Native product with local SQLite, signatures, PDF export, Supabase backup/restore, remote supervisor signing, RevenueCat, notifications, and gear tracking.

The rebuild should keep the serious domain goals, but with cleaner architecture:

- Local-first core before cloud complexity.
- Explicit SQLite migrations from the beginning.
- Immutable signed records.
- Amendment records instead of editing signed entries.
- SPRAT/IRATA readiness treated as a first-class product requirement.
- Shared Expo app targeting iOS and Android, with web preview kept working for fast development.

Important caveat: do not claim this app is officially accepted by SPRAT or IRATA unless written confirmation is obtained from the relevant organization. The app can be built toward audit-ready logging, but official acceptance is a separate workstream.

## Current Folder State

The rebuild folder is:

`C:\Users\MC\Desktop\RALB-Codex-Edition`

This folder is currently a git repository on `main`. Use normal status/diff checks, but keep unrelated local changes intact.

Key docs:

- `README.md`: concise project summary and commands.
- `docs/current-ralb-audit.md`: audit of the original Desktop `RALB` folder.
- `docs/rebuild-blueprint.md`: architecture direction for the rebuild.
- `docs/sprat-irata-compliance-roadmap.md`: SPRAT/IRATA acceptance roadmap and disclaimers.
- `docs/hosted-remote-signing.md`: Supabase-hosted verifier link contract and app integration checklist.
- `docs/CODEX_HANDOFF.md`: this file.

## Implemented Features

The first local-first slice is live:

- Local profile setup.
- Tabbed dashboard.
- Draft logbook entry creation.
- Entry list and detail screens.
- Scheme-oriented entry fields:
  - employer
  - site/location
  - client
  - work task
  - access method
  - structure type
  - rope-access hours
  - maximum height
  - height unit
  - work description
  - SPRAT/IRATA level snapshots
- Local supervisor signing:
  - supervisor name
  - supervisor certification number
  - drawn touch signature
  - attestation checkbox beneath the signature
  - canonical entry hash
  - immutable signed entry state
- Remote signature request foundation:
  - request creation from a draft entry
  - verifier name/contact
  - verifier role/company
  - pending request code
  - requested entry hash and hash version
  - pending request display on entry detail
  - verifier signing route at `app/verify/[code].tsx`
  - remote completion transaction writes a `remote` signature, completes the request, and locks the entry
  - local signing cancels pending remote requests
  - requests now store an expiry, token hash, token hint, and completion timestamp fields for the secure-link path
  - shared verifier links now include a signing token, verifier detail loading requires the token, request views stamp `viewed_at`, and remote completion validates the token before signing
- Audit export:
  - JSON bundle from the Records tab
  - CSV export from the Records tab
  - single-entry JSON audit packet from signed/amended entry detail
  - single-entry PDF export from signed/amended entry detail using the same packet data
  - profile context
  - signed and amended entries by default
  - signatures, entry hashes, hash-chain fields, gear usage, evidence attachments, supervisor contacts, and summary totals
- Backup/restore:
  - `src/domain/backup/*` creates local recovery snapshots
  - snapshots include profile, entries, signatures, remote requests, supervisors, gear, inspections, entry gear usage, attachments, and templates
  - Profile tab can share a snapshot and restore from pasted snapshot JSON
- Amendments:
  - signed entries remain locked
  - replacement amendment drafts can be created
  - signing an amendment marks the original as amended
- Gear inventory:
  - bundled 767-row rope-access gear catalog seeded from `src/db/seeds/gear-catalog.json`
  - make/model autocomplete filtered by gear type in the Gear tab
  - catalog matches are convenience only; free-form gear entry still works
  - add local gear items with category, serial number, and next inspection due date
  - due status calculation for current, due soon, overdue, unscheduled, and retired gear
  - log pass, pass-with-concerns, and fail inspections
  - failed gear is retired and blocked from later inspection updates
  - draft entries can attach active gear so signed records preserve equipment history
- Entry speed and evidence:
  - seeded smart entry templates for tower inspection, bridge maintenance, and rescue standby
  - user-created entry templates from the new-entry form
  - duplicate-last-entry action for fast repeated field logging
  - native photo picker evidence attachments on draft entries
- Supervisor mode:
  - local and remote signing save supervisor contacts
  - local signing and remote request forms can reuse known supervisors
- Dashboard totals:
  - total entries
  - draft entries
  - signed entries
  - amended entries
  - pending signatures
  - draft hours
  - signed hours
  - cert expiry readiness
  - overdue/due-soon gear counts
  - career stats and top work-task hour buckets
- UX cleanup:
  - Dashboard, Records, Gear, Profile, entry detail, new entry, remote verifier, setup, amendment, and remote-request screens have been reduced toward compact cards, chips, icons, and sticky primary actions.
  - First-run setup now supports explicit SPRAT/IRATA Level I/II/III selection instead of defaulting every profile to Level II.
  - Remote request creation now separates required verifier identity from optional role/company details.

## Important Product Decisions

- Local signing and remote signing should both exist.
- Android and iOS are both product targets.
- Web preview is for development and quick QA.
- Remote signing should eventually send a secure request link to a verifier so they can sign from their own phone/tablet/computer without needing to install the app.
- Remote signing should not merely be "someone clicked a link." It needs signer identity, request expiry, one-time token behavior, entry hash, timestamps, attestation, and eventually audit metadata.
- SPRAT/IRATA acceptance is very important to the user, but the product must stay honest until written approval is obtained.
- The hosted remote-signature layer now has Supabase schema, Edge Function contracts, app upload/read/complete wiring, anonymous-session bootstrap, and a manual technician sync-back action. Live project deployment and automatic polling/realtime sync are still pending.

## Key Source Map

Routes:

- `app/index.tsx`: redirects to setup or dashboard.
- `app/(onboarding)/setup.tsx`: compact local profile setup with scheme/level chips.
- `app/(tabs)/dashboard.tsx`: dashboard and summary.
- `app/(tabs)/records.tsx`: entry list and JSON audit export.
- `app/(tabs)/gear.tsx`: gear inventory, inspection logging, and due-status list.
- `app/(tabs)/profile.tsx`: profile display plus backup/restore snapshot actions.
- `app/entry/new.tsx`: draft entry form, templates, duplicate-last-entry action.
- `app/entry/[id].tsx`: entry detail, gear usage, evidence, signature state, remote request state.
- `app/entry/[id]/sign.tsx`: local touch-signature flow with known-supervisor reuse.
- `app/entry/[id]/request-signature.tsx`: compact remote request form with readiness summary, known-supervisor reuse, and optional verifier details.
- `app/entry/[id]/amend.tsx`: amendment draft form with grouped work/method/time sections and missing-field summary.
- `app/verify/[code].tsx`: verifier-facing remote signature completion route.

Domain:

- `src/domain/logbook/types.ts`: logbook entry, signature, request, dashboard types.
- `src/domain/logbook/logbook-service.ts`: local SQLite-backed logbook operations.
- `src/domain/logbook/use-logbook.ts`: React Query hooks.
- `src/domain/logbook/export.ts`: JSON packet, CSV, PDF HTML, and export filename builders.
- `src/domain/logbook/entry-hash.ts`: canonical entry hashing.
- `src/domain/logbook/entry-readiness.ts`: required-field gate before verification.
- `src/domain/backup/*`: local recovery snapshot create/restore.
- `src/domain/profile/*`: profile model/service/hooks.
- `src/domain/gear/*`: gear inventory model/service/hooks.

Data:

- `src/db/migrations.ts`: migration ledger and schema.
- `src/db/client.ts`: DB client interface.
- `src/db/initialize.ts`: runtime DB init.

UI:

- `src/ui/primitives/*`: button, card, field, screen, checkbox, signature pad, stat row.
- `src/ui/theme/*`: tokens and theme provider.

Tests:

- `__tests__/db/migrations.test.ts`
- `__tests__/domain/logbook-export.test.ts`
- `__tests__/domain/logbook-service.test.ts`
- `__tests__/domain/gear-service.test.ts`
- `__tests__/domain/backup-service.test.ts`

## Current Schema Notes

Current migrations:

1. `core-local-logbook`
2. `gear-and-cloud-placeholders`
3. `signature-trust-state`
4. `drawn-signatures-and-attestation`
5. `remote-signature-requests`
6. `scheme-work-log-fields`
7. `gear-catalog`
8. `field-ops-foundation`

The entry hash version is currently `2` in `src/domain/logbook/entry-hash.ts`. Version 2 includes the scheme-oriented work-log fields, max height, and height unit. If export fixtures are added, lock expectations around this version.

## Validation Status

Last known good checks:

```bash
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\jest.cmd --runInBand
```

Result: TypeScript passed, Jest passed with 50 tests.

Latest code-validation commits were checked with both commands:

- `216543e Fix iOS verifier link sharing`
- `80f0747 Add records exit from signed entries`

Latest local validation in this continuation also passed:

- `.\node_modules\.bin\tsc.cmd --noEmit`
- `.\node_modules\.bin\jest.cmd --runInBand`
- `npm run functions:check`

Last phone preview target:

Expo `--tunnel` (URL changes per session; `Linking.createURL` keeps the verifier link in sync automatically).

Last smoke flow passed:

1. Create profile.
2. Create entry with required scheme-oriented fields.
3. Confirm Save is disabled until required height is filled.
4. Confirm entry detail renders work classification fields.
5. Create remote signature request.
6. Confirm pending request status, verifier, request code, requested hash.
7. Open the full shared verifier link, not just the request code.
8. Complete a remote signature from the verifier route.
9. Confirm signing returns to entry detail and the footer includes a `Records` exit.
10. Confirm no unmatched route and no console/page errors.

To restart the phone preview:

```bash
npm.cmd run start -- --host lan
```

## Recommended Next Step

First, run the two-phone hosted remote-signing smoke above. Then continue by turning the hosted foundation into a less manual product flow:

1. Wire the Expo app to the hosted remote-signing foundation:
   - Decide whether anonymous technician sessions are acceptable for the first preview, or replace them with explicit email/OAuth technician auth.
   - Decide whether to upload hosted requests immediately after local `createRemoteSignatureRequest`, or keep upload-on-share.
   - Add automatic polling or realtime refresh around the manual `Sync` action.
2. Cloud backup storage and conflict resolution on top of the local snapshot format.
3. Local signing screen cleanup, especially signature-pad ergonomics and supervisor attestation density.
4. Gear detail/history screens if inline entry and gear tabs become too dense.
5. Visual export preview and full-logbook PDF if reviewer feedback calls for it.
6. Native iOS/Android QA builds.

## User Testing Help Needed

Ask the user to test field realism:

- Are "work task," "access method," "structure type," and "maximum height" the right labels?
- Should "site" be "location" or should both exist?
- Should "client" be required in every real logbook entry?
- Are access methods better as free text or a picker?
- Does the touch signature feel usable on a phone?
- Does the attestation wording sound correct for a supervisor?
- Does the remote request detail show enough for a verifier to trust what they are signing?

## Design/Implementation Preferences

- Keep using Expo Router.
- Routes belong only in `app/`; reusable components and utilities belong under `src/`.
- Keep forms practical and work-focused, not marketing-like.
- Keep signed records immutable.
- Add service tests and migration tests with each domain/schema change.
- Use local-first SQLite APIs before adding cloud behavior.
- Keep web working as a development target, but do not design around web at the expense of iOS/Android.
- Be careful with official acceptance language around SPRAT/IRATA.
