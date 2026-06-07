# UI Visionary — Agent Memory Index

- [Primitive type drift](project_primitive_type_drift.md) — TopBar/EntryRow + the whole v2 input-primitive family hardcode unscaled font sizes; toggle/button correctly use type.* (drift within one form)
- [HashGlyph chainHash semantics](project_hashglyph_chainhash_semantics.md) — EntryRow chain glyph fed a constant (Today) vs UUID (Records); neither is the real chain hash
- [Entry hero type drift](project_entry_hero_typedrift.md) — entry/[id]/* + entry/new share a hand-rolled fixed fontSize:26 hero that bypasses UI_SCALE; KNOWN-BACKLOG, fix as one batch
- [UI_SCALE type-drift mechanism](project_ui_scale_type_drift.md) — how to quantify drift (1.18); gear/[id] hero hand-rolls fontSize:20; spacing has no token scale so don't flag it
- [warn-on-warnSoft contrast](project_warn_on_warnsoft_contrast.md) — warn fg on warnSoft fails WCAG on the 3 light palettes (mercury worst 2.92); code-certain math
- [Soft-token foreground contrast](project_soft_token_foreground_contrast.md) — full per-palette tables for warn/accent/ok on their *Soft fills; forge+mercury fail AA (FormatTile accent 2.82/4.20)
- [CustomIcon theme-blind — RESOLVED](project_customicon_theme_blind.md) — icon rewrite shipped (7b77b93): currentColor SVGs + CustomIcon forwards color; theming holds. Don't re-flag.
- [auth error-banner contrast](project_auth_error_banner_contrast.md) — danger-on-dangerSoft small text fails AA on verdigris/tungsten/mercury (4.09 worst); use tokens.text for body
