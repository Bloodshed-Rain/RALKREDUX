---
name: gear-delete-policy-ruling
description: deleteGearItem must hard-delete only orphaned items; block if used in any entry, has inspection history, or already retired
metadata:
  type: project
---

Ruling (2026-07-03) on "delete gear after adding": hard-delete is allowed ONLY for genuinely orphaned mis-adds; otherwise steer to retire.

`deleteGearItem(id)` gates, in order:
1. Any `entry_gear_usage` row (draft OR signed) → throw `gear_used_in_entries`. Reason: gear list is a LIVE join over entry_gear_usage; a draft becomes signed, so delete would silently strip an attested record. FK is currently `ON DELETE CASCADE` — a latent footgun; the service gate closes this path. Don't rely on CASCADE; delete only the bare item once gates pass.
2. Any `gear_inspections` row → throw `gear_has_inspection_history`. Reason: inspector name/cert/result is PPE traceability evidence.
3. Already retired (`retired_at` set) → throw `gear_retired` (reuse existing code). Retirement is terminal; don't delete out of it.
4. Else hard DELETE FROM gear_items.

NO `force` bypass of (1)/(2). NO ENTRY_HASH_VERSION bump — gear usage is NOT in canonicalizeEntry (verified entry-hash.ts:56-96, only entry scalar fields hashed).

**Why:** Erase a mistake, never a fact. Anything a signer saw or an inspector signed is a fact.

**How to apply:** UI primary action = Retire; hard Delete is secondary, enabled only when provably orphaned. Blocked → show plain-language reason, not a dead button. Safe-delete confirm copy = calm/factual (an orphaned mis-add is a nothing-event), reserve heavy language for retire-vs-delete education. Flag any OTHER code path doing raw `DELETE FROM gear_items` — same CASCADE footgun. Related: [[export-human-readable-loses-v3-and-site-signer]] (export must render retired gear, not omit).
