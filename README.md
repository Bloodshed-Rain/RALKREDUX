# RALB Codex Edition

This folder is the clean rebuild space for a new Rope Access Logbook project based on the existing Desktop `RALB` app, but designed from a fresh architecture pass.

The original app is a serious offline-first Expo/React Native product: local SQLite logbook, immutable signed entries, PDF export, Supabase backup/restore, remote supervisor signing, RevenueCat subscriptions, notifications, and gear inspection tracking. The rebuild should preserve those domain contracts while reducing coupling, improving test isolation, and making cloud/restore semantics explicit from day one.

## What Is Here

- `docs/current-ralb-audit.md`: concise audit of the current Desktop RALB folder.
- `docs/rebuild-blueprint.md`: how I would build the new version.
- `docs/sprat-irata-compliance-roadmap.md`: deferred but high-priority acceptance roadmap for scheme-specific logging.
- `docs/hosted-remote-signing.md`: Supabase-hosted verifier link contract and next app integration steps.
- `docs/CODEX_HANDOFF.md`: continuity note for future Codex sessions, including phone-based work.
- `app/`: Expo Router routes for onboarding, tabs, entries, local signing, amendments, export, and gear.
- `src/`: app providers, SQLite migration ledger, local logbook/profile/gear domain services, theme, and primitives.
- `__tests__/`: SQLite-backed migration, logbook, and gear service tests.

## Current State

The first local-first slice is live:

- Create a local profile.
- Land on a tabbed dashboard.
- Add draft logbook entries.
- Capture scheme-oriented work-log fields: work task, access method, structure type, rope-access hours, maximum height, and unit.
- Open entry detail screens.
- Locally sign draft entries with a drawn supervisor signature, attestation checkbox, and canonical entry hash.
- Create pending remote supervisor signature requests with verifier contact, role/company metadata, request code, and requested entry hash.
- Complete pending remote signature requests by code with verifier signature, attestation, and remote signature method.
- Store expiring remote requests with token hashes, token hints, completion timestamps, and verifier identity metadata.
- Block local signing and remote verification requests while required work-log fields are incomplete.
- Lock signed records and create amendment drafts.
- Chain signed-entry hashes so audit packets can show tamper-evident chronology.
- Share JSON and CSV audit exports for signed/amended records with profile context, signatures, hash chain, gear usage, evidence, and summary totals.
- Generate and share a signed/amended entry PDF from the same audit packet data.
- Share a single signed/amended entry audit packet from the entry detail screen.
- Track draft, signed, amended, pending-signature, certification expiry, gear-due, and career-hours dashboard totals.
- Add gear inventory items, track next inspection due dates, log inspections, and retire failed gear.
- Attach active gear to draft work entries so signed records keep gear history.
- Search a bundled 767-item rope-access gear catalog by make/model while filtering by gear type.
- Attach photo evidence to draft entries from the native image picker.
- Use and save smart entry templates, plus duplicate the most recent entry for fast field logging.
- Reuse known supervisors in local signing and remote request flows.
- Share and restore a local recovery snapshot containing entries, signatures, remote requests, gear, inspections, evidence, templates, supervisors, and profile data.
- Carry a migration ledger from the first commit.
- Scaffold Supabase hosted remote-signing storage and Edge Functions for one-time verifier-token validation.

The app is being built as a shared Expo codebase for iOS and Android. Web preview is kept working for fast development, but the product target remains native mobile.

Run it with:

```bash
npm install
npm run start -- --host lan
npm run web -- --host localhost --port 8091
npm run typecheck
npm run functions:check
npm test
```

## First Build Principle

Build the core logbook as a local-first app before adding cloud complexity:

1. Profile and certification setup.
2. Entries, immutable signing, amendments, and PDF/JSON export.
3. Gear inventory and inspections.
4. SPRAT/IRATA-specific logging fields and audit exports.
5. Cloud backup/restore with explicit conflict screens.
6. Authenticated remote supervisor signing and completion flows.
7. RevenueCat and store-ready build pipeline.

Every stage should ship with TypeScript, service tests, migration tests, and one manual device QA checklist before the next stage starts.
