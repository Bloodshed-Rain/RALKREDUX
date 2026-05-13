---
name: hours-bucket-breakdown
description: Work hours must be distinguishable from training and assessment hours in storage and exports
metadata:
  type: feedback
---

A single `work_hours` field that conflates on-rope work, training, assessment, and rescue drill is not adequate for SPRAT or IRATA assessment. Assessors care about the breakdown — IRATA's logbook expects it, and SPRAT separates work hours from training hours when evaluating progression.

**Why:** When a tech goes to L2 or L3 assessment, the assessor scans the logbook for *work* hours specifically — training hours don't count toward the threshold. If the export doesn't distinguish, the assessor either disqualifies entries or has to interview the tech. Both are bad outcomes the app can prevent. As of 2026-05-12 the entry has a single `work_hours` column.

**How to apply:** When entry shape changes come up, push for either (a) an `entry_kind` top-level discriminator ('work' | 'training' | 'assessment' | 'rescue_drill') plus the single hours field, or (b) discrete `work_hours_work` / `work_hours_training` / `work_hours_assessment` columns. Option (a) is simpler and lines up with how techs think about a day. Option (b) handles the rare day that mixes types but creates UI clutter for the 95% case.

Either way: this is signer-attested → bumps `ENTRY_HASH_VERSION`. Batch with [[hash-version-bump-candidates]].
