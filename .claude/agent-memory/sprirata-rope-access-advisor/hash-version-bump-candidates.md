---
name: hash-version-bump-candidates
description: What already shipped in ENTRY_HASH_VERSION 3, and the remaining entry/signature-shape changes that would force a future v4 — batched so reviews stay consistent
metadata:
  type: project
---

`ENTRY_HASH_VERSION` is **3** as of the code read on 2026-05-24 (`src/domain/logbook/entry-hash.ts`). v3 canonicalization includes `entry_kind`, `hazards`, and `rescue_cover` on top of the v2 entry fields. The earlier "pending v3 batch" is largely landed — this file now tracks the v4 horizon.

**Why batch:** Each hash bump fragments the audit narrative ("v2 vs v3 vs v4 entries") and widens the test surface in `entry-hash.test.ts` + `verify-full-chain.test.ts`. One coherent bump is easier to defend to an auditor than serial ones.

**How to apply:** When a proposal touches what a signer attests to, ask the v4-batch question before greenlighting it solo. The advisor (me) flags this in every entry-shape review.

Already shipped — do NOT re-flag as pending:
- `entry_kind` ('work' | 'training' | 'assessment' | 'rescue_drill') — top-level entry attribute, in the hash. See [[hours-bucket-breakdown]].
- `hazards` array on entries (controlled vocabulary, `HAZARD_PRESETS`), in the hash.
- `rescue_cover` free-text on entries, in the hash.
- Supervisor/signer scheme on signatures: `supervisor_scheme` is `SignerScheme` ('sprat' | 'irata' | 'site'), with `supervisor_role` / `supervisor_employer` captured for the 'site' path. NOTE: this is on the *signature* row, not entry canonicalization — it rides the signature chain, not the entry hash. See [[cert-required-gate-supervisor-not-tech]] and [[signer-authority-site-vs-scheme]].

Still genuinely pending (would force a v4 if it lands in entry canonicalization):
- `anchor_method` separate from `access_method` on entries — NOT shipped. Today access_method is one free-text-ish field; splitting anchor vs access is a real v4 entry-shape change.
- `rescue_plan_summary` as a distinct structured field beyond the current free-text `rescue_cover` — NOT shipped.
- `actual_signer_name` as a field distinct from `supervisor_name` — NOT shipped as a separate column. Current model treats `supervisor_name` as the actual signer and reconciles against the request's `recipient_name`. This is a signature-shape question, not entry canonicalization. See [[verifier-identity-must-reconcile]].

NOT hash-version changes (kept here so they don't get mis-filed):
- Drawn signature ink is not in the entry hash by design (chain hash binds it via signature_id). Document in exports.
- Gear inspection inspector identity / gear manufacture/in-service dates live in gear tables, not entry canonicalization.
- Expanding `WORK_TASK_PRESETS` / `ACCESS_METHOD_PRESETS` / `STRUCTURE_PRESETS` or allowing custom free-text in those fields is NOT a hash change — the canonical serialization stores the string as-typed; what's hashed is what's signed. See [[work-task-taxonomy-and-custom-entry]].
