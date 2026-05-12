# Redesign Audit — Current Back End vs. `design_handoff_ralkredux/`

Last updated: 2026-05-11
Status: decisions locked. Phase A ready to begin on user go-ahead.

This is the "audit and propose" deliverable the previous handoff called for. It compares the back end's current shape against the Tidewater redesign spec, records the four pushback-driven decisions the user locked on 2026-05-11, and proposes the remaining work as a two-phase sequence.

## TL;DR

The current back end covers ~70% of the redesign out of the box. With the four spec-pushback decisions now locked (§2), **Phase A is pure plumbing** — no migration, no `ENTRY_HASH_VERSION` bump, no breaking type changes, no multi-signature refactor. Phase B is the UI rebuild.

## 1. What's already in place (no new work)

| Capability | Where |
|---|---|
| Immutable signed entries; amendment as a new entry pointing back via `amends_entry_id` | `src/db/migrations.ts#1,3`, `src/domain/logbook/logbook-service.ts` |
| Drawn signature + attestation timestamp on every signature row | migration 4 |
| Canonical entry hash + hash chain (`hashEntry`, `hashSignatureChain`) | `src/domain/logbook/entry-hash.ts` |
| `chain_hash` and `previous_chain_hash` computed on every sign (local + remote) | migration 8 |
| Required-field gating before sign/request (`getEntryVerificationReadiness`) | `src/domain/logbook/entry-readiness.ts` |
| Hosted remote-signing path with token-hashed verifier links, auto-sync every 5 s on focus | `src/cloud/supabase/*`, `useAutoSyncHostedRemoteSignature` |
| Closed-request UX classifier (`completed / expired / cancelled / pre_empted`) | `src/domain/logbook/remote-signing-status.ts` |
| Gear inventory + inspection state machine (`current / due_soon / overdue / unscheduled / retired`) | `src/domain/gear/*`, migration 2 |
| Bundled 767-row gear catalog + autocomplete | migration 7 |
| Supervisor contacts (cert number, role, company, `last_signed_at`) reusable across local + remote | migration 8 |
| Dashboard summary + career stats already bucketed by task / access / structure / employer / year | `getDashboardSummary`, `getCareerStats` |
| Audit export — JSON bundle, CSV, single-entry PDF packet with verification block | `src/domain/logbook/export.ts` |
| Local backup snapshot (full schema) + restore | `src/domain/backup/*` |
| Custom mobile tab bar, lucide icons, theme tokens scaffold | `app/(tabs)/_layout.tsx`, `src/ui/theme/tokens.ts` |

The hooks layer already exposes ~20 query/mutation hooks across `use-logbook.ts`, `use-gear.ts`, `use-profile.ts`, `use-backup.ts`, `use-remote-signing-sync.ts`. The redesign mostly consumes them as-is.

## 2. Locked decisions (2026-05-11)

The rope-access advisor pushed back on four redesign claims. User decisions:

| # | Topic | Decision |
|---|---|---|
| D1 | Witness signature | **Removed from scope.** No `entry_type` enum. No multi-signature refactor. `signatures` stays one-per-entry. No `ENTRY_HASH_VERSION` bump. |
| D2 | `FILED` stamp | **Rename to `SYNCED`.** Derives from `remote_signature_requests.status = 'completed'`. Only renders on entries that travelled the hosted remote-signing path. |
| D3 | Amended-original stamp | **Keep `AMENDED`.** Matches existing `entry.status`. No copy change. |
| D4 | `VERIFIED` auto-stamp | **Rename to `CHAIN OK`.** Auto-derives from hash-chain match. `VERIFIED` reserved for a future explicit human-verification feature. |

**Resulting stamp set:** `DRAFT · PENDING · CHAIN OK · AMENDED · SYNCED · EXPIRED (gear/certs only)`. No `WITNESSED`, no `FILED`, no `VOID`, no auto-`VERIFIED`.

Wider advisor notes to keep in mind during Phase B copy review:

- The README says "each record references the hash of the previous record's *signature block*". Chain links signatures to signatures, not entries to entries. Use signature-to-signature language in code.
- `FORM 27-A · REV 4 · EFF 2026.05` chrome is brand decoration only — must not leak into PDF exports an auditor receives. There is no real Form 27-A.
- `EXPIRED` belongs to gear inspections + certifications; entries don't expire.
- Spec is silent on capturing supervisor cert *level* at sign time; current model stores only cert number. Out of scope for Phase A.

## 3. Phase A — Back-end plumbing

No schema. No hash-version bump. All additive.

1. **Expose `useChainHead()` hook.** `getLatestChainHash` already exists privately inside `createLogbookService` — needs to land in the public return object plus a hook wrapper. Drives chain-head display on Today + every record footer.

2. **Pure stamp-derivation helper.** New file `src/domain/logbook/entry-stamps.ts`:
   ```ts
   export type StampKind = 'DRAFT' | 'PENDING' | 'CHAIN_OK' | 'AMENDED' | 'SYNCED';

   export function deriveEntryStamps(input: {
     entry: LogbookEntry;
     signature: EntrySignature | null;
     remote_request: RemoteSignatureRequest | null;
     chain_valid: boolean;
   }): StampKind[];
   ```
   Pure, fully tested under `__tests__/domain/entry-stamps.test.ts`.

