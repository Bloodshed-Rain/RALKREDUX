import { createTestClient } from '../setup';

describe('database migrations', () => {
  it('creates the migration ledger and applies all current migrations', async () => {
    const db = await createTestClient();
    const rows = await db.getAll<{ id: number; name: string }>(
      'SELECT id, name FROM schema_migrations ORDER BY id',
    );

    expect(rows).toEqual([
      { id: 1, name: 'core-local-logbook' },
      { id: 2, name: 'gear-and-cloud-placeholders' },
      { id: 3, name: 'signature-trust-state' },
      { id: 4, name: 'drawn-signatures-and-attestation' },
      { id: 5, name: 'remote-signature-requests' },
      { id: 6, name: 'scheme-work-log-fields' },
      { id: 7, name: 'gear-catalog' },
      { id: 8, name: 'field-ops-foundation' },
    ]);
  });

  it('creates the local-first core tables', async () => {
    const db = await createTestClient();
    const rows = await db.getAll<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    const names = rows.map((row) => row.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'profiles',
        'entries',
        'signatures',
        'remote_signature_requests',
        'gear_items',
        'gear_inspections',
        'gear_catalog',
        'entry_gear_usage',
        'entry_attachments',
        'entry_templates',
        'supervisors',
        'cloud_state',
        'schema_migrations',
      ]),
    );
  });

  it('adds signature trust metadata for local and remote signing', async () => {
    const db = await createTestClient();
    const columns = await db.getAll<{ name: string }>('PRAGMA table_info(signatures)');
    const names = columns.map((column) => column.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'method',
        'remote_request_id',
        'signer_attestation',
        'signature_path',
        'attestation_accepted_at',
        'previous_chain_hash',
        'chain_hash',
      ]),
    );
  });

  it('creates the remote signature request table', async () => {
    const db = await createTestClient();
    const columns = await db.getAll<{ name: string }>('PRAGMA table_info(remote_signature_requests)');
    const names = columns.map((column) => column.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'entry_id',
        'recipient_name',
        'recipient_contact',
        'verifier_role',
        'verifier_company',
        'status',
        'request_code',
        'entry_hash',
        'hash_version',
        'signing_token_hash',
        'token_hint',
        'viewed_at',
        'completed_at',
      ]),
    );
  });

  it('creates field operations support tables', async () => {
    const db = await createTestClient();
    const usageColumns = await db.getAll<{ name: string }>('PRAGMA table_info(entry_gear_usage)');
    const attachmentColumns = await db.getAll<{ name: string }>('PRAGMA table_info(entry_attachments)');
    const templateColumns = await db.getAll<{ name: string }>('PRAGMA table_info(entry_templates)');
    const supervisorColumns = await db.getAll<{ name: string }>('PRAGMA table_info(supervisors)');
    const templates = await db.getAll<{ name: string }>('SELECT name FROM entry_templates ORDER BY name');

    expect(usageColumns.map((column) => column.name)).toEqual(
      expect.arrayContaining(['entry_id', 'gear_id', 'role', 'created_at']),
    );
    expect(attachmentColumns.map((column) => column.name)).toEqual(
      expect.arrayContaining(['entry_id', 'label', 'uri', 'mime_type', 'notes']),
    );
    expect(templateColumns.map((column) => column.name)).toEqual(
      expect.arrayContaining(['name', 'work_task', 'access_method', 'last_used_at']),
    );
    expect(supervisorColumns.map((column) => column.name)).toEqual(
      expect.arrayContaining(['name', 'cert_number', 'contact', 'last_signed_at']),
    );
    expect(templates.map((template) => template.name)).toEqual(
      expect.arrayContaining(['Tower inspection', 'Bridge maintenance', 'Rescue standby']),
    );
  });

  it('adds scheme-specific work log fields to entries', async () => {
    const db = await createTestClient();
    const columns = await db.getAll<{ name: string }>('PRAGMA table_info(entries)');
    const names = columns.map((column) => column.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'work_task',
        'access_method',
        'structure_type',
        'max_height',
        'height_unit',
      ]),
    );
  });

  it('creates gear inventory and inspection columns', async () => {
    const db = await createTestClient();
    const gearColumns = await db.getAll<{ name: string }>('PRAGMA table_info(gear_items)');
    const inspectionColumns = await db.getAll<{ name: string }>('PRAGMA table_info(gear_inspections)');

    expect(gearColumns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        'name',
        'category',
        'manufacturer',
        'model',
        'serial_number',
        'next_inspection_due',
        'retired_at',
      ]),
    );
    expect(inspectionColumns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        'gear_id',
        'inspected_on',
        'result',
        'notes',
      ]),
    );
  });

  it('seeds the bundled gear catalog', async () => {
    const db = await createTestClient();
    const row = await db.get<{ count: number }>('SELECT COUNT(*) AS count FROM gear_catalog');
    const sample = await db.get<{ manufacturer: string; model: string; category: string }>(
      "SELECT manufacturer, model, category FROM gear_catalog WHERE manufacturer = 'Petzl' AND model LIKE '%Avao%' LIMIT 1",
    );

    expect(row?.count).toBeGreaterThan(700);
    expect(sample).toEqual(
      expect.objectContaining({
        manufacturer: 'Petzl',
        category: 'harness',
      }),
    );
  });
});
