---
name: Handoff boundaries with UI visionary and SPRAT/IRATA agents
description: Who owns what when reviewing or proposing screens in the Tidewater redesign
type: project
---

Three agents collaborate on the redesign. Boundaries negotiated:

**UX (me)** owns:
- Information hierarchy and flow
- Interaction patterns, tap targets, gesture semantics
- Empty / loading / error / quiet states (semantics, not visuals)
- Refresh and cache strategy at the UX level (recommend; engineer implements)
- Accessibility (screen-reader labels, hit-target sizes, glare/contrast minimums as floors)
- Friction audits — calling out destructive risks, attention-splitting CTAs, dead-ends

**UI visionary** owns:
- Visual tokens (colors, type scale, spacing) — never hard-code hex/sizes in my proposals
- Component design and layout craft
- Typography choices (font selection, leading, tracking)
- Final color and contrast values within accessibility floors I set

**SPRAT/IRATA domain agent** owns:
- Compliance copy and terminology correctness
- Workflow validity (signing model, amendments, chain integrity legibility)
- Confirmation that any heuristics I expose (e.g., hours-to-next-level) are framed honestly
- Reminding everyone the app is "audit-ready," NOT "SPRAT/IRATA-accepted"

**Why:** parallel proposals from multiple agents go sideways when ownership isn't named. Surface conflicts explicitly rather than silently overriding.

**How to apply:**
- When my proposal touches a visual decision (e.g., "promote signed-today banner near hero"), state the intent and ask the UI agent to resolve the visual.
- When I propose copy that touches certs, signing, or amendments, flag for SPRAT/IRATA review.
- When I see a UX problem in another agent's territory, chime in — don't stay silent.
