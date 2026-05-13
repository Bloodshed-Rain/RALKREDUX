---
name: remote-signing-verifier-parity
description: Remote verifier portal must show gear and attachments — anything a local supervisor would see in person
metadata:
  type: feedback
---

The remote verifier portal must present at least the same information a local supervisor sees when signing in person. Today it does not — it omits gear and attached evidence photos.

**Why:** The remote signing path and the local signing path are two paths, one contract (per `CLAUDE.md`). If a supervisor attestation reads "I reviewed this remote request and work record" but the remote portal hides the gear list and photo evidence the local supervisor would have walked through, the two signatures have different evidentiary weight despite carrying identical attestation text. That's a safety-of-record problem and an audit-defense problem.

**How to apply:** When reviewing the verifier portal or any remote-signing flow, check that gear and attachments render before §21 Authorization. If a future change adds entry context that's visible on local sign, mirror it to remote. Push back hard on "remote gets a slimmer view because the screen is smaller" — pagination/disclosure is fine, omission is not.
