---
name: customicon-theme-blind
description: In-flight custom-icon rewrite swapped 9 nav/status/gear icons to a CustomIcon helper that ignores color/fill, breaking the theme-token + active-state contract at consumer call sites
metadata:
  type: project
---

The in-flight icon rewrite (`src/ui/icons/index.tsx`, uncommitted working tree) replaced 9 icons — Today, Records, Profile, Plus, Draft, Bell, Harness, Rope, Carabiner — with `CustomIcon` (index.tsx:53-55), which renders a raster-traced `SvgXml` and takes ONLY `{xml, size}`. It does NOT forward `color`/`fill`, and the source SVGs (in `src/ui/icons/custom/*.ts`) bake in fixed fills (`#090909`, `#383838`, `#6D6C6C`, `white`, gradients) on huge native viewBoxes (1024–1739) scaled by transforms.

Consequence — the design-system theming contract is silently dropped at the call sites:
- Tab bar (`app/(tabs)/_layout.tsx:148`) passes `color={isFocused ? tokens.text : tokens.textDim}` + `fill` to drive active/inactive state. For Today/Records/Profile those props are no-ops now, so the ICON no longer reflects focus (the label color at :124 still does). Gear (`IconGear`, still a duotone `Icon`) DOES reflect focus → mixed behavior in one tab bar.
- FAB (`_layout.tsx:92`) passes `color={tokens.accentInk}` to `IconPlus`; ignored, so the plus renders its baked dark fill instead of accentInk over the saturated accent fill.
- `GEAR_ICON` map (index.tsx:528-539): harness/rope/carabiner/lanyard/sling/ascender/other → CustomIcon (theme-blind); helmet/descender/pulley → themed `Icon`. One gear list = mixed icon styles, only some theme-aware.

**Why:** The whole icon system was built so `Icon` defaults to `tokens.text`/`tokens.accent` and re-skins on `setTheme`. The custom raster icons break that for ~1/4 of the set. The visibility magnitude is needs-on-device (mixed light/dark sub-paths invert differently per palette; IconDraft has many `white` fills → most at-risk on the 3 LIGHT palettes heliotype/forge/mercury). The mechanism (props dropped) is code-certain.
**How to apply:** If asked to finish the icon rewrite, make CustomIcon honor a single `color` (recolor the SVG ink, e.g. strip baked fills / drive a currentColor) OR keep custom icons only where a fixed illustrative look is intended and never in tinted/active-state contexts (tab bar, FAB). Reconcile all consumer call sites that still pass color/fill.
