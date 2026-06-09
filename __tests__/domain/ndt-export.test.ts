import { buildNdtCsvRows, buildNdtPdfHtml } from '@/src/domain/ndt/ndt-export';
import type { NdtInspection, NdtSignature } from '@/src/domain/ndt/types';

// These builders only FORMAT data — they never hash — so the test constructs
// plain literals and needs neither a service nor the expo-crypto mock.

function inspection(overrides: Partial<NdtInspection> = {}): NdtInspection {
  return {
    id: 'ndt_1',
    date_from: '2026-06-01',
    date_to: '2026-06-01',
    method: 'UT',
    technique: 'PA',
    ndt_level_snapshot: 'II',
    supervised: 'independent',
    hours: 4,
    site: 'Platform A',
    client: 'NorthOil',
    employer: 'Acme NDT',
    procedure_ref: 'PROC-UT-01',
    component: 'Weld seam',
    ndt_scheme: 'ISO 9712',
    description: null,
    linked_entry_id: null,
    status: 'logged',
    amends_inspection_id: null,
    pending_signature_id: null,
    timezone_offset: 0,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function signature(overrides: Partial<NdtSignature> = {}): NdtSignature {
  return {
    id: 'ndtsig_1',
    inspection_id: 'ndt_1',
    verifier_name: 'Dana L3',
    verifier_cert_number: 'L3-UT-9001',
    verifier_level: 'III',
    verifier_scheme: 'ISO 9712',
    verifier_employer: 'Acme NDT',
    signed_at: '2026-06-02T00:00:00.000Z',
    inspection_hash: 'hash',
    hash_version: 1,
    method: 'local',
    remote_request_id: null,
    signer_attestation: null,
    signature_path: 'M0 0 L1 1',
    attestation_accepted_at: '2026-06-02T00:00:00.000Z',
    previous_chain_hash: null,
    chain_hash: 'chain',
    created_at: '2026-06-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildNdtCsvRows', () => {
  it('carries the NDT columns and leaves verifier_* blank when unverified', () => {
    const rows = buildNdtCsvRows([inspection()]);
    expect(rows).toHaveLength(1);
    const r = rows[0];

    // Required NDT columns present.
    expect(r).toHaveProperty('method', 'UT');
    expect(r).toHaveProperty('technique', 'PA');
    expect(r).toHaveProperty('ndt_level', 'II');
    expect(r).toHaveProperty('supervised', 'independent');
    expect(r).toHaveProperty('hours', 4);
    expect(r).toHaveProperty('procedure_ref', 'PROC-UT-01');
    expect(r).toHaveProperty('scheme', 'ISO 9712');
    expect(r).toHaveProperty('verification_state');
    expect(r).toHaveProperty('verifier_name');
    expect(r).toHaveProperty('verifier_cert');

    // Self-logged (no signature) → state label and empty verifier fields.
    expect(r.verification_state).toBe('Self-logged');
    expect(r.verifier_name).toBe('');
    expect(r.verifier_cert).toBe('');
  });

  it('maps verification states to neutral labels (no qualified/eligible/certified)', () => {
    const draft = buildNdtCsvRows([inspection({ id: 'a', status: 'draft' })])[0];
    const logged = buildNdtCsvRows([inspection({ id: 'b', status: 'logged' })])[0];
    const pending = buildNdtCsvRows([inspection({ id: 'c', status: 'pending' })])[0];
    expect(draft.verification_state).toBe('Draft');
    expect(logged.verification_state).toBe('Self-logged');
    expect(pending.verification_state).toBe('Pending verification');
  });

  it('populates verifier_* only when a signature exists', () => {
    const insp = inspection({ id: 'ndt_1', status: 'verified' });
    const rows = buildNdtCsvRows([insp], { ndt_1: signature() });
    expect(rows[0].verification_state).toBe('Verified');
    expect(rows[0].verifier_name).toBe('Dana L3');
    expect(rows[0].verifier_cert).toBe('L3-UT-9001');
  });
});

describe('buildNdtPdfHtml', () => {
  it('labels a SEPARATE self-maintained NDT section and never claims a requirement is met', () => {
    const html = buildNdtPdfHtml([inspection({ id: 'x', hours: 6 }), inspection({ id: 'y', hours: 4 })]);

    expect(html).toContain('NDT experience (self-maintained)');
    expect(html).toMatch(/pending verification by the NDT Level III/i);

    // Forbidden claim language must NOT appear anywhere.
    for (const banned of ['qualified', 'eligible', 'requirement met', 'certified', 'accepted']) {
      expect(html.toLowerCase()).not.toContain(banned);
    }
  });

  it('presents NDT method hours as their own totals with no summing against any rope figure', () => {
    // Two inspections totalling 10 NDT hours. The builder takes NO rope figure
    // and must surface 10 as the NDT total — never a combined number.
    const html = buildNdtPdfHtml([inspection({ id: 'x', hours: 6 }), inspection({ id: 'y', hours: 4 })]);

    // The builder signature accepts only NDT data — (inspections, signaturesById?).
    // It takes no rope figure, so nothing can be summed across the boundary.
    // (Function.length counts only params before the first default, so the
    // optional signaturesById makes it 1; assert it never grows a 2nd required
    // arg that could carry a rope total.)
    expect(buildNdtPdfHtml.length).toBeLessThanOrEqual(1);

    // NDT-only total of 10 hrs is surfaced as its own figure.
    expect(html).toContain('10 h');
    // ...and the builder output never references rope-access hours.
    expect(html.toLowerCase()).not.toContain('rope access hours');
  });

  it('does not double-count an amendment pair in the totals', () => {
    // An NDT amendment leaves the original as `amended` (still has its hours +
    // signature) and the correction as `verified`. The totals must count the
    // job ONCE — matching getSummary, which excludes `amended` (and `draft`).
    const original = inspection({ id: 'orig', status: 'amended', hours: 4 });
    const amendment = inspection({ id: 'amd', status: 'verified', hours: 4 });
    const html = buildNdtPdfHtml([original, amendment]);

    // Truth is 4 (one job), not 8 (double-counted).
    expect(html).toContain('NDT total</th><td>4 h');
    expect(html).not.toContain('NDT total</th><td>8 h');
  });

  it('excludes draft hours from the totals but still lists the record', () => {
    const draft = inspection({ id: 'd', status: 'draft', hours: 5, site: 'Drydock' });
    const html = buildNdtPdfHtml([draft]);
    expect(html).toContain('NDT total</th><td>0 h');
    // The draft record is still listed (provenance), just not summed.
    expect(html).toContain('Drydock');
    expect(html).toContain('Draft');
  });
});
