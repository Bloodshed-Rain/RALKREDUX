---
name: today-on-your-plate-review
description: 2026-06-02 redesign review of Today screen "ON YOUR PLATE / Open work" section — data facts + direction chosen
metadata:
  type: project
---

Reviewed the Today screen "ON YOUR PLATE / Open work" section on 2026-06-02 (owner: section "could be more useful than what it's doing now").

**Data facts (verified in code, anchor future proposals here):**
- `useDashboardSummary()` -> `draftEntries`, `pendingSignatureRequests`, `signedEntries`, `amendedEntries`, `totalEntries`, `draftHours`, `signedHours`, `overdueGearItems`, `dueSoonGearItems`, `expiringCerts[]`.
- `useEntries()` -> full `LogbookEntry[]`; each row has `status`, `pending_signature_id`, `site`, `work_task`, `work_hours`, `date_to`, `updated_at`. So Today CAN render a real worklist (which specific drafts/pending), not just counts. A draft with `pending_signature_id` set is the "awaiting signature" case; a plain draft is "to finish".
- **Biggest find:** `src/domain/logbook/today-derivations.ts` already exports `buildActions()` (conditional, suppresses zero-count items) and `buildAdvisories()` (gear/cert alerts, priority-sorted). NEITHER is used by `app/(tabs)/today.tsx` — the screen hand-rolls a static 4-tile grid instead. The "smart, hide-when-empty" logic exists and is being ignored.

**Inconsistency to flag:** Today gear-due-soon tile copy says "within 14d"; `buildAdvisories` OPS-07 says "due within 30 days". Pick one (SPRAT/IRATA + UI agents).

**Owner screenshot issues confirmed by reading TopBar:** TopBar trailing cluster = SyncChip + Bell IconBtn, no right-edge breathing room beyond paddingHorizontal:20; status-bar crowding is real. Handoff to UI agent (chrome density), but flag.

**Direction chosen:** collapse the 0-count 2-col stat grid into a single suppress-when-empty worklist driven by buildActions()/real entries; clean "all clear" empty state when nothing is open. Avoids the clipped-tiles + low-value-zeros problem entirely.

**Palette note:** Heliotype collapses accent/danger to oxblood; Pill/SyncChip/StatusPill already disambiguate by shape. Reuse those primitives rather than inventing new tone fills.
