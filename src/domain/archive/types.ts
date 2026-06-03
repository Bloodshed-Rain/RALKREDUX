// Legacy paper-logbook archive — UNVERIFIED, self-declared historical evidence.
// These are NOT entries: no signature, no hash chain, never summed into attested
// totals. They exist so a technician moving from paper can attach scans that
// support a self-declared starting-hours baseline, clearly walled off from the
// signed record an auditor relies on.

export interface LegacyArchive {
  id: string;
  label: string;
  scheme: string | null; // which scheme(s) the paper logbook covered (free text)
  date_from: string | null; // ISO date the archive period starts
  date_to: string | null; // ISO date it ends
  hours_claimed: number | null; // self-declared hours represented by this archive
  witness_name: string | null; // supervisor/L3 who can vouch for the paper record
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArchivePhoto {
  id: string;
  archive_id: string;
  uri: string;
  mime_type: string | null;
  sort_order: number;
  created_at: string;
}

export interface LegacyArchiveWithPhotos extends LegacyArchive {
  photos: ArchivePhoto[];
}

export interface ArchivePhotoInput {
  uri: string;
  mime_type?: string | null;
}

export interface CreateArchiveInput {
  label: string;
  scheme?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  hours_claimed?: number | null;
  witness_name?: string | null;
  notes?: string | null;
  photos?: ArchivePhotoInput[];
}

export interface UpdateArchiveInput {
  label?: string;
  scheme?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  hours_claimed?: number | null;
  witness_name?: string | null;
  notes?: string | null;
}
