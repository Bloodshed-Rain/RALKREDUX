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
      ]),
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
});
