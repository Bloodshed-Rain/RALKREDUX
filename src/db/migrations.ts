import { DbClient } from './client';

interface Migration {
  id: number;
  name: string;
  up(db: DbClient): Promise<void>;
}

const migrations: Migration[] = [
  {
    id: 1,
    name: 'core-local-logbook',
    async up(db) {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          primary_scheme TEXT NOT NULL CHECK (primary_scheme IN ('sprat', 'irata')),
          sprat_id TEXT,
          sprat_level TEXT CHECK (sprat_level IS NULL OR sprat_level IN ('I', 'II', 'III')),
          sprat_expires_on TEXT,
          irata_id TEXT,
          irata_level TEXT CHECK (irata_level IS NULL OR irata_level IN ('I', 'II', 'III')),
          irata_expires_on TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      await db.exec(`
        CREATE TABLE IF NOT EXISTS entries (
          id TEXT PRIMARY KEY,
          date_from TEXT NOT NULL,
          date_to TEXT NOT NULL,
          employer TEXT NOT NULL,
          site TEXT NOT NULL,
          client TEXT NOT NULL,
          description TEXT NOT NULL,
          work_hours REAL NOT NULL,
          sprat_level_snapshot TEXT CHECK (sprat_level_snapshot IS NULL OR sprat_level_snapshot IN ('I', 'II', 'III')),
          irata_level_snapshot TEXT CHECK (irata_level_snapshot IS NULL OR irata_level_snapshot IN ('I', 'II', 'III')),
          status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'signed', 'amended')),
          amends_entry_id TEXT REFERENCES entries(id),
          pending_signature_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      await db.exec('CREATE INDEX IF NOT EXISTS idx_entries_date_from ON entries(date_from);');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(status);');
      await db.exec(`
        CREATE TABLE IF NOT EXISTS signatures (
          id TEXT PRIMARY KEY,
          entry_id TEXT NOT NULL REFERENCES entries(id),
          supervisor_name TEXT NOT NULL,
          supervisor_cert_number TEXT NOT NULL,
          signed_at TEXT NOT NULL,
          entry_hash TEXT NOT NULL,
          hash_version INTEGER NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
      await db.exec('CREATE INDEX IF NOT EXISTS idx_signatures_entry_id ON signatures(entry_id);');
    },
  },
  {
    id: 2,
    name: 'gear-and-cloud-placeholders',
    async up(db) {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS gear_items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          serial_number TEXT,
          next_inspection_due TEXT,
          retired_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      await db.exec(`
        CREATE TABLE IF NOT EXISTS gear_inspections (
          id TEXT PRIMARY KEY,
          gear_id TEXT NOT NULL REFERENCES gear_items(id),
          inspected_on TEXT NOT NULL,
          result TEXT NOT NULL CHECK (result IN ('pass', 'pass_with_concerns', 'fail')),
          notes TEXT,
          created_at TEXT NOT NULL
        );
      `);
      await db.exec(`
        CREATE TABLE IF NOT EXISTS cloud_state (
          id TEXT PRIMARY KEY,
          last_backup_at TEXT,
          last_backup_id TEXT,
          last_restore_at TEXT,
          updated_at TEXT NOT NULL
        );
      `);
    },
  },
  {
    id: 3,
    name: 'signature-trust-state',
    async up(db) {
      const signatureColumns = await db.getAll<{ name: string }>('PRAGMA table_info(signatures)');
      const names = new Set(signatureColumns.map((column) => column.name));

      if (!names.has('method')) {
        await db.exec(
          "ALTER TABLE signatures ADD COLUMN method TEXT NOT NULL DEFAULT 'local' CHECK (method IN ('local', 'remote'));",
        );
      }

      if (!names.has('remote_request_id')) {
        await db.exec('ALTER TABLE signatures ADD COLUMN remote_request_id TEXT;');
      }

      if (!names.has('signer_attestation')) {
        await db.exec('ALTER TABLE signatures ADD COLUMN signer_attestation TEXT;');
      }

      await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_signatures_entry_unique ON signatures(entry_id);');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_entries_amends_entry_id ON entries(amends_entry_id);');
    },
  },
  {
    id: 4,
    name: 'drawn-signatures-and-attestation',
    async up(db) {
      const signatureColumns = await db.getAll<{ name: string }>('PRAGMA table_info(signatures)');
      const names = new Set(signatureColumns.map((column) => column.name));

      if (!names.has('signature_path')) {
        await db.exec('ALTER TABLE signatures ADD COLUMN signature_path TEXT;');
      }

      if (!names.has('attestation_accepted_at')) {
        await db.exec('ALTER TABLE signatures ADD COLUMN attestation_accepted_at TEXT;');
      }
    },
  },
  {
    id: 5,
    name: 'remote-signature-requests',
    async up(db) {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS remote_signature_requests (
          id TEXT PRIMARY KEY,
          entry_id TEXT NOT NULL REFERENCES entries(id),
          recipient_name TEXT NOT NULL,
          recipient_contact TEXT,
          verifier_role TEXT,
          verifier_company TEXT,
          status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled', 'expired')),
          request_code TEXT NOT NULL UNIQUE,
          entry_hash TEXT NOT NULL,
          hash_version INTEGER NOT NULL,
          expires_at TEXT,
          completed_signature_id TEXT REFERENCES signatures(id),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      await db.exec('CREATE INDEX IF NOT EXISTS idx_remote_signature_requests_entry_id ON remote_signature_requests(entry_id);');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_remote_signature_requests_status ON remote_signature_requests(status);');
    },
  },
  {
    id: 6,
    name: 'scheme-work-log-fields',
    async up(db) {
      const entryColumns = await db.getAll<{ name: string }>('PRAGMA table_info(entries)');
      const names = new Set(entryColumns.map((column) => column.name));

      if (!names.has('work_task')) {
        await db.exec("ALTER TABLE entries ADD COLUMN work_task TEXT NOT NULL DEFAULT '';");
      }

      if (!names.has('access_method')) {
        await db.exec("ALTER TABLE entries ADD COLUMN access_method TEXT NOT NULL DEFAULT '';");
      }

      if (!names.has('structure_type')) {
        await db.exec("ALTER TABLE entries ADD COLUMN structure_type TEXT NOT NULL DEFAULT '';");
      }

      if (!names.has('max_height')) {
        await db.exec('ALTER TABLE entries ADD COLUMN max_height REAL;');
      }

      if (!names.has('height_unit')) {
        await db.exec(
          "ALTER TABLE entries ADD COLUMN height_unit TEXT NOT NULL DEFAULT 'ft' CHECK (height_unit IN ('ft', 'm'));",
        );
      }
    },
  },
];

export async function runMigrations(db: DbClient): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = await db.getAll<{ id: number }>('SELECT id FROM schema_migrations');
  const applied = new Set(appliedRows.map((row) => row.id));

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    await db.exec('BEGIN');
    try {
      await migration.up(db);
      await db.run(
        'INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)',
        [migration.id, migration.name, new Date().toISOString()],
      );
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  }
}
