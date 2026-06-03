---
name: warn-on-warnsoft-contrast
description: warn token over warnSoft fails WCAG on the 3 light palettes — code-certain contrast math reusable across audits
metadata:
  type: project
---

`tokens.warn` foreground on a `tokens.warnSoft` fill fails WCAG AA for text on all three LIGHT palettes (computed from themes.ts token tables, 2026-05-28):

- heliotype `#9C6E0A` on `#EDDFB5` = **3.40**
- forge `#9C6E0A` on `#EFDFB5` = **3.42**
- mercury `#B07914` on `#F0E2BC` = **2.92** (worst — fails even the 3:1 graphical bar)

AA needs 4.5:1 for normal text, 3:1 for large/graphical. Dark palettes (tungsten/mariner/verdigris) pass (6.7–8.8). For comparison: `danger`-on-`dangerSoft` passes everywhere (≥4.09); `ok`-on-`okSoft` passes (≥4.22, mercury lowest).

**Why:** This is the root cause behind several Gear-screen findings (warn caption text, the warn Pill "Due soon"/"No date", deadline header IconWarn). It is NOT in the INTENTIONAL list and is distinct from the FIXED soft-token-as-foreground bug.

**How to apply:** When auditing any screen that renders warn-toned text/icons on warnSoft (Pill warn tone, hand-rolled deadline rows), this combination is the failure. Fix is systemic — darken `warn` or `warnSoft` on the 3 light palettes, or use `tokens.text` for the foreground — not a per-screen patch. Re-verify against themes.ts before recommending (palette hexes may change).
