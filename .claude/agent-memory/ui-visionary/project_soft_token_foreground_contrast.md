---
name: soft-token-foreground-contrast
description: WCAG contrast math for *Soft-background + saturated-foreground token pairs that fail AA on light palettes (Mercury/Forge/Heliotype)
metadata:
  type: project
---

Computed cross-palette WCAG contrast for the recurring "saturated token text/icon over its own *Soft fill" pattern. These are provable from the token tables in `src/ui/theme/themes.ts` (code-certain). The three light palettes (heliotype, forge, mercury) consistently produce the lowest ratios because the *Soft tints are near-white.

**warn on warnSoft** (e.g. destructive-restore warning block in `app/(tabs)/more.tsx` BackupInlinePanel ~765-781): tungsten 6.73, mariner 8.75, verdigris 6.90, heliotype 3.40, forge 3.42, mercury 2.92. FAILS AA-normal (4.5) on heliotype/forge/mercury. The accompanying IconWarn also fails the 3:1 graphical-object floor (1.4.11) on mercury.

**accent on accentSoft** (e.g. `app/export.tsx` FormatTile active state, label color=accent on bg=accentSoft): tungsten 4.55, mariner 5.79, verdigris 5.72, heliotype 6.37, forge 2.82, mercury 4.20. FAILS AA-normal on forge (2.82) and mercury (4.20); tungsten only barely passes.

**ok on okSoft** (e.g. SNAPSHOT PREVIEW kicker in more.tsx ~816): tungsten 6.00, mariner 7.16, verdigris 5.80, heliotype 5.93, forge 5.69, mercury 4.22. Borderline-fail on mercury (4.22) for small text; passes elsewhere.

**Why:** This is distinct from the FIXED "soft-token-as-foreground over a SATURATED fill" bug. Here the foreground is the saturated token and the background is the *Soft tint — legible on the 3 dark palettes, sub-threshold on the 3 light ones. The pattern is idiomatic in the codebase (soft fill + saturated text/icon for status callouts), so it likely recurs beyond Settings.

**How to apply:** When auditing any status callout (warn/danger/ok/accent text or icon sitting on its matching *Soft background), the dark palettes will pass and mislead you — check forge and mercury specifically. A systemic fix would darken the saturated foreground tokens on the light palettes or darken the *Soft fills; a one-off fix swaps the foreground to `text`/`textDim` over the soft fill. Note text size matters: type.cardSub renders at scaled(12)=14px weight 500 = normal text (4.5 threshold), not large.
