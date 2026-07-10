---
name: workflow-field-reality-findings
description: Field-tech assessment of the daily logging + signing + gear workflow — batch-signing gap, confined-space height, terminology, gear ownership
metadata:
  type: project
---

Assessment (2026-07-05) of whether the app's workflow matches a real rope-access day. Findings, priority-ordered, with the rulings behind them.

**Batch signing is the #1 gap (P1).** No `signMany`/batch service exists — `app/entry/[id]/sign.tsx` is single-entry only, and the supervisor re-enters name+scheme+cert+signature from scratch per entry.
Why: real end-of-shift = a crew of 4–8 hands phones to ONE L3 who signs the stack in minutes. Per-entry re-typing means sign-off gets deferred → entries rot as unsigned drafts → audit trail decays. This is the single highest-leverage workflow fix.
How to apply: recommend a "supervisor signing session" — identify signer ONCE, draw signature ONCE, then walk a queue with a per-entry review card + single confirm per entry. Each entry KEEPS its own signature row + own chain link (hash model untouched, NO hash bump). Attestation must stay honest: per-entry review card the supervisor advances past, never a blind "sign all."

**Confined-space height (P2).** `entry-readiness.ts:29` hard-requires `max_height > 0` to sign; wizard step 4 mirrors it. But WORK_TASK_PRESETS has "Confined-space entry work" and STRUCTURE_PRESETS has "Tank / vessel / silo" — height is meaningless/fake there.
Why: forcing a positive height on confined-space work makes techs type a fake number to pass the gate; fake data in a required field is worse than an honest blank.
How to apply: relabel to "Max working height / depth" and accept depth (label change, NO schema/hash change). Keeps the field required (auditors want vertical extent) without lying on confined-space jobs.

**Terminology.** "Seal in chain" (sign.tsx:287 button) is blockchain jargon at the tech's ACTION moment — a L1 won't parse it, a L3 finds it silly. Recommend "Sign entry" / "Sign & lock"; keep seal/chain as the RESULT animation. Note the Review step already says "Sign in person" correctly — the inconsistency is the tell. Also: remote path says "verifier", in-person says "supervisor" for the same human — pick "supervisor" as primary.

**Gear ownership gap (P3).** `GearItem` has no personal-vs-company dimension and no manufacture/in-service dates. Techs track personal kit (owned, self-inspected) separately from company kit (site-container, store-inspected). Retirement clocks for textiles run off MANUFACTURE date — nowhere to put it.
How to apply: add ownership tag (personal/company) + manufacture_date + in_service_date to gear. Inventory-only, NOT part of any entry signature → NO hash bump. Surface ownership as a filter alongside category chips. (Complements gear-inventory-gaps.md.)

**Inspection interval (P3).** `next_inspection_due` is fully manual; app already warns about "unscheduled" when skipped. Recommend defaulting next-due to inspected_on + 6 months on a passing inspection (6-monthly is the near-universal rope-access detailed-inspection interval).

**Supervision-level-on-entry (P2 roadmap note, NOT built).** Signer level is captured at sign time, but there's no attested entry field for "supervised work + supervisor level." Fine for the common case (signer = supervisor). If a "hours under L3 supervision" progression report is ever promised, that field IS a hash-version bump + canonical-serialization change — flag it then, not now.

**Confirmed strengths (do NOT re-flag / don't let anyone "fix"):** hours buckets correctly separated; rescue_cover first-class with realistic placeholder; hazards kept whole not buried; site-signer role+employer path; inspector identity required on gear; NDT in separate ledger never summed; amendment-not-edit; compliance language clean (About sheet "built toward audit-readiness, official acceptance separate workstream" — verified no false accepted-claims in export/sign/today copy).

**Remote-signing prominence:** correct BECAUSE terminal action is user-configurable (`defaultTerminalAction`). Verify fresh-install default `DEFAULT_TERMINAL_ACTION === 'sign'` (in-person is the modal case).
