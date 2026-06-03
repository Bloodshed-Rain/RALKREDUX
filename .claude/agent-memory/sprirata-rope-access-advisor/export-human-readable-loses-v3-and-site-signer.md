---
name: export-human-readable-loses-v3-and-site-signer
description: PDF and CSV audit exports omit the v3 attestation fields (entry_kind/hazards/rescue_cover) and the site-signer authority basis (scheme/role/employer); JSON is complete
metadata:
  type: project
---

Ruling logged 2026-05-28 reviewing `app/export.tsx` + `src/domain/logbook/export.ts`.

The audit export has three formats. **JSON is complete** — `app/export.tsx` (~line 173) does a raw `JSON.stringify(sanitizedBundle)`, and the bundle carries full `LogbookEntry` (has entry_kind/hazards/rescue_cover) and full `EntrySignature` (has supervisor_scheme/supervisor_role/supervisor_employer). But the **human-readable artifacts an auditor actually reads — PDF and CSV — are lossy**:

1. `buildLogbookEntrySection` (export.ts ~284) and `buildLogbookCsv` CSV_HEADERS (export.ts ~25-47) render NONE of entry_kind / hazards / rescue_cover. These are the exact v3 hash-bumped, signer-attested fields. Worse, hours are unconditionally labelled "Rope access hours" (export.ts ~284, and ~509 in `buildEntryPdfHtml`) even for a training/assessment/rescue_drill entry — actively wrong, not just missing. Defeats the hours-bucket-breakdown purpose: an assessor scanning the PDF for *work* hours cannot separate them.
   - Note: `work_task` does NOT substitute for `entry_kind` — orthogonal axes (see [[work-task-taxonomy-and-custom-entry]]). Preempt the "work_task covers it" rebuttal.
2. The PDF/CSV print "Supervisor" + "Certification number" unconditionally and never print supervisor_scheme/role/employer. For a `site` signer this shows a blank cert cell that "looks like a missing field instead of a different authority basis" — exactly what [[signer-authority-site-vs-scheme]] says the export must avoid. This is a RENDER gap, not a data gap (the bundle carries the fields).
3. Same gaps exist in `buildEntryPdfHtml` (per-entry packet, export.ts ~509/515-522) but that's the entry-detail screen's surface, not export.tsx. Secondary evidence only.

Live-UI echo of #1: export.tsx PreviewCard `signedHours` (export.tsx ~117-120) sums all signed work_hours regardless of entry_kind and labels it "signed hrs" — same conflation surfacing on screen. P2.

**Severity:** P1, code-certain. Not P0 — data exists in DB + JSON, just doesn't reach the human-readable artifact.

**Hash impact:** None — this is presentation, not entry attestation. Do NOT bump ENTRY_HASH_VERSION for fixing export rendering.

**more.tsx is clean for the compliance lens.** The restore→chain-continuity warning is present (more.tsx ~775-780) — satisfies [[restore-vs-chain-continuity]], not a finding. No SPRAT/IRATA acceptance copy in either scoped file.
