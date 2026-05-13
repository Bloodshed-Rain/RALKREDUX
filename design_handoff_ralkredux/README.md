# Handoff — RALKREDUX (Rope Access Logbook redesign)

## Overview

RALKREDUX is a redesign of an offline-first rope-access logbook for SPRAT- and IRATA-certified technicians. The product replaces a paper logbook used to track rope hours, inspections, gear, and witnessed entries. The redesign reframes the app as a **regulated document system**: each screen reads like a numbered form, each action produces a signed and chained record.

This package contains the **interactive prototype** and the **brand system** (logo, stamps, motion, empty-states).

## About the Design Files

The HTML files in this bundle are **design references** — clickable prototypes built in React + Babel + inline JSX, hosted in a single browser tab. They demonstrate the intended look, copy, interactions, and motion. **They are not production code.**

Your task is to **recreate these designs in the target codebase's existing environment** (React Native, SwiftUI, Flutter, etc.) using its established patterns, components, and libraries. If no environment exists yet, pick the most appropriate framework for an offline-first, signature-capture mobile app (React Native or SwiftUI are both reasonable defaults) and implement there.

## Fidelity

**High-fidelity.** Colors, typography, spacing, layout density, motion timings, and copy are all final and intended to be reproduced precisely. The `Tidewater` palette and the typographic system (Archivo / Inter / IBM Plex Mono / Newsreader italic) are part of the brand identity — do not substitute system fonts.

---

## Files in this bundle

```
design_handoff_ralkredux/
├── README.md                          ← this file
├── prototype/
│   ├── RALKREDUX Prototype.html       ← entry point — interactive flow
│   ├── prototype.jsx                  ← all prototype screens & flows
│   ├── official.jsx                   ← shared tokens, type, primitives
│   ├── app.jsx                        ← root component
│   ├── ios-frame.jsx                  ← device chrome
│   ├── design-canvas.jsx              ← review canvas wrapper
│   └── tweaks-panel.jsx               ← in-design tweak controls
├── brand/
│   ├── RALKREDUX Brand.html           ← brand exploration sheet
│   └── brand.jsx                      ← logo + motion + empty-state sources
└── screenshots/                       ← (optional — request separately)
```

Open `prototype/RALKREDUX Prototype.html` in a browser to walk the flow. Open `brand/RALKREDUX Brand.html` for the brand system sheet.

---

## Brand identity

### Logo — PLATE direction

A riveted industrial nameplate. The mark is itself a small piece of equipment.

- Ink rectangle filled with `#0e3a40`
- Reversed `RALB` in Archivo Black, letter-spacing 2
- Hairline inner outline at 45% opacity, four corner rivets (paper-colored circles)
- Caption underneath: `ROPE ACCESS LOGBOOK` in IBM Plex Mono — use `textLength` or `letter-spacing` to fit width exactly
- Aspect ratio 56:42 (4:3 landscape)

Full lockup pairs the plate with `ROPE ACCESS LOGBOOK` in Archivo Black + tag line `RALB · FORM 27-A` in mono.

### Color tokens (Tidewater palette)

The shipped palette is the **teal-sage Tidewater** in `src/ui/theme/tokens.ts`. An earlier draft of this handoff documented a navy-on-cream variant; the teal/sage values below are canonical. Update the production code if the navy is ever re-adopted, not this table.

