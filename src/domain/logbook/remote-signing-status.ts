import { EntrySignature, LogbookEntry, RemoteSignatureRequest } from './types';

export type RemoteRequestClosedReason =
  | { kind: 'completed'; signed_at: string | null; signer_name: string | null }
  | { kind: 'expired'; expires_at: string | null }
  | { kind: 'cancelled' }
  | { kind: 'pre_empted'; entry_status: LogbookEntry['status'] };

export function describeClosedRemoteRequest(
  request: RemoteSignatureRequest,
  entry: LogbookEntry,
  signature: EntrySignature | null,
): RemoteRequestClosedReason | null {
  if (request.status === 'pending' && entry.status === 'draft') return null;

  if (request.status === 'completed') {
    return {
      kind: 'completed',
      signed_at: signature?.signed_at ?? request.completed_at,
      signer_name: signature?.supervisor_name ?? null,
    };
  }

  if (request.status === 'expired') {
    return { kind: 'expired', expires_at: request.expires_at };
  }

  if (request.status === 'cancelled') {
    return { kind: 'cancelled' };
  }

  return { kind: 'pre_empted', entry_status: entry.status };
}
