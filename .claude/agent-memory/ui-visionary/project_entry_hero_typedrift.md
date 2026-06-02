---
name: entry-hero-typedrift
description: The entry/[id]/* route group shares a hand-rolled fixed-size hero title that bypasses UI_SCALE (typography drift, KNOWN-BACKLOG)
metadata:
  type: project
---

Every screen in `app/entry/[id]/*` (request-signature, amend, edit) plus `app/entry/new` defines its own hand-rolled hero title style instead of spreading a `type.*` token: `fontFamily: 'Manrope_800ExtraBold', fontWeight: '800', fontSize: 26` (new.tsx uses 28). These raw `fontSize` literals do NOT pass through `scaled()`, so they ignore the global `UI_SCALE` that every `type.*` value carries.

**Why:** This is the KNOWN-BACKLOG "typography drift" item — many screens hand-roll font props inline. The hero case is the most visible instance because the closest token, `type.heroCardTitle` (fontSize `scaled(22)`), DOES scale. So at UI_SCALE > 1 the surrounding card titles grow while the fixed-26 hero does not — the hero can end up smaller than card content and the intended hierarchy inverts.

**How to apply:** When asked to fix typography drift or harmonize the entry-detail/signing flow, treat these four heroes as a single batch. The right fix is a shared scaled display token (e.g. add a `screenHero`/reuse `heroCardTitle` bumped via a scaled variant) rather than patching one screen. Do NOT present as a new discovery — tag KNOWN-BACKLOG. Sibling chips in the same files (`fontSize: 12`/`13`) are the same drift; sign.tsx is the clean counter-example because it spreads `...type.cardSub` first and only overrides weight, preserving the scaled size.
