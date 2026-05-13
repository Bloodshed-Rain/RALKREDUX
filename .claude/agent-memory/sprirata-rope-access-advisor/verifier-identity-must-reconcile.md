---
name: verifier-identity-must-reconcile
description: Requested verifier and actual signer must be reconcilable in the audit packet; never silently overwrite one with the other
metadata:
  type: feedback
---

On the remote verifier portal, the requested verifier's name (from the technician's request) and the name of whoever actually completed the signature must both be captured. The attestation "I am the requested verifier" is meaningless if the field is editable and only one name ends up in the signature row.

**Why:** As of 2026-05-12 `app/verify/[code].tsx` pre-fills `supervisorName` from `request.recipient_name` but leaves the field editable; whatever the verifier types becomes the signer of record. Bob being forwarded the link and signing as Alice is undetectable in the audit packet. Auditors compare "who was requested" to "who signed" — those have to be different fields, both preserved.

**How to apply:** When reviewing the verifier portal flow or signature schema changes, ensure: (1) the requested-verifier identity is locked / read-only on the portal, and (2) there's a separate `actual_signer_name` (and ideally `actual_signer_cert_number` + scheme/level) on the signature record that captures who actually completed it. If they match, fine — record both anyway. If they don't, the audit packet must show both with a "delegated signature" annotation.

Related: this is in the v3 batch — see [[hash-version-bump-candidates]].
