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
  {
    id: 9,
    name: 'entry-kind-and-rescue-context',
    async up(db) {
      // Adds three fields that auditors expect on every work record but the
      // schema couldn't represent:
      //   entry_kind — separates work / training / assessment / rescue_drill
      //                hours so SPRAT/IRATA progression math can be honest.
      //                Defaults to 'work' so every existing row keeps its
      //                meaning (the legacy assumption).
      //   rescue_cover — who's standing rescue cover for the work, or the
      //                  self-rescue plan summary. Free text, optional.
      //   hazards — JSON-encoded array of hazard labels. Stored as TEXT so
      //             SQLite stays happy; service layer parses on read.
      //
      // All three become part of what a signer attests to, so a hash-version
      // bump (2 → 3) lands alongside this migration in the entry-hash module
      // and edge function. Existing v2 signatures stay valid via the
      // hash_version short-circuit in verifyChainHashFor; new entries hash
      // under v3 with the new fields included.
      const entryColumns = await db.getAll<{ name: string }>('PRAGMA table_info(entries)');
      const names = new Set(entryColumns.map((column) => column.name));

      if (!names.has('entry_kind')) {
        await db.exec(
          "ALTER TABLE entries ADD COLUMN entry_kind TEXT NOT NULL DEFAULT 'work' CHECK (entry_kind IN ('work', 'training', 'assessment', 'rescue_drill'));",
        );
      }

      if (!names.has('rescue_cover')) {
        await db.exec('ALTER TABLE entries ADD COLUMN rescue_cover TEXT;');
      }

      if (!names.has('hazards')) {
        await db.exec('ALTER TABLE entries ADD COLUMN hazards TEXT;');
      }
    },
  },
  {
    id: 10,
    name: 'gear-inspector-identity',
    async up(db) {
      // Audit-grade fix: every gear inspection must record WHO did it, by
      // name + cert number. Without inspector identity the inspection chain
      // is anonymous and an auditor can't reconcile "who signed off this
      // rope was in service." Additive — existing rows get NULL until they
      // get re-inspected (the service will require the fields on every new
      // inspection going forward).
      const inspectionColumns = await db.getAll<{ name: string }>(
        'PRAGMA table_info(gear_inspections)',
      );
      const names = new Set(inspectionColumns.map((column) => column.name));

      if (!names.has('inspector_name')) {
        await db.exec('ALTER TABLE gear_inspections ADD COLUMN inspector_name TEXT;');
      }
      if (!names.has('inspector_cert_number')) {
        await db.exec('ALTER TABLE gear_inspections ADD COLUMN inspector_cert_number TEXT;');
      }
    },
  },
  {
    id: 11,
    name: 'gear-catalog-image-url',
    async up(db) {
      // Schema-ready for the catalog browser to render a product image when
      // a licensed source is available. Stays NULL on every existing seeded
      // row — UI falls back to the category icon. A future curation pass
      // can populate the column for the top-N manufacturer entries without
      // any further migration.
      const columns = await db.getAll<{ name: string }>('PRAGMA table_info(gear_catalog)');
      const names = new Set(columns.map((c) => c.name));
      if (!names.has('image_url')) {
        await db.exec('ALTER TABLE gear_catalog ADD COLUMN image_url TEXT;');
      }
    },
  },
  {
    id: 12,
    name: 'site-signer-role-employer',
    async up(db) {
      // Rope-access ruling: signers don't have to be SPRAT/IRATA certified.
      // A site-authorised signer (safety officer / shift lead /
      // superintendent — not rope-access certified but the responsible
      // party for the work) is acceptable when no scheme-certified L3 is
      // available. For those signatures we capture role + employer instead
      // of a cert number; auditors use those to confirm signer authority.
      //
      // Adds three columns:
      //   supervisor_scheme — was captured at sign time but never persisted
      //     (the scheme was implied by the cert number format). With 'site'
      //     in play, cert number can be empty, so the scheme must be
      //     explicit. Defaults to 'sprat' on existing rows — historical
      //     signatures' actual scheme is still derivable from cert format
      //     via `inferSchemeFromCertNumber` if anyone needs to backfill.
      //   supervisor_role + supervisor_employer — captured only when
      //     supervisor_scheme === 'site'. Nullable.
      const columns = await db.getAll<{ name: string }>('PRAGMA table_info(signatures)');
      const names = new Set(columns.map((c) => c.name));
      if (!names.has('supervisor_scheme')) {
        await db.exec(
          "ALTER TABLE signatures ADD COLUMN supervisor_scheme TEXT NOT NULL DEFAULT 'sprat' CHECK (supervisor_scheme IN ('sprat', 'irata', 'site'));",
        );
      }
      if (!names.has('supervisor_role')) {
        await db.exec('ALTER TABLE signatures ADD COLUMN supervisor_role TEXT;');
      }
      if (!names.has('supervisor_employer')) {
        await db.exec('ALTER TABLE signatures ADD COLUMN supervisor_employer TEXT;');
      }
    },
  },
  {
    id: 13,
    name: 'performance-indexes',
    async up(db) {
      // Offline-first logbooks can grow to thousands of rows over a career.
      // These indexes eliminate full table scans and memory-heavy sorts on
      // the critical path (dashboard summary, entry list, chain hash resolution).

      // 1. Optimizes `getLatestChainHash`
      await db.exec(
        'CREATE INDEX IF NOT EXISTS idx_signatures_chain_latest ON signatures(signed_at DESC, created_at DESC) WHERE chain_hash IS NOT NULL;'
      );

      // 2. Optimizes `listEntries`
      await db.exec(
        'CREATE INDEX IF NOT EXISTS idx_entries_timeline ON entries(date_from DESC, created_at DESC);'
      );

      // 3. Optimizes gear deadline math in `getDashboardSummary`
      await db.exec(
        'CREATE INDEX IF NOT EXISTS idx_gear_items_inspections ON gear_items(retired_at, next_inspection_due);'
      );

      // 4. Optimizes `listSupervisorContacts`
      await db.exec(
        'CREATE INDEX IF NOT EXISTS idx_supervisors_recent ON supervisors(last_signed_at DESC, name ASC);'
      );
    },
  },
  {
    id: 14,
    name: 'timezone-anchoring-and-photos',
    async up(db) {
      // 1. Timezone anchoring: Store the UTC offset (in minutes) at the time
      // the entry was created to prevent day-shifting when crossing timezones.
      const entryColumns = await db.getAll<{ name: string }>('PRAGMA table_info(entries)');
      const names = new Set(entryColumns.map((column) => column.name));

      if (!names.has('timezone_offset')) {
        await db.exec('ALTER TABLE entries ADD COLUMN timezone_offset INTEGER;');
      }

      // 2. Photo storage: Store lightweight URIs pointing to expo-file-system
      // rather than blowing up SQLite with base64 blobs.
      await db.exec(`
        CREATE TABLE IF NOT EXISTS entry_photos (
          id TEXT PRIMARY KEY,
          entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
          file_uri TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
      await db.exec('CREATE INDEX IF NOT EXISTS idx_entry_photos_entry_id ON entry_photos(entry_id);');
    },
  },
  {
    id: 15,
    name: 'profile-avatar',
    async up(db) {
      // Optional local avatar. Stores a file URI pointing at expo-file-system's
      // documentDirectory (not a blob) — cosmetic local identity only, so it is
      // NOT part of any entry attestation and does not touch ENTRY_HASH_VERSION.
      // The file is device-local: it rides along in backups as a string but the
      // bytes do not, so consumers must tolerate a dangling URI (see the Image
      // onError → initials fallback on the Profile tab).
      const columns = await db.getAll<{ name: string }>('PRAGMA table_info(profiles)');
      const names = new Set(columns.map((column) => column.name));
      if (!names.has('avatar_uri')) {
        await db.exec('ALTER TABLE profiles ADD COLUMN avatar_uri TEXT;');
      }
    },
  },
  {
    id: 16,
    name: 'profile-hours-baseline',
    async up(db) {
      // Starting-hours baseline carried from a paper logbook so a technician
      // moving to digital doesn't restart at zero. SPRAT and IRATA are tracked
      // as INDEPENDENT counters (a dual-cert tech's career totals legitimately
      // differ). Profile-scoped, self-declared, NOT part of any entry
      // attestation — no ENTRY_HASH_VERSION change. `hours_baseline_declared_at`
      // doubles as the immutability sentinel: once set, the baseline is locked
      // (void-and-redeclare only), so a silent edit can't rewrite history.
      const columns = await db.getAll<{ name: string }>('PRAGMA table_info(profiles)');
      const names = new Set(columns.map((column) => column.name));
      if (!names.has('sprat_hours_baseline')) {
        await db.exec('ALTER TABLE profiles ADD COLUMN sprat_hours_baseline REAL;');
      }
      if (!names.has('irata_hours_baseline')) {
        await db.exec('ALTER TABLE profiles ADD COLUMN irata_hours_baseline REAL;');
      }
      if (!names.has('hours_baseline_date')) {
        await db.exec('ALTER TABLE profiles ADD COLUMN hours_baseline_date TEXT;');
      }
      if (!names.has('hours_baseline_declared_at')) {
        await db.exec('ALTER TABLE profiles ADD COLUMN hours_baseline_declared_at TEXT;');
      }
    },
  },
  {
    id: 17,
    name: 'legacy-logbook-archives',
    async up(db) {
      // Legacy paper-logbook archive: user-supplied photos of PRIOR paper
      // logbook pages, stored as standalone HISTORICAL EVIDENCE. These are
      // unverified + self-declared — NOT entries, NOT signed, NOT part of any
      // hash chain — so they live in their own tables with no FK to entries and
      // never touch ENTRY_HASH_VERSION. They must never be summed into attested
      // totals or rendered as if they were signed records.
      await db.exec(`
        CREATE TABLE IF NOT EXISTS logbook_archives (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          scheme TEXT,
          date_from TEXT,
          date_to TEXT,
          hours_claimed REAL,
          witness_name TEXT,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      await db.exec(`
        CREATE TABLE IF NOT EXISTS archive_photos (
          id TEXT PRIMARY KEY,
          archive_id TEXT NOT NULL REFERENCES logbook_archives(id) ON DELETE CASCADE,
          uri TEXT NOT NULL,
          mime_type TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
      `);
      await db.exec(
        'CREATE INDEX IF NOT EXISTS idx_archive_photos_archive_id ON archive_photos(archive_id);',
      );
    },
  },
];

// Total number of migrations defined. Surfaced in the About sheet so the
// schema generation is visible without querying the DB.
export const MIGRATION_COUNT = migrations.length;

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