| Token | Hex | Use |
|---|---|---|
| `ink` | `#0e3a40` | Primary text, plate fill, borders |
| `ink2` | `#1a525a` | Secondary text |
| `ink3` | `#5e7c80` | Meta text, captions |
| `paper` | `#e6ece8` | Main surface |
| `paper2` | `#d6dfdb` | Recessed surface |
| `white` | `#ffffff` | Card surface |
| `accent` | `#5cb3c4` | Selected state, active accent |
| `accentSoft` | `#d2ebf0` | Accent tinted backgrounds |
| `yellow` | `#d4a514` | Safety / rope / load accent |
| `yellowDeep` | `#937007` | Yellow on light |
| `yellowSoft` | `#eed8a3` | Yellow tinted backgrounds |
| `red` | `#b03020` | VOID, EXPIRED, errors |
| `redSoft` | `#eccac2` | Error backgrounds |
| `green` | `#2c7256` | VERIFIED, OK, chain-confirmed |
| `greenSoft` | `#c8dccf` | Success backgrounds |
| `hair` (border) | `#0e3a40` | 1.5px borders on cards/cells |
| `hairSoft` | `rgba(14,58,64,0.22)` | Internal rules |
| `hairFaint` | `rgba(14,58,64,0.10)` | Ruled lines, form lines |

### Typography

| Family | Use | Weights |
|---|---|---|
| **Archivo** | Display, screen titles, "form-name" all-caps labels | 700, 800, 900 |
| **Inter** | Body, paragraph text, button labels | 400, 500, 600, 700 |
| **IBM Plex Mono** | Form numbers, meta, status chips, ticker, captions | 400, 500, 600 |
| **Newsreader** (italic) | Signatures, stamps (rotated) | 500, 700 — italic only |

Letter-spacing is loaded across the board — mono captions sit at `1.2–1.8`, all-caps display at `-0.2 to -0.8` for tight headlines. Form numbers always carry the `FORM nn-X · REV n · EFF YYYY.MM` pattern in mono.

### Document anatomy (applies to every screen)

Every screen frames as a document:

1. **Top doc-band** — ink bar, paper text, form ID left, effective date right (`FORM 27-A · REV 4` | `EFF 2026.05`)
2. **Title block** — Archivo all-caps screen title + ink underline
3. **Body** — flexbox columns of "cells" separated by 1px ink rules
4. **Footer doc-band** — issuance clause + page counter (`p. 1 / N`)

### Stamps (rotated Newsreader italic, 78% opacity)

`VERIFIED · SIGNED · WITNESSED · FILED · PENDING · AMENDED · VOID · EXPIRED · DRAFT`

Each is 22px Newsreader italic, 700 weight, `letter-spacing: 3px`, in a 2.5px solid border of its tone color, rotated -9° to +6°. Use over signed records and document covers.

### Security weave

Background pattern for sensitive screens, audit-PDF backers, splash. SVG pattern at 20×20px tile: two diagonal hairlines + center dot at ~18-32% opacity. Three color variants: ink-on-paper, paper-on-ink, yellowDeep-on-paper.

### Watermark seal

Pale center mark for audit-PDF cover pages: concentric circles + circular perimeter text (`ROPE ACCESS LOGBOOK · FORM 27-A ·` looped) + reversed `RALB` monogram in center + `EST. ANNO IV` cartouche. Opacity 18%.

### Motion system (9 loops)

All loops, no easing tricks — short, mechanical, single-purpose.

| ID | Name | Purpose | Timing |
|---|---|---|---|
| M.1 | Stamp slam | VERIFIED drops onto doc | 3.4s cubic-bezier(.2,.7,.3,1.4) |
| M.2 | Pulley · rope flow | Sync / progress signal | 1.6s linear sheave + 0.9s rope twist |
| M.3 | Ledger counters | Rolling slot digits for counts | 4s ease per digit, staggered 0.18s |
| M.4 | Splash | App boot — polished plate w/ shine sweep + progress bar | 4s shine, 3.2s bar |
| M.5 | Seal chain-OK | Rotating perimeter text + pulse rings | 24s spin, 1.8s pulse |
| M.6 | Weave drift | Subtle background motion | 6s linear |
| M.7 | Load gauge | Animated needle through green/yellow/red zones | 3.6s ease-in-out |
| M.8 | Signature fill | Newsreader italic writes onto line | 2.4s ease-out |
| M.9 | Ticker tape | Status crawl, three speeds & directions | 22s / 36s / 28s linear |

