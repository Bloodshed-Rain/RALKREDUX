---
name: project-audit-punch-list-2026-05
description: Full 24-item UX punch list from the post-Tidewater audit on 2026-05-12, delivered inline after a prior compressed retelling lost detail
metadata:
  type: project
---

Full inline punch list delivered 2026-05-12 (re-audit after the user reported losing detail from a prior summarized version). Twenty-four items, prioritized P0/P1/P2/P3, each grounded in current code paths.

**Why:** The first delivery of this audit compressed to headlines and the body of work was lost when the user came back for triage. The user explicitly asked for re-delivery in full, in-line, with each item self-contained as a punch-list line. Future asks for this audit must NOT summarize — re-deliver fully or point to this memory's snapshot.

**How to apply:** If the user asks for "the audit," "the punch list," or "what UX issues you found," lead with the full list, not headlines. The three P0s are stable but always re-verify against current code before recommending — see [[feedback-memory-staleness]] / the "Before recommending from memory" guidance. The supporting P1/P2 set is the part that's easiest to lose; if you're tempted to abbreviate, don't.

The P0s (all post-redesign behavioral gaps, not visual):
1. Wizard Cancel after Step 1 commit silently saves a draft — **RESOLVED 2026-05-17 re-audit**: `app/entry/new.tsx` handleClose now branches on draft.entryId with Keep editing / Keep draft / Delete draft.
2. Gear FAIL inspection retires on single tap with banner-only warning, no Alert.alert — **RESOLVED 2026-05-17 re-audit**: `app/gear/[id].tsx` submitInspection now wraps fail in Alert.alert('Retire gear?', …) with destructive button.
3. Restore-from-backup is paste-only, no document picker (`app/(tabs)/more.tsx` restoreSnapshot) — **STILL PRESENT** as of 2026-05-17; BackupInlinePanel uses TextInput paste only.
4. Edit-draft "SAVE AUDIT-READY DRAFT" label promises full readiness; canSave only requires 3 of 10 fields (`app/entry/[id]/edit.tsx`) — **STILL PRESENT** as of 2026-05-17; canSave only requires site + workTask + hours>0 while button shows "Save audit-ready draft" whenever isAuditReady (full 10 fields).

P1 cluster (clear friction): wizard Step 2 stepper-only hours, Step1/Step3 readiness inconsistency, no path-switch on sign screen, single-tap gear-detach on entry detail, no expired-request surfacing on technician side, no cancel-remote-request action, photo attach goes to library not camera, no save-this-verifier prompt, Today has no log-work entry point when quiet, inspection auto-selects first item silently, next-due input stays editable when result=fail.

P2 polish: per-field jumpback from missing-fields list, locked-entry sign screen still renders full form, swipe-to-delete is invisible at row level, DocBand vs KPI tile redundancy on gear, hosted-completion success state lacks "close window" guidance, setup CTA label flip confuses first-run, amendment can't edit dates.

P3: 30d delta zero-state glyph reads poorly, advisory long-press feels long under gloves (1200ms) and the acknowledge memory expects an audit row that's currently just local React state.

Handoffs documented in the delivery: UI visionary owns row-affordance/visual-redundancy items; SPRAT/IRATA agent weighs in on supervisor-persistence semantics, first-run cert-requirement, and amendment date-edit class; engineering for Alert.alert wiring, document picker, cancel-request mutation, camera-first capture, and advisory-audit-row plumbing.

Related: [[feedback-cancel-after-commit]], [[feedback-destructive-confirmation-audit]], [[feedback-advisory-dismiss]], [[feedback-typed-numeric-inputs]].
