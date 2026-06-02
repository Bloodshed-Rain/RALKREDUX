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
