---
name: auth-error-banner-contrast
description: Auth-screen error banner (danger text on dangerSoft) fails WCAG AA on verdigris/tungsten at small size — code-certain cross-palette defect
metadata:
  type: project
---

`src/ui/auth/auth-screen.tsx` renders the error banner as `type.cardSub` (12pt → ~14.2pt at UI_SCALE 1.18, i.e. NORMAL text needing 4.5:1) in `tokens.danger` on a `tokens.dangerSoft` fill (lines ~145-156). Computed WCAG contrast across the six palettes: verdigris 4.09:1, tungsten 4.44:1, mercury 4.26:1 — all below the 4.5:1 AA floor for normal text. mariner 5.16, forge 4.76, heliotype 6.37 pass. This is the highest-stakes copy in the auth flow (the message that tells a tech why sign-in failed).

**Why:** The danger/dangerSoft pairing was tuned for badge/pill use where text is short and often bolder, not for a paragraph of error prose. The soft tints are deliberately low-chroma on dark palettes, which compresses contrast against the saturated danger ink.

**How to apply:** When fixing, the cheapest code-certain fix is to use `tokens.text` (not `tokens.danger`) for the banner body copy and keep the `danger` border + a small danger icon as the status signal — preserves color-blind-safe shape/border signaling and lifts every palette well past 4.5:1. Do NOT just darken `danger`; it is shared with pills/buttons. Same dangerSoft+danger-text pattern likely recurs in other inline error banners — grep `backgroundColor: tokens.dangerSoft` before declaring it isolated. [[entry-hero-typedrift]] is the sibling typography-drift item in the same auth file (inline fontSize:26 title).
