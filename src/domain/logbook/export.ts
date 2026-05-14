import {
  EntryDetail,
  EntrySignature,
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

function coverWeaveSvg(): string {
  return `<svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <pattern id="ralb-cover-weave" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <line x1="-2" y1="22" x2="22" y2="-2" stroke="#0e3a40" stroke-width="0.5" opacity="0.18"/>
      <line x1="-2" y1="-2" x2="22" y2="22" stroke="#0e3a40" stroke-width="0.5" opacity="0.18"/>
      <circle cx="10" cy="10" r="0.7" fill="#0e3a40" opacity="0.42"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="100%" height="100%" fill="url(#ralb-cover-weave)"/>
</svg>`;
}

function coverWatermarkSealSvg(): string {
  return `<svg viewBox="0 0 200 200" width="220" height="220" aria-hidden="true">
  <g opacity="0.18">
    <circle cx="100" cy="100" r="90" fill="none" stroke="#0e3a40" stroke-width="1.5"/>
    <circle cx="100" cy="100" r="80" fill="none" stroke="#0e3a40" stroke-width="0.8"/>
    <circle cx="100" cy="100" r="62" fill="none" stroke="#0e3a40" stroke-width="0.5"/>
    <defs>
      <path id="ralb-cover-seal-arc" d="M 100 100 m -78 0 a 78 78 0 1 1 156 0 a 78 78 0 1 1 -156 0"/>
    </defs>
    <text font-family="ui-monospace, SFMono-Regular, Consolas, monospace" font-size="9" fill="#0e3a40" letter-spacing="5">
      <textPath href="#ralb-cover-seal-arc">ROPE ACCESS LOGBOOK · CODEX EDITION · ROPE ACCESS LOGBOOK · CODEX EDITION · </textPath>
    </text>
    <text x="100" y="110" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="32" fill="#0e3a40" letter-spacing="2">RALB</text>
    <line x1="55" y1="118" x2="145" y2="118" stroke="#0e3a40" stroke-width="1"/>
    <text x="100" y="130" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Consolas, monospace" font-size="7" fill="#0e3a40" letter-spacing="2">CODEX EDITION</text>
    <line x1="100" y1="2" x2="100" y2="12" stroke="#0e3a40" stroke-width="1.5"/>
    <line x1="100" y1="2" x2="100" y2="12" stroke="#0e3a40" stroke-width="1.5" transform="rotate(90 100 100)"/>
    <line x1="100" y1="2" x2="100" y2="12" stroke="#0e3a40" stroke-width="1.5" transform="rotate(180 100 100)"/>
    <line x1="100" y1="2" x2="100" y2="12" stroke="#0e3a40" stroke-width="1.5" transform="rotate(270 100 100)"/>
  </g>
</svg>`;
}

function truncateHashForCover(value: string | null): string {
  if (!value) return '—';
  if (value.length <= 24) return value;
  return `${value.slice(0, 14)}…${value.slice(-8)}`;
}

function coverStatusLabel(status: string): string {
  return status.toUpperCase();
}

function coverStatusColor(status: string): string {
  if (status === 'amended') return '#0e3a40';
  if (status === 'signed') return '#2c7256';
  return '#d4a514';
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

export function buildLogbookExportFileName(
  bundle: LogbookExportBundle,
  extension: 'json' | 'pdf',
): string {
  const date = (bundle.exported_at || nowIso()).slice(0, 10);
  return `ralb-logbook-${date}-${filenamePart(bundle.profile?.full_name)}.${extension}`;
}

// One compact record block in the full-logbook PDF. Lighter than the per-entry
// audit packet — no full-bleed signature image — but carries the same hashes
// so the chain is auditable end to end.
function buildLogbookEntrySection(item: LogbookExportEntry, n: number): string {
  const { entry, signature, gear_usage, attachments } = item;
  const dateLabel = formatDateRange(entry.date_from, entry.date_to);
  const statusColor = coverStatusColor(entry.status);
  const gearLabel = gear_usage.length
    ? gear_usage
      .map(({ gear }) => `${gear.name}${gear.serial_number ? ` (${gear.serial_number})` : ''}`)
      .join(', ')
    : null;

  return `<section class="entry">
    <div class="entry-head">
      <span class="entry-n">No. ${n}</span>
      <span class="entry-status" style="color:${statusColor}">${html(coverStatusLabel(entry.status))}</span>
    </div>
    <h2 class="entry-title">${display(entry.site)}</h2>
    <p class="entry-dateline">${html(dateLabel)}</p>
    <table>
      ${row('Employer', entry.employer)}
      ${row('Client', entry.client)}
      ${row('Work task', entry.work_task)}
      ${row('Access method', entry.access_method)}
      ${row('Structure type', entry.structure_type)}
      ${row('Rope access hours', entry.work_hours.toFixed(1))}
      ${row('Maximum height', !entry.max_height || entry.max_height <= 0 ? null : `${entry.max_height} ${entry.height_unit}`)}
      ${row('Description', entry.description)}
      ${entry.amends_entry_id ? row('Amends entry', entry.amends_entry_id) : ''}
      ${row('Supervisor', signature?.supervisor_name)}
      ${row('Certification number', signature?.supervisor_cert_number)}
      ${row('Signed at', signature ? displayDate(signature.signed_at) : null)}
      ${row('Signature method', signature?.method)}
      ${row('Entry hash', signature?.entry_hash)}
      ${row('Chain hash', signature?.chain_hash)}
      ${row('Gear used', gearLabel)}
      ${row('Evidence files', attachments.length || null)}
    </table>
  </section>`;
}

export function buildLogbookPdfHtml(bundle: LogbookExportBundle): string {
  const { profile, summary, entries } = bundle;
  const operatorLine = [
    profile?.full_name,
    profile?.primary_scheme ? profile.primary_scheme.toUpperCase() : null,
    profile?.primary_scheme === 'sprat' ? profile?.sprat_level : profile?.irata_level,
  ]
    .filter(Boolean)
    .join(' · ');
  const operatorCert =
    (profile?.primary_scheme === 'sprat' ? profile?.sprat_id : profile?.irata_id) ?? null;

  const firstDate = entries[0]?.entry.date_from ?? null;
  const lastDate = entries.length ? entries[entries.length - 1].entry.date_to : null;
  const spanLabel = firstDate && lastDate ? formatDateRange(firstDate, lastDate) : '—';

  // Latest chain hash = chain_hash of the most recently signed record on file.
  const latestSigned = entries
    .map(({ signature }) => signature)
    .filter((s): s is EntrySignature => Boolean(s))
    .sort((a, b) => a.signed_at.localeCompare(b.signed_at))
    .pop();
  const chainHash = latestSigned?.chain_hash ?? null;

  const entrySections = entries.length
    ? entries.map((item, index) => buildLogbookEntrySection(item, index + 1)).join('\n')
    : '<p class="muted">No signed or amended records on file.</p>';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>RALB Audit Logbook</title>
  <style>
    @page { margin: 32px; }
    * { box-sizing: border-box; }
    body { color: #222121; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 12px; line-height: 1.45; }
    h2 { font-size: 14px; margin: 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #CACCC5; padding: 6px 5px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
    th { color: #3C4556; font-weight: 600; width: 31%; }
    .muted { color: #3C4556; }
    .cover { position: relative; page-break-after: always; height: 100vh; padding: 36px 28px; display: flex; flex-direction: column; justify-content: space-between; }
    .cover-weave { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
    .cover-seal { position: absolute; inset: 0; z-index: 1; display: flex; align-items: center; justify-content: center; pointer-events: none; }
    .cover-content { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 22px; }
    .cover-brand { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; letter-spacing: 2.2px; color: #0e3a40; text-transform: uppercase; }
    .cover-title { color: #0e3a40; font-size: 30px; line-height: 1.15; margin: 0; font-weight: 900; letter-spacing: -0.3px; }
    .cover-dateline { color: #3c4556; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; }
    .cover-meta { display: grid; grid-template-columns: 130px 1fr; row-gap: 6px; column-gap: 14px; }
    .cover-meta dt { color: #3c4556; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; margin: 0; }
    .cover-meta dd { color: #0e3a40; font-size: 12px; margin: 0; }
    .cover-meta dd.mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; word-break: break-all; }
    .cover-footer { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 9.5px; letter-spacing: 1.5px; color: #3c4556; text-transform: uppercase; }
    .cover-footer-line { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .ledger-head { border-bottom: 1px solid #AEB3A9; font-size: 14px; margin: 0 0 14px; padding-bottom: 5px; text-transform: uppercase; }
    .entry { page-break-inside: avoid; margin: 0 0 20px; padding: 0 0 14px; border-bottom: 2px solid #AEB3A9; }
    .entry:last-child { border-bottom: none; }
    .entry-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .entry-n { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; letter-spacing: 1.5px; color: #3c4556; text-transform: uppercase; }
    .entry-status { display: inline-block; padding: 2px 8px; border: 2px solid currentColor; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 9.5px; letter-spacing: 1.6px; font-weight: 700; text-transform: uppercase; }
    .entry-title { color: #0e3a40; font-size: 17px; margin: 6px 0 2px; font-weight: 900; }
    .entry-dateline { color: #3c4556; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; margin: 0 0 8px; }
  </style>
</head>
<body>
  <section class="cover">
    <div class="cover-weave">${coverWeaveSvg()}</div>
    <div class="cover-seal">${coverWatermarkSealSvg()}</div>
    <div class="cover-content">
      <div class="cover-brand">Rope Access Logbook · Codex Edition</div>
      <div>
        <h1 class="cover-title">Audit Logbook</h1>
        <p class="cover-dateline">${html(spanLabel)}</p>
      </div>
      <dl class="cover-meta">
        <dt>Operator</dt><dd>${display(operatorLine || profile?.full_name)}</dd>
        ${operatorCert ? `<dt>Cert</dt><dd class="mono">${display(operatorCert)}</dd>` : ''}
        <dt>Records on file</dt><dd class="mono">${html(summary.entry_count)}</dd>
        <dt>Signed</dt><dd class="mono">${html(summary.signed_entry_count)}</dd>
        <dt>Amended</dt><dd class="mono">${html(summary.amended_entry_count)}</dd>
        <dt>Signed hours</dt><dd class="mono">${html(summary.signed_hours.toFixed(1))}</dd>
        <dt>Latest chain hash</dt><dd class="mono">${html(truncateHashForCover(chainHash))}</dd>
      </dl>
    </div>
    <div class="cover-footer">
      <div class="cover-footer-line">
        <span>Audit logbook exported ${html(formatDate(bundle.exported_at))}</span>
        <span>${html(truncateHashForCover(chainHash))}</span>
      </div>
    </div>
  </section>

  <h2 class="ledger-head">Record Ledger — ${html(summary.entry_count)} ${summary.entry_count === 1 ? 'Entry' : 'Entries'}</h2>
  ${entrySections}
</body>
</html>`;
}

export function buildEntryPdfHtml(packet: LogbookExportPacket): string {
  const { entry, profile, signature, verification } = packet;
  const dateLabel = formatDateRange(entry.date_from, entry.date_to);
  const signatureSvg = signatureMarkup(signature.signature_path);
  const operatorLine = [
    profile?.full_name,
    profile?.primary_scheme ? profile.primary_scheme.toUpperCase() : null,
    profile?.primary_scheme === 'sprat' ? profile?.sprat_level : profile?.irata_level,
  ]
    .filter(Boolean)
    .join(' · ');
  const operatorCert =
    (profile?.primary_scheme === 'sprat' ? profile?.sprat_id : profile?.irata_id) ?? null;
  const statusColor = coverStatusColor(entry.status);

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
    .cover { position: relative; page-break-after: always; height: 100vh; padding: 36px 28px; display: flex; flex-direction: column; justify-content: space-between; }
    .cover-weave { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
    .cover-seal { position: absolute; inset: 0; z-index: 1; display: flex; align-items: center; justify-content: center; pointer-events: none; }
    .cover-content { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 22px; }
    .cover-brand { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; letter-spacing: 2.2px; color: #0e3a40; text-transform: uppercase; }
    .cover-title { color: #0e3a40; font-size: 30px; line-height: 1.15; margin: 0; font-weight: 900; letter-spacing: -0.3px; }
    .cover-dateline { color: #3c4556; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; }
    .cover-status { display: inline-block; padding: 4px 10px; border: 2px solid currentColor; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11px; letter-spacing: 2px; font-weight: 700; text-transform: uppercase; }
    .cover-meta { display: grid; grid-template-columns: 110px 1fr; row-gap: 6px; column-gap: 14px; }
    .cover-meta dt { color: #3c4556; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; margin: 0; }
    .cover-meta dd { color: #0e3a40; font-size: 12px; margin: 0; }
    .cover-meta dd.mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; word-break: break-all; }
    .cover-footer { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 9.5px; letter-spacing: 1.5px; color: #3c4556; text-transform: uppercase; }
    .cover-footer-line { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  </style>
</head>
<body>
  <section class="cover">
    <div class="cover-weave">${coverWeaveSvg()}</div>
    <div class="cover-seal">${coverWatermarkSealSvg()}</div>
    <div class="cover-content">
      <div class="cover-brand">Rope Access Logbook · Codex Edition</div>
      <div>
        <h1 class="cover-title">${display(entry.site)}</h1>
        <p class="cover-dateline">${html(dateLabel)} · ${html(coverStatusLabel(entry.status))}</p>
      </div>
      <div>
        <span class="cover-status" style="color:${statusColor}">${html(coverStatusLabel(entry.status))}</span>
      </div>
      <dl class="cover-meta">
        <dt>Operator</dt><dd>${display(operatorLine || profile?.full_name)}</dd>
        ${operatorCert ? `<dt>Cert</dt><dd class="mono">${display(operatorCert)}</dd>` : ''}
        <dt>Employer</dt><dd>${display(entry.employer)}</dd>
        <dt>Client</dt><dd>${display(entry.client)}</dd>
        <dt>Hours</dt><dd class="mono">${html(entry.work_hours.toFixed(1))}</dd>
        <dt>Signed by</dt><dd>${display(signature.supervisor_name)}</dd>
        <dt>Method</dt><dd>${html(coverStatusLabel(signature.method))}</dd>
        <dt>Entry hash</dt><dd class="mono">${html(truncateHashForCover(verification.entry_hash))}</dd>
        <dt>Chain hash</dt><dd class="mono">${html(truncateHashForCover(verification.chain_hash))}</dd>
      </dl>
    </div>
    <div class="cover-footer">
      <div class="cover-footer-line">
        <span>Audit packet exported ${html(formatDate(packet.exported_at))}</span>
        <span>${html(truncateHashForCover(verification.entry_hash))}</span>
      </div>
    </div>
  </section>

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
