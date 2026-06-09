import { createNdtService } from '@/src/domain/ndt/ndt-service';
import { createTestClient } from '@/__tests__/setup';
import { verifyNdtChainHashFor } from '@/src/domain/ndt/ndt-hash';

let mockUuidCounter = 0;

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  // Content-sensitive (not length-only): folds content + position into the
  // digest so the chain round-trip assertions actually prove the stored
  // signature reproduces the sealed envelope, not merely a same-length string.
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) => {
    let h = 5381;
    for (let i = 0; i < value.length; i += 1) {
      h = ((h * 33) ^ value.charCodeAt(i)) >>> 0;
    }
    return `sha256:${value.length}:${h.toString(16)}`;
  }),
  // Unique per call so createId() never collides across multiple inserts.
  randomUUID: jest.fn(() => {
    mockUuidCounter += 1;
    return `00000000-0000-4000-8000-${String(mockUuidCounter).padStart(12, '0')}`;
  }),
}));

beforeEach(() => {
  mockUuidCounter = 0;
});

const draftInput = {
  date_from: '2026-06-01', date_to: '2026-06-01', method: 'UT' as const,
  ndt_level_snapshot: 'II' as const, supervised: 'independent' as const,
  hours: 4, site: 'Platform A',
};

it('creates a draft, logs it, and signs it into a verified hash-chained record', async () => {
  const db = await createTestClient();
  const svc = createNdtService(db);
  const draft = await svc.createInspection(draftInput);
  expect(draft.status).toBe('draft');

  const logged = await svc.markLogged(draft.id);
  expect(logged.status).toBe('logged');

  const detail = await svc.signNdtLocal({
    inspection_id: draft.id, verifier_name: 'Dana L3', verifier_cert_number: 'L3-UT-9001',
    verifier_level: 'III', signature_path: 'M0 0 L1 1', attestation_accepted: true,
  });
  expect(detail.inspection.status).toBe('verified');
  expect(detail.signature).toBeTruthy();
  expect(await verifyNdtChainHashFor({ inspection: detail.inspection, signature: detail.signature! })).toBe(true);
});

it('refuses to sign an inspection missing required fields', async () => {
  const db = await createTestClient();
  const svc = createNdtService(db);
  const draft = await svc.createInspection({ ...draftInput, hours: 0 });
  await expect(svc.signNdtLocal({
    inspection_id: draft.id, verifier_name: 'Dana', verifier_cert_number: 'L3',
    signature_path: 'M', attestation_accepted: true,
  })).rejects.toThrow();
});

it('chains a second NDT signature onto the first (independent of the rope-access chain)', async () => {
  const db = await createTestClient();
  const svc = createNdtService(db);
  const a = await svc.createInspection(draftInput);
  await svc.signNdtLocal({ inspection_id: a.id, verifier_name: 'Dana L3', verifier_cert_number: 'L3', signature_path: 'M', attestation_accepted: true });
  const b = await svc.createInspection({ ...draftInput, method: 'MT' });
  const bDetail = await svc.signNdtLocal({ inspection_id: b.id, verifier_name: 'Dana L3', verifier_cert_number: 'L3', signature_path: 'M', attestation_accepted: true });
  expect(bDetail.signature!.previous_chain_hash).toBeTruthy();
  expect(await verifyNdtChainHashFor({ inspection: bDetail.inspection, signature: bDetail.signature! })).toBe(true);
});

it('completes a remote NDT verification by code + token', async () => {
  const db = await createTestClient();
  const svc = createNdtService(db);
  const draft = await svc.createInspection(draftInput);
  await svc.markLogged(draft.id);
  const pending = await svc.createRemoteRequest({ inspection_id: draft.id, recipient_name: 'Dana L3' });
  expect(pending.inspection.status).toBe('pending');
  const code = pending.remote_request!.request_code;
  const token = `${code}.${pending.remote_request!.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const done = await svc.completeRemoteRequest({
    request_code: code, signing_token: token, verifier_name: 'Dana L3',
    verifier_cert_number: 'L3-UT-9001', verifier_level: 'III', signature_path: 'M', attestation_accepted: true,
  });
  expect(done.inspection.status).toBe('verified');
  expect(done.signature!.method).toBe('remote');
});

it('restores a cancelled remote request to logged, not draft', async () => {
  const db = await createTestClient();
  const svc = createNdtService(db);
  const draft = await svc.createInspection(draftInput);
  await svc.markLogged(draft.id);
  await svc.createRemoteRequest({ inspection_id: draft.id, recipient_name: 'Dana L3' });
  const cancelled = await svc.cancelRemoteRequest(draft.id);
  expect(cancelled.inspection.status).toBe('logged');
});

it('rejects edits to a verified inspection', async () => {
  const db = await createTestClient();
  const svc = createNdtService(db);
  const draft = await svc.createInspection(draftInput);
  await svc.signNdtLocal({ inspection_id: draft.id, verifier_name: 'Dana', verifier_cert_number: 'L3', signature_path: 'M', attestation_accepted: true });
  await expect(svc.updateInspection({ id: draft.id, hours: 9 })).rejects.toThrow();
});

it('summarises hours per method and splits verified vs self-logged', async () => {
  const db = await createTestClient();
  const svc = createNdtService(db);
  const a = await svc.createInspection({ ...draftInput, method: 'UT', hours: 4 });
  await svc.markLogged(a.id); // self-logged
  const b = await svc.createInspection({ ...draftInput, method: 'UT', hours: 6 });
  await svc.signNdtLocal({ inspection_id: b.id, verifier_name: 'DD', verifier_cert_number: 'L3', signature_path: 'M', attestation_accepted: true }); // verified
  const c = await svc.createInspection({ ...draftInput, method: 'MT', hours: 2 });
  await svc.signNdtLocal({ inspection_id: c.id, verifier_name: 'DD', verifier_cert_number: 'L3', signature_path: 'M', attestation_accepted: true });

  const s = await svc.getSummary();
  expect(s.verifiedHours).toBe(8);     // 6 UT + 2 MT
  expect(s.selfLoggedHours).toBe(4);   // 4 UT logged
  const ut = s.byMethod.find((m) => m.method === 'UT')!;
  expect(ut.hours).toBe(10);           // 4 + 6, all UT regardless of state
  const utVerified = s.byMethodVerified.find((m) => m.method === 'UT')!;
  expect(utVerified.hours).toBe(6);
});

it('drafts are excluded from accrued totals', async () => {
  const db = await createTestClient();
  const svc = createNdtService(db);
  await svc.createInspection({ ...draftInput, hours: 99 }); // stays draft
  const s = await svc.getSummary();
  expect(s.selfLoggedHours).toBe(0);
  expect(s.verifiedHours).toBe(0);
});
