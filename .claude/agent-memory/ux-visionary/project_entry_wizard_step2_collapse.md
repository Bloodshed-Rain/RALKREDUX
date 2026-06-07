---
name: entry-wizard-step2-collapse
description: New-entry wizard Step 2 collapses 5 optional fields behind "Add details"; Review card never surfaced them — collapse turns a latent gap into a live miss-risk
metadata:
  type: project
---

The new-entry wizard (app/entry/new.tsx) Step 2 redesign (branch feature/redesign-entry-wizard) moved 5 optional fields (Description, Hazards, Rescue cover, Gear, Photos) into a `DetailsDisclosure` collapsed-by-default. Entry kind leads the required spine (kind → task → access → structure → hours/height).

**Why this matters for future reviews:** StepReview's review card (around lines 1118-1153) only surfaces site, client, work task, hours, height, access, and entry kind. It does NOT surface description/hazards/rescue/gear/photos. Before the collapse those fields were unavoidably visible while scrolling Step 2, so Review's omission was harmless. After the collapse, a fast/routine tech can leave hazards + rescue cover empty end-to-end with zero visual reminder — the two surfaces that would prompt "I never logged the hazards" are both gone.

**How to apply:** If anyone touches Step 2 collapse OR the Review card, treat them as coupled — collapsing an input creates an obligation to echo a presence/absence cue in Review. Recommended remedy is a one-line "Details: notes, 2 hazards, rescue cover" recap (or "no details added") on the review card, NOT forcing expansion. Whether collapsing hazards/rescue is acceptable for audit legibility is a SPRAT/IRATA-agent call, not a UX call.

**Second coupling — disclosure remount:** `StepWhat` mounts conditionally (`step === 2 ? ... : null`), and ANY back navigation (Step 2 Back goes to Step 1, line 347) unmounts it. `DetailsDisclosure` seeds `open` from `React.useState(defaultExpanded)` where `defaultExpanded = detailsSeeded` (description OR hazards OR rescueCover — EXCLUDES gear/photos). So a tech who attached only gear/photos, navigated away, and returned lands on a COLLAPSED panel reading "Add details … 1 added" with their attachments hidden. Discriminating fix: `defaultExpanded={filledDetailCount > 0}` (gear/photos are always empty on a fresh no-entryId mount, so it can't spuriously expand).
