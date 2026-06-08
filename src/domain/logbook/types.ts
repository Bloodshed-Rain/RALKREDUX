import { CertLevel, CertScheme, Profile, SignerScheme } from '../profile/types';
import { GearItem } from '../gear/types';

export type EntryStatus = 'draft' | 'signed' | 'amended';
export type SignatureMethod = 'local' | 'remote';
export type RemoteSignatureRequestStatus = 'pending' | 'completed' | 'cancelled' | 'expired';
export type HeightUnit = 'ft' | 'm';
// SPRAT/IRATA progression splits hours into distinct buckets; auditors want
// to know how many were on real work vs training/assessment/rescue drills.
export type EntryKind = 'work' | 'training' | 'assessment' | 'rescue_drill';

export function entryKindLabel(kind: EntryKind): string {
  switch (kind) {
    case 'training': return 'Training';
    case 'assessment': return 'Assessment';
    case 'rescue_drill': return 'Rescue drill';
    case 'work':
    default: return 'Work';
  }
}

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
  // v3 hash-bumped fields. `entry_kind` defaults to 'work' at the SQL layer so
  // pre-v3 rows keep their meaning. `rescue_cover` and `hazards` are nullable.
  // `hazards` is stored as a canonical (sorted, JSON-stringified) string —
  // consumers parse it with `parseHazards` for array access.
  timezone_offset: number | null;
  entry_kind: EntryKind;
  rescue_cover: string | null;
  hazards: string | null;
  // v5 hash-bumped fields. `work_task` and `access_method` became attested
  // MULTI-value fields: the scalar columns above are frozen as the PRIMARY
  // (index 0) so pre-v5 signatures keep verifying byte-identically, while these
  // canonical JSON-string lists are what a v5 signature attests to. NULL on
  // pre-v5 rows (migration 18 backfills from the scalar). Parse with
  // `parseStringList`; write through `canonicalizeStringList`.
  work_task_list: string | null;
  access_method_list: string | null;
  status: EntryStatus;
  amends_entry_id: string | null;
  pending_signature_id: string | null;
  created_at: string;
  updated_at: string;
}

// Parses the raw `hazards` TEXT column into a string[]. Returns an empty
// array for null / empty / malformed JSON so consumers can render
// unconditionally.
export function parseStringList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

// `hazards`, `work_task_list`, and `access_method_list` share the same
// JSON-array-in-TEXT shape, so they all parse through `parseStringList`.
export function parseHazards(raw: string | null | undefined): string[] {
  return parseStringList(raw);
}

// Canonicalizes a hazards array for storage / hashing: trim, drop empties,
// dedupe, sort. Returns null when the resulting list is empty so the DB row
// matches the "no hazards recorded" intent.
export function canonicalizeHazards(values: readonly string[] | null | undefined): string | null {
  if (!values || values.length === 0) return null;
  const cleaned = Array.from(
    new Set(values.map((v) => v.trim()).filter((v) => v.length > 0)),
  ).sort();
  if (cleaned.length === 0) return null;
  return JSON.stringify(cleaned);
}

// Like `canonicalizeHazards` but ORDER-PRESERVING: trim, drop empties, dedupe
// keeping first occurrence (a Set preserves insertion order). Used for the v5
// `work_task` / `access_method` lists, where order is meaningful — `work_task`
// index 0 is the attested PRIMARY task.
export function canonicalizeStringList(
  values: readonly string[] | null | undefined,
): string | null {
  if (!values || values.length === 0) return null;
  const cleaned = Array.from(new Set(values.map((v) => v.trim()).filter((v) => v.length > 0)));
  if (cleaned.length === 0) return null;
  return JSON.stringify(cleaned);
}

