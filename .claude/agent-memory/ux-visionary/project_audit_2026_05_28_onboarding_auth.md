---
name: audit-2026-05-28-onboarding-auth
description: Onboarding & auth screens audit — first-run error dead-ends, OTP no-resend, index isError routing
metadata:
  type: project
---

Reviewed onboarding + auth group on 2026-05-28 (lens: UX flow & field-context). Files: app/index.tsx, app/(onboarding)/intro.tsx, app/(onboarding)/setup.tsx, src/ui/auth/auth-screen.tsx.

Key NEW findings:
- setup.tsx submit() `onError: () => haptics.error()` — buzz only, NO visible message/retry. useCreateProfile hook has no onError either. First-run profile-create failure (profile_create_failed or SQLite write error) is a silent dead-end. Contrast: AuthScreen has full messageFor() error surface; setup has none.
- app/index.tsx splash gate: `ready = minElapsed && !profile.isLoading && onboardingSeen!==null`. On profile.isError, isLoading=false + data=undefined → Redirect routes an established tech BACK through /setup or /intro. No isError branch. (createProfile guards true dup by returning existing, softening data risk, but UX is alarming.)
- auth-screen.tsx enter_code step (lines 211-247): no "Resend code", no countdown. Only escape if OTP never arrives is "Use a different email" → re-enter same email → re-trigger sendEmailOtp (then rate-limit branch punishes). Bad for field signal latency.
- auth-screen.tsx: no proactive "you're offline, connect once to activate" state; copy "records stay on this device" reinforces offline mental model but first sign-in genuinely needs net (auth-gate shows AuthScreen only when configured+signed_out).

**Why:** these are the first-touch screens; opaque failure here loses the user before they ever log an entry.
**How to apply:** when this group is revisited, push for an inline error banner on setup (reuse AuthScreen's messageFor pattern), an isError state on index, and a Resend-with-cooldown on OTP.

Verified NOT bugs: intro.tsx:211 HeroIcon uses accentInk over accent fill = CORRECT ink-on-accent pairing, NOT the fixed soft-token-foreground bug. No new Fabric transform-ternary instances. IRATA cert-number round-trip (cert-number.ts) is data-safe.

Field primitive (src/ui/primitives/v2/field.tsx) has NO error/invalid prop — invalid messages render as `helper` in textFaint (lowest-contrast token), same styling as neutral helper. Invalid state = copy-only in faintest color (glare risk). Cross-cuts every form, not just setup.
