import type { CertLevel } from './profile/types';

export const SPRAT_NUMBER_MAX_LENGTH = 12;
export const IRATA_NUMBER_LENGTH = 5;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeSpratNumber(value: string): string {
  return digitsOnly(value).slice(0, SPRAT_NUMBER_MAX_LENGTH);
}

export function certLevelToDigit(level: CertLevel): '1' | '2' | '3' {
  if (level === 'I') return '1';
  if (level === 'II') return '2';
  return '3';
}

export function certDigitToLevel(value: string | null | undefined): CertLevel {
  if (value === '1') return 'I';
  if (value === '3') return 'III';
  return 'II';
}

export function irataNumberDigits(value: string): string {
  const parts = value.split('/');
  const candidate = parts.length > 1 ? parts[1] : value;
  return digitsOnly(candidate).slice(0, IRATA_NUMBER_LENGTH);
}

export function formatIrataNumber(level: CertLevel, value: string): string {
  const digits = irataNumberDigits(value);
  return digits ? `${certLevelToDigit(level)}/${digits}` : '';
}

export function irataLevelFromNumber(value: string | null | undefined, fallback: CertLevel = 'II'): CertLevel {
  if (!value) return fallback;
  const match = /^([123])\//.exec(value.trim());
  return match ? certDigitToLevel(match[1]) : fallback;
}

/**
 * Best-effort guess of a cert-number's scheme based on its format. IRATA
 * numbers are stored as `D/DDDDD`; SPRAT numbers are bare digits. Used only
 * for prefill defaults — the user can always toggle scheme at sign time.
 */
export function inferSchemeFromCertNumber(value: string | null | undefined): 'sprat' | 'irata' | null {
  if (!value) return null;
  if (/^[123]\/\d/.test(value.trim())) return 'irata';
  if (/^\d{2,}$/.test(value.trim())) return 'sprat';
  return null;
}
