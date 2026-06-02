---
name: ui-scale-type-drift
description: UI_SCALE=1.18 lives inside type.*; hand-rolled inline fontSize renders ~18% smaller — how to size the drift
metadata:
  type: project
---

`UI_SCALE = 1.18` in `src/ui/scale.ts`; every `type.*` entry runs fontSize/lineHeight through `scaled()` (round) at the source. So inline `fontSize: 20` renders at 20px, while the intended scaled hero (`type.heroCardTitle`, handoff 22) renders at `round(22*1.18)=26px` — the hand-rolled block is ~18-23% smaller than surrounding scaled UI. This is the mechanism behind the KNOWN-BACKLOG typography-drift item.

**Why:** Lets me quantify drift precisely instead of hand-waving "smaller." A hand-rolled `fontSize: N` (no `scaled()`) is always drift; compare N against `round(handoffValue*1.18)` to state the px gap.

**How to apply:** When I see inline `fontFamily/fontWeight/fontSize` in a screen, tag KNOWN-BACKLOG typography drift and cite the px delta. Note there is often NO exact `type.*` match (e.g. no Manrope_700Bold@20 token) — recommend the nearest token or propose a new scale entry rather than just "spread type.*". Color-only `ThemeTokens` (themes.ts) has NO spacing/radius scale, so inline spacing/radii are the established norm — do NOT flag those as token drift.
