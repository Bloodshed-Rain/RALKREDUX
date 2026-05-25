import { HAZARD_PRESETS } from './hazards';

// Ordered roughly by hour-share so the inline chips a tech taps without reading
// come first. Source: rope-access advisor ruling, recorded in
// .claude/agent-memory/sprirata-rope-access-advisor/work-task-taxonomy-and-custom-entry.md
export const WORK_TASK_PRESETS = [
  'Inspection (visual)',
  'NDT / testing',
  'Maintenance / servicing',
  'Cleaning / washing',
  'Painting / coating',
  'Bolting / torque / tensioning',
  'Welding / hot work',
  'Glazing / cladding',
  'Rigging / installation',
  'Wind turbine blade repair',
  'Geotechnical / rockfall',
  'Concrete repair',
  'Sealant / waterproofing',
  'Confined-space entry work',
  'Survey / measurement',
  'Photography / media',
  'Demolition / removal',
  'Rescue / recovery',
] as const;

export const ACCESS_METHOD_PRESETS = [
  'Two-rope access',
  'Work positioning (with backup)',
  'Fall restraint',
  'Fall arrest',
  'Aid climb',
  'Rope-to-rope / deviation',
  'Rescue cover / standby',
] as const;

export const STRUCTURE_PRESETS = [
  'Building / façade',
  'Wind turbine',
  'Communications tower / mast',
  'Industrial chimney / flare stack',
  'Bridge / viaduct',
  'Dam / lock',
  'Tank / vessel / silo',
  'Offshore platform / FPSO',
  'Stadium / arena roof',
  'Crane / gantry',
  'Theatrical / event rig',
  'Ship / hull',
  'Pipe rack / process plant',
  'Natural feature',
] as const;

// Re-exported so all four chip vocabularies live in one module.
export { HAZARD_PRESETS };

// Work-task presets removed in the 2026-05-24 taxonomy fix because they
// double-encoded the locked entry_kind enum / rescue_cover field. They must
// NEVER resurface as "recent custom" suggestions, or the audit fix is silently
// undone for any user with historical entries that used them.
export const REMOVED_WORK_TASK_PRESETS = ['Training', 'Assessment', 'Rescue standby'] as const;

export const CUSTOM_VALUE_MAX_LENGTH = 64;

export type ClassificationField = 'work_task' | 'access_method' | 'structure_type';

const PRESETS_BY_FIELD: Record<ClassificationField, readonly string[]> = {
  work_task: WORK_TASK_PRESETS,
  access_method: ACCESS_METHOD_PRESETS,
  structure_type: STRUCTURE_PRESETS,
};

const REMOVED_WORK_TASK_LOWER = new Set(REMOVED_WORK_TASK_PRESETS.map((p) => p.toLowerCase()));

export function isPresetValue(field: ClassificationField, value: string): boolean {
  const v = value.trim().toLowerCase();
  return PRESETS_BY_FIELD[field].some((p) => p.toLowerCase() === v);
}

// True when a historical value must not appear as a "recent custom" suggestion:
// blank, a current preset (already shown as a chip), or a removed work-task preset.
export function isSuppressedRecent(field: ClassificationField, value: string): boolean {
  const v = value.trim().toLowerCase();
  if (v.length === 0) return true;
  if (isPresetValue(field, value)) return true;
  if (field === 'work_task' && REMOVED_WORK_TASK_LOWER.has(v)) return true;
  return false;
}

// Filters raw recency-ordered DB values down to the custom values worth
// suggesting: drops suppressed entries, dedupes case-insensitively (keeping the
// first/most-recent casing), and caps the count.
export function filterRecentValues(
  field: ClassificationField,
  rawOrderedByRecency: readonly string[],
  cap: number,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of rawOrderedByRecency) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    if (isSuppressedRecent(field, trimmed)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= cap) break;
  }
  return out;
}

// Filters raw recency-ordered hazard values: drops blanks + current hazard
// presets, dedupes case-insensitively, caps.
const HAZARD_PRESETS_LOWER = new Set(HAZARD_PRESETS.map((p) => p.toLowerCase()));

export function filterRecentHazards(rawOrderedByRecency: readonly string[], cap: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of rawOrderedByRecency) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (key.length === 0 || seen.has(key) || HAZARD_PRESETS_LOWER.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= cap) break;
  }
  return out;
}
