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
      { id: 9, name: 'entry-kind-and-rescue-context' },
      { id: 10, name: 'gear-inspector-identity' },
      { id: 11, name: 'gear-catalog-image-url' },
      { id: 12, name: 'site-signer-role-employer' },
      { id: 13, name: 'performance-indexes' },
      { id: 14, name: 'timezone-anchoring-and-photos' },
      { id: 15, name: 'profile-avatar' },
      { id: 16, name: 'profile-hours-baseline' },
      { id: 17, name: 'legacy-logbook-archives' },
    ]);
  });

  it('creates the legacy logbook archive tables (migration 17)', async () => {
    const db = await createTestClient();
    const archiveColumns = await db.getAll<{ name: string }>('PRAGMA table_info(logbook_archives)');
    expect(archiveColumns.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        'id',
        'label',
        'scheme',
        'date_from',
        'date_to',
        'hours_claimed',
        'witness_name',
        'notes',
      ]),
    );
    const photoColumns = await db.getAll<{ name: string }>('PRAGMA table_info(archive_photos)');
    expect(photoColumns.map((c) => c.name)).toEqual(
      expect.arrayContaining(['id', 'archive_id', 'uri', 'mime_type', 'sort_order']),
    );
  });

  it('adds the starting-hours baseline columns to profiles (migration 16)', async () => {
    const db = await createTestClient();
    const columns = await db.getAll<{ name: string }>('PRAGMA table_info(profiles)');
    expect(columns.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        'sprat_hours_baseline',
        'irata_hours_baseline',
        'hours_baseline_date',
        'hours_baseline_declared_at',
      ]),
    );
  });

  it('adds the optional avatar_uri column to profiles (migration 15)', async () => {
    const db = await createTestClient();
    const columns = await db.getAll<{ name: string }>('PRAGMA table_info(profiles)');
    expect(columns.map((c) => c.name)).toEqual(expect.arrayContaining(['avatar_uri']));
  });

  it('adds timezone anchoring and the entry photos table (migration 14)', async () => {
    const db = await createTestClient();
    const entryColumns = await db.getAll<{ name: string }>('PRAGMA table_info(entries)');
    expect(entryColumns.map((c) => c.name)).toEqual(
      expect.arrayContaining(['timezone_offset']),
    );

    const photoColumns = await db.getAll<{ name: string }>('PRAGMA table_info(entry_photos)');
    expect(photoColumns.map((c) => c.name)).toEqual(
      expect.arrayContaining(['id', 'entry_id', 'file_uri', 'created_at']),
    );
  });

  it('adds site-signer scheme/role/employer fields to signatures', async () => {
    const db = await createTestClient();
    const columns = await db.getAll<{ name: string; dflt_value: string | null }>(
      'PRAGMA table_info(signatures)',
    );
    const byName = new Map(columns.map((c) => [c.name, c]));
    expect(byName.get('supervisor_scheme')?.dflt_value).toBe("'sprat'");
    expect(byName.has('supervisor_role')).toBe(true);
    expect(byName.has('supervisor_employer')).toBe(true);
  });

  it('adds inspector identity fields to gear inspections', async () => {
    const db = await createTestClient();
    const columns = await db.getAll<{ name: string }>('PRAGMA table_info(gear_inspections)');
    const names = new Set(columns.map((c) => c.name));
    expect(names.has('inspector_name')).toBe(true);
    expect(names.has('inspector_cert_number')).toBe(true);
  });

  it('adds entry kind and rescue context fields (v3 hash bump)', async () => {
    const db = await createTestClient();
    const columns = await db.getAll<{ name: string; dflt_value: string | null }>(
      'PRAGMA table_info(entries)',
    );
    const byName = new Map(columns.map((c) => [c.name, c]));

    expect(byName.get('entry_kind')?.dflt_value).toBe("'work'");
    expect(byName.has('rescue_cover')).toBe(true);
    expect(byName.has('hazards')).toBe(true);
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
        'entry_photos',
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
