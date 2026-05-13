---
name: feedback-cancel-after-commit
description: Cancel/Back actions in multi-step flows must never silently leave a committed draft the user thought they discarded
metadata:
  type: feedback
---

In multi-step capture flows (currently the new-entry wizard), once a step has committed a row to SQLite, "Cancel" / "Back to root" must NOT silently route the user into that row's detail screen. The user's mental model of Cancel is "this never existed."

**Why:** new-entry wizard's `handleClose()` only shows the "Discard draft?" alert when `!draft.entryId`. After Step 1 auto-commits via `commitDraft()` to get an entry id (needed for the Step 2/3 update path), Cancel routes to `/entry/[id]` — a record the tech believed they aborted is now in their ledger. For an offline-first audit ledger, an unintended draft is a data-integrity surprise, not a polish bug.

**How to apply:** When auditing or designing any flow that progressively persists state, ask: "If the user backs out *after* a commit, do they know a record now exists?" Acceptable patterns:
- Don't commit until the user takes an explicit "save" action (preferred if technically feasible).
- If progressive commit is required, branch Cancel UX on commit state: pre-commit shows "Discard?"; post-commit shows "Keep draft for later / Delete draft / Stay here."
- Never silently land the user inside the record they tried to leave.

This applies to amendment flow too, once amendments grow multi-step.
