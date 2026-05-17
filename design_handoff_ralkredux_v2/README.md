# Handoff — RALKREDUX v2 (UI/UX Redesign)

## Overview

This is a **full UI/UX redesign** of the RALB Codex Edition rope-access logbook (Expo / React Native, iOS + Android, web preview retained). The redesign is a complete reset away from the previous "regulated paper-form" identity toward a modern, sleek app aesthetic — while retaining every functional contract of the existing app (offline-first SQLite, chained signatures, gear inspection schedules, audit-grade exports, SPRAT/IRATA cert handling).

**Key additions beyond a coat of paint:**
- **Six interchangeable color palettes** (Tungsten, Mariner, Verdigris, Heliotype, Sandstone, Mercury), switched live from Profile → Appearance.
- **Bespoke 38-icon duotone set** drawn at 24px (silhouette layer in text color + 28% accent fill).
- **Quick-log entry pattern** — one-tap duplicate of last entry from Today.
- **Photo evidence strip** in the New Entry flow (wiring up the existing `EntryAttachment` model).
- **Gear detail screen** with countdown dial, inspection history, and linked-entries section.
- **Pull-to-refresh on Today** with chain-themed indicator.
- **Branded sealing animation** for the chain-hash signature moment.

## About the Design Files

The HTML/JSX files in this bundle are **design references** — clickable web prototypes built with React + Babel + inline JSX, hosted in a single browser tab. They demonstrate intended look, copy, motion, density, and interaction. **They are not production code.**

Your task is to **recreate these designs in the existing RALKREDUX codebase** (Expo Router + React Native + React Query + SQLite). The previous codebase follows strict layering — see the existing repo's `CLAUDE.md` — and you must preserve those rules. Specifically:

- Screens belong in `app/`. Pure routing, no business logic.
- Domain services + React Query hooks belong in `src/domain/<feature>/`.
- Tokens + shared primitives belong in `src/ui/theme/` and `src/ui/primitives/`.
- Schema changes go in numbered migrations in `src/db/migrations.ts`.
- The `entries` table contract is locked: signed entries are immutable; amendments are new entries. **No design here changes those rules.**

If the existing codebase has primitives that match (e.g. `Field`, `Pill`, `Card`), reuse them — extend their token system to support the six-palette switch rather than forking.

## Fidelity

**High-fidelity.** Colors, typography, spacing, motion timings, and copy are final and intended to be reproduced precisely. Where the prototype uses CSS custom properties (`var(--bg)`), the React Native implementation should resolve to the active theme's token via a `ThemeProvider` returning a JS object — see the **Theme Architecture** section below.

---

## Files in this bundle

```
design_handoff_ralkredux_v2/
├── README.md                          ← this file
├── prototype.html                     ← entry point — the interactive prototype in an iOS frame
├── RALKREDUX Redesign.html            ← design canvas — all screens × all themes side-by-side
├── src/
│   ├── themes.jsx                     ← all 6 theme token tables
│   ├── icons.jsx                      ← the 38 bespoke icons
│   ├── data.jsx                       ← mock data (entries, gear, profile, summary)
│   ├── components.jsx                 ← shared primitives (Button, Card, Pill, Field, etc.)
│   ├── screens-home.jsx               ← Today, Onboarding, Splash, QuickLogCard
│   ├── screens-records.jsx            ← Records list, RecordDetail, ChainLink
│   ├── screens-new.jsx                ← NewEntryFlow (3-step), SignScreen, SealAnim, PhotoStrip
│   ├── screens-aux.jsx                ← GearScreen, GearDetail, ExportScreen, ProfileScreen
│   ├── app.jsx                        ← root prototype component (theme provider + nav stack)
│   └── styles.css                     ← global styles bound to theme tokens
└── lib/                               ← starter components (ignore — these are scaffold)
```

Open `prototype.html` to walk the live prototype. Open `RALKREDUX Redesign.html` for the full canvas (every screen × every theme).

---

## Theme Architecture

