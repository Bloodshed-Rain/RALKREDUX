# SPRAT / IRATA Compliance Roadmap

This rebuild must treat SPRAT and IRATA acceptance as a first-class product requirement, not as polish. The app may support compliant recordkeeping, but it must not claim official SPRAT or IRATA acceptance until written confirmation is obtained from the relevant body.

## Product Goal

Build a logbook flow that can produce audit-ready records for SPRAT-style experience documentation and IRATA-style logbook review, while preserving a clear distinction between:

- Local records used for technician backup and exports.
- Remote supervisor verification records.
- Official acceptance by SPRAT, IRATA, training companies, assessors, or regulators.

## Required Capabilities

- Certification-specific modes for SPRAT and IRATA.
- Required fields per scheme: date or period, employer, work task, access method, location or structure, rope-access hours, technician certification snapshot, and max height where required.
- Verifier identity: name, role, company, contact information, certification body, certification number, and relationship to the work.
- Drawn signature plus attestation for local signing.
- Remote signing with authenticated signer identity and tamper-evident signature records.
- Immutable signed entries with amendment records instead of editing signed rows.
- Canonical entry hashing with versioned hash fixtures.
- PDF export that mirrors scheme-required logbook fields.
- CSV/JSON export for employer backup and audit review.
- Backup/restore verification that proves signed records were not altered.
- Clear warnings that users must maintain official paper or official digital logbooks unless SPRAT/IRATA acceptance is confirmed.

## Implemented Foundation

- Draft entries now capture work task, access method, structure type, rope-access hours, maximum height, and height unit.
- Local signing and pending remote-signature requests are blocked when required work-log fields are incomplete.
- Signed-entry hashes include the scheme-oriented work-log fields through hash version 2.

## Acceptance Workstream

1. Build complete scheme-specific field coverage.
2. Add export packages for SPRAT and IRATA review.
3. Prepare sample records and tamper-evidence explanation.
4. Request written feedback from SPRAT and IRATA before any official acceptance claim.
5. Track feedback as implementation requirements.

## Priority

High. Do not ship public claims around certification validity, upgrade eligibility, or official logbook replacement until this workstream is complete.
