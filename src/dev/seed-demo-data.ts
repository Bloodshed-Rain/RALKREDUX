/**
 * DEV-ONLY demo-data seeder for App Store screenshots.
 *
 * Drives the real domain services, so signed entries carry genuine entry
 * hashes and an intact signature chain — exactly what the screenshots should
 * show. Never imported outside `__DEV__` guards (see app/account.tsx); the
 * production bundle tree-shakes it out via the conditional require.
 *
 * All people, companies, and certificate numbers below are fictional.
 */
import { getClient } from '@/src/db/initialize';
import { createLogbookService } from '@/src/domain/logbook/logbook-service';
import { createGearService } from '@/src/domain/gear/gear-service';
import { createNdtService } from '@/src/domain/ndt/ndt-service';
import { createProfileService } from '@/src/domain/profile/profile-service';
import type { CreateEntryInput } from '@/src/domain/logbook/types';
import type { CreateGearItemInput, RecordGearInspectionInput } from '@/src/domain/gear/types';
import type { CreateNdtInspectionInput } from '@/src/domain/ndt/types';

/** ISO date string `days` ago (local). */
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** ISO date string `days` ahead (local). */
function daysAhead(days: number): string {
  return daysAgo(-days);
}

/** Plausible hand-drawn signature scrawls (SVG paths). */
const SCRAWLS = [
  'M 24 96 C 48 30, 70 128, 96 58 S 138 92, 162 44 C 178 18, 196 88, 226 62 S 268 40, 296 70',
  'M 20 78 C 52 120, 64 28, 92 72 S 130 110, 158 52 C 184 6, 198 96, 234 70 L 300 56',
  'M 28 88 C 40 40, 84 36, 96 84 S 142 116, 170 60 C 196 16, 228 94, 252 58 S 286 44, 308 66',
  'M 22 70 C 60 116, 76 24, 110 64 S 150 96, 178 48 C 210 4, 224 100, 262 64',
];

interface Supervisor {
  name: string;
  scheme: 'sprat' | 'irata' | 'site';
  cert: string;
  role?: string;
  employer?: string;
}

const SUPERVISORS: Supervisor[] = [
  { name: 'R. Calloway', scheme: 'sprat', cert: '8841205' },
  { name: 'M. Okafor', scheme: 'irata', cert: '1/54902' },
  { name: 'J. Whitfield', scheme: 'sprat', cert: '7720318' },
  { name: 'D. Reyes', scheme: 'site', cert: '', role: 'Site supervisor', employer: 'Meridian Industrial' },
];

type EntrySeed = {
  input: CreateEntryInput;
  sign: number | null; // index into SUPERVISORS, or null to leave as draft
};

