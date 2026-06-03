# RALKREDUX Batch 2 — Starting Hours + Legacy Archive

> Follows `2026-06-01-ralkredux-safe-wins.md`. Profile-scoped / additive — **no `ENTRY_HASH_VERSION` change.**

## #3 Per-scheme starting hours (full split)

Decision: two independent per-scheme counters; the same shift can increment both (dual-cert). Baselines are **immutable** (void-and-redeclare, never silently edit), attributable (declared-at timestamp), shown as "carried forward (self-declared)". This also fixes the latent bug that the single career total is wrong for dual-cert techs.

**Data model — migration 16 `profile-hours-baseline`** (idempotent `ALTER TABLE profiles`):
- `sprat_hours_baseline REAL` — hours carried from paper SPRAT logbook (null = none)
- `irata_hours_baseline REAL`
- `hours_baseline_date TEXT` — ISO date of the paper→digital transition
- `hours_baseline_declared_at TEXT` — when declared; non-null ⇒ locked (immutability sentinel)

**Service (`profile-service.ts`):**
- `declareHoursBaseline({ sprat, irata, transitionDate })` — throws `hours_baseline_already_declared` if `hours_baseline_declared_at` is set; else writes the three values + `declared_at = now`.
- `voidHoursBaseline()` — clears all four to null (the only way to change a declared baseline).
- Baselines are **NOT** in `UPDATABLE_COLUMNS` — the general edit-profile flow can't touch them.

**Aggregation (`getCareerStats`)** — add to `CareerStats`:
- `spratSignedHours` = `SUM(work_hours)` over signed entries where `sprat_level_snapshot IS NOT NULL`
- `iratASignedHours` = same for `irata_level_snapshot`
- (an entry with both snapshots counts toward both — correct for dual-cert)

**Derivation/UI (next):** display per scheme = baseline + signed logged. Today CareerHero, records, profile show SPRAT and IRATA separately. Declare/void UI lives in profile-edit (or a dedicated sheet) with the immutability warning.

## #4 Legacy paper-logbook archive (evidence, never entries)

New domain `src/domain/archive/` (DbClient-only) + screens under `app/archives/`. **No FK to entries, no hash, no signature.**

**Migration 17 `legacy-logbook-archives`:**
- `logbook_archives(id PK, label, scheme TEXT, date_from TEXT, date_to TEXT, hours_claimed REAL, witness_name TEXT, notes TEXT, created_at, updated_at)`
- `archive_photos(id PK, archive_id FK CASCADE, uri, mime_type, sort_order, created_at)` + index on archive_id

**Service:** `createArchive`, `listArchives`, `getArchive`, `updateArchive`, `deleteArchive`; photos via the existing `persistAttachmentFile`.

**UI:** Profile → "Legacy logbook archive" → list / detail / new (multi-photo). Hard "UNVERIFIED · SELF-DECLARED" badge. **Excluded from the attested audit export**; if surfaced in export at all, only as a separate "Historical Reference — Self-Declared, Unverified" appendix that never sums into attested totals.

**Audit invariant:** archives must never be confusable with signed entries — separate routes, separate table, separate export section.
