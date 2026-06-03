---
name: gear-status-soft-fill-contrast
description: Gear status-row contrast/hue rules — warn/danger ink on *Soft fails AA; Heliotype collapses accent+danger
metadata:
  type: project
---

Rules any gear status row/tile MUST follow (all code-grounded, not generic):

- **Status color text on its own `*Soft` fill fails WCAG AA on the light palettes.** The gear tab `DeadlineRow` already works around this: caption renders in `tokens.text` (readable ink) and the colored ICON carries urgency. Copy that pattern — never put warn/danger-colored body text on warnSoft/dangerSoft. Carry urgency via a colored leading bar/icon + ink text + a `Pill` (Pill's tones are vetted).
- **Heliotype collapses `accent` and `danger` to one oxblood hue.** Never differentiate gear status by hue alone — use label + icon + position. `Pill` already handles this (danger → outlined oxblood-on-bone).
- **New hero numerals (e.g. a `days` leading numeral) must use `scaled()`** from `src/ui/scale.ts`. EntryRow's day numeral (`fontSize: scaled(22)`) is the correct copy-paste pattern; do NOT hardcode a fontSize.
- **Tap target must stay ≥ the current GearCard row height for gloved use.** This is the constraint that sinks a 2-col dial grid as a default layout.

**Why:** these are the recurring failure modes flagged across the UI audit (soft-token contrast, CustomIcon theme-blindness, type-drift).
**How to apply:** when proposing/implementing any gear row redesign, bake these four in so the proposal is defensible in review without a contrast/glove regression.

Related: [[gear-list-data-boundary]], [[warn-on-warnsoft-contrast]], [[soft-token-foreground-contrast]]