const ENTRY_SEEDS: EntrySeed[] = [
  {
    input: {
      employer: 'Meridian Industrial Access',
      site: 'Wind farm sector 7 — turbine W-114',
      client: 'Boreal Energy',
      description: 'Blade leading-edge inspection and minor filler repair, both ropes rigged from nacelle anchor points with deviation at mid-span.',
      work_hours: 6.5, work_task: 'Inspection', access_method: 'Two-rope descent',
      work_task_list: ['Inspection', 'Surface repair'], access_method_list: ['Two-rope descent', 'Deviation'],
      structure_type: 'Wind turbine', max_height: 118, height_unit: 'm',
      hazards: ['Weather exposure', 'Dropped objects', 'Rotating machinery (locked out)'],
      rescue_cover: 'Standby L3 with pre-rigged lowering system at nacelle.',
      sprat_level_snapshot: 'II', entry_kind: 'work',
      date_from: daysAgo(84), date_to: daysAgo(84),
    },
    sign: 0,
  },
  {
    input: {
      employer: 'Meridian Industrial Access',
      site: 'Cooling tower 3 — interior shell',
      client: 'Lakeside Power',
      description: 'Interior concrete spall survey on descent lines; marked delaminations for follow-up crew and photographed defects.',
      work_hours: 7.0, work_task: 'Inspection', access_method: 'Two-rope descent',
      work_task_list: ['Inspection'], access_method_list: ['Two-rope descent'],
      structure_type: 'Cooling tower', max_height: 96, height_unit: 'm',
      hazards: ['Confined space (top access)', 'Poor visibility', 'Falling debris'],
      rescue_cover: 'Rescue kit staged at rim; two-tech buddy descent.',
      sprat_level_snapshot: 'II', entry_kind: 'work',
      date_from: daysAgo(77), date_to: daysAgo(76),
    },
    sign: 1,
  },
  {
    input: {
      employer: 'Meridian Industrial Access',
      site: 'Harbor bridge — north pylon',
      client: 'Port Authority',
      description: 'Bolt torque verification on upper chord connections, aid climbing along lattice with fall-arrest transfer at panel points.',
      work_hours: 8.0, work_task: 'Bolting / torquing', access_method: 'Aid climbing',
      work_task_list: ['Bolting / torquing', 'Inspection'], access_method_list: ['Aid climbing', 'Rope transfer'],
      structure_type: 'Bridge', max_height: 87, height_unit: 'm',
      hazards: ['Traffic below', 'Wind', 'Pinch points'],
      rescue_cover: 'Pick-off kit carried; rescue plan briefed at toolbox talk.',
      sprat_level_snapshot: 'II', entry_kind: 'work',
      date_from: daysAgo(63), date_to: daysAgo(61),
    },
    sign: 2,
  },
  {
    input: {
      employer: 'Meridian Industrial Access',
      site: 'Refinery flare stack FS-2',
      client: 'Gulf Petrochem',
      description: 'UT thickness survey support: rigging rope protection, moving anchor stations, and tending lines for the inspection technician.',
      work_hours: 9.0, work_task: 'Rigging', access_method: 'Two-rope descent',
      work_task_list: ['Rigging', 'Rope tending'], access_method_list: ['Two-rope descent'],
      structure_type: 'Stack', max_height: 76, height_unit: 'm',
      hazards: ['Hot surfaces', 'H2S zones (monitored)', 'Dropped objects'],
      rescue_cover: 'Dedicated standby rescue tech at grade.',
      sprat_level_snapshot: 'II', entry_kind: 'work',
      date_from: daysAgo(49), date_to: daysAgo(48),
    },
    sign: 0,
  },
  {
    input: {
      employer: 'Meridian Industrial Access',
      site: 'Training center — tower bay 2',
      client: 'Meridian Industrial Access',
      description: 'Quarterly rescue drill: mid-rope casualty pick-off, descent with casualty, and handover to ground team. Timed within target.',
      work_hours: 4.0, work_task: 'Rescue drill', access_method: 'Two-rope descent',
      work_task_list: ['Rescue drill'], access_method_list: ['Two-rope descent', 'Pick-off'],
      structure_type: 'Training structure', max_height: 18, height_unit: 'm',
      hazards: ['Suspension intolerance (drill scenario)'],
      rescue_cover: 'Instructor-supervised drill; ground crew on belay.',
      sprat_level_snapshot: 'II', entry_kind: 'rescue_drill',
      date_from: daysAgo(42), date_to: daysAgo(42),
    },
    sign: 3,
  },
  {
    input: {
      employer: 'Meridian Industrial Access',
      site: 'Grain terminal silo row C',
      client: 'Prairie AgExport',
      description: 'Sealant replacement on roof-to-wall joints; negative edge transitions with rope protection at parapet.',
      work_hours: 7.5, work_task: 'Sealant / coatings', access_method: 'Two-rope descent',
      work_task_list: ['Sealant / coatings'], access_method_list: ['Two-rope descent', 'Negative edge'],
      structure_type: 'Silo', max_height: 41, height_unit: 'm',
      hazards: ['Grain dust', 'Edge loading'],
      rescue_cover: 'Pre-rigged retrieval line on each drop.',
      sprat_level_snapshot: 'II', entry_kind: 'work',
      date_from: daysAgo(35), date_to: daysAgo(34),
    },
    sign: 1,
  },
  {
    input: {
      employer: 'Meridian Industrial Access',
      site: 'Stadium roof — east cable net',
      client: 'Civic Facilities Board',
      description: 'LED fixture changeout along catenary cables; horizontal aid traverse with twin lanyards, tools on individual drops.',
      work_hours: 6.0, work_task: 'Mechanical / electrical', access_method: 'Aid traverse',
      work_task_list: ['Mechanical / electrical'], access_method_list: ['Aid traverse'],
      structure_type: 'Stadium roof', max_height: 54, height_unit: 'm',
      hazards: ['Public below (exclusion zone)', 'Live event schedule pressure'],
      rescue_cover: 'Rescue plan posted; horizontal retrieval kit on site.',
      sprat_level_snapshot: 'II', entry_kind: 'work',
      date_from: daysAgo(27), date_to: daysAgo(27),
    },
    sign: 2,
  },
  {
    input: {
      employer: 'Meridian Industrial Access',
      site: 'Offshore jacket — platform Kestrel A',
      client: 'North Basin Operators',
      description: 'Splash-zone anode survey from boat landing level; tidal window work with standby vessel, full PFD over harness.',
      work_hours: 5.5, work_task: 'Inspection', access_method: 'Two-rope descent',
      work_task_list: ['Inspection'], access_method_list: ['Two-rope descent'],
      structure_type: 'Offshore structure', max_height: 22, height_unit: 'm',
      hazards: ['Working over water', 'Tidal window', 'Marine growth (slips)'],
      rescue_cover: 'FRC on standby; man-overboard procedure briefed.',
      sprat_level_snapshot: 'II', entry_kind: 'work',
      date_from: daysAgo(20), date_to: daysAgo(19),
    },
    sign: 0,
  },
  {
    input: {
      employer: 'Meridian Industrial Access',
      site: 'Training center — tower bay 1',
      client: 'Meridian Industrial Access',
      description: 'L3 mentorship session: advanced rigging (tensioned lines, deviations, re-anchors) ahead of level III assessment.',
      work_hours: 6.0, work_task: 'Training', access_method: 'Rope transfer',
      work_task_list: ['Training', 'Rigging'], access_method_list: ['Rope transfer', 'Re-anchor'],
      structure_type: 'Training structure', max_height: 18, height_unit: 'm',
      hazards: [],
      rescue_cover: 'Instructor supervision throughout.',
      sprat_level_snapshot: 'II', entry_kind: 'training',
      date_from: daysAgo(13), date_to: daysAgo(13),
    },
    sign: 3,
  },
  {
    input: {
      employer: 'Meridian Industrial Access',
      site: 'Cement plant preheater tower',
      client: 'Stonebridge Cement',
      description: 'Refractory anchor inspection in cyclone 4 during outage; rope access through inspection ports, confined-space permit in force.',
      work_hours: 8.5, work_task: 'Inspection', access_method: 'Two-rope descent',
      work_task_list: ['Inspection'], access_method_list: ['Two-rope descent'],
      structure_type: 'Industrial tower', max_height: 68, height_unit: 'm',
      hazards: ['Confined space', 'Residual heat', 'Silica dust'],
      rescue_cover: 'Confined-space rescue team on permit; tripod staged.',
      sprat_level_snapshot: 'II', entry_kind: 'work',
      date_from: daysAgo(8), date_to: daysAgo(7),
    },
    sign: 1,
  },
  {
    input: {
      employer: 'Meridian Industrial Access',
      site: 'Telecom mast — ridge site 9',
      client: 'SummitCom',
      description: 'Antenna alignment and feeder check; lead climbing with fixed anchors, tools tethered.',
      work_hours: 5.0, work_task: 'Mechanical / electrical', access_method: 'Lead climbing',
      work_task_list: ['Mechanical / electrical'], access_method_list: ['Lead climbing'],
      structure_type: 'Tower / mast', max_height: 45, height_unit: 'm',
      hazards: ['RF exposure (power-down confirmed)', 'Weather exposure'],
      rescue_cover: 'Pick-off kit carried; partner rescue briefed.',
      sprat_level_snapshot: 'II', entry_kind: 'work',
      date_from: daysAgo(3), date_to: daysAgo(3),
    },
    sign: null, // awaiting signature — shows the draft/pending state
  },
  {
    input: {
      employer: 'Meridian Industrial Access',
      site: 'Hydro dam spillway face',
      client: 'River Basin Authority',
      description: 'Crack mapping on spillway concrete; long free-hanging descents from crest anchors with mid-face re-belays.',
      work_hours: 7.0, work_task: 'Inspection', access_method: 'Two-rope descent',
      work_task_list: ['Inspection'], access_method_list: ['Two-rope descent', 'Re-anchor'],
      structure_type: 'Dam', max_height: 92, height_unit: 'm',
      hazards: ['Spill gates (locked out)', 'Long drops'],
      rescue_cover: 'Powered ascender rescue kit at crest.',
      sprat_level_snapshot: 'II', entry_kind: 'work',
      date_from: daysAgo(1), date_to: daysAgo(1),
    },
    sign: null, // today's draft
  },
];

