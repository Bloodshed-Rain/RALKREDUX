---
name: Today screen spec location
description: ScreenBrief function in the design-handoff prototype defines the Tidewater Today layout
type: reference
---

The Tidewater redesign spec for the Today screen lives in:
`design_handoff_ralkredux/prototype/prototype.jsx` at lines 100-166 (function `ScreenBrief`).

Key elements defined there:
- Chapter header (CH.1 · BRIEFING) with day-of-year, date, weather strip
- Cumulative rope-hour hero number with 30-day delta
- Dual cert dials (SPRAT / IRATA) in 2-column grid
- Advisory card with Inspect / Dismiss buttons (UX recommends replacing Dismiss with long-press Acknowledge)
- "Today's actions" numbered ladder (3 items max, §-references, first item yellow-emphasised)
- Signed-today success banner at the bottom

Verify the file still exists before recommending from this memory — the design-handoff directory is a snapshot and may move.

Related: live code at `app/(tabs)/today.tsx`. Data hooks at `src/domain/logbook/use-logbook.ts` and `src/domain/profile/use-profile.ts`.