This is the most consequential addition. The existing codebase has a single Tidewater palette in `src/ui/theme/tokens.ts`. **The redesign requires a switchable theme system.** Implement as follows:

1. **Persist** the selected theme key in `local-prefs` (the existing `src/storage/local-prefs.ts` already has a get/set pattern).
2. **Token contract** — every theme exports the same set of keys (see "Token shape" below). Move `tokens.ts` to `themes.ts` exporting a `{ [key]: ThemeTokens }` map, plus a default order array.
3. **Provider** — wrap `AppProviders` with a `ThemeProvider` that reads the prefs key on boot and exposes `useTheme()` returning `{ theme, tokens, setTheme }`. All primitives consume `useTheme().tokens` instead of importing a static object.
4. **No CSS variables in RN.** Use a flat JS object; transitions between themes happen instantly. For the web preview (Expo web), you may set CSS vars on `document.documentElement` to enable the smooth 280ms cross-fade we use in the web prototype — but this is optional.
5. **Status bar** — when the theme `.mode === 'dark'`, set `StatusBar.barStyle = 'light-content'`; otherwise `'dark-content'`. Hook into theme changes.

### Token shape (TypeScript)

```ts
export type ThemeMode = 'light' | 'dark';
export interface ThemeTokens {
  bg: string;          // app background
  surface: string;     // primary card surface
  surface2: string;    // raised / muted surface
  surface3: string;    // deepest surface (e.g. inside cards)
  line: string;        // primary borders
  lineSoft: string;    // hairline borders
  text: string;        // primary text
  textDim: string;     // secondary text
  textFaint: string;   // tertiary / kicker text
  accent: string;      // brand accent
  accentInk: string;   // text-on-accent
  accentSoft: string;  // tinted accent background
  ok: string;          // signed / verified
  okSoft: string;
  warn: string;        // draft / due-soon
  warnSoft: string;
  danger: string;      // overdue / void
  dangerSoft: string;
  chip: string;        // generic chip bg
  chipText: string;
  scrim: string;       // modal scrim
  shadow: string;      // (web only, optional)
  ring: string;        // focus ring color
}
export interface Theme {
  name: string;        // 'Tungsten'
  sub: string;         // 'Steel grey · muted orange'
  mode: ThemeMode;
  swatch: [string, string, string];  // 3-color preview for the picker
  tokens: ThemeTokens;
}
```

### The six palettes

Source: `src/themes.jsx` — copy-paste the hex values verbatim. The themes ship in this order and the Profile → Appearance picker shows them in this order:

| Key | Name | Mode | Mood | Accent |
|---|---|---|---|---|
| `tungsten` | Tungsten | dark | Industrial steel | `#E08F55` |
| `mariner` | Mariner | dark | Marine engineering · cool | `#5FB8FF` |
| `verdigris` | Verdigris | dark | Weathered patina · warm | `#D4AA5B` |
| `heliotype` | Heliotype | light | Letterpress · high-contrast | `#8B1F1A` |
| `sandstone` | Sandstone | light | Canyon dust · warm | `#B5462C` |
| `mercury` | Mercury | light | Cool slate · modern | `#6B4FD8` |

**Heliotype carries an extra treatment** — heavier 1.5px borders on cards and a hard 2px drop-shadow on primary buttons (mimicking ink-on-paper print). The current web prototype implements this via `[data-theme='heliotype']` selectors in `src/styles.css`. In RN, branch on `theme.key === 'heliotype'` inside primitive styles to apply the extra border width and shadow.

---

## Typography

| Family | Use | Weights | Source |
|---|---|---|---|
| **Manrope** | Display, body, button labels, screen titles | 400, 500, 600, 700, 800 | Google Fonts |
| **JetBrains Mono** | Form numbers, hash strings, kicker labels, status timestamps | 400, 500, 600 | Google Fonts |
| **Newsreader** *(italic only)* | Signature scrawl (in the `rk-sigfill` element after sign) | 600 italic | Google Fonts (only loaded on signature display) |