export interface EntrySignature {
  id: string;
  entry_id: string;
  supervisor_name: string;
  // The signer's scheme. Widened from CertScheme to SignerScheme to support
  // site-authorised signers (safety officers / shift leads / superintendents
  // who aren't rope-access certified). Stored as TEXT in SQLite so pre-v3
  // rows that wrote 'sprat'/'irata' remain valid.
  supervisor_scheme: SignerScheme;
  // Cert number — empty string for 'site' signers (they don't have one);
  // required non-empty for SPRAT/IRATA.
  supervisor_cert_number: string;
  // Captured only when supervisor_scheme === 'site'. Auditors use these to
  // confirm the signer's authority on a non-rope-access path.
  supervisor_role: string | null;
  supervisor_employer: string | null;
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
  // v3 hash-bumped fields. All optional at the input boundary so existing
  // call sites compile unchanged; service defaults entry_kind to 'work',
  // rescue_cover to null, and runs hazards through `canonicalizeHazards`.
  entry_kind?: EntryKind;
  rescue_cover?: string | null;
  hazards?: readonly string[];
  // v5: multi-select work_task / access_method. Optional so existing single-
  // select call sites compile unchanged — when omitted, the service derives the
  // list from the scalar (`[work_task]`). When provided, index 0 is the primary
  // and the scalar column is set to it.
  work_task_list?: readonly string[];
  access_method_list?: readonly string[];
}

export interface UpdateDraftEntryInput extends CreateEntryInput {
  entry_id: string;
}

export interface SignEntryInput {
  entry_id: string;
  supervisor_name: string;
  /**
   * The signer's scheme — sprat | irata | site. SPRAT and IRATA require a
   * cert number; 'site' (safety officer / shift lead / superintendent who
   * is NOT rope-access certified but IS responsible on site) requires role
   * + employer instead. Service throws scheme-specific errors when the
   * required fields are missing.
   */
  supervisor_scheme: SignerScheme;
  supervisor_cert_number: string;
  // Required when supervisor_scheme === 'site'. Service throws
  // `site_signer_role_required` / `site_signer_employer_required`.
  supervisor_role?: string | null;
  supervisor_employer?: string | null;
  signature_path: string;
  attestation_accepted: boolean;
  signer_attestation?: string | null;
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
  signing_token?: string | null;
  supervisor_name: string;
  /**
   * The verifier's scheme — sprat | irata | site. Same rules as
   * SignEntryInput.supervisor_scheme.
   */
  supervisor_scheme: SignerScheme;
  supervisor_cert_number: string;
  supervisor_role?: string | null;
  supervisor_employer?: string | null;
  signature_path: string;
  attestation_accepted: boolean;
  signer_attestation?: string | null;
  signed_at?: string;
}

export interface RemoteSignatureAccessInput {
  request_code: string;
  signing_token?: string | null;
  mark_viewed?: boolean;
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

// A photo attached to an entry. The bytes live on disk (expo-file-system);
// only the URI is stored in SQLite. Added in migration 14 (`entry_photos`).
export interface EntryPhoto {
  id: string;
  entry_id: string;
  file_uri: string;
  created_at: string;
}

// Attachment plus the entry context needed to render it in the Attachments
// index (site + date + status). Returned by listAttachmentsWithEntry.
export interface EntryAttachmentWithEntry extends EntryAttachment {
  entry_site: string;
  entry_date: string;
  entry_status: 'draft' | 'signed' | 'amended';
}

export interface AddEntryAttachmentInput {
  entry_id: string;
  label: string;
  uri: string;
  mime_type?: string | null;
  notes?: string | null;
}

export interface RemoveEntryAttachmentInput {
  entry_id: string;
  attachment_id: string;
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
  // Signed hours logged toward each scheme's certification. An entry counts
  // toward a scheme when its level snapshot for that scheme is set; a dual-cert
  // entry legitimately counts toward BOTH (so these can sum to more than
  // signedHours). Add the profile's per-scheme baseline for the career figure.
  spratSignedHours: number;
  iratASignedHours: number;
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
  export_schema_version: 3;
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
  export_schema_version: 3;
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
