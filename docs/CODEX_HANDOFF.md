# Codex Handoff: RALB Codex Edition

Last updated: 2026-05-10

This file is the continuity note for future Codex sessions working from `C:\Users\MC\Desktop\RALB-Codex-Edition`, including sessions started from the user's phone.

## Latest Handoff For New Chat

Current git state before this handoff continuation was `main...origin/main` with a clean tree. The latest pushed app commit before this remote-signing continuation is:

`70d1f2e Apply RALB brand palette`

Latest continuation in this chat:

- Replaced the app palette with `#222121`, `#398F30`, `#CACCC5`, and `#1D2B46`; committed and pushed `70d1f2e Apply RALB brand palette`.
- Continued the hosted remote-signing layer toward true two-device testing:
  - Added `@react-native-async-storage/async-storage` for persisted Supabase Auth sessions.
  - Updated `src/cloud/supabase/client.ts` to persist sessions and bootstrap an anonymous session with `signInAnonymously()` when hosted upload needs auth.
  - Added hosted completion mapping in `src/cloud/supabase/remote-signing.ts`.
  - Added `src/cloud/supabase/use-remote-signing-sync.ts` so the technician device can import a completed hosted signature into local SQLite.
  - Added a `Sync` action beside `Share` and `Preview` on pending remote requests in `app/entry/[id].tsx`.
  - Added `__tests__/cloud/remote-signing.test.ts` for hosted completion mapping.
- Validation after these code changes: TypeScript passed, Jest passed with 44 tests, `npm run functions:check` passed, and `expo config --type public` passed.
- Local deployment/config status: no `.env` file is present and `supabase/.temp` has no project ref, so live Supabase deployment/project validation is still pending.

Recent user-tested remote-signature fixes:

- iOS verifier sharing now works. The entry detail `Share` action passes the verifier link as the native iOS `url` payload instead of burying it inside message text.
- Verifier links remain token-gated. Opening a request code alone should show the secure-link-required state; opening the full shared link should authorize the remote verifier view.
- Native verifier links preserve the token; web verifier links remove the visible token from the URL only after request details load.
- Verifier screens reset local state when moving from one request code to another, so signing one request should not poison the next request.
- Signature drawing is much better on phone. The shared `Screen` wrapper now disables scrolling only while the signature pad is actively capturing a stroke, and otherwise lets the page scroll normally.
- Verifier pages can scroll, including down to the submit button and footer area.
- After a remote signature completes, the user returns to the entry detail for confirmation. Signed/amended entry detail footers now include a `Records` button so the user is not trapped with only `PDF`, `Packet`, and `Amend`.

Immediate next-chat smoke test:

1. Pull latest `main`.
2. Run `npm.cmd run start -- --host lan`.
3. Confirm `.env` has `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_REMOTE_SIGNING_ORIGIN`, and that the linked Supabase project has Anonymous Sign-Ins enabled if using the current preview auth bootstrap.
4. Deploy/apply `supabase/migrations/20260509085611_hosted_remote_signing.sql` and both Edge Functions if not already deployed.
5. On phone A, create a fresh draft entry and remote request.
6. Tap `Share`, send/open the full verifier link on phone B, and complete the remote signature.
7. Back on phone A, tap `Sync` on the pending request and confirm the entry becomes signed with a visible `Records` exit.
8. Confirm signature drawing does not drag the page and the verifier page still scrolls when not drawing.

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

Result: TypeScript passed, Jest passed with 28 tests.

Latest code-validation commits were checked with both commands:

- `216543e Fix iOS verifier link sharing`
- `80f0747 Add records exit from signed entries`

Latest local validation in this continuation also passed:

- `.\node_modules\.bin\tsc.cmd --noEmit`
- `.\node_modules\.bin\jest.cmd --runInBand`
- `npm run functions:check`

Last phone preview target:

`exp://192.168.86.143:8081`

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

First, re-run the latest phone smoke above after pulling this handoff update. Then continue by turning the new foundations into deeper product flows:

1. Wire the Expo app to the hosted remote-signing foundation:
   - Add a real technician auth flow so hosted request upload can obtain a Supabase session.
   - Decide whether to upload hosted requests immediately after local `createRemoteSignatureRequest`, or keep upload-on-share.
   - Poll/import completed hosted signatures back into local SQLite.
   - Validate Edge Functions against local/linked Supabase once Docker-backed local Supabase or project secrets are available.
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
