---
name: project-audit-2026-05-20
description: UX/field-usability audit on 2026-05-20. Most prior P0s now fixed; two NEW uncommitted security providers (AppLock, TamperGuard) introduce blocker-grade field-context failures.
metadata:
  type: project
---

Flow/field-usability audit delivered 2026-05-20 (read-only, my scope of a 3-agent UI/UX pass). Verified against current code, not memory.

**What's now RESOLVED since the 2026-05-17 pass** (do NOT re-flag; recommend regression tests instead):
- Seal screen has tap-to-continue + unmount cleanup ref (`sign.tsx:204-231`, 95-102).
- Wizard cancel-after-commit branches Keep editing / Keep draft / Delete draft (`entry/new.tsx:296-333`).
- Gear FAIL wrapped in Alert.alert; retire-gear IconBtn now has onPress (`gear/[id].tsx:153-164`, 332-336).
- Camera-first photo capture via `src/ui/photo-picker.ts captureOrPickPhoto` (Alert: Take photo / From photos).
- QuickLog chips wired with `?seed=last` + `?filter=pending` deep links (`today.tsx:188-212`); wizard seeds from latest entry (`entry/new.tsx:228-248`).
- Today + Records loading-vs-empty fixed via `!entries.data ? null` guard (`today.tsx:256`, `records.tsx:238`).
- Edit "Save audit-ready draft" label only shows when `canSave && isAuditReady` — resolved.
- IconBtn touch targets: TopBars now use size="md" (~42px box) + hitSlop floor to ~45px tappable under UI_SCALE 1.18. hitSlop math in `icon-btn.tsx:54`. Do NOT re-flag the old "sm 28px" finding.

**NEW blocker-grade finds (both in UNCOMMITTED working tree — `src/providers/`):**
1. `app-lock.tsx` — on background→active it `setUnlocked(false)` (line 36) and the `unlocked || !isSupported` branch (line 58) returns the overlay, NOT children → the ENTIRE children tree unmounts → every form's React.useState resets. Kills mid-entry wizard input (pre-commit), an in-progress SigPad signature on the sign screen during supervisor handoff, inspection forms. No grace window. iOS fires inactive on notification banners. This is the headline interruption-recovery failure.
2. `tamper-guard.tsx` — RSOD when `verifyFullChain` returns valid:false. No escape: no export-broken-ledger, no read-only view of entries that DID verify, no navigation. For a regulated ledger, locking the tech out of their own data is the inverse of audit intent. `useVerifyFullChain` has staleTime:Infinity (`use-logbook.ts:307`) so on a large logbook the app can render normally then snap to RSOD mid-task.

**Still-present from prior lists:**
- Restore-from-backup is paste-only, no document picker (`more.tsx` BackupInlinePanel TextInput, line 776). Prior P0 #3, unchanged. (Restore flow itself has good preview+checkbox+destructive-CTA pattern.)
- Dead More button: `entry/[id].tsx:287` IconBtn label="More" has no onPress (same class as the old retire-gear dead button).
- Date inputs are plain-text YYYY-MM-DD app-wide (entry/new, edit, gear create+inspect, export). No DateTimePicker. Cross-cutting glove/cold field failure.
- Amendment success lands the tech on a brand-new unsigned draft (`amend.tsx:153-156`) with no "now sign it" continuation cue — medium continuation-clarity find.

Related: [[project-audit-2026-05-17]], [[project-audit-punch-list-2026-05]], [[feedback-destructive-confirmation-audit]], [[feedback-cancel-after-commit]], [[feedback-typed-numeric-inputs]].
