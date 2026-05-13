---
name: hash-version-bump-candidates
description: Pending entry/signature-shape changes that would require ENTRY_HASH_VERSION to go from 2 to 3, batched so future reviews stay consistent
metadata:
  type: project
---

Pending changes that, if any one lands, force `ENTRY_HASH_VERSION` from 2 → 3 and an update to `canonicalizeEntry` (and possibly `hashSignatureChain` inputs). Batch them into a single v3 cycle rather than serial bumps.

**Why:** Each schema bump fragments the audit narrative ("v2 entries vs v3 entries"). One coherent v3 ("introduces supervisor scheme, hazards, rescue cover, hours bucketing") is easier to defend than three sequential bumps, and reduces test surface.

**How to apply:** When a proposal touches any of these, raise the v3-batch question before greenlighting it solo. If the team wants to land one early, document why the rest can't wait. The advisor (me) will flag in every entry-shape review.

Pending v3 candidates from the 2026-05-12 audit:

- Supervisor scheme + supervisor level on signatures (today SPRAT loses level; IRATA encodes it in cert-number leading digit). See [[cert-required-gate-supervisor-not-tech]].
- `actual_signer_name` separate from `recipient_name` on signatures so requested-verifier vs actual-signer is reconcilable. See [[verifier-identity-must-reconcile]].
- Hours-type breakdown on entries (`work` / `training` / `assessment` / `rescue_drill`). See [[hours-bucket-breakdown]].
- `rescue_cover` / `rescue_plan_summary` fields on entries.
- `hazards` array on entries (controlled vocabulary).
- `anchor_method` separate from `access_method` on entries.
- `entry_kind` ('work' | 'training' | 'assessment') as top-level entry attribute.

Items that do NOT need a v3 bump (signature-image / inspector identity / gear fields):
- Drawn signature ink is not in the entry hash by design (chain hash still binds it via signature_id). Just document this in exports.
- Gear inspection inspector identity is its own table, not part of entry canonicalization.
- Gear item manufacture/in-service dates are gear-table, not signature-attested.
