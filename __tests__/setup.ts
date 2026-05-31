import BetterSqlite3 from 'better-sqlite3';
import { DbClient } from '@/src/db/client';
import { runMigrations } from '@/src/db/migrations';

export async function createTestClient(): Promise<DbClient> {
  const sqlite = new BetterSqlite3(':memory:');
  // Mirror production: initialize.ts enables `PRAGMA foreign_keys = ON` on
  // native. With FK enforcement OFF (better-sqlite3's default), the deferred-FK
  // COMMIT path that restoreSnapshot relies on is never validated, so an
  // insert-order regression would pass CI green and only fail on-device
  // (cf. docs/codex-audit-2026-05-20.md BUG-4). Enabled before migrations so
  // the whole schema + every service test runs under real FK semantics. (P2-3)
  sqlite.exec('PRAGMA foreign_keys = ON;');

  const client: DbClient = {
    async run(sql, params = []) {
      const result = sqlite.prepare(sql).run(...params);
      return { changes: result.changes };
    },
    async get<T>(sql, params = []) {
      const row = sqlite.prepare(sql).get(...params) as T | undefined;
      return row ?? null;
    },
    async getAll<T>(sql, params = []) {
      return sqlite.prepare(sql).all(...params) as T[];
    },
    async exec(sql) {
      sqlite.exec(sql);
    },
  };

  await runMigrations(client);
  return client;
}

