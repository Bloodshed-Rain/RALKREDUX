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
  created_at: string;
  updated_at: string;
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

