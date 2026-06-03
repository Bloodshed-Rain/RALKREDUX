---
name: attestation-text-vs-delegated-signer
description: The verifier-portal attestation hard-codes "I am the requested verifier" but the flow allows a delegated/different signer, forcing a false attestation
metadata:
  type: project
---

`app/verify/[code].tsx` defines a single fixed `ATTESTATION_TEXT`: "I am the requested verifier, I reviewed this remote request and work record, and I authorize this signature." The same screen explicitly supports a *different* signer (the "Different signer" warn pill + helper "Both your name and the requested verifier name are recorded"). So when a delegated signer completes a request sent to someone else, the checkbox forces them to attest "I am the requested verifier" — which is false on its face.

**Why:** An attestation is the crown jewel of the record. An auditor reading "I am the requested verifier" sitting next to a "delegated / different signer" annotation sees a self-contradicting signature row — it undercuts the trust the whole remote path is built on. Two paths, one contract: the local sign path doesn't make this claim, so remote shouldn't fabricate it either.

**How to apply:** The attestation copy must branch on whether `supervisorName` matches `request.recipient_name`:
- Match: "I am the requested verifier, I reviewed this work record, and I authorize this signature."
- Diverge: "I am authorized to verify this work on behalf of the requested verifier" (or similar) — never assert "I am the requested verifier" for a delegated signer.
The persisted `signer_attestation` should capture whichever variant was actually shown, so the export reflects what the signer truly affirmed.

Secondary: "...I reviewed this remote request and work record" overstates what the portal shows — see [[remote-signing-verifier-parity]]: gear and attachments are not on the `RemoteSignatureRequestDetail` payload at all, so the signer cannot have reviewed them. Fixing parity also de-risks this attestation clause.

**Hash version impact:** None — attestation text is signature metadata, not entry attestation.

**RESOLVED 2026-05-30 (owner decision): soften the wording NOW, defer parity post-1.0.** Product owner chose the honest-minimum fix (scope the claim to what's shown) over waiting for gear/attachment payload parity. Shipped wording in `app/verify/[code].tsx`:
- `ATTESTATION_VERIFIER` = "I am the requested verifier. I reviewed the work details shown in this request, and I authorize this signature."
- `ATTESTATION_DELEGATE` = "I reviewed the work details shown in this request, and I authorize this signature on my own authority as named."
Shared spine ("I reviewed the work details shown in this request, and I authorize this signature") is identical in both; verifier prepends identity, delegate appends authority basis. "shown" scopes the claim to portal-visible content. Hazards + rescue cover ARE on the portal, so safety attestation is preserved.

This SUPERSEDES my earlier delegate-phrasing suggestion ("on behalf of the requested verifier") — that never shipped; do not relitigate it.

**Critical: `signer_attestation` is chain-hash-committed** (`entry-hash.ts:147` → `signerEnvelopeFromSignature` → `hashSignatureChain`, v4 envelope). It's data committed at sign time, like `supervisor_name`. Changing the string changes the committed VALUE, not the bound SHAPE — so NO `ENTRY_HASH_VERSION` bump and NO signature-chain version bump. Editing the constant is free and correct.

**Forward-only by design — flag if asked.** Pre-change remote signatures keep the old "work record" overclaim forever; they are chain-bound and immutable (rewriting breaks the chain). The back-catalog is not retroactively corrected — that's the integrity model working, not a gap. Bulk export shows whatever each row committed; expect a mix of old/new strings, which is the honest representation. NO blanket disclaimer in export.

**In-person sign path is clean** (`app/entry/[id]/sign.tsx:50`): "I verify this entry matches the work performed and I am authorized to sign it." Makes no portal-review claim — supervisor is physically present with full entry detail incl. gear on-screen. Do not change it.