Letter-spacing is tight: display at `-0.025em` to `-0.035em`, body at `-0.005em` to `-0.01em`. Mono kickers use `+0.14em` to `+0.18em` letter-spacing, uppercase, 10–11px, in `textFaint` color — these are the small caps you'll see above every screen title (e.g. `NEEDS ATTENTION`).

In React Native, load via `expo-font` and reference by family name. Pin weights and only load what's needed (idle skipping the 400 of Manrope is fine — body is 500).

### Type scale (px)

| Use | Size | Weight | Letter-spacing |
|---|---|---|---|
| Hero number (Today career hrs) | 56 | 700 | -0.04em |
| Screen title (large) | 32 | 800 | -0.035em |
| Hero card title (e.g. entry site) | 22 | 800 | -0.025em |
| Section title | 18 | 800 | -0.02em |
| Detail stat number | 20 | 700 | -0.02em |
| Body | 14 | 500 | -0.01em |
| Card title | 14 | 600 | -0.01em |
| Card sub | 12 | 500 normal | — |
| Mono kicker | 10–11 | 600 | +0.14em – +0.18em |
| Button label | 14 | 600 | -0.01em |

---

## Iconography

**38 bespoke duotone icons**, all 24×24 viewBox, drawn on a unit-aligned grid. Each icon is two layers:

- **Shape** group at full opacity using `currentColor` (ink — picks up `text` token).
- **Fill** group at 28% opacity using `--icon-fill`, which defaults to the `accent` token but can be overridden per-instance.

Source: `src/icons.jsx`. Port to React Native as inline `<Svg>` components from `react-native-svg`. Each icon should accept `size` (default 24), `color` (the ink color), and `fill` (the duotone fill color, default = `accent` token). The export pattern:

```tsx
// e.g. icons/Brand.tsx
export const IconBrand = ({ size = 24, color, fill }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <G fill={fill || tokens.accent} opacity={0.28}>
      <Path d="…duotone fill path…" />
    </G>
    <G fill={color || tokens.text}>
      <Path d="…ink shape path…" />
    </G>
  </Svg>
);
```

### Icon inventory

**Nav:** Brand, Today, Records, New, Gear, Profile.
**Actions:** Sign, Stamp, Chain, Export, Sync, Bolt, Plus, Check, Close, Chevron, ArrowLeft, More, Search, Filter, Camera.
**Status:** Verified, Draft, Pending, Void, Warn, Lock, Bell.
**Gear:** Harness, Helmet, Rope, Carabiner, Descender (Ascender, Lanyard, Sling, Pulley fall back to existing icons; see `GEAR_ICON` map in `src/data.jsx`).
**Form:** Clock, Calendar, Height, Location, Wifi, Offline.
**Misc:** Settings.

---

## Screens

### Onboarding (3 cards)

Three full-screen cards, each with a centered hero plate (the `IconBrand` mark on an accent-colored disk with a 24px corner radius), a 32px display headline (whitespace-preserved with `\n`), and a single primary button. Dot indicator at the bottom (active dot stretches to 24×6 pill).

Cards:
1. **"Your logbook,\nin your pocket."** — `IconBrand`. Sub: offline-first description.
2. **"Tamper-evident\nby design."** — `IconChain`. Sub: chain hashing description.
3. **"Works off-rope,\nworks off-grid."** — `IconOffline`. Sub: offline sync description.

Spring on each entry: hero pops via `scale(0.6) → 1.05 → 1` over 600ms `cubic-bezier(.2,.7,.3,1.4)`. Text rises 8px with 80ms delay.

### Splash

Centered `IconBrand` (80px), wordmark "RALB" (22px 800), mono caption "Rope Access Logbook" tracked at 0.24em. Below: a 140px wide × 3px progress bar with an indeterminate accent-gradient sweep (`@keyframes rk-slide`, 1.3s ease-in-out infinite). Auto-dismiss after 1.8s.

### Today

**Top bar (large variant):** leading brand icon button · trailing sync chip + bell icon · then a 32px greeting line "Good evening, {first name}." + sub "{week hours}h this week · {career} career entries".

