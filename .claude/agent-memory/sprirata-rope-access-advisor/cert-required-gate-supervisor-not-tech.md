---
name: cert-required-gate-supervisor-not-tech
description: Cert-number requirement on signatures must be keyed to the supervisor's scheme, not the technician's IRATA level
metadata:
  type: feedback
---

The cert-number requirement on a sign-off MUST be gated on the supervisor's scheme (SPRAT vs IRATA), not on whether the technician has an IRATA level on the entry.

**Why:** A SPRAT-only technician being signed off by an IRATA L3 still needs that L3's IRATA number — the *signer's* certification authorizes the signature, not the *signee's*. As of 2026-05-12 `requiresVerifierCertNumber` in `src/domain/logbook/logbook-service.ts` checks `Boolean(entry.irata_level_snapshot)`, which is the tech's level, which means an IRATA-tech-being-signed-by-no-one case is exactly what is currently allowed when the tech's IRATA level is null. This is wrong.

**How to apply:** When reviewing sign-off / remote-verify flows, look for any logic that derives "is cert number required?" from entry data instead of signer-selected scheme. Push to make the supervisor explicitly pick SPRAT or IRATA at sign time and gate accordingly. Related: this also means signatures should carry `supervisor_scheme` + `supervisor_level` explicitly (today SPRAT loses level entirely) — see [[hash-version-bump-candidates]].

Also: when comparing signer level against tech level for authorization adequacy, *warn* rather than *block*. Real edge cases exist (L3 cross-signing for compliance audit, scheme bridging, etc.) and a hard block creates pressure to falsify the supervisor record. Warn loudly; let the human decide.