type GearSeed = {
  item: CreateGearItemInput;
  inspection: Omit<RecordGearInspectionInput, 'gear_id'> | null;
};

const GEAR_SEEDS: GearSeed[] = [
  {
    item: { name: 'Full-body harness', category: 'harness', manufacturer: 'NorthLine', model: 'Vertex Pro', serial_number: 'NL-VP-22841' },
    inspection: { result: 'pass', inspected_on: daysAgo(21), notes: 'Stitching, webbing, and D-rings all serviceable.', next_inspection_due: daysAhead(160), inspector_name: 'R. Calloway', inspector_cert_number: '8841205' },
  },
  {
    item: { name: 'Helmet', category: 'helmet', manufacturer: 'NorthLine', model: 'Crown II', serial_number: 'NL-CR-09112' },
    inspection: { result: 'pass', inspected_on: daysAgo(21), notes: 'Shell and cradle sound; chinstrap buckle OK.', next_inspection_due: daysAhead(160), inspector_name: 'R. Calloway', inspector_cert_number: '8841205' },
  },
  {
    item: { name: 'Working rope 11mm × 60m', category: 'rope', manufacturer: 'Apex Cordage', model: 'StaticLine 11', serial_number: 'AC-SL-60-7731' },
    inspection: { result: 'pass', inspected_on: daysAgo(14), notes: 'Full-length tactile check; sheath uniform, no core deformation.', next_inspection_due: daysAhead(170), inspector_name: 'M. Okafor', inspector_cert_number: '1/54902' },
  },
  {
    item: { name: 'Safety rope 11mm × 60m', category: 'rope', manufacturer: 'Apex Cordage', model: 'StaticLine 11', serial_number: 'AC-SL-60-7732' },
    inspection: { result: 'pass_with_concerns', inspected_on: daysAgo(14), notes: 'Light sheath fuzzing 4–6m from end A. Downgraded to non-critical drops; re-check at next inspection.', next_inspection_due: daysAhead(18), inspector_name: 'M. Okafor', inspector_cert_number: '1/54902' },
  },
  {
    item: { name: 'Descender', category: 'descender', manufacturer: 'Vertik', model: 'D2 Auto-Lock', serial_number: 'VK-D2-33019' },
    inspection: { result: 'pass', inspected_on: daysAgo(21), notes: 'Cam wear within limits; auto-lock engages crisply.', next_inspection_due: daysAhead(160), inspector_name: 'R. Calloway', inspector_cert_number: '8841205' },
  },
  {
    item: { name: 'Chest ascender', category: 'ascender', manufacturer: 'Vertik', model: 'C-Clamp', serial_number: 'VK-CC-18077' },
    inspection: { result: 'pass', inspected_on: daysAgo(21), notes: 'Teeth clean, spring action positive.', next_inspection_due: daysAhead(160), inspector_name: 'R. Calloway', inspector_cert_number: '8841205' },
  },
  {
    item: { name: 'Twin lanyard with absorber', category: 'lanyard', manufacturer: 'NorthLine', model: 'TwinFlex 80', serial_number: 'NL-TF-55208' },
    inspection: { result: 'fail', inspected_on: daysAgo(5), notes: 'Energy absorber pouch torn with stitch pull-out visible. REMOVED FROM SERVICE — replacement ordered.', inspector_name: 'R. Calloway', inspector_cert_number: '8841205' },
  },
  {
    item: { name: 'HMS carabiner set (x6)', category: 'carabiner', manufacturer: 'Vertik', model: 'TriLock HMS', serial_number: 'VK-TL-BATCH-44' },
    inspection: { result: 'pass', inspected_on: daysAgo(14), notes: 'Gates self-close and triple-lock on all six.', next_inspection_due: daysAhead(170), inspector_name: 'M. Okafor', inspector_cert_number: '1/54902' },
  },
];

