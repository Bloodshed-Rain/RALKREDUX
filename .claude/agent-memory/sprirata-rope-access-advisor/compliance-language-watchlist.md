---
name: compliance-language-watchlist
description: Specific phrases in user-facing copy that have drifted toward claiming SPRAT/IRATA acceptance or citing specific clauses
metadata:
  type: feedback
---

Per `CLAUDE.md` compliance-language rule and the SPRIRATA standing instruction: the app must not claim SPRAT- or IRATA-acceptance or cite specific clauses as if the app maps to them. Specific phrases flagged as of 2026-05-12:

- `app/entry/new.tsx` Step 3 footer: "Amendments require a counter-signed appendix per IRATA ICOP §G.4." → cite-by-clause is exactly the pattern to avoid. Rephrase plain-language: "Amendments are a new signed record that points back to the original — the original stays sealed."

**Why:** Two failure modes. (1) The clause may not say what we imply; readers screenshot the line and the project gets called on it. (2) It signals "this app is mapped to the standard," which is precisely the acceptance claim the project explicitly does not make. See `docs/sprat-irata-compliance-roadmap.md`.

**How to apply:** Grep any new user-facing copy for "IRATA", "SPRAT", "ICOP", "§", "ANSI", "accepted", "certified", "approved" before it ships. Plain-language descriptions of *what the app does* are fine ("amendments are a new entry that points back"); citations and acceptance language are not.

Safe phrasing patterns:
- "Audit-ready" not "audit-accepted"
- "Built toward audit readiness" not "compliant with"
- "Hash chain seals the record" not "satisfies §X.Y"
- "Amendment points back to the original" not "per ICOP §G.4"

Currently safe copy worth preserving: setup screen's "OFFLINE-FIRST ROPE ACCESS LEDGER" and footer's "PROFILE WILL SEED THE LOCAL LEDGER — HASH-CHAIN STARTS AT GENESIS" — descriptive, no acceptance claim.
