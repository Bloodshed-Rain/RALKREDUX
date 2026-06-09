// NDT export builders. PURE: take data in, return row objects / an HTML
// fragment. No DbClient, no expo-sqlite, no hashing, no I/O — so they are
// trivially unit-testable and the caller owns the data fetch.
//
// COMPLIANCE: this is a SEPARATE, self-maintained NDT section. NDT hours and
// method totals are NEVER summed into rope-access work_hours — the builders
// receive ONLY NDT data and emit ONLY NDT totals; there is no rope figure to
// add. Labels stay neutral: never "qualified / eligible / requirement met /
// certified / accepted". Scheme names appear only as data values, never as a
// claim that a requirement is met.

import type { NdtInspection, NdtInspectionStatus, NdtSignature } from './types';

const NDT_SECTION_LABEL = 'NDT experience (self-maintained)';
const NDT_SECTION_DISCLAIMER = 'Self-logged NDT experience, pending verification by the NDT Level III.';

// Map every inspection status (draft|logged|pending|verified|amended) to a
// neutral state label. `amended` is a superseded verified record — still a
// verified attestation — so it reads as "Verified". No status falls through to
// undefined.
const VERIFICATION_STATE_LABEL: Record<NdtInspectionStatus, string> = {
  draft: 'Draft',
  logged: 'Self-logged',
  pending: 'Pending verification',
  verified: 'Verified',
  amended: 'Verified',
};

export function ndtVerificationStateLabel(status: NdtInspectionStatus): string {
  return VERIFICATION_STATE_LABEL[status] ?? 'Draft';
}

export interface NdtCsvRow {
  date_from: string;
  date_to: string;
  method: string;
  technique: string;
  ndt_level: string;
  supervised: string;
  hours: number;
  site: string;
  client: string;
  employer: string;
  procedure_ref: string;
  component: string;
  scheme: string;
  verification_state: string;
  verifier_name: string;
  verifier_cert: string;
  verifier_level: string;
  verifier_scheme: string;
  signed_at: string;
  inspection_hash: string;
  chain_hash: string;
}

// Column order for a flat CSV. Caller can join these in order.
export const NDT_CSV_HEADERS: Array<keyof NdtCsvRow> = [
  'date_from',
  'date_to',
  'method',
  'technique',
  'ndt_level',
  'supervised',
  'hours',
  'site',
  'client',
  'employer',
  'procedure_ref',
  'component',
  'scheme',
  'verification_state',
  'verifier_name',
  'verifier_cert',
  'verifier_level',
  'verifier_scheme',
  'signed_at',
  'inspection_hash',
  'chain_hash',
];

function nullToEmpty(value: string | null | undefined): string {
  return value ?? '';
}

// Build structured CSV rows. verifier_* are populated ONLY when a matching
// signature exists for the inspection.
export function buildNdtCsvRows(
  inspections: NdtInspection[],
  signaturesById: Record<string, NdtSignature> = {},
): NdtCsvRow[] {
  return inspections.map((insp) => {
    const sig = signaturesById[insp.id] ?? null;
    return {
      date_from: insp.date_from,
      date_to: insp.date_to,
      method: insp.method,
      technique: nullToEmpty(insp.technique),
      ndt_level: nullToEmpty(insp.ndt_level_snapshot),
      supervised: insp.supervised,
      hours: insp.hours,
      site: insp.site,
      client: nullToEmpty(insp.client),
      employer: nullToEmpty(insp.employer),
      procedure_ref: nullToEmpty(insp.procedure_ref),
      component: nullToEmpty(insp.component),
      scheme: nullToEmpty(insp.ndt_scheme),
      verification_state: ndtVerificationStateLabel(insp.status),
      verifier_name: sig ? sig.verifier_name : '',
      verifier_cert: sig ? sig.verifier_cert_number : '',
      verifier_level: sig ? nullToEmpty(sig.verifier_level) : '',
      verifier_scheme: sig ? nullToEmpty(sig.verifier_scheme) : '',
      signed_at: sig ? sig.signed_at : '',
      inspection_hash: sig ? sig.inspection_hash : '',
      chain_hash: sig ? nullToEmpty(sig.chain_hash) : '',
    };
  });
}

