---
name: feedback-destructive-confirmation-audit
description: Every irreversible write in this app (delete, retire, restore, sign) must have a confirmation step — audit gaps before approving features
metadata:
  type: feedback
---

Every irreversible write needs an explicit confirmation step before commit. The bar is the existing `Alert.alert` pattern in records-list draft delete (`confirmDeleteDraft` in records.tsx).

**Why:** RALB Codex Edition's appeal as a regulated-document app collapses if a glove-mistap can permanently retire a $400 harness, delete a draft, or wipe the local ledger. The audit identified gear FAIL inspection as the worst offender — a single tap on SAVE INSPECTION retires gear with no `Alert.alert`, even though the banner above warns of the consequence. Banners are not confirmations; they are signage. The user still has to *commit* with a fresh, named action.

**How to apply:** When reviewing any new feature or refactor, enumerate every code path that writes a status change a user cannot undo from the UI (retire, delete, restore, sign, amend-source-lock, cancel-remote-request). Each one must either:
1. Show an `Alert.alert` with destructive style and the affected object named in the body, OR
2. Be gated behind a separate checkbox + visibly destructive CTA (the restore pattern in more.tsx is acceptable; the failed-gear save path is not).

Banners alone do not count. Disabled-until-checked CTAs are acceptable for in-flow gating (restore); modal Alerts are required for in-list destructive actions (delete, retire).

Related: [[feedback-advisory-dismiss]] (long-press is for *acknowledging* a warning, not committing a destructive write — different pattern).
