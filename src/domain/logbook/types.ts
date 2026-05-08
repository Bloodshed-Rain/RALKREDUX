import { CertLevel, Profile } from '../profile/types';
import { GearItem } from '../gear/types';

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
  previous_chain_hash: string | null;
  chain_hash: string | null;
  created_at: string;
}

export interface EntryDetail {
  entry: LogbookEntry;
  signature: EntrySignature | null;
  remote_request: RemoteSignatureRequest | null;
  gear_usage: EntryGearUsageDetail[];
  attachments: EntryAttachment[];
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
  template_id?: string | null;
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
  signing_token_hash: string | null;
  token_hint: string | null;
  viewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RemoteSignatureRequestDetail {
  entry: LogbookEntry;
  request: RemoteSignatureRequest;
  signature: EntrySignature | null;
}

export interface CreateRemoteSignatureRequestInput {
  entry_id: string;
  recipient_name: string;
  recipient_contact?: string | null;
  verifier_role?: string | null;
  verifier_company?: string | null;
  expires_at?: string | null;
}

export interface CompleteRemoteSignatureRequestInput {
  request_code: string;
  supervisor_name: string;
  supervisor_cert_number: string;
  signature_path: string;
  attestation_accepted: boolean;
  signer_attestation?: string | null;
  signed_at?: string;
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
  expiringCerts: ExpirationAlert[];
  overdueGearItems: number;
  dueSoonGearItems: number;
}

export type ExpirationSeverity = 'expired' | 'warning' | 'ok' | 'missing';

export interface ExpirationAlert {
  label: string;
  value: string | null;
  severity: ExpirationSeverity;
  daysRemaining: number | null;
}

export interface EntryGearUsage {
  entry_id: string;
  gear_id: string;
  role: string | null;
  created_at: string;
}

export interface EntryGearUsageDetail {
  usage: EntryGearUsage;
  gear: GearItem;
}

export interface AttachGearToEntryInput {
  entry_id: string;
  gear_id: string;
  role?: string | null;
}

export interface RemoveGearFromEntryInput {
  entry_id: string;
  gear_id: string;
}

export interface EntryAttachment {
  id: string;
  entry_id: string;
  label: string;
  uri: string;
  mime_type: string | null;
  notes: string | null;
  created_at: string;
}

export interface AddEntryAttachmentInput {
  entry_id: string;
  label: string;
  uri: string;
  mime_type?: string | null;
  notes?: string | null;
}

export interface EntryTemplate {
  id: string;
  name: string;
  employer: string;
  client: string;
  work_task: string;
  access_method: string;
  structure_type: string;
  description: string;
  work_hours: number;
  max_height: number | null;
  height_unit: HeightUnit;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

export interface CreateEntryTemplateInput {
  name: string;
  employer?: string;
  client?: string;
  work_task: string;
  access_method: string;
  structure_type: string;
  description: string;
  work_hours: number;
  max_height?: number | null;
  height_unit: HeightUnit;
}

export interface SupervisorContact {
  id: string;
  name: string;
  cert_number: string | null;
  contact: string | null;
  role: string | null;
  company: string | null;
  last_signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CareerStatsBucket {
  label: string;
  hours: number;
  entries: number;
}

export interface CareerStats {
  totalEntries: number;
  signedEntries: number;
  totalHours: number;
  signedHours: number;
  byTask: CareerStatsBucket[];
  byAccessMethod: CareerStatsBucket[];
  byStructureType: CareerStatsBucket[];
  byEmployer: CareerStatsBucket[];
  byYear: CareerStatsBucket[];
}

export interface ExportLogbookOptions {
  includeDrafts?: boolean;
}

export interface LogbookExportEntry {
  entry: LogbookEntry;
  signature: EntrySignature | null;
  gear_usage: EntryGearUsageDetail[];
  attachments: EntryAttachment[];
}

export interface LogbookExportBundle {
  export_schema_version: 2;
  exported_at: string;
  app_flavor: 'ralb-codex-edition';
  profile: Profile | null;
  summary: {
    entry_count: number;
    signed_entry_count: number;
    amended_entry_count: number;
    draft_entry_count: number;
    signed_hours: number;
  };
  supervisors: SupervisorContact[];
  entries: LogbookExportEntry[];
}

export interface LogbookExportPacket {
  export_schema_version: 2;
  exported_at: string;
  app_flavor: 'ralb-codex-edition';
  profile: Profile | null;
  entry: LogbookEntry;
  signature: EntrySignature;
  gear_usage: EntryGearUsageDetail[];
  attachments: EntryAttachment[];
  verification: {
    entry_hash: string;
    hash_version: number;
    signature_method: SignatureMethod;
    signed_at: string;
    attestation_accepted_at: string | null;
    previous_chain_hash: string | null;
    chain_hash: string | null;
  };
  amendment: {
    status: EntryStatus;
    amends_entry_id: string | null;
  };
}
