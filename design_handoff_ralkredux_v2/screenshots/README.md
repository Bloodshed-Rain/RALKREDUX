# Screenshots

PNG captures of the prototype, one phone shell per file. All 22 shots are taken from the live `prototype.html` running in a 390×844 iOS frame.

## Naming

`{screen}-{theme}.png`

Themes: `tungsten` · `mariner` · `verdigris` · `heliotype` · `sandstone` · `mercury`.
Screens: `today` · `records` · `detail` · `new` · `sign` · `sealed` · `gear` · `gear-detail` · `export` · `profile`.

## What's covered

- **All six themes on `today`** — the home dashboard. Quickest way to compare palettes.
- **Tungsten across every screen** — the default theme, full app sweep.
- **One "highlight" theme variant per remaining screen** — proves the system holds.

## Notes for the implementer

- **Screenshot fidelity:** these are DOM-to-image captures of the web prototype. Spacing, type, and tokens are accurate. SVG nested inside transformed parents can render inconsistently in DOM-to-image — for example, the `sealed-*.png` shots show the seal dial filled but the center brand monogram missing inside the stamp box. **The mark is present in the live prototype** (open `prototype.html` and walk to the seal moment); the implementation should faithfully include it as documented in the main `README.md` ("Sign" screen → seal animation).
- **Heliotype** is the high-contrast light theme — note the hard outlines on cards, the 2px ink drop-shadow on primary buttons, and the heavier 1.5px borders. Carries forward to RN as the only theme that branches on `theme.key`.
- **Daylight on these shots:** the status-bar glyphs in the iOS frame are rendered as part of the capture environment, not the app — they should be replaced by the OS in the real RN build.
