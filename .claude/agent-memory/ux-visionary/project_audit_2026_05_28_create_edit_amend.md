---
name: audit-2026-05-28-create-edit-amend
description: UX-flow audit of entry/new, entry/[id]/edit, entry/[id]/amend on 2026-05-28; key recurring gaps in error/dirty-state handling
metadata:
  type: project
---

Reviewed the create/edit/amend screen group on 2026-05-28 (UX flow & field-context lens).

Key findings (durable patterns, not one-off bugs):

- **edit.tsx save() has no onError handler** — `updateDraft.mutate(..., { onSuccess })` only. A failed local write (offline DB error) gives zero feedback; button just re-enables. `new.tsx` does this right (try/catch + Alert.alert on every commit). amend.tsx fires `haptics.error()` but still NO visible message. This is the [[feedback_destructive_confirmation_audit]] family: writes that can fail silently.

- **edit.tsx + amend.tsx are `presentation: 'modal'`** (app/_layout.tsx) with default gestureEnabled. Swipe-down dismiss AND the Back IconBtn (`router.back()`) are both unguarded — no dirty-check. Mid-edit loses all in-progress text with no confirm. This is a NEW instance of the [[feedback_cancel_after_commit]] principle but on the EDIT path (prior memory was about the wizard Step-1 auto-commit). new.tsx's wizard DOES guard close via handleClose; edit/amend do not.

- **new.tsx Step 3 (Review) has no Back button** — footer only renders `step < 3`. From Review the only escape is the X (close). A tech who spots a typo on Review cannot return to Step 1/2 to fix it without cancelling. Dead-end.

- **Missing-field guidance is count-only.** edit.tsx shows `${missing.length} missing` Pill but never enumerates WHICH fields (the missingFields() array is computed and discarded). amend.tsx same (`${missingCount} missing`). Violates the "surface missingFields rather than blocking opaquely" guardrail in spirit.

- **amend.tsx sourceLocked dead-end:** when source isn't signed, all fields stay editable but Save is permanently disabled with only a small warn card. Tech can fill the whole form then find they can't submit.

- new.tsx inline ft/m unit toggle (lines 740-762) missing accessibilityState selected (the UnitToggle component in edit/amend has it). Inconsistent.

Did NOT re-flag: typography drift (KNOWN-BACKLOG), thin async-state null returns (KNOWN-BACKLOG).