// Neutralize spreadsheet formula injection (CSV injection): a cell beginning
// with = + - @ or a control char is evaluated as a formula by Excel/Sheets.
// Mirrors the private csvCell in logbook/export.ts (can't import it).
function csvCell(value: string | number | null | undefined): string {
  let raw = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(raw)) raw = `'${raw}`;
  if (!/[",\r\n]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

// Serialize the NDT rows to a CSV block (header + rows). Returned as its OWN
// block so the caller can clearly delimit it from the rope-access CSV — never
// interleaved with rope rows.
export function buildNdtCsv(
  inspections: NdtInspection[],
  signaturesById: Record<string, NdtSignature> = {},
): string {
  const rows = buildNdtCsvRows(inspections, signaturesById);
  const header = NDT_CSV_HEADERS.map((h) => csvCell(`ndt_${h}`)).join(',');
  const body = rows.map((r) => NDT_CSV_HEADERS.map((h) => csvCell(r[h])).join(','));
  return [header, ...body].join('\n');
}

function html(value: string | number | null | undefined): string {
  return value === null || value === undefined
    ? ''
    : String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
}

function display(value: string | number | null | undefined): string {
  const escaped = html(value);
  return escaped || '-';
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}

// Build the NDT PDF section as an HTML FRAGMENT (not a full document). The
// caller injects it before the rope-access document's </body>. Hours are
// totalled PER METHOD and as an NDT-only grand total — there is no rope figure
// in scope, so nothing can be summed across the boundary.
export function buildNdtPdfHtml(
  inspections: NdtInspection[],
  signaturesById: Record<string, NdtSignature> = {},
): string {
  // Per-method totals over the NDT inspections only. Inclusion matches the
  // in-app getSummary: count `logged`/`pending`/`verified` (accrued) hours and
  // EXCLUDE `draft` and `amended`. Excluding `amended` is what prevents an
  // amendment pair (original `amended` + correction `verified`, both carrying
  // the same hours) from double-counting one corrected job. Excluded records
  // are still LISTED below for provenance — just not summed.
  const ACCRUED: ReadonlySet<NdtInspectionStatus> = new Set(['logged', 'pending', 'verified']);
  const byMethod = new Map<string, number>();
  let ndtTotalHours = 0;
  for (const insp of inspections) {
    if (!ACCRUED.has(insp.status)) continue;
    byMethod.set(insp.method, (byMethod.get(insp.method) ?? 0) + insp.hours);
    ndtTotalHours += insp.hours;
  }
  ndtTotalHours = round2(ndtTotalHours);

  const methodRows = [...byMethod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([method, hours]) =>
        `<tr><th>${html(method)}</th><td>${html(round2(hours))} h</td></tr>`,
    )
    .join('');

  const recordRows = inspections.length
    ? inspections
      .map((insp) => {
        const sig = signaturesById[insp.id] ?? null;
        const verifier = sig
          ? `${html(sig.verifier_name)}${sig.verifier_cert_number ? ` · ${html(sig.verifier_cert_number)}` : ''}`
          : '-';
        return `<tr>
            <td>${display(insp.date_from)}</td>
            <td>${display(insp.method)}</td>
            <td>${display(insp.technique)}</td>
            <td>${display(insp.ndt_level_snapshot)}</td>
            <td>${display(insp.supervised)}</td>
            <td>${html(round2(insp.hours))}</td>
            <td>${display(insp.site)}</td>
            <td>${display(insp.procedure_ref)}</td>
            <td>${display(insp.ndt_scheme)}</td>
            <td>${html(ndtVerificationStateLabel(insp.status))}</td>
            <td>${verifier}</td>
          </tr>`;
      })
      .join('')
    : `<tr><td colspan="11" class="ndt-muted">No NDT experience on file.</td></tr>`;

  return `<section class="ndt-section">
    <h2 class="ndt-head">${html(NDT_SECTION_LABEL)}</h2>
    <p class="ndt-note">${html(NDT_SECTION_DISCLAIMER)} These figures are kept separate from rope-access totals and are not summed with rope-access hours.</p>
    <h3 class="ndt-subhead">NDT hours by method</h3>
    <table class="ndt-totals">
      ${methodRows || `<tr><td class="ndt-muted">No NDT hours logged.</td></tr>`}
      <tr class="ndt-grand"><th>NDT total</th><td>${html(ndtTotalHours)} h</td></tr>
    </table>
    <h3 class="ndt-subhead">NDT records</h3>
    <table class="ndt-records">
      <tr>
        <th>Date</th><th>Method</th><th>Technique</th><th>Level</th><th>Supervision</th>
        <th>Hours</th><th>Site</th><th>Procedure</th><th>Scheme</th><th>State</th><th>Verifier</th>
      </tr>
      ${recordRows}
    </table>
  </section>`;
}
