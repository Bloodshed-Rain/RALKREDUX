import * as SQLite from 'expo-sqlite';
import { DbClient } from './client';
import { createExpoClient } from './expo-client';
import { runMigrations } from './migrations';

let client: DbClient | null = null;

export async function initializeDatabase(): Promise<DbClient> {
  if (client) return client;
  const sqlite = await SQLite.openDatabaseAsync('ralb-codex.db');
  await sqlite.execAsync('PRAGMA journal_mode = WAL;');
  client = createExpoClient(sqlite);
  await runMigrations(client);
  return client;
}

export function getClient(): DbClient {
  if (!client) {
    throw new Error('Database has not been initialized.');
  }
  return client;
}

