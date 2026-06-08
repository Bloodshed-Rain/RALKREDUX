// NDT (Non-Destructive Testing) ledger types. A fully separate subsystem from
// the rope-access entry ledger: different signer authority (NDT Level III),
// different hash version, never summed with work_hours.

export type NdtMethod =
  | 'UT' | 'MT' | 'PT' | 'RT' | 'ET' | 'VT' | 'LT' | 'AE' | 'IRT' | 'NR' | 'GW';

export type NdtLevel = 'trainee' | 'I' | 'II' | 'III';
export type NdtSupervision = 'supervised' | 'independent';
export type NdtScheme = 'ISO 9712' | 'SNT-TC-1A' | 'NAS410' | 'EN 4179' | 'PCN' | 'ACCP';
export type NdtInspectionStatus = 'draft' | 'logged' | 'pending' | 'verified' | 'amended';
export type NdtSignatureMethod = 'local' | 'remote';
export type NdtVerifierLevel = 'II' | 'III';

export interface NdtInspection {
  id: string;
  date_from: string;
  date_to: string;
  method: NdtMethod;
  technique: string | null;
  ndt_level_snapshot: NdtLevel | null;
  supervised: NdtSupervision;
  hours: number;
  site: string;
  client: string | null;
  employer: string | null;
  procedure_ref: string | null;
  component: string | null;
  ndt_scheme: NdtScheme | null;
  description: string | null;
  linked_entry_id: string | null;
  status: NdtInspectionStatus;
  amends_inspection_id: string | null;
  pending_signature_id: string | null;
  timezone_offset: number | null;
  created_at: string;
  updated_at: string;
}

export interface NdtSignature {
  id: string;
  inspection_id: string;
  verifier_name: string;
  verifier_cert_number: string;
  verifier_level: NdtVerifierLevel | null;
  verifier_scheme: string | null;
  verifier_employer: string | null;
  signed_at: string;
  inspection_hash: string;
  hash_version: number;
  method: NdtSignatureMethod;
  remote_request_id: string | null;
  signer_attestation: string | null;
  signature_path: string | null;
  attestation_accepted_at: string | null;
  previous_chain_hash: string | null;
  chain_hash: string | null;
  created_at: string;
}

export type NdtRemoteRequestStatus = 'pending' | 'completed' | 'cancelled' | 'expired';

export interface NdtRemoteSignatureRequest {
  id: string;
  inspection_id: string;
  recipient_name: string;
  recipient_contact: string | null;
  verifier_role: string | null;
  verifier_company: string | null;
  status: NdtRemoteRequestStatus;
  request_code: string;
  inspection_hash: string;
  hash_version: number;
  expires_at: string | null;
  completed_signature_id: string | null;
  signing_token_hash: string | null;
  token_hint: string | null;
  viewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateNdtInspectionInput {
  date_from: string;
  date_to: string;
  method: NdtMethod;
  technique?: string | null;
  ndt_level_snapshot?: NdtLevel | null;
  supervised: NdtSupervision;
  hours: number;
  site: string;
  client?: string | null;
  employer?: string | null;
  procedure_ref?: string | null;
  component?: string | null;
  ndt_scheme?: NdtScheme | null;
  description?: string | null;
  linked_entry_id?: string | null;
  amends_inspection_id?: string | null;
  timezone_offset?: number | null;
}

export type UpdateNdtInspectionInput = Partial<CreateNdtInspectionInput> & { id: string };

export interface SignNdtInspectionInput {
  inspection_id: string;
  verifier_name: string;
  verifier_cert_number: string;
  verifier_level?: NdtVerifierLevel | null;
  verifier_scheme?: string | null;
  verifier_employer?: string | null;
  signature_path: string;
  attestation_accepted: boolean;
  signer_attestation?: string | null;
}

export interface CreateNdtRemoteRequestInput {
  inspection_id: string;
  recipient_name: string;
  recipient_contact?: string | null;
  verifier_role?: string | null;
  verifier_company?: string | null;
  expires_at?: string | null;
}

export interface CompleteNdtRemoteRequestInput {
  request_code: string;
  signing_token?: string | null;
  verifier_name: string;
  verifier_cert_number: string;
  verifier_level?: NdtVerifierLevel | null;
  verifier_scheme?: string | null;
  verifier_employer?: string | null;
  signature_path: string;
  attestation_accepted: boolean;
  signer_attestation?: string | null;
  signed_at?: string | null;
}

export interface NdtInspectionDetail {
  inspection: NdtInspection;
  signature: NdtSignature | null;
  remote_request: NdtRemoteSignatureRequest | null;
  linked_entry_label: string | null;
}

export interface NdtMethodTotal {
  method: NdtMethod;
  hours: number;
  inspections: number;
}

export interface NdtMethodLevelTotal {
  method: NdtMethod;
  level: NdtLevel | 'Unspecified';
  hours: number;
}

export interface NdtSummary {
  selfLoggedHours: number; // status in (logged, pending)
  verifiedHours: number; // status = verified
  byMethod: NdtMethodTotal[];
  byMethodVerified: NdtMethodTotal[];
  byMethodLevel: NdtMethodLevelTotal[];
  supervisedSplit: { method: NdtMethod; supervised: number; independent: number }[];
  last12mByMethod: NdtMethodTotal[];
}
