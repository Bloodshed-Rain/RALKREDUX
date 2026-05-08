# Codex Handoff: RALB Codex Edition

Last updated: 2026-05-08

This file is the continuity note for future Codex sessions working from `C:\Users\MC\Desktop\RALB-Codex-Edition`, including sessions started from the user's phone.

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

This folder was not initialized as a git repository during the initial rebuild work. Use filesystem awareness carefully, and do not assume `git status` is available.

Key docs:

- `README.md`: concise project summary and commands.
- `docs/current-ralb-audit.md`: audit of the original Desktop `RALB` folder.
- `docs/rebuild-blueprint.md`: architecture direction for the rebuild.
- `docs/sprat-irata-compliance-roadmap.md`: SPRAT/IRATA acceptance roadmap and disclaimers.
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
  - local signing cancels pending remote requests
- Amendments:
  - signed entries remain locked
  - replacement amendment drafts can be created
  - signing an amendment marks the original as amended
- Dashboard totals:
  - total entries
  - draft entries
  - signed entries
  - amended entries
  - pending signatures
  - draft hours
  - signed hours

## Important Product Decisions

- Local signing and remote signing should both exist.
- Android and iOS are both product targets.
- Web preview is for development and quick QA.
- Remote signing should eventually send a secure request link to a verifier so they can sign from their own phone/tablet/computer without needing to install the app.
- Remote signing should not merely be "someone clicked a link." It needs signer identity, request expiry, one-time token behavior, entry hash, timestamps, attestation, and eventually audit metadata.
- SPRAT/IRATA acceptance is very important to the user, but the product must stay honest until written approval is obtained.
- The best next product layer is audit/export packets before full remote-signature completion.

## Key Source Map

Routes:

- `app/index.tsx`: redirects to setup or dashboard.
- `app/(onboarding)/setup.tsx`: local profile setup.
- `app/(tabs)/dashboard.tsx`: dashboard and summary.
- `app/(tabs)/records.tsx`: entry list.
- `app/(tabs)/gear.tsx`: placeholder gear tab.
- `app/(tabs)/profile.tsx`: profile display.
- `app/entry/new.tsx`: draft entry form.
- `app/entry/[id].tsx`: entry detail, signature state, remote request state.
- `app/entry/[id]/sign.tsx`: local touch-signature flow.
- `app/entry/[id]/request-signature.tsx`: pending remote request form.
- `app/entry/[id]/amend.tsx`: amendment draft form.

Domain:

- `src/domain/logbook/types.ts`: logbook entry, signature, request, dashboard types.
- `src/domain/logbook/logbook-service.ts`: local SQLite-backed logbook operations.
- `src/domain/logbook/use-logbook.ts`: React Query hooks.
- `src/domain/logbook/entry-hash.ts`: canonical entry hashing.
- `src/domain/logbook/entry-readiness.ts`: required-field gate before verification.
- `src/domain/profile/*`: profile model/service/hooks.

Data:

- `src/db/migrations.ts`: migration ledger and schema.
- `src/db/client.ts`: DB client interface.
- `src/db/initialize.ts`: runtime DB init.

UI:

- `src/ui/primitives/*`: button, card, field, screen, checkbox, signature pad, stat row.
- `src/ui/theme/*`: tokens and theme provider.

Tests:

- `__tests__/db/migrations.test.ts`
- `__tests__/domain/logbook-service.test.ts`

## Current Schema Notes

Current migrations:

1. `core-local-logbook`
2. `gear-and-cloud-placeholders`
3. `signature-trust-state`
4. `drawn-signatures-and-attestation`
5. `remote-signature-requests`
6. `scheme-work-log-fields`

The entry hash version is currently `2` in `src/domain/logbook/entry-hash.ts`. Version 2 includes the scheme-oriented work-log fields, max height, and height unit. If export fixtures are added, lock expectations around this version.

## Validation Status

Last known good checks:

```bash
npm.cmd run typecheck
npm.cmd test -- --runInBand
```

Result: TypeScript passed, Jest passed with 12 tests.

Last browser smoke target:

`http://localhost:8091`

Last smoke flow passed:

1. Create profile.
2. Create entry with required scheme-oriented fields.
3. Confirm Save is disabled until required height is filled.
4. Confirm entry detail renders work classification fields.
5. Create remote signature request.
6. Confirm pending request status, verifier, request code, requested hash.
7. Confirm no unmatched route and no console/page errors.

To restart web preview:

```bash
npm.cmd run web -- --clear --host localhost --port 8091
```

## Recommended Next Step

Build the audit/export packet layer.

Suggested first deliverable:

- Add a domain function that creates a deterministic JSON verification packet for a signed entry.
- Include:
  - full entry fields
  - scheme-oriented work-log fields
  - signature details
  - attestation text
  - entry hash and hash version
  - amendment/original entry relationship
  - export metadata
- Add Jest fixtures so the packet format becomes stable.
- Add an entry-detail action to preview/copy/export the JSON packet.

After that, build:

1. PDF export using the same packet.
2. CSV export for employer/audit review.
3. Remote signer completion flow with secure tokens and a public signing page.
4. Gear inventory and inspection module.
5. Cloud backup/restore with explicit conflict and signed-record verification.
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
