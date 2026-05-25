---
name: work-task-taxonomy-and-custom-entry
description: Ruling on work_task / access_method / structure_type preset taxonomies, custom free-text entry, and the work_task-vs-entry_kind separation of concerns
metadata:
  type: feedback
---

Ruling given 2026-05-24 on expanding the three free-text categorical fields and allowing technician-entered custom values.

**Separation of concerns (the load-bearing rule):** `work_task` = the technical activity on the rope. `entry_kind` = whether the day was work/training/assessment/rescue_drill (hash-attested, hour-bucket-attested). They are different axes. A training day for inspection is `work_task='Inspection'` + `entry_kind='training'`. Do NOT put 'Training', 'Assessment', or 'Rescue standby' in `work_task` presets — that double-encodes a fact already in `entry_kind` (and rescue cover already lives in the `rescue_cover` field). On signed entries a disagreement between the two is frozen forever. The original 4-chip preset had this bug ('Training' in work_task).

**Custom free-text is acceptable for audit-readiness — with guardrails.** Auditors care that the field is *meaningful and consistent*, not that it came from a closed list. Guardrails: (1) cap ~64 chars (longer = description, not category); (2) device-local "recent custom" suggestions via case-insensitive match to fight drift; (3) never normalize the stored string and never sync the recent list across devices; (4) no denylist validation (techs route around it) — instead show the final stored value in the Review step so the tech sees what they're attesting to.

**No hash bump for any of this.** Canonical serialization stores the string as-typed; what's hashed is what's signed. CSV injection already handled in `export.ts` `csvCell`.

**structure_type is physical form, not hazard.** 'Confined space' is a hazard (already in `HAZARD_PRESETS`), not a structure. A confined vault inside a tank = `structure=Tank` + `hazard=Confined space`.

**access_method nuance:** two-rope is the SPRAT/IRATA standard; single-rope is outside both schemes' industrial work scope (mark non-standard or omit). Fall restraint and fall arrest are different controls — keep distinct. 'Work positioning (with backup)' is its own category.

**Recommended ordering:** order chips by hour-share so the common taps (Inspection, Maintenance) are first; specialised activities (welding, glazing, wind-blade repair) behind a "More" affordance. `ChipSelect` has no custom affordance today — this feature carries a small UI scope (a "More…" sheet or an `allowCustom` prop), not just an array swap.

**Why:** Assessors scan logbooks for credible, consistent categorisation; a field that's either empty, conflated with entry_kind, or full of "Misc" undermines the whole categorical record. See [[hours-bucket-breakdown]] and [[hash-version-bump-candidates]].
