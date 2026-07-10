---
name: project-workflow-audit-2026-07-05
description: Full-workflow UX audit (onboarding→sign→records→gear→more) — two persistent structural findings plus core-loop tap count
metadata:
  type: project
---

Full workflow-level audit 2026-07-05 (post entry-wizard 6-page redesign, PR #9 merged). Core loop "log today's shift and get it signed" = **~20 taps** best case; defensible because the required spine is all attested-to (`entry-readiness.ts:13-32`). "Same as last" seed (`today.tsx:251-257`) is the real accelerator.

**Two PERSISTENT structural findings (survive multiple audits — flag as workflow-level, not new signal):**

1. **Create-path vs edit-path are two different apps for the same artifact.** `app/entry/new.tsx` = 6-page big-**tile** wizard, per-field red only after Next, grammatical hint (`new.tsx:195-216`). `app/entry/[id]/edit.tsx` = single-scroll **chip** form (`MultiClassificationChips`), always-on red, "Still needed: …" list. A tech who saves a draft in the wizard then reopens it via detail→"Finish draft" (`[id].tsx:1044`) lands in a visually different form. Highest-leverage consolidation. Ties to [[project_audit_2026_05_28_create_edit_amend]] and [[project_missing_fields_inline_pattern]] (4 sources of "required" truth). Handoff: UI-visionary owns primitive convergence; I own flow-parity principle.

2. **NDT is undiscoverable.** Reachable only via the `+` FabChooser 2nd option (`_layout.tsx:267-277`) and a sub-tab INSIDE Records that defaults to 'rope' (`records.tsx:147`). No NDT on Today, no NDT tab, no signpost. A whole record type behind an unlabeled transient `+` branch. Structural call (peer tab? Today worklist row?) punts to UI + SPRAT/IRATA agents.

**Why:** Both recur because they're architecture-shaped, not polish — each audit re-derives them. Recording so future audits treat them as known workflow debt, not fresh findings.

**How to apply:** When asked to audit workflows again, cite these two as standing items; don't re-discover. Also still-open from prior audits and re-confirmed present: missing-field pills are dead-ends on detail (`[id].tsx:408`, count-only), sign (`sign.tsx:328`, names fields but non-tappable), request (`request-signature.tsx:163`) — see [[project_detail_signing_reviewed]]. Sign screen has redundant bottom "Cancel" flanking "Seal" (`sign.tsx:627`) — mis-tap risk at device-handoff. Seal 3s auto-advance still present (`sign.tsx:242`) — see [[project_audit_2026_05_17]].

**What's genuinely good (don't re-flag as fixable):** exit-to-draft is bulletproof (`new.tsx:397-443`); 6-page split is correctly sized (do NOT collapse back to mega-form); immutability framed dignified not punitive; sign screen has full WORK RECORD parity with verifier portal (`sign.tsx:348-404`).