**Career hero card** — 18px padded card with:
- Mono kicker "CAREER HOURS" (10px, 0.16em tracking) · accent "Live" pill with `IconBolt` (right-aligned).
- 56px hero number using the `AnimatedNumber` component (tabular-nums mono, animates from previous → current over 900ms cubic-out).
- Bottom row: three columns — week hours / month hours / total entries (18px mono numbers, 11px dim caption).

**Quick-log card** — accent-tinted radial-gradient corner gleam; left-aligned accent disk with `IconBolt` icon. Three chips below: "Same as last", "Request signature", "Photo log". Tap → duplicates last entry into the new-entry sheet.

**Chain head card** — 16px padded; accent disk with `IconChain` · mono "CHAIN HEAD" kicker · the chain hash as `{first 8}…{last 4}` followed by the **HashGlyph** (8 vertical bars whose heights & opacities are derived from the hex character values — first/fourth/seventh bar uses accent color). Subtext: last-sealed date + site. Tap → opens the most recent signed entry.

**Action tile grid (2×2):** Open drafts · Awaiting signature · Gear overdue · Gear due soon. Each tile: 32px square tinted icon (`okSoft`/`warnSoft`/`dangerSoft` backgrounds), big count, label, hint.

**Recent entries (max 5)** — bottom-stacked `EntryRow` cards. Each row: 44px date column (large day, mono month), title (site), sub (task · hours · hash glyph), and a `StatusPill` on the right.

**Pull-to-refresh:** chain-icon-in-ring indicator at the top edge. See `src/components.jsx` → `PullToRefresh`. Threshold 72px. Labels: "Pull to refresh" → "Release to sync" → "Syncing chain…". Use `react-native-gesture-handler` + `react-native-reanimated` to implement on RN.

### Records

Large top bar with title "Records" + sub "{count} entries · sealed in the chain". Trailing: export icon + filter icon.

**Search field** + **filter chip row** (All / Drafts / Signed / Amended, each with count). The search field uses the standard `Field` primitive with a search icon suffix.

**Grouped by month**, with a sticky `bg`-colored month header per group (mono kicker style). Each row is the same `EntryRow` used on Today.

**Empty state** — when no matches, show `EmptyState` with a `IconSearch` icon in concentric-ring backdrop, the query echoed in the title ("Nothing matches \"{q}\""), and a "Clear filters" outline button.

### Record Detail

Top bar: title `Entry {ID}`, leading back, trailing export + more.

**Hero card** — mono date kicker · 22px entry site title · sub "{client} · {task}" · status pill (top-right). Followed by a 1px hairline rule, then a 3-column stat row (hours / height / access).

**Work description card** — single 14px body paragraph.

**Gear used card** — list of gear items used on this entry. Each row: 32px square tinted-bg icon + name + mono manufacturer/serial line.

**Signature block** — when signed:
- `SigFill` element: 64px high card with a hairline baseline + animated Newsreader-italic supervisor name "writes onto the line" from left over 2.2s on mount (CSS `@keyframes rk-sig`). In RN, use Reanimated to drive width 0→240px and let the text overflow.
- Below: supervisor name + cert number + "Verified" pill.
- Two-column meta row: Signed at + Method.

When unsigned:
- Single explanatory paragraph + two-button row: primary "Sign now" + outline "Request remote".

**Chain section** — `ChainLink` ladder: a vertical rail with bullet markers, four most-recent links shown. Current entry's hash highlighted with an accent "HEAD" pill. Each link renders its hash + label + the HashGlyph visualization on the right.

### New Entry (3-step sheet)

Bottom sheet, 92% height. Three steps with a progress strip (three 3px bars; filled accent for completed/current).

**Step 1: Where** — recent site chips, then `Site`, `Client`, `Employer` fields, then date.

