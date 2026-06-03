# RALKREDUX Batch 3 — #6/#7 multi-select → ENTRY_HASH_VERSION v5

> Audit-critical, **atomic** change (device hash + Deno Edge Function + migration ship together). Advisor-reviewed. **Implement as a focused unit with the tunnel paused** — a half-applied migration/hash must never hot-reload onto a live device.

## Decisions
- `work_task` → multi-select **with a designated primary** (ordered array, index 0 = primary; order is attested).
- `access_method` → multi-select, **rope techniques only** (no `means_of_access` axis). Order-preserving canonical (could sort since no primary — not required).
- Both are hash-attested → **one** `ENTRY_HASH_VERSION` 4→5 bump.

## Load-bearing invariant (do NOT violate)
Keep the **scalar `work_task`/`access_method` columns frozen** and the **`canonicalizeEntry` `v<5` path byte-identical**. Add the lists **additively** in new columns. The moment `canonicalizeEntry(oldEntry, 4)` reads `["Inspection"]` instead of `Inspection`, every v4 signature breaks.

### Byte-identity baseline (captured from current code, 2026-06-02 — lock these in tests)
- `canonicalizeEntry(e, 3)` === `canonicalizeEntry(e, 4)` except the `version` field. `work_task`/`access_method` are scalar strings; `hazards` is a canonical JSON **string** value (e.g. `"[\"Edge\",\"Falling object\"]"`).
- v5 canonical = same as v4 but `work_task` and `access_method` values replaced by their canonical **list strings**, and `version:5`.

## Design
1. **Migration 18 `entry-multi-classification`**: `ALTER TABLE entries ADD COLUMN work_task_list TEXT; ADD COLUMN access_method_list TEXT;` (nullable). **Backfill in JS** (NOT SQL `json_array()` — avoids the JSON1 dependency and makes the backfilled string identical to `canonicalizeStringList`): `getAll` rows where the scalar is non-empty, then `run('UPDATE entries SET work_task_list = ? WHERE id = ?', [JSON.stringify([work_task.trim()]), id])` (same for access_method). Backfilling signed rows is harmless (they verify under v4/scalar); backfilling old drafts means signing them under v5 still attests their task.
2. **`src/domain/logbook/types.ts`**: `LogbookEntry` gains `work_task_list: string | null`, `access_method_list: string | null` (canonical JSON strings, mirroring `hazards`). Add `parseStringList(raw)` (mirror `parseHazards`) and `canonicalizeStringList(values)` (order-preserving: trim, drop empties, dedupe, `JSON.stringify` or null). `CreateEntryInput`/`UpdateEntryInput` accept optional `work_task_list`/`access_method_list` arrays.
3. **`src/domain/logbook/entry-hash.ts`**: `ENTRY_HASH_VERSION = 5`. In `canonicalizeEntry`, after the base payload, add `if (version >= 5) { payload.entry.work_task = entry.work_task_list; payload.entry.access_method = entry.access_method_list; }`. **Do not touch the `v<5` lines.**
4. **`src/domain/logbook/logbook-service.ts`**: on create/update, `scalar = primary = list[0] ?? input.scalar`; `list = canonicalizeStringList(input.list ?? [scalar])` (new entries ALWAYS get a non-null list so `canonicalizeEntry(v5,5)` never hashes null). On read, the column flows into `entry.work_task_list`. Career-stats bucketing stays on the scalar (= primary) — note the simplification. Readiness unchanged (scalar = primary, always set).
5. **Hosted parity — `supabase/functions/_shared/remote-signing.ts`**: bump `ENTRY_HASH_VERSION = 5` and mirror the v5 branch in `canonicalizeEntryPayload` **byte-identically** (it currently sets `work_task`/`access_method` scalars at ~lines 130/144). `remote-signing-request` rejects `hash_version !== ENTRY_HASH_VERSION` and recomputes `hashEntryPayload(entry) !== entry_hash`, so a v5 entry whose upload omits the lists, or whose Deno canonical form drifts from TS, fails with `entry_hash_mismatch`. Run `npm run functions:check`.
6. **Upload payload — `src/cloud/supabase/remote-signing.ts`**: ensure `work_task_list`/`access_method_list` are included in the `entry` object sent to `remote-signing-request`.
7. **Export — `src/domain/logbook/export.ts`**: render the **full lists** for v5 entries (currently shows the scalar primary only). Same failure class as `[[export-human-readable-loses-v3-and-site-signer]]`. Bump `export_schema_version` + update its test.
8. **Verifier rendering**: the human verifier must see the full task/access lists (they attest to what the v5 hash binds), not just the primary.
9. **UI (last, verify on-device)**: swap the single-select `ClassificationChips` for a multi-select variant on `work_task` + `access_method` in `app/entry/new.tsx` (+ edit). Designate primary (index 0). Mirror the `hazards` multi-select UX.

## Test rigor (advisor-mandated)
- **Pin existing `entry-hash.test.ts`** `signature()`/`hashEntry()` to explicit `hash_version: 4` — the bump to 5 silently moves the defaults and would evaporate v4 regression coverage.
- **Byte-identity snapshot**: assert `canonicalizeEntry(entry, 2/3/4)` equals the exact captured strings (or `toMatchInlineSnapshot`), so "v<5 unchanged" is enforced mechanically.
- v5: multi-value work_task/access_method hashes+verifies; **reordering work_task changes the v5 hash** (primary attested).
- **Old v4 signature still verifies** after the change (`verifyChainHashFor` with `hash_version:4`).
- **Old draft signed under v5** attests its single (backfilled) task; create/sign **never** produces a null list under v5.
- Migration-18 columns + backfill test.

## Order to implement
types/helpers → entry-hash + tests (lock byte-identity first) → migration + test → service + tests → Edge Function parity + `functions:check` → upload payload → export + test → UI (on-device).
