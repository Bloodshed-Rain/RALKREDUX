---
name: Don't dismiss safety advisories with one tap
description: Advisory cards in a safety-critical app need confirmation; replace Dismiss with long-press Acknowledge + audit trail
type: feedback
---

A one-tap "Dismiss" on a safety advisory (overdue gear, expiring cert, broken hash chain) is a destructive interaction in a glove/harness context. A glove-bump can suppress a real warning.

**Why:** the product's whole premise is that audit-grade records exist because humans miss things under pressure. A UI that lets a tech wave away a "DO NOT DEPLOY" prompt without producing an audit record contradicts the product thesis. Field conditions (gloves, glare, motion) make one-tap accidental triggers more likely than in normal apps.

**How to apply:**
- Replace single-tap "Dismiss" on any safety-coded advisory with **long-press Acknowledge (~600ms)** that writes an audit row (operator id, advisory code, timestamp) and mutes the card for the rest of the session.
- Acknowledge is NOT resolution. The card re-fires next session unless the underlying condition (overdue → inspected, expired → renewed) is actually cleared in domain data.
- A different advisory code, or a change in the set of items implicated, re-raises the card at full prominence regardless of prior acknowledge.
- Provide an accessible alternative to long-press (confirmation sheet) for screen-reader users — long-press gestures are not discoverable.
- This rule applies to: overdue gear, expiring certs, broken hash chain, stale sync warnings. It does NOT apply to informational cards (e.g., "X signed today" success banner) — those can be one-tap close.
