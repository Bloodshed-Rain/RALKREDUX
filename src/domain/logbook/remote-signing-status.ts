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

export interface VerifierReadiness {
  hasName: boolean;
  certReady: boolean; // cert number (scheme verifiers); always true for site signers
  siteFieldsReady: boolean; // role + employer (site signers); always true otherwise
  hasSignature: boolean;
  attestationAccepted: boolean;
}

// The next action a verifier still owes, in form order, for the disabled-CTA
// label so the button names the blocker instead of a generic "Finish
// verification". Returns null once every required step is satisfied (the caller
// then falls back to a generic label if the block is request/entry status).
export function nextVerifierStep(r: VerifierReadiness): string | null {
  if (!r.hasName) return 'Enter your name';
  if (!r.certReady) return 'Add your cert number';
  if (!r.siteFieldsReady) return 'Add your role & employer';
  if (!r.hasSignature) return 'Draw your signature';
  if (!r.attestationAccepted) return 'Confirm the attestation';
  return null;
}
