---
name: gear-inventory-gaps
description: Specific PPE-register fields the current gear inventory lacks vs how a real audit-grade kit register is kept
metadata:
  type: feedback
---

Audit-grade PPE registers require fields the current `gear_items` / `gear_inspections` schema is missing. These are the gaps to flag any time gear features come up:

**On `gear_items`:**
- `date_of_manufacture` — required for textile retirement (rope, sling, lanyard, harness all have manufacture-date-driven service lives).
- `date_first_used` (in-service date) — many manufacturers reset service life from first-use, not manufacture. Both fields are needed.
- `lot_or_batch` — manufacturer batch identifier, especially for soft goods. Serial alone doesn't link to recall notices.

**On `gear_inspections`:**
- `inspector_name` — competent-person identity. Today inspections are anonymous in the schema.
- `inspector_cert_number` and `inspector_level` — required for the inspector to be a "competent person" under both schemes.

**Status / lifecycle:**
- Quarantine state between active and retired. As of 2026-05-12 a "fail" inspection retires the item immediately. Real practice is "withdrawn from service pending second opinion" → either return-to-service (requires second inspector signature) or formal retirement.

**Why:** Auditors will ask "who signed off this rope being in service in April 2024?" and "what's the manufacture date of this harness — should it have been retired last year?" Today the app can't answer either. The gear table is the second-most-scrutinized object after entries.

**How to apply:** Any time gear schema or UI changes come up, raise these specifically rather than letting them slip into a backlog. None of them require an entry-hash version bump — they're gear-table only — so they can land independently of the [[hash-version-bump-candidates]] cycle.
