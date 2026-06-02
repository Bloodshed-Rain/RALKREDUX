---
name: remote-signing-verifier-parity
description: Remote verifier portal must show gear and attachments — anything a local supervisor would see in person
metadata:
  type: feedback
---

The remote verifier portal must present at least the same information a local supervisor sees when signing in person. Today it does not — it omits gear and attached evidence photos.

**Why:** The remote signing path and the local signing path are two paths, one contract (per `CLAUDE.md`). If a supervisor attestation reads "I reviewed this remote request and work record" but the remote portal hides the gear list and photo evidence the local supervisor would have walked through, the two signatures have different evidentiary weight despite carrying identical attestation text. That's a safety-of-record problem and an audit-defense problem.

**How to apply:** When reviewing the verifier portal or any remote-signing flow, check that gear and attachments render before §21 Authorization. If a future change adds entry context that's visible on local sign, mirror it to remote. Push back hard on "remote gets a slimmer view because the screen is smaller" — pagination/disclosure is fine, omission is not.

**Parity DEFERRED post-1.0 (owner decision 2026-05-30).** Rather than widen the payload before 1.0, the owner chose to soften the attestation wording so it no longer claims review of gear/attachments — see [[attestation-text-vs-delegated-signer]]. Parity (gear + attachments on the wire) remains the right end-state and is still tracked here; the softened wording is the honest interim, not a substitute. When parity ships, revisit the attestation wording (the "shown in this request" scope can widen) and the scope comment in `app/verify/[code].tsx`.

**Re-confirmed 2026-05-28, now traced to the transport layer:** The gap is not merely a missing UI block. The portal's `detail` is a `RemoteSignatureRequestDetail` (`src/domain/logbook/types.ts`), which carries only `{ entry, request, signature }` — it has NO `gear_usage` / `attachments` fields, unlike `EntryDetail` which does. The hosted sync payload (`syncHostedRemoteSigningRequest` in `src/cloud/supabase/remote-signing.ts`) sends `entry` + `entry_hash` but never gear or attachments. So BOTH the local and hosted verifier paths are structurally incapable of showing PPE used or photo evidence. Fix requires widening `RemoteSignatureRequestDetail` + the hosted payload, not just adding a card. Ties into [[attestation-text-vs-delegated-signer]] — the attestation claims the signer "reviewed this work record" while gear/photos were never on the wire.
