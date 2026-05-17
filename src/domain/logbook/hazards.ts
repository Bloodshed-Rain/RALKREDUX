// Common rope-access hazards surfaced as picker presets on the new-entry /
// edit / amend forms. Users can pick zero, one, or many. The list is
// deliberately short — auditors care that hazards were recorded, not that
// every imaginable risk got its own checkbox. Free-form notes still live
// in the entry description.

export const HAZARD_PRESETS = [
  'Falling objects',
  'Live equipment',
  'Confined space',
  'Hot work',
  'Working at night',
  'Adverse weather',
  'Simultaneous traffic',
  'Public access',
  'Chemical exposure',
  'Biological',
] as const;

export type HazardLabel = (typeof HAZARD_PRESETS)[number];
