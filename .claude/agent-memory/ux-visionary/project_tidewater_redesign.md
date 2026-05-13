---
name: Tidewater redesign phase
description: RALB Codex Edition is mid-redesign to a doc-system UI; Today screen is first target after primitives landed
type: project
---

RALB is in Phase B of a redesign called Tidewater. Phase A delivered the primitive set and data hooks. Phase B is building screens on top.

The visual concept treats every screen as a regulated document: chapter headers, numbered sections, hairline rules, Archivo display type. Hierarchy reads like a form, not a feed.

**Why:** the product is built toward audit-readiness (not SPRAT/IRATA-accepted — see compliance roadmap). The doc-system aesthetic reinforces "this is a legal record" to the user, which the previous dashboard layout did not.

**How to apply:**
- The full spec lives at `design_handoff_ralkredux/prototype/prototype.jsx`. Today is `ScreenBrief` at lines 100-166.
- A UI visionary agent owns visual craft (tokens, type, color); a SPRAT/IRATA domain agent owns compliance copy and workflow correctness. UX (me) owns flow, hierarchy, and friction.
- Screens shipped so far still use the pre-Tidewater layout. Don't propose changes to non-Today screens unless asked — they have their own redesign passes coming.
- The redesign uses heuristics not present in the data layer (e.g., 1000hr-per-cert-level, advisory severity codes). Flag these as heuristics in copy; never imply they are standards.