**Step 2: What** — chip-select rows for Task, Structure, Access method. Two-column Hours / Max height numeric fields. Description textarea (3 rows). Then a 4-column gear grid showing icon + category label per item. **Then the Photo Evidence Strip** — horizontally-scrolling row, leading "Capture" tile (accent-filled with `IconCamera`), then three empty 88×88 outlined slots labeled "Anchors / Workzone / Hazard". Tapping Capture appends a 88×88 mock-photo tile with a mono filename overlay.

**Step 3: Review** — summary card (same shape as Record Detail hero), then three choice rows: "Sign in person" / "Request remote signature" / "Save as draft" (dim). A warning chip at the bottom: amber `warnSoft` background, `IconWarn`, explains immutability.

Footer: Back button (ghost) + primary "Continue" (or "Save & sign" on last step).

### Sign

Top bar with back. Context row showing the entry being signed. Then:

- **Supervisor block**: scheme chip-select (SPRAT / IRATA) · full name field · cert # field (helper text changes — required for IRATA, optional for SPRAT).
- **Signature pad** (`SigPad`) — 180px tall, hairline baseline 32px from bottom, mono "✕ SIGN HERE" overlay at lower-left. Captures strokes as SVG polylines using touch/mouse events. Clear button in the section header.
- **Attestation row** — large checkbox card with a 22px square check, full attestation copy. Tap toggles.
- **Primary "Seal in chain" button** — disabled until name + (cert if IRATA) + attestation + at least 4 stroke points.

**On seal:** screen swaps to the **SealAnim** state — 200×200 circular dial with 24 tick marks, an outer accent ring that draws over 1.4s (`stroke-dashoffset` 528 → 0), and a center 88×72 rounded rectangle that fills with accent at completion. The `IconBrand` mark appears in the center on completion (replacing the loading `IconVerified`). Caption: "Sealing chain" → "Sealed in chain". Mono hash printed below. After 1.7s the seal locks; after 3s navigates to the signed record.

### Gear

Large top bar: title "Gear", sub showing counts; trailing add icon.

**Inspection deadlines summary card** (only if overdue or due-soon items exist):
- Mono kicker "INSPECTION DEADLINES" · headline "{n} overdue · {n} due ≤14d" · warning icon.
- Up to 3 highlighted rows (red bg for overdue, amber for due-soon), each: gear icon + name + "{n}d overdue" mono caption + chevron.

**Category filter row** — horizontally-scrolling chips (All, Harness, Helmet, Rope, Descender, Ascender, Carabiner, Lanyard, Pulley).

**Gear cards** — `GearCard` primitive. Each: 48px square icon · name + mono manufacturer/serial · countdown pill (right) · a thin 4px progress bar at the bottom of the card that fills based on days-to-inspection.

### Gear Detail

Top bar: category as title, back leading.

**Hero card** — 64px square icon · mono manufacturer/model kicker · 20px gear name · mono S/N line · status pill. Below, a 2-column row:
- **Countdown Dial** (76×76 circular ring filling based on inspection cycle, color shifts at due-soon → overdue). Center shows days remaining (or days late) + caption.
- Right column: mono "NEXT INSPECTION" kicker + 20px date + colored remaining/overdue line.

**Primary actions** — full-width "Record inspection" button + a single ghost lock-icon button to retire.

**Inspection history card** — 4 history rows. Each: 32px tinted-bg result icon (check / warn / void), result label (Pass / Pass with concerns / Fail · retired), mono date + signer cert.

**Linked entries** — 3 most-recent entries this item was used on (`EntryRow`).

### Export

Top bar: "Audit export", back leading.

**Preview card** — has two concentric circle decorations at the top-right corner and an embossed brand watermark in the bottom-right (6% opacity, rotated -8deg). Mono "AUDIT PACKET · V2" kicker · headline "{n} entries" · sub "{hours} signed hrs · chain verifiable". Below: hairline rule, then a pill row (Chain valid / Hash v2 / {n} links).

**Options** section: chip-select for range (All / Year / Quarter / Custom). Three toggle rows: include drafts, include attachments, embed chain proof (disabled — always on).

**Format** section: 3-tile grid (PDF / JSON / CSV). Selected tile uses `accentSoft` bg + accent stroke.

