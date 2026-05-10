import {
  EntryDetail,
  LogbookExportBundle,
  LogbookExportEntry,
  LogbookExportPacket,
  SupervisorContact,
} from './types';
import { Profile } from '../profile/types';
import { formatDate, formatDateOrDash, formatDateRange } from '../date-format';

interface BuildLogbookExportInput {
  profile: Profile | null;
  entries: LogbookExportEntry[];
  supervisors?: SupervisorContact[];
  exportedAt?: string;
}

interface BuildEntryExportInput {
  profile: Profile | null;
  detail: EntryDetail;
  exportedAt?: string;
}

const CSV_HEADERS = [
  'status',
  'date_from',
  'date_to',
  'employer',
  'site',
  'client',
  'work_task',
  'access_method',
  'structure_type',
  'work_hours',
  'max_height',
  'height_unit',
  'supervisor_name',
  'supervisor_cert_number',
  'signed_at',
  'entry_hash',
  'hash_version',
  'chain_hash',
  'gear',
  'attachment_count',
  'amends_entry_id',
];

function nowIso(): string {
  return new Date().toISOString();
}

function csvCell(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? '' : String(value);
  if (!/[",\r\n]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
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

function displayDate(value: string | null | undefined): string {
  return formatDateOrDash(value);
}

function row(label: string, value: string | number | null | undefined): string {
  return `<tr><th>${html(label)}</th><td>${display(value)}</td></tr>`;
}

function filenamePart(value: string | null | undefined): string {
  return (value || 'entry')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'entry';
}

function signatureMarkup(signaturePath: string | null): string {
  if (!signaturePath) return '<div class="muted">No drawn signature path stored.</div>';

  if (signaturePath.startsWith('data:image/')) {
    return `<img src="${html(signaturePath)}" alt="Drawn signature" />`;
  }

  return `<svg viewBox="0 0 1000 400" role="img" aria-label="Drawn signature"><line x1="48" x2="952" y1="324" y2="324" stroke="#CACCC5" stroke-width="3"/><path d="${html(signaturePath)}" fill="none" stroke="#222121" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"/></svg>`;
}

export function buildLogbookExportBundle({
  profile,
  entries,
  supervisors = [],
  exportedAt = nowIso(),
}: BuildLogbookExportInput): LogbookExportBundle {
  return {
    export_schema_version: 2,
    exported_at: exportedAt,
    app_flavor: 'ralb-codex-edition',
    profile,
    summary: {
      entry_count: entries.length,
      signed_entry_count: entries.filter(({ entry }) => entry.status === 'signed').length,
      amended_entry_count: entries.filter(({ entry }) => entry.status === 'amended').length,
      draft_entry_count: entries.filter(({ entry }) => entry.status === 'draft').length,
      signed_hours: entries
        .filter(({ entry }) => entry.status === 'signed')
        .reduce((total, { entry }) => total + entry.work_hours, 0),
    },
    supervisors,
    entries,
  };
}

export function buildEntryExportPacket({
  profile,
  detail,
  exportedAt = nowIso(),
}: BuildEntryExportInput): LogbookExportPacket {
  if (!detail.signature) throw new Error('entry_signature_missing');

  return {
    export_schema_version: 2,
    exported_at: exportedAt,
    app_flavor: 'ralb-codex-edition',
    profile,
    entry: detail.entry,
    signature: detail.signature,
    gear_usage: detail.gear_usage,
    attachments: detail.attachments,
    verification: {
      entry_hash: detail.signature.entry_hash,
      hash_version: detail.signature.hash_version,
      signature_method: detail.signature.method,
      signed_at: detail.signature.signed_at,
      attestation_accepted_at: detail.signature.attestation_accepted_at,
      previous_chain_hash: detail.signature.previous_chain_hash,
      chain_hash: detail.signature.chain_hash,
    },
    amendment: {
      status: detail.entry.status,
      amends_entry_id: detail.entry.amends_entry_id,
    },
  };
}

export function buildLogbookCsv(bundle: LogbookExportBundle): string {
  const rows = bundle.entries.map(({ entry, signature, gear_usage, attachments }) =>
    [
      entry.status,
      formatDate(entry.date_from),
      formatDate(entry.date_to),
      entry.employer,
      entry.site,
      entry.client,
      entry.work_task,
      entry.access_method,
      entry.structure_type,
      entry.work_hours,
      entry.max_height,
      entry.height_unit,
      signature?.supervisor_name,
      signature?.supervisor_cert_number,
      formatDate(signature?.signed_at),
      signature?.entry_hash,
      signature?.hash_version,
      signature?.chain_hash,
      gear_usage.map(({ gear }) => `${gear.name}${gear.serial_number ? ` (${gear.serial_number})` : ''}`).join('; '),
      attachments.length,
      entry.amends_entry_id,
    ].map(csvCell).join(','),
  );

  return [CSV_HEADERS.join(','), ...rows].join('\n');
}

export function buildEntryExportFileName(packet: LogbookExportPacket, extension: 'json' | 'pdf'): string {
  const date = packet.entry.date_from || packet.signature.signed_at.slice(0, 10);
  return `ralb-entry-${date}-${filenamePart(packet.entry.site)}.${extension}`;
}

export function buildEntryPdfHtml(packet: LogbookExportPacket): string {
  const { entry, profile, signature, verification } = packet;
  const dateLabel = formatDateRange(entry.date_from, entry.date_to);
  const signatureSvg = signatureMarkup(signature.signature_path);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>RALB Entry Audit Packet</title>
  <style>
    @page { margin: 32px; }
    * { box-sizing: border-box; }
    body { color: #222121; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 12px; line-height: 1.45; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    h2 { border-bottom: 1px solid #AEB3A9; font-size: 14px; margin: 22px 0 8px; padding-bottom: 5px; text-transform: uppercase; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #CACCC5; padding: 7px 5px; text-align: left; vertical-align: top; }
    th { color: #3C4556; font-weight: 600; width: 31%; }
    .meta { color: #3C4556; margin: 0 0 16px; }
    .status { color: #398F30; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .hash { background: #F7F8F4; border: 1px solid #AEB3A9; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; overflow-wrap: anywhere; padding: 10px; }
    .signature { border: 1px solid #AEB3A9; height: 150px; margin-top: 6px; width: 100%; }
    .signature img, .signature svg { height: 100%; object-fit: contain; width: 100%; }
    .muted { color: #3C4556; }
    ul { margin: 6px 0 0; padding-left: 18px; }
    li { margin-bottom: 4px; }
  </style>
</head>
<body>
  <header>
    <p class="status">${html(entry.status)}</p>
    <h1>${display(entry.site)}</h1>
    <p class="meta">RALB Codex Edition audit packet - exported ${html(formatDate(packet.exported_at))}</p>
  </header>

  <h2>Technician</h2>
  <table>
    ${row('Name', profile?.full_name)}
    ${row('Primary scheme', profile?.primary_scheme?.toUpperCase())}
    ${row('SPRAT ID', profile?.sprat_id)}
    ${row('SPRAT level', profile?.sprat_level)}
    ${row('IRATA ID', profile?.irata_id)}
    ${row('IRATA level', profile?.irata_level)}
  </table>

  <h2>Work Record</h2>
  <table>
    ${row('Date', dateLabel)}
    ${row('Employer', entry.employer)}
    ${row('Client', entry.client)}
    ${row('Work task', entry.work_task)}
    ${row('Access method', entry.access_method)}
    ${row('Structure type', entry.structure_type)}
    ${row('Rope access hours', entry.work_hours.toFixed(1))}
    ${row('Maximum height', !entry.max_height || entry.max_height <= 0 ? null : `${entry.max_height} ${entry.height_unit}`)}
    ${row('Description', entry.description)}
    ${row('Amends entry', entry.amends_entry_id)}
  </table>

  <h2>Supervisor Signature</h2>
  <table>
    ${row('Supervisor', signature.supervisor_name)}
    ${row('Certification number', signature.supervisor_cert_number)}
    ${row('Method', signature.method)}
    ${row('Signed at', displayDate(signature.signed_at))}
    ${row('Attestation', signature.signer_attestation)}
  </table>
  <div class="signature">${signatureSvg}</div>

  <h2>Verification</h2>
  <table>
    ${row('Hash version', verification.hash_version)}
    ${row('Signature method', verification.signature_method)}
    ${row('Attestation accepted at', displayDate(verification.attestation_accepted_at))}
    ${row('Previous chain hash', verification.previous_chain_hash)}
    ${row('Chain hash', verification.chain_hash)}
  </table>
  <p class="hash">${html(verification.entry_hash)}</p>

  <h2>Gear Used</h2>
  ${
    packet.gear_usage.length
      ? `<ul>${packet.gear_usage.map(({ gear, usage }) =>
        `<li>${html(gear.name)} - ${html(gear.category)}${gear.serial_number ? ` - ${html(gear.serial_number)}` : ''}${usage.role ? ` - ${html(usage.role)}` : ''}</li>`,
      ).join('')}</ul>`
      : '<p class="muted">No gear was attached to this entry.</p>'
  }

  <h2>Evidence Attachments</h2>
  ${
    packet.attachments.length
      ? `<ul>${packet.attachments.map((attachment) =>
        `<li>${html(attachment.label)} - ${html(attachment.uri)}${attachment.notes ? ` - ${html(attachment.notes)}` : ''}</li>`,
      ).join('')}</ul>`
      : '<p class="muted">No evidence attachments were added.</p>'
  }
</body>
</html>`;
}
