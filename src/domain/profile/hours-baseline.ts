import type { CareerStats } from '@/src/domain/logbook/types';
import type { Profile } from './types';

// Per-scheme career hours = self-declared paper-logbook baseline + in-app signed
// hours logged toward that scheme. SPRAT and IRATA are independent; a dual-cert
// shift contributes to both `logged` totals (see getCareerStats), which is why
// the two can legitimately sum to more than the unified signed-hours figure.

export interface SchemeCareerHours {
  baseline: number; // carried forward from paper (self-declared)
  logged: number; // signed hours logged in-app toward this scheme
  total: number; // baseline + logged
}

export interface CareerHoursByScheme {
  sprat: SchemeCareerHours;
  irata: SchemeCareerHours;
  declared: boolean; // whether a baseline has been declared (and locked)
  transitionDate: string | null; // ISO date paper→digital, when declared
}

type BaselineFields = Pick<
  Profile,
  'sprat_hours_baseline' | 'irata_hours_baseline' | 'hours_baseline_date' | 'hours_baseline_declared_at'
>;

type SchemeHourFields = Pick<CareerStats, 'spratSignedHours' | 'iratASignedHours'>;

export function careerHoursByScheme(
  profile: BaselineFields | null | undefined,
  stats: SchemeHourFields | null | undefined,
): CareerHoursByScheme {
  const spratBaseline = profile?.sprat_hours_baseline ?? 0;
  const irataBaseline = profile?.irata_hours_baseline ?? 0;
  const spratLogged = stats?.spratSignedHours ?? 0;
  const irataLogged = stats?.iratASignedHours ?? 0;

  return {
    sprat: { baseline: spratBaseline, logged: spratLogged, total: spratBaseline + spratLogged },
    irata: { baseline: irataBaseline, logged: irataLogged, total: irataBaseline + irataLogged },
    declared: Boolean(profile?.hours_baseline_declared_at),
    transitionDate: profile?.hours_baseline_date ?? null,
  };
}
