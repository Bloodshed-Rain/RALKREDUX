---
name: Data hooks available to the Today screen
description: react-query hooks that Phase A delivered for the Today/dashboard redesign
type: reference
---

The Today screen can read from these hooks (all already shipped):

- `useDashboardSummary()` → counts and hour totals: totalEntries, draftEntries, signedEntries, amendedEntries, pendingSignatureRequests, draftHours, signedHours, expiringCerts (ExpirationAlert[]), overdueGearItems, dueSoonGearItems
- `useChainHead()` → latest hash chain head string, or `null` when no signed records exist yet
- `useGearItems()` → GearItemDetail[] including overdue items with name, serial, days-overdue
- `useProfile()` → operator identity, scheme, cert levels, scheme expiry dates
- `useEntries()` → entry list; derive "signed today" from `signed_at`
- `useCareerStats()` → totalHours and byTask buckets

Heuristics NOT in data (added by redesign):
- Hours-to-next-level (current `today.tsx` uses 500/1000/1000 via `hourTarget()`; prototype hardcodes 1000)
- Advisory severity codes (OPS-04, P1 in prototype) — not in domain types

Cache strategy I recommend for Today (call out to engineer):
- `dashboard-summary` and `gear-items`: staleTime 0, refetchOnWindowFocus true
- `career-stats` and `profile`: staleTime 5min
- Pull-to-refresh invalidates all the above plus `entries` and `chain-head`
- `useFocusEffect` on the screen invalidates on tab focus — critical for "Countersign N pending" staying accurate after the user returns from Records.
