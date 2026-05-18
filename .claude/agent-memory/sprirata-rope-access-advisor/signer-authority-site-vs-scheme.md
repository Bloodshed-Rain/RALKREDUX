---
name: signer-authority-site-vs-scheme
description: Ruling that signers on a work-record entry do not have to be SPRAT/IRATA certified — site-authorised witnesses (safety officer, shift super, site manager) are a legitimate third category.
metadata:
  type: project
---

A logbook signature attests to **work performed**, not to scheme competence. Scheme certification is the assessor's job at re-cert. Both SPRAT and IRATA logbooks have historically accepted site-side signoffs, especially in the L3-is-the-technician case (solo techs, remote L3 oversight, small teams).

**Ruling:** `CertScheme` should be `'sprat' | 'irata' | 'site'`. Cert number remains required for `'sprat'` and `'irata'` (the `0a42003` change was correct for those two — just over-applied). For `'site'`, capture name + role/title + employer; cert number is N/A.

**Why:**
- Field reality: on many jobs the only available witness is the site's responsible person, not a rope-access L3.
- Auditors accept non-scheme signers as long as the signature row makes the authority basis explicit (role + employer) and unambiguously distinguishes site-authorised from scheme-authorised.
- The opposite extreme — empty cert numbers on a "SPRAT" signature — is worse: it looks like a missing field instead of a different authority basis.

**How to apply:**
- When advising on signature-table fields, signer pickers, verifier portal copy, or audit-export formatting: the three-way distinction (SPRAT / IRATA / site-authorised) is canonical.
- Watch for `site` becoming a lazy default. Defaults should follow the tech's profile scheme and the address-book lookup; `site` should be an explicit choice.
- Helper copy near the picker must not claim SPRAT/IRATA acceptance — see [[compliance-language-watchlist]]. Say "meets audit expectations for site-authorised witness" or similar.
- Signature row in audit export must print scheme-appropriate signer line: "SPRAT L3 #12345" vs "Site-authorised: Site Safety Officer, AcmeRefinery Ltd".

**Hash version impact:** None. Signer identity/role is signature metadata, not entry attestation. The entry hash covers *what was done*; signature covers *who witnessed it*. See [[hash-version-bump-candidates]] — site-authorised signer fields do NOT belong on that list.

**Related prior ruling that this supersedes in scope:** [[cert-required-gate-supervisor-not-tech]] correctly said the gate is governed by supervisor scheme, not tech's IRATA level. This ruling extends that: when supervisor scheme is `site`, the cert-number gate doesn't apply at all.

**Verifier portal copy:** the request-signature form's Role placeholder should be agnostic — "e.g. IRATA L3, SPRAT L3, or site safety officer" — not "IRATA L3 / Rope access manager" which presupposes rope-access certification.
