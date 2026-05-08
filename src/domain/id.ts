import * as Crypto from 'expo-crypto';

export function createId(prefix: string): string {
  return `${prefix}_${Crypto.randomUUID()}`;
}

