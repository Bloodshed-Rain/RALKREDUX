import { NdtInspection } from './types';

export interface NdtInspectionReadiness {
  ready: boolean;
  missingFields: string[];
}

const VALID_METHODS = ['UT', 'MT', 'PT', 'RT', 'ET', 'VT', 'LT', 'AE', 'IRT', 'NR', 'GW'];

// Gating before a verification can be requested or performed. Mirrors
// entry-readiness.ts — surface missingFields rather than throwing.
export function getNdtInspectionReadiness(inspection: NdtInspection): NdtInspectionReadiness {
  const missingFields: string[] = [];
  if (!inspection.method || !VALID_METHODS.includes(inspection.method)) missingFields.push('NDT method');
  if (!Number.isFinite(inspection.hours) || inspection.hours <= 0) missingFields.push('NDT hours');
  if (!inspection.site || !inspection.site.trim()) missingFields.push('site / job reference');
  if (!inspection.ndt_level_snapshot) missingFields.push('NDT level held');
  if (!inspection.date_from) missingFields.push('date');
  return { ready: missingFields.length === 0, missingFields };
}
