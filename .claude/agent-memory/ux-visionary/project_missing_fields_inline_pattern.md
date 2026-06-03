---
name: missing-fields-inline-pattern
description: Design for inline-red missing-field surfacing across the 5 entry screens; the gate-vs-input split is the load-bearing insight
metadata:
  type: project
---

Owner asked (2026-06-02) to replace the top-of-screen missing-fields banner with the offending field highlighted red inline.

**Load-bearing insight — gate vs input split.** Only 3 of the 5 named screens actually have editable entry fields to redden:
- INPUT screens (inline-red applies): `app/entry/new.tsx`, `app/entry/[id]/edit.tsx`, `app/entry/[id]/amend.tsx`.
- GATE screens (NO editable entry fields — entry shows as read-only `Row`s; only supervisor/verifier inputs exist): `app/entry/[id]/sign.tsx`, `app/entry/[id]/request-signature.tsx`. Converting their banner to inline-red is a category error. Correct move there is the OPPOSITE: keep the message, make it actionable — deep-link "Fix in editor" to edit.tsx with the offenders pre-flagged.

**Four sources of "required" truth today** (a real liability if each grows its own inline-red):
- `src/domain/logbook/entry-readiness.ts` `getEntryVerificationReadiness` — canonical 10 fields, emits human strings ("work dates", "site or location", "rope access hours"). Consumed by sign/request/detail. NOT part of canonicalizeEntry/hash, so its return shape is safe to change to keyed output.
- edit.tsx local `missingFields()` — terse keys ("dates","site","task"...).
- amend.tsx local `isMissing` object — no dates (source-derived).
- new.tsx step-gating — a SUBSET (step1: anchor+valid range; step2: task+hours); full 10 is enforced downstream at sign/request.

**Heliotype color collision (verified in themes.ts):** `danger === accent === #8B1F1A`, and base/focus border is already 1.5px there. Neither hue nor border-thickness disambiguates error from focus. Error signal MUST be carried by text/shape (label flips + explicit "REQUIRED" token/glyph), not color alone. Field's existing `error?: string` prop is Heliotype-safe ONLY because it renders a danger message string. ChipSelect / Multi(Classification)Chips / DateField have NO error prop — for chip groups the error carrier is the group kicker label ("WORK TASK · REQUIRED"), since nothing is selected (no chip to redden).

**Trigger forces a CTA change:** all screens currently DISABLE the CTA when not ready (canSign/canSave/canCreate/canContinue). A disabled Pressable can't fire submit-validation. "Show red on submit + scroll to first offender" requires ENABLING the button and validating on press (touch-ergonomic: don't paint a fresh form red on load; reveal on first submit, then live-clear as fields fill).

**a11y:** RN `accessibilityState` has NO `invalid` member — do not propose it. Fold "required/missing" into the errored field's `accessibilityLabel`; on submit-with-errors call `AccessibilityInfo.announceForAccessibility(...)` + `setAccessibilityFocus` to first offender.

Recommended spine: centralize entry-readiness to keyed `{key,label}[]` output + a shared error-map helper threaded through the 3 input screens; gate screens get the actionable deep-link. Optional bold layer: missing-field chip rail in the bottom bar (tap to scroll+focus, chip vanishes as filled) for the long edit/amend scrolls.

Handoff: glyph/exact danger treatment + chip-rail visual = UI visionary. "Required field set" wording/which-fields = SPRAT/IRATA agent (but the 10 in entry-readiness are the established set).
