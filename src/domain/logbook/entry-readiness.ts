import { LogbookEntry } from './types';
import { isValidIsoDateRange } from '../date-utils';

export interface EntryVerificationReadiness {
  ready: boolean;
  missingFields: string[];
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function getEntryVerificationReadiness(entry: LogbookEntry): EntryVerificationReadiness {
  const missingFields: string[] = [];

  if (!hasText(entry.date_from) || !hasText(entry.date_to)) {
    missingFields.push('work dates');
  } else if (!isValidIsoDateRange(entry.date_from, entry.date_to)) {
    missingFields.push('valid work date range');
  }
  if (!hasText(entry.employer)) missingFields.push('employer');
  if (!hasText(entry.site)) missingFields.push('site or location');
  if (!hasText(entry.client)) missingFields.push('client');
  if (!hasText(entry.work_task)) missingFields.push('work task');
  if (!hasText(entry.access_method)) missingFields.push('access method');
  if (!hasText(entry.structure_type)) missingFields.push('structure type');
  if (!hasText(entry.description)) missingFields.push('work description');
  if (!Number.isFinite(entry.work_hours) || entry.work_hours <= 0) missingFields.push('rope access hours');
  if (!Number.isFinite(entry.max_height ?? NaN) || (entry.max_height ?? 0) <= 0) {
    missingFields.push('maximum height');
  }

  return {
    ready: missingFields.length === 0,
    missingFields,
  };
}
