---
name: ndt-hours-ruling
description: NDT (Non-Destructive Testing) hours live OUTSIDE the signed entry — separate ledger, separate verifier (NDT Level III), no hash bump, never summed with rope-access hours
metadata:
  type: feedback
---

Ruling given 2026-06-03 on a client request to track NDT (Non-Destructive Testing) hours.

**THE ARCHITECTURAL ANSWER — outside the hash, no bump.** NDT method-hours are NOT part of the signed/canonical entry. Do NOT add to `canonicalizeEntry`. Do NOT bump `ENTRY_HASH_VERSION`. Reason = **verification authority**: a rope-access supervisor (even a SPRAT/IRATA L3) has zero standing to attest to NDT method-hours. NDT experience is verified by the employer's responsible **NDT Level III** (or third-party/central scheme), not the rope-access supervisor. Folding NDT into the entry the supervisor signs = false attestation outside the signer's competence — same double-encoding trap already ruled against ([[work-task-taxonomy-and-custom-entry]] entry_kind-vs-work_task, "Rescue Standby"-vs-rescue_cover). Even when one human holds both roles, they're two separate attestations → two separate signatures. Consistent with existing precedent: gear-inspector identity + drawn ink already live outside entry canonicalization. NDT = entry-LINKED context, separately verified, not in the hash.

**Two ledgers, never summed.** NDT hours partially OVERLAP rope-access work_hours (6 hrs on rope, 4 of them UT → contributes 6 rope hrs AND 4 UT hrs from the SAME clock time) — not a subset, not additive. NDT can also be fully OFF-ROPE (MEWP/scaffold/ground) → NDT record can exist with no rope-access entry. So: separate parallel ledger, optional nullable FK to entry for context. **Never sum NDT into a single "total hours" with rope-access** — double-counts the overlap, misleads the tech. Mirrors the independent SPRAT/IRATA counter pattern in [[starting-hours-and-legacy-evidence]].

**Granularity = method × level + supervised flag.** Primitive is method-specific hours (UT/PT/MT/RT/ET/VT, + technique variants PA/TOFD). Never store bare "NDT hours" — un-auditable. `level_at_time` (I/II/III held when earned). `supervised` (supervised/trainee vs independent) is THE key discriminator — analogous to entry_kind; trainee hours count differently. Non-negotiable after method.

**Min viable field set:** method, technique/variant, level_at_time, supervised(bool), hours, date(+range), procedure_ref, component/material, verified_by (Level III name + NDT cert number — a DIFFERENT identity from `supervisor_name`), verification_state (self-logged/verified/pending), entry_id (optional FK, nullable), ndt_scheme (optional: SNT-TC-1A / ISO 9712 / PCN).

**Scheme thresholds — DO NOT HARDCODE.** SNT-TC-1A / NAS410 = employer's written practice defines hours (no universal table). ISO 9712 / EN 4179 / PCN = fixed by standard, expressed in months + assumed hrs/week, pro-rated. App ACCRUES hours; the Level III applies the threshold. App must NEVER assert "requirement met."

**Scope flag for client (name before designing):** (A) first-class NDT career ledger parallel to rope-access career card w/ verification flow — large; vs (B) lightweight NDT tagging+notes on entries — small. Ruling holds for both. Order-of-magnitude build difference.

**Why:** NDT is a separate competency framework that rides on rope access. Keeping it out of the hash preserves the truth of what the rope-access signature attests to, and keeps the two experience records independently auditable by the bodies that actually own each (SPRAT/IRATA supervisor vs NDT Level III). See [[compliance-language-watchlist]] for the new "not an NDT cert record" line.
