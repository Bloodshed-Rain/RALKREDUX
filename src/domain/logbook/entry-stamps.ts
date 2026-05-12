import type { EntrySignature, LogbookEntry, RemoteSignatureRequest } from './types';

export type StampKind = 'DRAFT' | 'PENDING' | 'CHAIN_OK' | 'AMENDED' | 'SYNCED';

export interface DeriveEntryStampsInput {
  entry: LogbookEntry;
  signature: EntrySignature | null;
  remote_request: RemoteSignatureRequest | null;
  chain_valid: boolean;
}

export function deriveEntryStamps(input: DeriveEntryStampsInput): StampKind[] {
  const { entry, signature, remote_request, chain_valid } = input;
  const stamps: StampKind[] = [];

  if (entry.status === 'draft') {
    stamps.push('DRAFT');
    if (remote_request?.status === 'pending') stamps.push('PENDING');
    return stamps;
  }

  if (entry.status === 'amended') stamps.push('AMENDED');
  if (signature && chain_valid) stamps.push('CHAIN_OK');
  if (signature?.method === 'remote') stamps.push('SYNCED');

  return stamps;
}
