import {
  WORK_TASK_PRESETS,
  ACCESS_METHOD_PRESETS,
  STRUCTURE_PRESETS,
  REMOVED_WORK_TASK_PRESETS,
  isPresetValue,
  isSuppressedRecent,
  filterRecentValues,
  CUSTOM_VALUE_MAX_LENGTH,
} from '@/src/domain/logbook/classification';

describe('classification vocabularies', () => {
  it('does not contain the removed entry_kind-conflating presets', () => {
    for (const removed of REMOVED_WORK_TASK_PRESETS) {
      expect(WORK_TASK_PRESETS as readonly string[]).not.toContain(removed);
    }
  });

  it('matches presets case-insensitively', () => {
    expect(isPresetValue('work_task', 'inspection (visual)')).toBe(true);
    expect(isPresetValue('work_task', 'Inspection (visual)')).toBe(true);
    expect(isPresetValue('work_task', 'Cathodic protection survey')).toBe(false);
  });

  it('suppresses presets, blanks, and removed presets from recents', () => {
    expect(isSuppressedRecent('work_task', '')).toBe(true);
    expect(isSuppressedRecent('work_task', 'NDT / testing')).toBe(true); // current preset
    expect(isSuppressedRecent('work_task', 'Training')).toBe(true); // removed preset
    expect(isSuppressedRecent('work_task', 'training')).toBe(true); // case-insensitive
    expect(isSuppressedRecent('work_task', 'Cathodic protection survey')).toBe(false);
  });

  it('filterRecentValues drops suppressed entries, dedupes case-insensitively, and caps', () => {
    const raw = ['Cathodic protection survey', 'Training', 'NDT / testing', 'cathodic protection survey', 'Tensile test'];
    expect(filterRecentValues('work_task', raw, 8)).toEqual([
      'Cathodic protection survey',
      'Tensile test',
    ]);
    expect(filterRecentValues('work_task', ['a', 'b', 'c'], 2)).toEqual(['a', 'b']);
  });

  it('exposes a 64-char custom cap', () => {
    expect(CUSTOM_VALUE_MAX_LENGTH).toBe(64);
  });
});