3. **`useEntryCloudState(entryId)` hook.** Maps `RemoteSignatureRequest.status` to `'local' | 'queued' | 'synced'`. Drives the `SYNCED` stamp. Only entries that travelled the hosted path can show as synced.

4. **Chain-validity helper.** Pure `verifyChainHashFor(entry, signature)` in `src/domain/logbook/entry-hash.ts` (or a sibling) — recomputes the chain hash from `entry_hash + previous_chain_hash + signature_id + signed_at + method + remote_request_id` and compares to stored `chain_hash`. One SHA per entry — cheap. Powers the `CHAIN OK` stamp.

5. **Font load.** Extend `src/providers/app-providers.tsx`:
   - Archivo 700/800/900 (`@expo-google-fonts/archivo`)
   - IBM Plex Mono 400/500/600 (`@expo-google-fonts/ibm-plex-mono`)
   - Newsreader italic 500/700 (`@expo-google-fonts/newsreader`)
   - Inter 700 added to existing 400/500/600 set (emphasis weight)

6. **Theme overhaul (`src/ui/theme/tokens.ts`).**
   - Replace current `brandColors` with full Tidewater palette: `ink #0b2545 / ink2 / ink3 / paper #f6f3eb / paper2 / yellow #f5c518 / yellowDeep / yellowSoft / red #b32f1a / redSoft / green #1f7a3d / greenSoft / hair / hairSoft / hairFaint`.
   - Add typography groups: `display` (Archivo 900 stretched), `body` (Inter), `mono` (Plex Mono), `italicStamp` (Newsreader italic), `formNumber` (Plex Mono scale variant).
   - Add `hairlines`, `docBand`, `stamp` (rotation, opacity) token groups.

7. **New primitives (`src/ui/primitives/`).** Token-driven; no hex/sizes inline:
   - `DocBand` — ink top-band + paper2 footer-band with form id / effective date / page counter.
   - `FormCell` — numbered + labeled field row separated by hairline rule.
   - `Stamp` — rotated Newsreader-italic stamp with bordered box and tone variants.
   - `Chip` — tone-coded mono pill (ink / green / yellow / red / mute).
   - `RowDoc` — hairline-separated tabular row used in Records + Gear lists.
   - `SectionH` — numbered section header with bottom ink rule.

8. **5-tab nav with raised center button.** Restructure `app/(tabs)/_layout.tsx`:
   - `today` route (renamed from `dashboard`)
   - `records` (unchanged)
   - `new` — raised center tab that opens the 3-step modal at `app/entry/new.tsx`
   - `gear` (unchanged)
   - `more` — combines profile + settings sheet

   The custom `AppTabBar` already exists; the rewrite is presentational + adds the raised-center slot.

**Validation gate end of Phase A:** `npm run typecheck && npm test && npm run functions:check` green. Phone smoke: today screen reads chain head, font load renders, stamp helper outputs match across draft / signed / amended / synced entries.

## 4. Phase B — UI rebuild

Locked in once Phase A is green. Screens with their data sources:

- **Splash** — animated boot screen reading font + DB readiness.
- **Today** — `useDashboardSummary` + `useCareerStats` + `useChainHead` + derived advisory list (gear overdue + cert expiry + pending sigs).
- **Records list** — `useEntries` + `useEntryStamps` per row.
- **New (3-step modal)** — `useCreateEntry` + `useEntryTemplates` + `useSupervisorContacts` + `useAttachGearToEntry` + `useSignEntryLocal`. Steps map to: site/job particulars → activity/gear/conditions/photos → counter-signer + lock confirmation.
- **Record detail** — `useEntryDetail` + `useEntryStamps` + `useEntryCloudState`.
- **Gear** — `useGearItems` + `useGearSummary` + `useRecordGearInspection`.
- **More / Settings** — `useProfile` + backup/restore + supervisor roster + export buttons + settings sheet (sections A.1–A.5 per `prototype.jsx`).

PDF audit-export cover-page (watermark seal + security weave + form chrome — chrome stays internal, never on the auditor-facing pages) lands as a Phase B sub-task in `src/domain/logbook/export.ts`.

**Validation gate end of Phase B:** type/test/functions green + per-screen smoke against the spec's user journey + `prefers-reduced-motion` check.

## 5. Risks / watch items

- **`SYNCED` honesty.** Only entries that completed the hosted remote-signing path have a backend mirror. Don't render `SYNCED` on local-only signed entries — they aren't synced. A general per-entry mirror to Supabase (independent of signing) is a future workstream.
- **Tab count discrepancy.** `prototype.jsx` uses 4 tabs (BRIEF/LOG/GEAR/CARD); `README.md` calls for 5 (Today/Records/New/Gear/More). README is the spec; prototype is a simplified reference. Phase A targets 5.
- **`FORM 27-A · REV 4` chrome.** Brand decoration only. Confirm during Phase B copy review that exports an auditor receives do NOT include the made-up form number.
- **Chain-validity computation.** The stamp helper needs chain-validity as input. Either compute on every detail render (cheap, one SHA per entry) or memoize at the hook level. Pick during Phase A implementation; both are fine.

## 6. Where this leaves us

Phase A is now small enough to land in one PR with full test coverage and no schema risk. The original "produce a written audit before writing migrations" gate is satisfied — there are no migrations.

Ready to start Phase A on user go-ahead.
