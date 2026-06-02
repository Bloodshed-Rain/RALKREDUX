export type CertScheme = 'sprat' | 'irata';
export type CertLevel = 'I' | 'II' | 'III';

// Broader scheme for signature records — adds 'site' for the case where the
// signer is the responsible person on site (safety officer, shift lead,
// superintendent) but is NOT SPRAT/IRATA certified. Per rope-access norms,
// a site-authorised signer is acceptable when no scheme-certified L3 is
// available; the audit trail captures role + employer instead of a cert
// number. The technician's own `CertScheme` stays sprat|irata only.
export type SignerScheme = CertScheme | 'site';

export interface Profile {
  id: string;
  full_name: string;
  primary_scheme: CertScheme;
  sprat_id: string | null;
  sprat_level: CertLevel | null;
  sprat_expires_on: string | null;
  irata_id: string | null;
  irata_level: CertLevel | null;
  irata_expires_on: string | null;
  // Optional local avatar — a device-local expo-file-system URI. Cosmetic only;
  // not part of any signature/entry attestation. May dangle after a restore to
  // a new device (the bytes are not in the backup), so always render with a
  // load-error fallback.
  avatar_uri: string | null;
  // Self-declared starting-hours baseline carried from a paper logbook
  // (migration 16). Tracked independently per scheme. `hours_baseline_declared_at`
  // is the immutability sentinel — once set, the baseline is locked and can only
  // be changed by voiding and re-declaring. Never part of an entry signature.
  sprat_hours_baseline: number | null;
  irata_hours_baseline: number | null;
  hours_baseline_date: string | null;
  hours_baseline_declared_at: string | null;
  created_at: string;
  updated_at: string;
}

// One-shot declaration of the paper-logbook starting balance. SPRAT/IRATA are
// independent (pass null for a scheme the tech doesn't hold). `transition_date`
// is the ISO date the paper logbook ended and the digital one began.
export interface HoursBaselineInput {
  sprat_hours_baseline?: number | null;
  irata_hours_baseline?: number | null;
  transition_date: string;
}

export interface CreateProfileInput {
  full_name: string;
  primary_scheme: CertScheme;
  sprat_id?: string | null;
  sprat_level?: CertLevel | null;
  sprat_expires_on?: string | null;
  irata_id?: string | null;
  irata_level?: CertLevel | null;
  irata_expires_on?: string | null;
}

// Post-onboarding edits. Every field is optional; only keys actually present
// are written (a provided `null` clears a nullable column, an absent key leaves
// it untouched). Profile fields are never part of an entry signature, so edits
// here never affect ENTRY_HASH_VERSION or any signed record.
export interface UpdateProfileInput {
  full_name?: string;
  primary_scheme?: CertScheme;
  sprat_id?: string | null;
  sprat_level?: CertLevel | null;
  sprat_expires_on?: string | null;
  irata_id?: string | null;
  irata_level?: CertLevel | null;
  irata_expires_on?: string | null;
}

