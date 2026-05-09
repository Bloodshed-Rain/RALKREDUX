# RALB Codex Edition

RALB Codex Edition is an offline-first rope access logbook built with Expo and React Native. It is designed for technicians who need quick field logging, supervisor verification, tamper-evident signatures, gear tracking, and exportable records that can stand up to review.

The app targets iOS and Android first. Web preview is kept available for faster development.

## What Works Now

- Local profile setup with SPRAT and IRATA certification fields.
- Draft, signed, amended, and pending-signature logbook records.
- Required-field readiness checks before signing or requesting verification.
- Direct local supervisor signing from completed new entries.
- Remote verifier request flow with known-verifier checks.
- Hosted remote verification through Supabase Edge Functions.
- Scheme-aware supervisor certification rules: IRATA verifier numbers are required, SPRAT verifier numbers are optional.
- MM/DD/YYYY date display across app screens and exports.
- Immutable entry hashing, signature metadata, and chain hashes for audit packets.
- JSON, CSV, and printable PDF export paths for signed records.
- Gear inventory, inspection due dates, retirement status, and entry gear usage.
- Photo evidence attachments, smart templates, and quick duplication of recent entries.
- Local recovery snapshot export and restore.

## Project Structure

- `app/` contains Expo Router screens for onboarding, tabs, entry creation, signing, amendments, exports, and remote verification.
- `src/domain/` contains local-first business logic for logbook records, gear, profile, backup, date formatting, and hashing.
- `src/db/` contains SQLite setup, migrations, and seeds.
- `src/ui/` contains shared primitives and theme tokens.
- `supabase/functions/` contains hosted remote-signing Edge Functions.
- `docs/` contains implementation notes, hosted-signing details, and SPRAT/IRATA compliance planning.
- `__tests__/` contains service, migration, export, backup, and gear tests.

## Run Locally

Install dependencies:

```bash
npm install
```

Start Expo for a phone on the same network:

```bash
npm run start -- --host lan
```

Start web preview:

```bash
npm run web -- --host localhost --port 8091
```

Run validation:

```bash
npm run typecheck
npm test
npm run functions:check
```

## Environment

Hosted remote signing uses Supabase. Copy `.env.example` to your local environment file and provide the public project URL, anon key, service-role key for function deployment, and remote signing base URL.

Do not commit real Supabase secrets.

## Product Direction

The next highest-value work is usability testing on the field logging and signing flows, then deeper SPRAT/IRATA compliance review, conflict-aware cloud backup/restore, production authentication, and app-store build preparation.

Every production-facing slice should include TypeScript checks, service tests, migration coverage when storage changes, and at least one manual mobile QA pass.
