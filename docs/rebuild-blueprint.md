# Rebuild Blueprint

## Product Direction

Make RALB a calm, field-grade mobile tool: fast entry capture on job sites, trustworthy signatures, audit-ready exports, and cloud recovery that never surprises the user. The app should feel like a professional logbook, not a social app or a dashboard demo.

## Stack I Would Use

- Expo SDK 54+ with TypeScript strict mode.
- Expo Router for route files and native stack organization.
- `expo-sqlite` for local-first persistence.
- React Query for async orchestration and cache invalidation.
- Supabase for Auth, Storage, Postgres, Realtime, and Edge Functions.
- RevenueCat for subscription ownership.
- Jest plus better-sqlite3 for service and migration tests.

I would keep raw SQL close to the schema instead of hiding the app behind an ORM too early. The domain is small enough that explicit SQL plus typed repositories is easier to audit.

## Project Structure

```text
app/
  _layout.tsx
  (onboarding)/
  (tabs)/
  entries/
  gear/
  supervisors/
  settings/

src/
  providers/
    app-providers.tsx
    boot.ts
  db/
    client.ts
    migrations/
    repositories/
  domain/
    logbook/
    signing/
    profile/
    gear/
    backup/
    supervisors/
    subscription/
  cloud/
    supabase/
    storage/
  ui/
    primitives/
    components/
    theme/
  testing/

supabase/
  migrations/
  functions/

docs/
  decisions/
  qa/
  runbooks/
```

## Architecture Rules

1. Domain services own all invariants. Screens never decide whether a signed entry can mutate.
2. Every table change is a numbered migration plus a migration test.
3. Every cloud snapshot version has an encoder, decoder, fixture, and restore test.
4. Every file path crossing backup/restore is normalized through one module.
5. Every asset-bearing profile field has symmetric backup and restore logic.
6. Remote signing has one transaction boundary: signature insert plus entry status update.
7. Realtime is a notification mechanism, not the source of truth.
8. Subscription lapsed means read-only writes, not loss of content access.

## Data Model Changes I Would Make

Use a local `schema_migrations` table instead of only introspection-based migrations. Introspection is still useful for defensive upgrades, but a migration ledger makes device state easier to diagnose.

Split `profile` certification fields into explicit local tables:

```text
profiles
certifications
entries
entry_signatures
entry_amendments
gear_items
gear_inspections
notifications
cloud_state
remote_sign_request_cache
supervisor_connection_cache
```

This avoids the current flat profile shape where SPRAT legacy names and IRATA additions make backup/restore easy to drift.

## Cloud Backup Contract

The backup snapshot should be treated like an API:

- `cloud_schema_version`
- `local_schema_version`
- `exported_at`
- `backup_id`
- `profile`
- `certifications`
- `entries`
- `signatures`
- `gear`
- `gear_inspections`
- `asset_manifest`

Restore should reject newer versions, verify every asset hash, write inside one transaction, and record a restore report. The UI should show exactly what was restored and what assets failed.

## UI Direction

Keep the light theme, Inter, and red action color, but make screens denser and more operational:

- Dashboard: today, recert status, pending signatures, due gear.
- Records: fast filters, search, export, and entry state clarity.
- Entry form: two or three stable steps, minimal modal stacking.
- Me: profile, certifications, cloud state, subscription, and account actions.
- Gear: inspection due list first, history second.

Large route files should be split into screen-specific sections before they reach 250 lines.

## Testing Baseline

Add scripts immediately:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "typecheck": "tsc --noEmit",
    "test": "jest --runInBand",
    "test:watch": "jest --watch"
  }
}
```

Test categories:

- Pure domain services.
- SQLite migrations from every historical shape.
- Snapshot encode/decode/restore fixtures.
- Signature hash compatibility fixtures.
- Supabase policy review checklist.
- One manual iOS and Android QA checklist per release.

Console noise in tests should be mocked or asserted, not allowed to flood output.

## First Implementation Milestone

Scaffold the Expo Router app, theme, DB client, migration ledger, and the local profile/entries/signing flow. Local signing uses the same canonical entry hash that remote supervisor signing will use later, so the trust model stays consistent across offline and cloud workflows.

Do not add Supabase or RevenueCat until local signing, immutable entries, amendments, and export pass tests.
