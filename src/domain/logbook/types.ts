import { CertLevel } from '../profile/types';

export type EntryStatus = 'draft' | 'signed' | 'amended';
export type SignatureMethod = 'local' | 'remote';
export type RemoteSignatureRequestStatus = 'pending' | 'completed' | 'cancelled' | 'expired';
export type HeightUnit = 'ft' | 'm';

export interface LogbookEntry {
  id: string;
  date_from: string;
  date_to: string;
  employer: string;
  site: string;
  client: string;
  description: string;
  work_hours: number;
  work_task: string;
  access_method: string;
  structure_type: string;
  max_height: number | null;
  height_unit: HeightUnit;
  sprat_level_snapshot: CertLevel | null;
  irata_level_snapshot: CertLevel | null;
  status: EntryStatus;
  amends_entry_id: string | null;
  pending_signature_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntrySignature {
  id: string;
  entry_id: string;
  supervisor_name: string;
  supervisor_cert_number: string;
  signed_at: string;
  entry_hash: string;
  hash_version: number;
  method: SignatureMethod;
  remote_request_id: string | null;
  signer_attestation: string | null;
  signature_path: string | null;
  attestation_accepted_at: string | null;
  created_at: string;
}

export interface EntryDetail {
  entry: LogbookEntry;
  signature: EntrySignature | null;
  remote_request: RemoteSignatureRequest | null;
}

export interface CreateEntryInput {
  employer: string;
  site: string;
  client: string;
  description: string;
  work_hours: number;
  work_task: string;
  access_method: string;
  structure_type: string;
  max_height: number;
  height_unit: HeightUnit;
  date_from?: string;
  date_to?: string;
  sprat_level_snapshot?: CertLevel | null;
  irata_level_snapshot?: CertLevel | null;
}

export interface SignEntryInput {
  entry_id: string;
  supervisor_name: string;
  supervisor_cert_number: string;
  signature_path: string;
  attestation_accepted: boolean;
  signer_attestation?: string | null;
  signed_at?: string;
}

export interface RemoteSignatureRequest {
  id: string;
  entry_id: string;
  recipient_name: string;
  recipient_contact: string | null;
  verifier_role: string | null;
  verifier_company: string | null;
  status: RemoteSignatureRequestStatus;
  request_code: string;
  entry_hash: string;
  hash_version: number;
  expires_at: string | null;
  completed_signature_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRemoteSignatureRequestInput {
  entry_id: string;
  recipient_name: string;
  recipient_contact?: string | null;
  verifier_role?: string | null;
  verifier_company?: string | null;
  expires_at?: string | null;
}

export interface CreateAmendmentInput extends CreateEntryInput {
  entry_id: string;
}

export interface DashboardSummary {
  totalEntries: number;
  draftEntries: number;
  signedEntries: number;
  amendedEntries: number;
  pendingSignatureRequests: number;
  draftHours: number;
  signedHours: number;
}
