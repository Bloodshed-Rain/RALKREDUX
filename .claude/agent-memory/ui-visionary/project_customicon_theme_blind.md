---
name: customicon-theme-blind
description: RESOLVED — the custom-icon rewrite shipped with currentColor SVGs and CustomIcon now forwards color; the earlier theme-blind concern no longer applies
metadata:
  type: project
---

RESOLVED as of commit 7b77b93 ("Replace icon set with 49 currentColor custom SVG icons + global ICON_SCALE"), merged. The earlier in-flight concern — that `CustomIcon` dropped `color`/`fill` and the source SVGs baked fixed hex fills — is no longer true.

Current state (verified 2026-06-07, `src/ui/icons/index.tsx`):
- `CustomIcon` (index.tsx ~91): `const ink = color ?? fill ?? tokens.text;` and renders `<SvgXml ... color={ink} />`. It DOES forward color.
- The generated SVGs in `src/ui/icons/custom/*.ts` are authored with `fill="currentColor"` (e.g. `plus.ts`), so `SvgXml color={ink}` recolors the ink. Confirmed for IconPlus.
- Net: the design-system theming contract holds for CustomIcon-backed icons. `<IconPlus color={tokens.text} />` themes correctly; tab active-state / FAB ink / gear-row tinting work.

**Why:** I previously flagged this as a live break while the rewrite was uncommitted in the working tree. It landed in a form that honors color, so the flag is retired.
**How to apply:** Do NOT re-flag CustomIcon icons (IconPlus, IconToday, IconRecords, IconProfile, IconSign, IconExport, GEAR_ICON entries, etc.) as theme-blind in reviews. If a *new* custom SVG is added without `fill="currentColor"`, that specific glyph would not recolor — check the source `.ts` art, not CustomIcon. `IconChevron`/`IconChain` use the duotone `Icon` path (also themed).
