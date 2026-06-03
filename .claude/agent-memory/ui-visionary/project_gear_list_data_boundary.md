---
name: gear-list-data-boundary
description: What the gear list payload (GearItemDetail) carries vs what needs a new hook — for any gear list/row redesign
metadata:
  type: project
---

The gear tab list (`useGearItems` → `listGearItems`) returns `GearItemDetail[]`, each row carrying enough for a rich, dense row with ZERO extra fetch.

**In the list payload per item:** `item` (category, name, manufacturer, model, serial_number, next_inspection_due, retired_at, created_at), `status` (`current|due_soon|overdue|unscheduled|retired`), and `latest_inspection` (result, inspected_on, inspector_name, inspector_cert_number, notes). So last-inspection result + who/when is free to show per row.

**NOT in the list:** full inspection history or a per-item inspection COUNT — only `latest_inspection`. A per-row sparkline / "trend" / "N inspections" needs a new hook (count query or `listInspectionsForGear` per item). Flag it; don't assume it.

**Derivable client-side from the in-memory array (no service change):** per-category counts (GearSummary does NOT give these — it gives overdue/dueSoon/active/retired/total only); status grouping (the array is already sorted server-side: retired-last, then null-due-last, then next_inspection_due asc, then name). So status-grouped sections = cheap client regroup.

**Status math:** `getGearStatus` + `DUE_SOON_DAYS = 30` (exported from gear-service). `days`/`progress` are computed in-screen (`computeCycle` in the gear tab) from next_inspection_due + last-inspection anchor — duplicated in `app/gear/[id].tsx`; a redesign could lift this into a shared helper.

**Why:** "propose only data that exists" is the grading edge on gear redesigns.
**How to apply:** rows can show category icon + name + mfg/serial + status pill + days + last-result with no new domain work; status-grouped sections fold in the standalone deadlines card for free; anything trend/count-shaped is a domain ask, not free.

Related: [[gear-status-soft-fill-contrast]]
