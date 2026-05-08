import BetterSqlite3 from 'better-sqlite3';
import { DbClient } from '@/src/db/client';
import { runMigrations } from '@/src/db/migrations';

export async function createTestClient(): Promise<DbClient> {
  const sqlite = new BetterSqlite3(':memory:');

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