const NDT_SEEDS: Array<{ input: CreateNdtInspectionInput; sign: boolean }> = [
  {
    input: {
      date_from: daysAgo(49), date_to: daysAgo(48),
      method: 'UT', technique: 'Thickness gauging (0°)', ndt_level_snapshot: 'II',
      supervised: 'independent', hours: 9.0,
      site: 'Refinery flare stack FS-2', client: 'Gulf Petrochem', employer: 'Meridian Industrial Access',
      procedure_ref: 'MIA-UT-012 Rev C', component: 'Stack shell, elevations 30–70m',
      ndt_scheme: 'SNT-TC-1A',
      description: 'Grid thickness survey on rope; 240 readings logged, three areas below nominal flagged for engineering review.',
    },
    sign: true,
  },
  {
    input: {
      date_from: daysAgo(34), date_to: daysAgo(34),
      method: 'MT', technique: 'Yoke, AC, visible', ndt_level_snapshot: 'II',
      supervised: 'independent', hours: 6.0,
      site: 'Harbor bridge — north pylon', client: 'Port Authority', employer: 'Meridian Industrial Access',
      procedure_ref: 'MIA-MT-004 Rev B', component: 'Upper chord welds, panels N7–N11',
      ndt_scheme: 'SNT-TC-1A',
      description: 'Magnetic particle examination of fatigue-prone weld toes; no relevant indications.',
    },
    sign: true,
  },
  {
    input: {
      date_from: daysAgo(6), date_to: daysAgo(6),
      method: 'PT', technique: 'Solvent removable, visible', ndt_level_snapshot: 'II',
      supervised: 'supervised', hours: 4.5,
      site: 'Cement plant preheater tower', client: 'Stonebridge Cement', employer: 'Meridian Industrial Access',
      procedure_ref: 'MIA-PT-002 Rev A', component: 'Refractory anchor welds, cyclone 4',
      ndt_scheme: 'SNT-TC-1A',
      description: 'Dye penetrant on accessible anchor welds during outage window.',
    },
    sign: false,
  },
];

