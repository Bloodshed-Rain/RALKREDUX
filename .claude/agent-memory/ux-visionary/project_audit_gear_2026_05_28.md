---
name: project-audit-gear-2026-05-28
description: Gear-screen UX/field-context audit 2026-05-28. New finds in silent inspection failure, ≤14d-vs-30d copy mismatch, catalog image offline fallback, local/UTC date-base split.
metadata:
  type: project
---

Gear screen group audit delivered 2026-05-28 (LENS = UX flow & field-context). Verified against current code + gear-service + use-gear + primitives, not memory.

**Confirmed RESOLVED since prior passes (did NOT re-flag):** retire-gear IconBtn now has onPress (`gear/[id].tsx:328-338`); FAIL inspection wrapped in Alert.alert (`gear/[id].tsx:153-164`). Re-reporting these would be the "worse than silence" failure.

**NEW finds (gear-specific):**
1. Silent inspection failure (P1, code-certain) — `gear/[id].tsx:192` `onError: () => haptics.error()`. No Alert, form stays open. The retire IconBtn routes through this SAME submit path, so a failed retire write (gear_retired race / inspector_identity_required) gives only a buzz; tech believes gear is retired but it's still active in DB. Audit-integrity gap. Note the create path 20 lines away (`gear.tsx:171-174`) DOES Alert.alert — inconsistency. This is my strongest find.
2. "due ≤14d" copy vs `DUE_SOON_DAYS=30` (P2, code-certain) — subtitle `gear.tsx:179` + deadline header `gear.tsx:313` both say "due ≤14d" but `getGearStatus` (gear-service.ts:16,31) flags due_soon at `<=30`. Count and label disagree. Frame neutrally: reconcile copy with constant; WHICH interval is correct is a SPRAT/IRATA domain-agent call — hand off.
3. Catalog image has no onError fallback (P2 latent, code-certain) — `catalog.tsx:200-208` falls back to icon only when `image_url` is falsy, NOT on load failure. VERIFIED: migration seed (migrations.ts:247-252) inserts NO image_url; ALTER adds the column later with no backfill (comment migrations.ts:477-479 plans a "future curation pass"). So today every row shows the icon (latent), but the moment image_url is populated, offline = empty grey box. Offline-first regression-guard.

**Secondary NEW (P2/needs-on-device):** local-vs-UTC date-base split — screen computes day-count in LOCAL time (`startOfLocalDay`/`parseLocalDate`, gear.tsx:57-93, [id].tsx:54-66) but service computes STATUS in UTC (`isoDateToUtcMs` T00:00:00.000Z, gear-service.ts:18). Near midnight / far-from-UTC zones the dial can say "Due today/1d remaining" while pill says "Overdue."

**Friction (P2):** passing inspection with Next-due left blank silently drops item to unscheduled/"No date" ([id].tsx:368-376 clearable/optional). SPRAT/IRATA gear has fixed re-inspection intervals — could prefill. Friction, not bug; domain-agent owns the interval.

**Tagged KNOWN-BACKLOG (async-state item 2 + typography item 1):** gear-list shows "No gear, tap +" empty state during load (`gear.tsx:141` `data ?? []`) while Today/Records already got the `!entries.data ? null` fix 2026-05-17 — gear left behind; unhandled isError on useGearItems/useGearCatalogSearch; hand-rolled fonts in detail hero ([id].tsx:246-260,281-291) bypassing type.*/UI_SCALE.

Related: [[project-audit-2026-05-20]], [[feedback-destructive-confirmation-audit]].
