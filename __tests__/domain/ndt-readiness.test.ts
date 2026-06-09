import { getNdtInspectionReadiness } from '@/src/domain/ndt/ndt-readiness';
import { NdtInspection } from '@/src/domain/ndt/types';

const base = (o: Partial<NdtInspection> = {}): NdtInspection => ({
  id: 'n1', date_from: '2026-06-01', date_to: '2026-06-01', method: 'UT',
  technique: null, ndt_level_snapshot: 'II', supervised: 'independent', hours: 4,
  site: 'Site', client: null, employer: null, procedure_ref: null, component: null,
  ndt_scheme: null, description: null, linked_entry_id: null, status: 'draft',
  amends_inspection_id: null, pending_signature_id: null, timezone_offset: 0,
  created_at: 'x', updated_at: 'x', ...o,
});

it('is ready with required fields present', () => {
  expect(getNdtInspectionReadiness(base()).ready).toBe(true);
});
it('flags missing method, hours, site, level', () => {
  const r = getNdtInspectionReadiness(base({ hours: 0, site: '', ndt_level_snapshot: null, method: '' as any }));
  expect(r.ready).toBe(false);
  expect(r.missingFields).toEqual(expect.arrayContaining(['NDT method', 'NDT hours', 'site / job reference', 'NDT level held']));
});
