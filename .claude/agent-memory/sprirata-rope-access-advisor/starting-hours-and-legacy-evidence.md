---
name: starting-hours-and-legacy-evidence
description: Per-scheme self-declared starting hours (immutable, profile-scoped) and legacy paper-logbook scans as evidence-not-entries
metadata:
  type: feedback
---

Ruling given 2026-06-01 on "starting hours" (item 3) and "legacy paper logbook archive" (item 4).

**Starting hours — two independent counters, same shift can increment both.** For a single shift the field-work is the SAME work; a dual-cert tech claims those hours toward BOTH schemes independently (not two pools of different work). But career TOTALS legitimately diverge: different historical baselines + schemes count slightly different things. So model SPRAT and IRATA as independent counters, each with its own start/transition date. This also exposes an existing bug: aggregation today sums into ONE career total and ignores per-entry scheme snapshots — already wrong for dual-cert techs.

**Self-declared paper baseline IS accepted by assessors** when clearly marked self-declared + carried-forward, with prior logbook produceable. Never equal to attested in-app hours. Two hard requirements: (1) IMMUTABLE once set — to change, void-and-redeclare (new record pointing back, amendment pattern), never edit in place; a quietly-editable baseline is an audit red flag. (2) Attributable — declared_by, declared_at, scheme, optional witness/prior-supervisor name.

Default: profile-level `sprat_starting_hours` / `irata_starting_hours`, each with `as_of_date`, `declared_at`, `self_declared` flag. Career total per scheme = starting + sum of signed, scheme-countable, rope-access entries since as_of_date. **Profile data, NOT entries — NO hash bump.** In exports show as labeled "Carried forward (self-declared)" line, never folded silently into attested totals.

**Legacy paper scans = EVIDENCE, never ENTRIES.** No hash/signature/chain/entry-id; never rendered in the same list or visual language as signed entries. Live under Profile as segregated "Historical reference." Audit-useful metadata: date_from, date_to, scheme, hours_claimed, witness_name (as written in original), source/logbook identifier, uploaded_at. Without date-range + scheme + hours-claimed they can't reconcile against the starting balance. Exports: INCLUDE in a hard-walled "Historical Reference — Self-Declared, Unverified" appendix (assessor wants the backing), never in attested section, never summed into attested totals; disclaimer travels with the data into the export so a downstream PDF can't be screenshotted to imply signed records. New `legacy_logbook_evidence` table, profile-scoped, optionally linked to the matching starting-hours declaration. **No hash bump.**