export interface SeedResult {
  entries: number;
  signedEntries: number;
  gearItems: number;
  ndtInspections: number;
  profileCreated: boolean;
}

/**
 * Idempotent-ish guard: refuses to run if the logbook already has entries, so
 * a stray double-tap can't double the dataset.
 */
export async function seedDemoData(): Promise<SeedResult> {
  const db = getClient();
  const logbook = createLogbookService(db);
  const gear = createGearService(db);
  const ndt = createNdtService(db);
  const profileService = createProfileService(db);

  const existing = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM entries');
  if ((existing?.n ?? 0) > 0) {
    throw new Error('seed_refused_logbook_not_empty');
  }

  let profileCreated = false;
  if (!(await profileService.getProfile())) {
    await profileService.createProfile({
      full_name: 'Casey Morgan',
      primary_scheme: 'sprat',
      sprat_id: '6630917',
      sprat_level: 'II',
      sprat_expires_on: daysAhead(540),
      irata_id: '1/88273',
      irata_level: 'II',
      irata_expires_on: daysAhead(480),
    });
    profileCreated = true;
  }

  let signedEntries = 0;
  for (const seed of ENTRY_SEEDS) {
    const draft = await logbook.createDraft(seed.input);
    if (seed.sign !== null) {
      const supervisor = SUPERVISORS[seed.sign];
      await logbook.signEntryLocal({
        entry_id: draft.id,
        supervisor_name: supervisor.name,
        supervisor_scheme: supervisor.scheme,
        supervisor_cert_number: supervisor.cert,
        supervisor_role: supervisor.role ?? null,
        supervisor_employer: supervisor.employer ?? null,
        signature_path: SCRAWLS[signedEntries % SCRAWLS.length],
        attestation_accepted: true,
        signer_attestation: 'Work witnessed as described.',
      });
      signedEntries += 1;
    }
  }

  for (const seed of GEAR_SEEDS) {
    const item = await gear.createGearItem(seed.item);
    if (seed.inspection) {
      await gear.recordInspection({ gear_id: item.id, ...seed.inspection });
    }
  }

  let ndtCount = 0;
  for (const seed of NDT_SEEDS) {
    const inspection = await ndt.createInspection(seed.input);
    if (seed.sign) {
      await ndt.signNdtLocal({
        inspection_id: inspection.id,
        verifier_name: 'A. Lindqvist',
        verifier_cert_number: 'UT-II-30417',
        verifier_level: 'III',
        verifier_scheme: 'SNT-TC-1A',
        verifier_employer: 'Meridian Industrial Access',
        signature_path: SCRAWLS[(ndtCount + 1) % SCRAWLS.length],
        attestation_accepted: true,
        signer_attestation: 'Results reviewed against procedure.',
      });
    }
    ndtCount += 1;
  }

  return {
    entries: ENTRY_SEEDS.length,
    signedEntries,
    gearItems: GEAR_SEEDS.length,
    ndtInspections: NDT_SEEDS.length,
    profileCreated,
  };
}