**Primary "Export {n} entries"** button at bottom.

### Profile

Large top bar: title "Profile", sub "Your record · your certifications".

**Operator card**:
- 58px square accent-filled tile with initials (20px 800)
- Right: 20px name · mono employer
- Trailing: accent "Active" pill
- Hairline rule
- 2-column **CertCard** row: SPRAT + IRATA. Each: mono scheme kicker · Level chip · mono ID line · expiry caption (turns warn-colored when <120 days).

**Appearance section** — the theme switcher. 2-column `themepick` grid; each button shows:
- 28px-high split swatch row (3 colors from the theme's `swatch`)
- Theme name (700)
- Sub description (11px dim)
- Active theme has a 2px accent inset ring.

**Manage section**: settings rows for Audit export, Sync & backup, Chain integrity, Security.
**Support section**: Notifications, Attachments.

**Footer**: tiny brand mark + "RALB · v1.0 · chain {first 8 chars}" in mono uppercase, faint color, centered with 28px bottom padding.

---

## Component Inventory

Every named component below has a 1:1 source in `src/components.jsx`, `src/screens-home.jsx`, etc. Port them in this order so dependencies resolve:

1. **Theme + Token plumbing** — `themes.ts`, `useTheme()`, status-bar binding.
2. **Icons** — port all 38 SVGs to `react-native-svg`.
3. **Primitives**:
   - `Button` (variants: primary, secondary, ghost, outline, danger; sizes sm/md/lg; supports leading + trailing icon; `full` width)
   - `IconBtn` (square, three sizes)
   - `Card` (`padding`, `interactive`, `onClick`)
   - `Pill` / `StatusPill` (tone: chip, accent, ok, warn, danger)
   - `Field` (label, value, suffix, multiline, helper, type)
   - `ChipSelect` (segmented chip row)
   - `Sheet` (bottom-sheet modal with grab handle, head, body)
   - `SectionH` (kicker + title + trailing action)
   - `TopBar` (small + large variants)
   - `TabBar` (5 slots with raised center "+", glow shadow on the center disk)
   - `SyncChip` (states: synced / syncing / queued / offline — different bg+fg per state)
   - `AnimatedNumber` (eased-out cubic interpolation, 900ms default)
   - `HashGlyph` (deterministic 8-bar visualization keyed by hex)
   - `EmptyState`
   - `PullToRefresh` (RN: replace with Reanimated + gesture-handler driver)
4. **Screen-specific**:
   - `EntryRow`, `ActionTile`, `QuickLogCard`, `QuickChip`
   - `ChainLink`, `DetailStat`
   - `StepWhere`, `StepWhat`, `StepReview`, `PhotoStrip`, `PhotoSlot`, `ChoiceRow`
   - `SigPad`, `SealAnim`
   - `GearCard`, `CountdownDial`
   - `CertCard`, `SettingsRow`, `ToggleRow`

---

## Interactions & Motion

| Moment | Element | Timing | Curve |
|---|---|---|---|
| Tab change | `TabBar__item` | 160ms | `ease` (scale 0.96 on active) |
| Tab "+" press | `TabBar__primary-disk` | 160ms | `cubic-bezier(.2,.7,.3,1.4)` (scale 0.94 + rotate -8deg) |
| Card tap | `Card--interactive` | 160ms | `ease` (translateY -1px on hover; scale 0.99 on press) |
| Pull to refresh | `PullIndicator` | progressive | linear (ring) + spin 1.4s linear (active) |
| Splash → onboarding | full screen | 1800ms | one-shot |
| Onboarding card | hero plate | 600ms | `cubic-bezier(.2,.7,.3,1.4)` (scale + opacity) |
| Onboarding text | rises | 480ms, 80ms delay | ease-out |
| Theme swap | tokens | 280ms | ease (web only — instant on RN is fine) |
| Sheet open | bottom sheet | 280ms | `cubic-bezier(.2,.7,.3,1.1)` translateY 100→0 |
| Scrim | sheet/modal | 200ms | ease (opacity 0→1) |
| Career counter | `AnimatedNumber` | 900ms | cubic-out |
| Sign animation | Newsreader text | 2200ms | `cubic-bezier(.22,.61,.36,1)` (clip width 0→240px) |
| Sealing dial | accent ring stroke | 1400ms | `cubic-bezier(.65,.05,.36,1)` (dashoffset 528→0) |
| Seal complete | center stamp fill | 360ms | ease (fill transition) |
| Spin (sync) | `IconSync` | 1600ms | linear infinite |
| Hash glyph | (static) | — | — |

**Reduced motion:** respect `useReducedMotion()` (already in `src/ui/animation/use-reduced-motion.ts`):
- Skip the splash sweep — hold on the static logo.
- Skip the sign-fill animation — show the signature instantly.
- Skip the sealing dial — show the sealed state without the rotation.
- AnimatedNumber: snap to final value.

---

## State Management

All async/server state continues through React Query, as in the existing repo. **No new domain services are required** — the redesign only changes UI. New UI state to model:

- `useTheme()` hook backed by `local-prefs` (`theme_key`, default `'tungsten'`).
- `useNav()` / Expo Router as the existing repo does — no router change needed. Gear detail becomes a new route under `app/gear/[id].tsx`.
- The new-entry sheet — already wired in the existing repo. Add a "duplicate last" intent: pre-fill from the user's most recent entry. The `useLogbook()` hook already exposes recents.

**New routes to add:**
- `app/gear/[id].tsx` — Gear detail screen.

**Existing routes to update:**
- `app/(tabs)/_layout.tsx` — re-style the tab bar (raised center "+").
- `app/(tabs)/today.tsx` — full redesign per the spec above.
- `app/(tabs)/records.tsx` — chip filters, empty state, month grouping.
- `app/(tabs)/gear.tsx` — inspection-deadlines summary card + filter row + new `GearCard`.
- `app/(tabs)/more.tsx` → rename concept to Profile. Operator card + theme picker + settings.
- `app/entry/new.tsx` — 3-step sheet flow + photo strip.
- `app/entry/[id].tsx` — full redesign per the Record Detail spec.
- `app/entry/[id]/sign.tsx` — supervisor + sig pad + attestation + seal animation.

---

## Compliance / Copy Guardrails

The repo's `CLAUDE.md` is explicit: **do not describe the app as SPRAT- or IRATA-accepted in code, copy, or commits.** This bundle's mock copy follows that rule — it uses phrases like "audit-readiness", "chain verifiable", "tamper-evident". Keep that language. Don't introduce new copy that implies certification or accreditation by SPRAT or IRATA.

The "EFF YYYY.MM" form-number pattern from the prior design is **gone** in this redesign and should not be reintroduced — that was the paper-form metaphor we explicitly reset away from.

---

## Assets

No raster assets. Everything is SVG or token-driven. Fonts loaded via Google Fonts in the web prototype; in RN use `expo-font` with Manrope, JetBrains Mono, and Newsreader.

---

## Implementation order (suggested)

1. **Theme provider + tokens.** Land the six palettes and the `useTheme()` hook. Re-skin existing primitives to read from tokens. (No new screens yet — verify the existing app still works under every theme.)
2. **Icon set.** Port all 38 icons to `react-native-svg`. Wire the GEAR_ICON map.
3. **Profile screen + theme picker.** Lets you switch themes from the device and visually confirm the system works.
4. **Today.** Rebuild with the new components — career counter, quick-log, chain head, action tiles, recent rows.
5. **Records list + record detail + chain visualization.**
6. **New entry sheet + photo strip.**
7. **Sign + seal animation.** Reuse the existing `signature-pad.tsx` if it's still pen-perfect; otherwise port the new SigPad.
8. **Gear list + Gear detail.**
9. **Audit export.**
10. **Onboarding + Splash.**
11. **Pull-to-refresh + remaining motion polish.**

Treat the HTML/JSX in `src/` as **annotated specifications**, not as code to ship.
