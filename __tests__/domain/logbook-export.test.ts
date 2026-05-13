import {
  buildEntryExportFileName,
  buildEntryExportPacket,
  buildEntryPdfHtml,
  buildLogbookCsv,
  buildLogbookExportBundle,
} from '@/src/domain/logbook/export';
import { EntryDetail, EntrySignature, LogbookEntry } from '@/src/domain/logbook/types';
import { Profile } from '@/src/domain/profile/types';

const profile: Profile = {
  id: 'profile_1',
  full_name: 'Mina Carter',
  primary_scheme: 'sprat',
  sprat_id: 'S-12345',
  sprat_level: 'III',
  sprat_expires_on: '2027-05-08',
  irata_id: null,
  irata_level: null,
  irata_expires_on: null,
  created_at: '2026-05-08T00:00:00.000Z',
  updated_at: '2026-05-08T00:00:00.000Z',
};

const entry: LogbookEntry = {
  id: 'entry_1',
  date_from: '2026-05-01',
  date_to: '2026-05-01',
  employer: 'Northwind Rope',
  site: 'Tower A, North Face',
  client: 'City Works',
  description: 'Inspected anchors.',
  work_hours: 8,
  work_task: 'Inspection',
  access_method: 'Two-rope access',
  structure_type: 'Tower',
  max_height: 120,
  height_unit: 'ft',
  sprat_level_snapshot: 'III',
  irata_level_snapshot: null,
  status: 'signed',
  amends_entry_id: null,
  pending_signature_id: null,
  created_at: '2026-05-01T10:00:00.000Z',
  updated_at: '2026-05-08T10:00:00.000Z',
};

const signature: EntrySignature = {
  id: 'sig_1',
  entry_id: entry.id,
  supervisor_name: 'Jordan Lee',
  supervisor_cert_number: 'SPRAT-1234',
  signed_at: '2026-05-08T10:00:00.000Z',
  entry_hash: 'sha256:entry',
  hash_version: 2,
  method: 'local',
  remote_request_id: null,
  signer_attestation: 'Verified in person.',
  signature_path: 'M 100 200 L 300 160',
  attestation_accepted_at: '2026-05-08T10:00:00.000Z',
  previous_chain_hash: null,
  chain_hash: 'sha256:chain',
  created_at: '2026-05-08T10:00:00.000Z',
};

describe('logbook export builders', () => {
  it('builds a stable single-entry audit packet', () => {
    const detail: EntryDetail = {
      entry,
      signature,
      remote_request: null,
      gear_usage: [],
      attachments: [],
    };

    expect(
      buildEntryExportPacket({
        profile,
        detail,
        exportedAt: '2026-05-08T12:00:00.000Z',
      }),
    ).toEqual({
      export_schema_version: 2,
      exported_at: '2026-05-08T12:00:00.000Z',
      app_flavor: 'ralb-codex-edition',
      profile,
      entry,
      signature,
      gear_usage: [],
      attachments: [],
      verification: {
        entry_hash: 'sha256:entry',
        hash_version: 2,
        signature_method: 'local',
        signed_at: '2026-05-08T10:00:00.000Z',
        attestation_accepted_at: '2026-05-08T10:00:00.000Z',
        previous_chain_hash: null,
        chain_hash: 'sha256:chain',
      },
      amendment: {
        status: 'signed',
        amends_entry_id: null,
      },
    });
  });

  it('creates CSV rows with escaped reviewer-facing fields', () => {
    const bundle = buildLogbookExportBundle({
      profile,
      exportedAt: '2026-05-08T12:00:00.000Z',
      entries: [{ entry, signature, gear_usage: [], attachments: [] }],
    });

    expect(buildLogbookCsv(bundle).split('\n')).toEqual([
      'status,date_from,date_to,employer,site,client,work_task,access_method,structure_type,work_hours,max_height,height_unit,supervisor_name,supervisor_cert_number,signed_at,entry_hash,hash_version,chain_hash,gear,attachment_count,amends_entry_id',
      'signed,05/01/2026,05/01/2026,Northwind Rope,"Tower A, North Face",City Works,Inspection,Two-rope access,Tower,8,120,ft,Jordan Lee,SPRAT-1234,05/08/2026,sha256:entry,2,sha256:chain,,0,',
    ]);
  });

  it('builds printable HTML and deterministic PDF filenames', () => {
    const packet = buildEntryExportPacket({
      profile,
      detail: {
        entry: {
          ...entry,
          site: 'Tower <A> & "North"',
          description: 'Inspected <anchors> & edge protection.',
        },
        signature,
        remote_request: null,
        gear_usage: [],
        attachments: [],
      },
      exportedAt: '2026-05-08T12:00:00.000Z',
    });
    const markup = buildEntryPdfHtml(packet);

    expect(buildEntryExportFileName(packet, 'pdf')).toBe('ralb-entry-2026-05-01-tower-a-north.pdf');
    expect(markup).toContain('RALB Codex Edition audit packet');
    expect(markup).toContain('Tower &lt;A&gt; &amp; &quot;North&quot;');
    expect(markup).toContain('Inspected &lt;anchors&gt; &amp; edge protection.');
    expect(markup).toContain('sha256:entry');
  });

  it('renders a cover page with truthful chrome only', () => {
    const packet = buildEntryExportPacket({
      profile,
      detail: {
        entry,
        signature,
        remote_request: null,
        gear_usage: [],
        attachments: [],
      },
      exportedAt: '2026-05-08T12:00:00.000Z',
    });
    const markup = buildEntryPdfHtml(packet);

    // Cover is present and renders before the existing body sections.
    expect(markup).toContain('<section class="cover">');
    expect(markup.indexOf('<section class="cover">')).toBeLessThan(markup.indexOf('<header>'));

    // Truthful content lands on the cover.
    expect(markup).toContain('Tower A, North Face');
    expect(markup).toContain('Mina Carter');
    expect(markup).toContain('S-12345');
    expect(markup).toContain('Northwind Rope');
    expect(markup).toContain('City Works');
    expect(markup).toContain('Audit packet exported');
    expect(markup).toContain('ralb-cover-weave');
    expect(markup).toContain('ralb-cover-seal-arc');

    // Brand decoration must NOT leak into the auditor-facing PDF.
    expect(markup).not.toMatch(/FORM\s*27-A/i);
    expect(markup).not.toMatch(/\bREV\s*\d/i);
    expect(markup).not.toMatch(/\bEFF\s*\d{4}/i);
  });
});