Splash gradient detail:
```css
background: linear-gradient(95deg,
  transparent 0%,
  rgba(245,197,24,0.00) 28%,
  rgba(245,197,24,0.22) 42%,
  rgba(255,236,170,0.55) 49%,
  rgba(255,255,255,0.78) 50%,
  rgba(255,236,170,0.55) 51%,
  rgba(245,197,24,0.22) 58%,
  rgba(245,197,24,0.00) 72%,
  transparent 100%);
mix-blend-mode: screen;
transform: skewX(-22deg);
/* keyframe: translateX -130% → 240% over 4s */
```

### Empty-state illustrations

Line-art only, mono caption beneath. Built at 140×112 viewBox.

- **No records yet** — stack of pages with `UNFILED` red stamp
- **All synced** — hex seal with bold green check, caption `CHAIN CONFIRMED`
- **No PPE on file** — carabiner outline with dashed "missing" marks
- **Offline** — page with no-signal arcs + red strike, caption `QUEUED LOCAL · n RECORDS`

---

## Prototype screens

Screen list (open `prototype/RALKREDUX Prototype.html` to walk through):

1. **Splash** — app boot with shine sweep
2. **Today (home)** — counters, last entry, sync state
3. **Records list** — chained entries with form-ID, hours, witness
4. **New record (modal, 3 steps)** — site → activity → sign & witness
5. **Record detail** — full doc view with stamps + chain footer
6. **PPE / Gear** — inspection schedule, due-by chips
7. **Audit export** — PDF preview with watermark cover
8. **Settings / Profile** — operator card

### Interaction & state notes

- **Offline-first.** All writes go to a local queue first. Sync indicator (M.2 Pulley) animates during background sync. On reconnect, queued records flush; show `QUEUED LOCAL · n` chip while offline.
- **Chain.** Each record references the hash of the previous record's signature block. Display the chain head (`3f9a1c…b820`) in the home counter and on each record's footer.
- **Witness.** A second signature is required for any record involving a fall-arrest event or gear retirement. Modal blocks submission until both signatures are captured.
- **Stamps are derived, not user-applied.** VERIFIED appears automatically when chain-validated, WITNESSED when both signatures present, FILED when synced to cloud, VOID when amended.
- **Amendment, not edit.** Records cannot be edited after sign. An amendment creates a new linked record and stamps the original AMENDED.

### Navigation

Bottom tab bar (5 items): Today · Records · New (center, raised) · Gear · More.

The center "New" button opens the 3-step modal. Tab bar is paper, ink-bordered, with mono labels.

---

## Implementation notes for Claude Code

- **Match the doc-band pattern rigorously.** Every screen has an ink top-band and a paper-2 footer band. Skipping these breaks the visual identity.
- **Hairlines, not shadows.** The system uses 1px ink borders almost everywhere; avoid drop-shadows except on the floating "New" button and modal scrims.
- **Density is high.** Counters and metadata sit close together; do not pad to web-app spacing.
- **All caps for short labels only.** Body copy stays mixed-case Inter.
- **Numbers are content.** Form IDs, hours counters, hash heads, kN load values — these are not chrome, they are the design. Treat them like data, render in mono, never animate without purpose.
- **Animations respect `prefers-reduced-motion`.** M.2/M.3/M.6/M.9 should pause and snap to a static end-state; M.4 should hold on the final logo without the shine sweep.

---

## Source HTML/JSX references

If you need to inspect the exact React structure or SVG paths used in the prototype, every screen is in `prototype/prototype.jsx`. Shared design tokens, primitives (DocBand, FormCell, Stamp, MarkPlate), and the typographic scale live in `prototype/official.jsx`. The brand sheet's SVG marks and motion loops live in `brand/brand.jsx`.

Treat these files as **annotated specifications**, not as code to ship.
