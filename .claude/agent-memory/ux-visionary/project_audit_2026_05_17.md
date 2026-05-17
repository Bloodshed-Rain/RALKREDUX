---
name: project-audit-2026-05-17
description: Read-only full-app UX audit on 2026-05-17. Surfaces the cross-cutting touch-target issue in v2 IconBtn and a handful of behavioral bugs not in the prior punch list.
metadata:
  type: project
---

Full-app UX audit delivered 2026-05-17 (post-Tidewater redesign, second pass). Most of the prior `[[project-audit-punch-list-2026-05]]` P0s now resolved in code (see that note's amended status). New issues surfaced:

**Why:** First audit after the v2 redesign landed; second audit to verify field-context fitness after primitives stabilized. The biggest finding is that v2 IconBtn `sm` (28×28) is used as the default size in every TopBar (Today, Records, Gear, Profile, entry/[id], gear/[id], export), so every screen back/export/more/filter button fails the 44px touch-target floor for gloved use. This is a primitive-level fix that lifts every screen.

**How to apply:** When proposing changes to TopBar usages or IconBtn defaults, treat the size bump as a deliberate cross-cutting move that needs UI-visionary buy-in (visual rhythm shifts). Don't re-flag the prior P0s on cancel-after-commit or gear-fail-Alert — those are fixed; recommend regression coverage instead.

New issues worth remembering past this session:
- `app/gear/[id].tsx:320` — IconBtn label="Retire gear" has no onPress. Dead button next to the primary action. Real bug, not friction.
- `app/(tabs)/today.tsx:170-185` — QuickLog chips ("Same as last", "Photo log", "Request signature") all push to `/entry/new` or `/records` with no preloaded state. Affordance is misleading; either implement or remove the chips.
- `app/entry/[id]/sign.tsx:148-150` — sealing screen auto-navigates after a hardcoded 3000ms setTimeout. No tap-to-advance, no skip. Reduced-motion users get the full 3s with no escape.
- `app/(tabs)/today.tsx:107` and `app/(tabs)/records.tsx:101` — both default `entries.data ?? []` and render the empty state during loading. Loading vs truly-empty is indistinguishable; empty message flashes before data arrives.
- Photo capture across the app (`app/entry/[id].tsx:241`, `app/entry/new.tsx:595`) is `launchImageLibraryAsync` only — never camera-first. For an in-field evidence flow, library-first is backwards.

Related: [[project-audit-punch-list-2026-05]], [[feedback-destructive-confirmation-audit]], [[feedback-primary-cta]].
