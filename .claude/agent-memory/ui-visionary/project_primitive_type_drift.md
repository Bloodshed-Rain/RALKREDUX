---
name: primitive-type-drift
description: TopBar and EntryRow primitives hardcode font sizes instead of spreading type.*, so titles/rows render unscaled (smaller than UI_SCALE intends)
metadata:
  type: project
---

`src/ui/primitives/v2/top-bar.tsx` and `entry-row.tsx` hardcode their entire font stacks (fontFamily/fontSize/lineHeight) inline instead of spreading `type.*` from `src/ui/theme/type.ts`.

- TopBar `heroTitleStyle` = fontSize 32 / lineHeight 36; the design token `type.screenTitle` is `scaled(32)=38` / `scaled(38)=45` under `UI_SCALE=1.18` (src/ui/scale.ts). So every large screen title (Today greeting, Records, Gear, More) renders ~16% smaller than the scale intends.
- EntryRow day/month/title/sub styles (lines ~52-85) are all hardcoded, unscaled.

**Input-primitives cluster (same drift class, confirmed 2026-05-28):** the entire `src/ui/primitives/v2/` input family hand-rolls unscaled font stacks instead of spreading `type.*`:
- `field.tsx` (label fs11, input fs15, helper fs11, suffix fs12), `date-field.tsx` (label/value/helper identical to field), `chip-select.tsx` + `multi-chip-select.tsx` + `classification-chips.tsx` (label fs12/lh16, count fs11), `classification-picker-sheet.tsx` (groupLabel fs11, rowLabel/input fs15), `sig-pad.tsx` hint (fs10), `info-sheet.tsx` titleStyle (fs22, vs `type.heroCardTitle` scaled(22)=26).
- Contrast: `toggle-row.tsx` and `button.tsx` DO spread `type.*` (correctly scaled). So forms mix correctly-scaled controls (toggles, buttons) with ~15% smaller field labels/inputs/chips — visible drift within a single form.
- The nearest tokens to spread: label rows → `type.monoKicker`/`monoKickerLg`; field input/value & picker rows → `type.body`; chip labels → `type.cardSub`/`mono`; sheet title → `type.heroCardTitle`.

**Display/anim-primitives cluster (same drift class, confirmed 2026-05-28):** the v2 display/animation family also hand-rolls unscaled font stacks. In-scope primitives that bypass `type.*`: `section-h.tsx` (kicker fs10 / title fs15), `sync-chip.tsx` (label fs11), `empty-state.tsx` (title fs16 / sub fs13), `chain-link.tsx` (hash fs12 / label fs12), `seal-anim.tsx` (caption fs17 / hash fs12), `countdown-dial.tsx` (value fs22/18 / caption fs9), `photo-strip.tsx` (capture/slot/overlay labels), `pull-to-refresh.tsx` (PullIndicator label fs10).
- The ones that DO use `type.*` here: `gear-card.tsx` (type.cardTitle/monoSm), `notifications-stub-sheet.tsx` (type.cardSub), and `info-sheet.tsx` kicker (type.monoKicker — but its titleStyle is still inline fs22 vs `type.heroCardTitle`).
- Sharpest single instance: `sig-fill.tsx` re-derives fontSize:26 inline even though `type.signatureScrawl` (base 24 → scaled 28) was authored in type.ts *specifically for the signature-scrawl moment* (per the token's own comment). A purpose-built token bypassed by the one primitive it exists for.
- `pill.tsx` is a HYBRID worth remembering: SIZE_SPEC fontSize/iconSize DO pass `scaled()` (pill text is correctly sized), but textStyle fontFamily/weight/letterSpacing are still inline — so pills escape the size drift yet still bypass the token surface.

**Why:** This is the KNOWN-BACKLOG typography-drift class, but it lives in load-bearing *primitives* consumed by every Home/list screen, so it propagates app-wide rather than being a one-screen slip.
**How to apply:** When the typography-drift backlog is picked up, prioritize these two primitives first — fixing them lifts every screen at once. Spread `type.screenTitle`/`type.cardTitle`/`type.monoKicker`/`type.mono` rather than re-deriving sizes.
