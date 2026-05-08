import { DbClient } from './client';
import gearCatalogSeed from './seeds/gear-catalog.json';

interface Migration {
  id: number;
  name: string;
  up(db: DbClient): Promise<void>;
}

interface GearCatalogSeedRow {
  manufacturer: string;
  model: string;
  category: string;
}

function catalogIdFor(row: GearCatalogSeedRow, index: number): string {
  const slug = `${row.manufacturer}-${row.model}-${row.category}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
  return `catalog_${slug || index}`;
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
  {
    id: 7,
    name: 'gear-catalog',
    async up(db) {
      const gearColumns = await db.getAll<{ name: string }>('PRAGMA table_info(gear_items)');
      const names = new Set(gearColumns.map((column) => column.name));

      if (!names.has('manufacturer')) {
        await db.exec('ALTER TABLE gear_items ADD COLUMN manufacturer TEXT;');
      }

      if (!names.has('model')) {
        await db.exec('ALTER TABLE gear_items ADD COLUMN model TEXT;');
      }

      await db.exec(`
        CREATE TABLE IF NOT EXISTS gear_catalog (
          id TEXT PRIMARY KEY,
          manufacturer TEXT NOT NULL,
          model TEXT NOT NULL,
          category TEXT NOT NULL CHECK (category IN (
            'harness','helmet','rope','lanyard','sling',
            'descender','ascender','carabiner','pulley','other'
          )),
          created_at TEXT NOT NULL,
          UNIQUE (manufacturer, model)
        );
      `);
      await db.exec('CREATE INDEX IF NOT EXISTS idx_gear_catalog_category ON gear_catalog(category);');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_gear_catalog_make_model ON gear_catalog(manufacturer, model);');

      const now = new Date().toISOString();
      for (const [index, row] of (gearCatalogSeed as GearCatalogSeedRow[]).entries()) {
        await db.run(
          `INSERT OR IGNORE INTO gear_catalog (
            id, manufacturer, model, category, created_at
          ) VALUES (?, ?, ?, ?, ?)`,
          [catalogIdFor(row, index), row.manufacturer, row.model, row.category, now],
        );
      }
    },
  },
  {
    id: 8,
    name: 'field-ops-foundation',
    async up(db) {
      const signatureColumns = await db.getAll<{ name: string }>('PRAGMA table_info(signatures)');
      const signatureNames = new Set(signatureColumns.map((column) => column.name));

      if (!signatureNames.has('previous_chain_hash')) {
        await db.exec('ALTER TABLE signatures ADD COLUMN previous_chain_hash TEXT;');
      }

      if (!signatureNames.has('chain_hash')) {
        await db.exec('ALTER TABLE signatures ADD COLUMN chain_hash TEXT;');
      }

      const remoteColumns = await db.getAll<{ name: string }>('PRAGMA table_info(remote_signature_requests)');
      const remoteNames = new Set(remoteColumns.map((column) => column.name));

      if (!remoteNames.has('signing_token_hash')) {
        await db.exec('ALTER TABLE remote_signature_requests ADD COLUMN signing_token_hash TEXT;');
      }

      if (!remoteNames.has('token_hint')) {
        await db.exec('ALTER TABLE remote_signature_requests ADD COLUMN token_hint TEXT;');
      }

      if (!remoteNames.has('viewed_at')) {
        await db.exec('ALTER TABLE remote_signature_requests ADD COLUMN viewed_at TEXT;');
      }

      if (!remoteNames.has('completed_at')) {
        await db.exec('ALTER TABLE remote_signature_requests ADD COLUMN completed_at TEXT;');
      }

      await db.exec(`
        CREATE TABLE IF NOT EXISTS supervisors (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          cert_number TEXT,
          contact TEXT,
          role TEXT,
          company TEXT,
          last_signed_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE (cert_number)
        );
      `);
      await db.exec('CREATE INDEX IF NOT EXISTS idx_supervisors_name ON supervisors(name);');

      await db.exec(`
        CREATE TABLE IF NOT EXISTS entry_gear_usage (
          entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
          gear_id TEXT NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,
          role TEXT,
          created_at TEXT NOT NULL,
          PRIMARY KEY (entry_id, gear_id)
        );
      `);
      await db.exec('CREATE INDEX IF NOT EXISTS idx_entry_gear_usage_gear_id ON entry_gear_usage(gear_id);');

      await db.exec(`
        CREATE TABLE IF NOT EXISTS entry_attachments (
          id TEXT PRIMARY KEY,
          entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
          label TEXT NOT NULL,
          uri TEXT NOT NULL,
          mime_type TEXT,
          notes TEXT,
          created_at TEXT NOT NULL
        );
      `);
      await db.exec('CREATE INDEX IF NOT EXISTS idx_entry_attachments_entry_id ON entry_attachments(entry_id);');

      await db.exec(`
        CREATE TABLE IF NOT EXISTS entry_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          employer TEXT NOT NULL DEFAULT '',
          client TEXT NOT NULL DEFAULT '',
          work_task TEXT NOT NULL DEFAULT '',
          access_method TEXT NOT NULL DEFAULT '',
          structure_type TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          work_hours REAL NOT NULL DEFAULT 8,
          max_height REAL,
          height_unit TEXT NOT NULL DEFAULT 'ft' CHECK (height_unit IN ('ft', 'm')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_used_at TEXT
        );
      `);

      const now = new Date().toISOString();
      const templates = [
        {
          id: 'template_tower_inspection',
          name: 'Tower inspection',
          work_task: 'Inspection',
          access_method: 'Two-rope access',
          structure_type: 'Tower',
          description: 'Completed rope access inspection, documented findings, and maintained edge/rope protection.',
          work_hours: 8,
          max_height: 120,
          height_unit: 'ft',
        },
        {
          id: 'template_bridge_maintenance',
          name: 'Bridge maintenance',
          work_task: 'Maintenance',
          access_method: 'Two-rope access',
          structure_type: 'Bridge',
          description: 'Performed rope access maintenance, tool handling, and site cleanup under supervisor review.',
          work_hours: 8,
          max_height: 80,
          height_unit: 'ft',
        },
        {
          id: 'template_rescue_standby',
          name: 'Rescue standby',
          work_task: 'Rescue standby',
          access_method: 'Rescue cover',
          structure_type: 'Industrial site',
          description: 'Provided rope access rescue standby, equipment checks, and hazard monitoring for active work.',
          work_hours: 10,
          max_height: 60,
          height_unit: 'ft',
        },
      ] as const;

      for (const template of templates) {
        await db.run(
          `INSERT OR IGNORE INTO entry_templates (
            id, name, employer, client, work_task, access_method, structure_type,
            description, work_hours, max_height, height_unit, created_at, updated_at, last_used_at
          ) VALUES (?, ?, '', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
          [
            template.id,
            template.name,
            template.work_task,
            template.access_method,
            template.structure_type,
            template.description,
            template.work_hours,
            template.max_height,
            template.height_unit,
            now,
            now,
          ],
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
