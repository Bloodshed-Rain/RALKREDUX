export type CertScheme = 'sprat' | 'irata';
export type CertLevel = 'I' | 'II' | 'III';

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

