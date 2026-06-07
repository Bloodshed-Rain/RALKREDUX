---
name: access-method-two-axis-ruling
description: access_method (rope technique) must NOT be merged with means-of-access (MEWP/scaffold/ladder); the latter controls rope-access hour-countability
metadata:
  type: feedback
---

Ruling given 2026-06-01 on the "convert Access Methods to multi-select" request (requester examples: Rope Access, MEWP, Scaffolding, Ladder, Structure Climbing).

**The requester conflated two distinct axes.** `access_method` = rope-access TECHNIQUE (two-rope, work positioning, fall restraint, fall arrest) — this is what a SPRAT/IRATA assessor cares about as evidence the hours are rope-access hours done to scheme technique. The requester's examples (MEWP/scaffold/ladder/structure-climbing) are MEANS OF ACCESS to the worksite — a different axis, and several are explicitly NOT rope access.

**Do NOT collapse them into one multi-select.** Blending MEWP into `access_method` creates an entry that simultaneously claims to be and not-be rope access; the rope-access hour count becomes untrustworthy. That is the worst failure mode for this app. The request as LITERALLY WRITTEN would mislead an auditor — flag it to the PO as an audit-integrity issue, not a UI preference.

**Recommended split (default):**
1. Keep `access_method` as rope-technique ONLY. Multi-select within rope technique IS correct (one climb routinely = two-rope + work positioning). Keep MEWP/scaffold/ladder out.
2. Add separate single-value `means_of_access` (Rope access / MEWP / Scaffold / Ladder / Structure climbing). When != "Rope access", the entry's hours are flagged OUT of the rope-access aggregate. Tie this to the per-scheme hour-pool logic from [[starting-hours-and-legacy-evidence]].

Both shapes are hash-attested → **bump ENTRY_HASH_VERSION**, add both to `canonicalizeEntry`. Batch with the work_task multi-select bump (see [[work-task-taxonomy-and-custom-entry]] and [[hash-version-bump-candidates]]).

**STATUS 2026-06-07 (confirmed from code):** `means_of_access` NEVER shipped — exists only in docs/plans, not in `classification.ts` or `app/entry/new.tsx`. So access_method is still the only access axis. Worse: `ACCESS_METHOD_PRESETS` (classification.ts:34) still contains `'Rescue cover / standby'` — a rescue *posture*, not a rope technique. That's the same double-encoding trap as old 'Training' in work_task: it collides with the `rescue_cover` free-text field and a signed entry would freeze the contradiction. RULING: pull 'Rescue cover / standby' from ACCESS_METHOD_PRESETS. Removing a never-correct preset is NOT a hash change (string-as-typed serialization, per [[work-task-taxonomy-and-custom-entry]]) but check no historical entries stored it before silently dropping recents.
