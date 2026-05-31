import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { DbClient } from './client';
import { createExpoClient } from './expo-client';
import { runMigrations } from './migrations';

let client: DbClient | null = null;
let clientPromise: Promise<DbClient> | null = null;

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
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    const sqlite = await openAppDatabase();
    if (Platform.OS !== 'web') {
      // WAL + synchronous tuning is a native-storage optimization.
      await sqlite.execAsync('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');
    }
    // foreign_keys is a per-connection enforcement pragma, NOT a native-only
    // optimization: keeping it inside the native branch meant web preview ran
    // every `ON DELETE CASCADE` as a no-op, so deleteDraftEntry orphaned child
    // rows on web. Harmless on native (already on) and on the web engine. (P3-5)
    await sqlite.execAsync('PRAGMA foreign_keys = ON;');
    const initializedClient = createExpoClient(sqlite);
    await runMigrations(initializedClient);
    client = initializedClient;
    return initializedClient;
  })().catch((error) => {
    clientPromise = null;
    throw error;
  });

  return clientPromise;
}

export function getClient(): DbClient {
  if (!client) {
    throw new Error('Database has not been initialized.');
  }
  return client;
}
