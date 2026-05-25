# Plan: Cloud backup & restore (disaster recovery)

**Date:** 2026-05-25
**Goal:** A rope tech who loses or breaks their phone can install the app on a new
device, sign in with the same account (Google / Apple / email-OTP), and pull their
entire logbook back down. This is the edge over a paper logbook — the record can't
drown with the phone.

## Scope

- **In v1:** Per-user cloud backup & restore of the **SQLite database rows**
  (entries, signatures, gear, supervisors, templates, etc.). Backup is a one-way
  safety net, not live two-way sync. Signed entries stay immutable — we copy the
  snapshot verbatim, never re-sign or mutate the hash chain.
- **Deferred to v2:** Photo/attachment **file bytes** (today `entry_photos.file_uri`
  / `entry_attachments.uri` point at on-device files). On restore, entry/photo rows
  come back but the images show as missing. Needs a Supabase Storage upload of the
  bytes — a clean follow-up using the same bucket pattern.
- **Not planned:** Live multi-device sync (collides with the audit hash-chain
  invariant; out of grain for local-first).

## Verified findings (de-risking)

1. **No raw token leaks to the cloud.** The local `remote_signature_requests` table
   stores only `signing_token_hash` + `token_hint` (migrations.ts:164-184, 275-288) —
   no raw token column. The full snapshot (`backup-service.ts:createSnapshot`) contains
   no raw secrets. ⇒ **Keep the existing single snapshot shape; no scrub, no second
   snapshot variant.** Satisfies CLAUDE.md "don't persist the raw token anywhere else."
2. **A backup engine already exists.** `src/domain/backup/backup-service.ts` snapshots
   all tables to JSON and restores them; `cloud_state` (last_backup_at / last_backup_id /
   last_restore_at) is scaffolding already waiting for a cloud destination. We add an
   upload/download layer *around* it — no change to the snapshot/restore core.
3. **No Edge Function needed.** Remote-signing needed functions for *anonymous*
   verifier access. Backup is fully owner-scoped + authenticated ⇒ direct `supabase-js`
   under the user's session, gated by RLS. (No `functions:check` for this feature.)

## Supabase server design (from supabase-expert, current-docs verified)

New migration (create via `supabase migration new cloud_logbook_backups` — let the CLI
mint the timestamp; do NOT hand-name it):

- **`public.logbook_backups`** metadata table — one row per stored snapshot:
  `id, owner_id (fk auth.users on delete cascade), storage_path, backup_schema_version,
  app_schema_version, entry_count, gear_count, signature_count, byte_size, sha256_hex,
  device_label, created_at, updated_at`, `unique (owner_id, storage_path)`,
  index `(owner_id, created_at desc)`. RLS enabled; owner-only SELECT/INSERT/DELETE
  (no UPDATE — rows immutable). `updated_at` trigger for convention parity.
  Holds the list-view fields so the restore UI shows "last backup: when / how many
  entries" **without downloading the blob**.
- **Private Storage bucket `logbook-backups`** (`public=false`, `file_size_limit`
  52428800 = 50 MiB defensive, `allowed_mime_types ['application/json']`).
  Path convention `<owner_id>/<iso-timestamp>.json`.
- **Storage RLS on `storage.objects`** scoped to the bucket: owner-only
  SELECT/INSERT/DELETE using `(storage.foldername(name))[1] = (select auth.uid())::text`
  (the `::text` cast matters — uuid vs text silently matches nothing otherwise).
  `upsert:false` ⇒ only INSERT/SELECT/DELETE needed (avoids the upsert-needs-UPDATE trap).
- **Retention N=3**, append-only with timestamped paths (client-enforced constant).
  Protects against a near-empty DB clobbering the only good copy.

Full migration SQL is in the supabase-expert deliverable (this session's transcript) —
drop verbatim into the generated migration file.

**Apply path:** generate migration → apply to a **Supabase branch/local first** →
`get_advisors` (security + perf), fix warnings → only then promote to the linked
project `Rope Access Logbook`. **Do NOT `supabase config push`** (config.toml is
drifted — see memory `project_supabase_auth_config_ops`). Migration apply only.

## Client design

- **`src/cloud/supabase/backup-cloud.ts`** — thin adapter, gated like `remote-signing.ts`:
  every fn first checks `isSupabaseConfigured()` AND a live **authenticated** session
  (not anonymous; if no real user → return `{ ok:false, reason:'not_authenticated' }`,
  UI hides the feature). When env unset, feature is invisible (local-first invariant).
  - `backupNow()`: `createSnapshot()` → JSON string → compute byte_size/sha256 →
    `storage.upload(path, json, { contentType:'application/json', upsert:false })` →
    insert metadata row (`.select().single()`) → prune to N=3 (remove objects THEN
    rows; client owns both deletes) → update local `cloud_state` from server-returned id.
  - `listBackups()`: select metadata columns only (no blob).
  - `restoreFromCloud(row)`: `storage.download(path)` → `text()` → `JSON.parse` →
    optional sha256 verify → `restoreSnapshot(parsed)`.
- **`src/domain/cloud-backup/use-cloud-backup.ts`** — React Query hooks following the
  `use-<feature>.ts` pattern; invalidate the list query key after backup/prune/restore.

## Restore safety

- **Destructive-restore guard.** `restoreSnapshot` DELETEs all local rows then inserts.
  - New-phone case (local DB empty) → restore freely. This is the disaster-recovery path.
  - Existing-local-data case → require **typed confirmation** ("wipe and restore") with a
    clear warning; never silently clobber.
- **Schema-version guard** already exists (`backup_snapshot_newer_version`); additionally
  use `app_schema_version` from the metadata row to warn *before* downloading a
  too-new snapshot.

## Auto-backup policy

**OPEN PRODUCT DECISION (ask user):** A field tech won't remember to tap "Back up now."
Recommended: **auto-backup after a meaningful change (debounced — e.g. after signing an
entry) + a manual "Back up now" button.** Manual-only is a weaker product but smaller.
Decide before building the trigger layer.

## UI surface

- "Cloud backup & restore" section under **More → Account** (account-tied, near sign-out):
  last-backup timestamp + entry count, "Back up now", and "Restore from cloud" (opens a
  list picker of the last 3 backups). Use design tokens (`colors`/`spacing`/`typography`);
  no hardcoded hex/sizes. Coordinate copy with compliance language rules (no
  "SPRAT/IRATA-accepted" claims).

## Tests

- `__tests__/.../backup-cloud.test.ts` — adapter with a mocked Supabase client:
  gating (unconfigured / unauthenticated), backup upload+insert+prune ordering, list
  shape, restore download→restore round-trip, error → structured result.
- Prune-to-N and destructive-restore-guard logic as pure/DbClient-only where possible.
- RLS can't be unit-tested locally → verify on a Supabase branch with two users
  (owner can read own, cannot read other's) before promoting.
- Keep the full suite green (currently 165/165) + `npm run typecheck`.

## Out of scope / follow-ups

- v2: photo/attachment file-byte backup (same bucket pattern, additive).
- Realtime/auto-refresh of the backup list.
- Backup encryption-at-rest beyond Supabase's default (consider if PII review demands it).
