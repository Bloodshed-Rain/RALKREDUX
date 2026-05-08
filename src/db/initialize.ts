import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { DbClient } from './client';
import { createExpoClient } from './expo-client';
import { runMigrations } from './migrations';

let client: DbClient | null = null;

async function openAppDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS !== 'web') {
    return SQLite.openDatabaseAsync('ralb-codex.db');
  }

  try {
    return await SQLite.openDatabaseAsync('ralb-codex.db');
  } catch (error) {
    console.warn('Persistent web SQLite unavailable; using an in-memory preview database.', error);
    return SQLite.openDatabaseAsync(':memory:');
  }
}

export async function initializeDatabase(): Promise<DbClient> {
  if (client) return client;
  const sqlite = await openAppDatabase();
  if (Platform.OS !== 'web') {
    await sqlite.execAsync('PRAGMA journal_mode = WAL;');
  }
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
