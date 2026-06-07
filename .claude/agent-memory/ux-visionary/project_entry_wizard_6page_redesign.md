---
name: project-entry-wizard-6page-redesign
description: feature/redesign-entry-wizard reworks app/entry/new.tsx from 3-step chip flow to 6-page big-tile wizard; UX review findings
metadata:
  type: project
---

Branch `feature/redesign-entry-wizard` (off main) rewrites `app/entry/new.tsx`: the
new-entry modal went from a 3-step flow (Where / dense "What" / Review) to a **6-page
big-tile wizard**: 1 Where → 2 Kind & hours → 3 Task & access → 4 Structure & height
→ 5 Details (optional) → 6 Review.

**Why:** user disliked dense inline chip selectors ("all the little pills you tap to
select", "What section too dense") and asked for more pages showing less content, with
**big icon tiles**.

**How to apply (what's settled — don't re-flag in future audits):**
- Tiles are the wizard's selection primitive (`TileGrid`, `ClassificationTiles`,
  `MultiClassificationTiles`): 2-col, `minHeight 78`, border-weight + accentSoft + check
  glyph for selection (3 non-colour cues — passes a11y). Gloved target size is fine.
- **Label-forward by design**: `PRESET_TILE_ICON` maps only obviously-recognisable
  glyphs; unmapped presets render icon-less ON PURPOSE (icon = enhancement, not filler).
  Structure grid is fully icon-less and that's intended-coherent. Access grid is fully
  iconned. Only **work-task inline top-6 is mixed (4 of 6 iconned)** — a known minor
  coherence wrinkle, not a bug.
- Long preset lists (work-task 18, structure 14) show top-6 + a dashed "More / custom"
  tile → existing `ClassificationPickerSheet`. Short lists (access 7) show all.
- Required gating re-split across pages (where→hours→task); structure/height/details
  never block. Same total requirement as old step1/step2. Draft commits on every Next,
  so entryId exists before the Details page (gear/photos work). Verified correct.
- `edit.tsx` deliberately still uses v1-style chips → create vs edit look different.
  Expected/out of scope for this branch.

**Open findings from 2026-06-07 review (see review output):**
- MAJOR: `tileLabelStyle` hardcodes `fontSize: 13` instead of `type` scale / `scaled()`
  → tile labels (the wizard's primary surface) ignore the global `UI_SCALE` a11y lever.
- MINOR: `inlinePresets` `<=8` threshold cuts 10-item HAZARD_PRESETS to 6, hiding
  "Chemical exposure" + "Biological" behind More — contradicts its own comment that
  hazards "show in full". Decision needed: show all 10 (safety) or fix comment.
- MINOR: Step 6 Review never echoes `structureType` despite the dedicated Structure page.
- MINOR/tension: Step 1 recent-value chips went 1 row → 3 rows (sites/clients/employers,
  up to 18 pills) — the one place the diff ADDS pill density vs the "fewer pills" brief.
  Defensible (autofill ≠ selection, gated on history) but a conscious tradeoff.
