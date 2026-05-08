import { createTestClient } from '../setup';
import { createLogbookService } from '@/src/domain/logbook/logbook-service';
import { CreateEntryInput } from '@/src/domain/logbook/types';

let mockUuidCounter = 0;

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) => `sha256:${value.length}`),
  randomUUID: jest.fn(() => {
    mockUuidCounter += 1;
    return `00000000-0000-4000-8000-${String(mockUuidCounter).padStart(12, '0')}`;
  }),
}));

function draftInput(overrides: Partial<CreateEntryInput> = {}): CreateEntryInput {
  return {
    employer: 'Northwind Rope',
    site: 'Bridge 12',
    client: 'City Works',
    description: 'Inspected anchor array and installed edge protection.',
    work_hours: 7.5,
    work_task: 'Inspection',
    access_method: 'Two-rope access',
    structure_type: 'Bridge',
    max_height: 120,
    height_unit: 'ft',
    sprat_level_snapshot: 'II',
    ...overrides,
  };
}

describe('logbook service', () => {
  beforeEach(() => {
    mockUuidCounter = 0;
  });

  it('creates a draft entry and includes it in dashboard totals', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);

    const entry = await service.createDraft(draftInput());

    expect(entry.status).toBe('draft');
    expect(entry.work_hours).toBe(7.5);

    const entries = await service.listEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].site).toBe('Bridge 12');

    const summary = await service.getDashboardSummary();
    expect(summary.totalEntries).toBe(1);
    expect(summary.draftEntries).toBe(1);
    expect(summary.signedEntries).toBe(0);
    expect(summary.amendedEntries).toBe(0);
    expect(summary.pendingSignatureRequests).toBe(0);
    expect(summary.draftHours).toBe(7.5);
    expect(summary.signedHours).toBe(0);
  });

  it('locally signs a draft, stores a hash, and locks the entry', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput());

    const detail = await service.signEntryLocal({
      entry_id: entry.id,
      supervisor_name: 'Jordan Lee',
      supervisor_cert_number: 'SPRAT-1234',
      signature_path: 'M 100 200 L 300 160',
      attestation_accepted: true,
      signer_attestation: 'Verified in person.',
      signed_at: '2026-05-08T10:00:00.000Z',
    });

    expect(detail.entry.status).toBe('signed');
    expect(detail.signature).toEqual(
      expect.objectContaining({
        entry_id: entry.id,
        supervisor_name: 'Jordan Lee',
        supervisor_cert_number: 'SPRAT-1234',
        method: 'local',
        hash_version: 2,
        signer_attestation: 'Verified in person.',
        signature_path: 'M 100 200 L 300 160',
        attestation_accepted_at: '2026-05-08T10:00:00.000Z',
      }),
    );
    expect(detail.signature?.entry_hash).toMatch(/^sha256:/);

    await expect(
      service.signEntryLocal({
        entry_id: entry.id,
        supervisor_name: 'Another Supervisor',
        supervisor_cert_number: 'IRATA-9999',
        signature_path: 'M 100 200 L 300 160',
        attestation_accepted: true,
      }),
    ).rejects.toThrow('entry_not_signable');

    const summary = await service.getDashboardSummary();
    expect(summary.draftEntries).toBe(0);
    expect(summary.signedEntries).toBe(1);
    expect(summary.pendingSignatureRequests).toBe(0);
    expect(summary.draftHours).toBe(0);
    expect(summary.signedHours).toBe(7.5);
  });

  it('signs an amendment draft and marks the original as amended', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const original = await service.createDraft(draftInput({ description: 'Original description.', work_hours: 8 }));

    await service.signEntryLocal({
      entry_id: original.id,
      supervisor_name: 'Jordan Lee',
      supervisor_cert_number: 'SPRAT-1234',
      signature_path: 'M 100 200 L 300 160',
      attestation_accepted: true,
    });

    const amendment = await service.createAmendmentDraft({
      entry_id: original.id,
      employer: 'Northwind Rope',
      site: 'Bridge 12',
      client: 'City Works',
      description: 'Corrected description.',
      work_hours: 6,
      work_task: 'Inspection',
      access_method: 'Two-rope access',
      structure_type: 'Bridge',
      max_height: 120,
      height_unit: 'ft',
      sprat_level_snapshot: 'II',
    });

    expect(amendment.status).toBe('draft');
    expect(amendment.amends_entry_id).toBe(original.id);

    await service.signEntryLocal({
      entry_id: amendment.id,
      supervisor_name: 'Taylor Smith',
      supervisor_cert_number: 'IRATA-4321',
      signature_path: 'M 140 210 L 340 170',
      attestation_accepted: true,
    });

    const originalDetail = await service.getEntryDetail(original.id);
    const amendmentDetail = await service.getEntryDetail(amendment.id);
    const summary = await service.getDashboardSummary();

    expect(originalDetail?.entry.status).toBe('amended');
    expect(amendmentDetail?.entry.status).toBe('signed');
    expect(summary.totalEntries).toBe(2);
    expect(summary.signedEntries).toBe(1);
    expect(summary.amendedEntries).toBe(1);
    expect(summary.signedHours).toBe(6);
  });

  it('requires a drawn signature and accepted attestation before local signing', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput({ description: 'Inspected anchor array.', work_hours: 4 }));

    await expect(
      service.signEntryLocal({
        entry_id: entry.id,
        supervisor_name: 'Jordan Lee',
        supervisor_cert_number: 'SPRAT-1234',
        signature_path: '',
        attestation_accepted: true,
      }),
    ).rejects.toThrow('signature_required');

    await expect(
      service.signEntryLocal({
        entry_id: entry.id,
        supervisor_name: 'Jordan Lee',
        supervisor_cert_number: 'SPRAT-1234',
        signature_path: 'M 100 200 L 300 160',
        attestation_accepted: false,
      }),
    ).rejects.toThrow('attestation_required');

    const unchanged = await service.getEntryDetail(entry.id);
    expect(unchanged?.entry.status).toBe('draft');
    expect(unchanged?.signature).toBeNull();
  });

  it('creates one pending remote signature request for a draft entry', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput({ description: 'Inspected anchor array.', work_hours: 4 }));

    const detail = await service.createRemoteSignatureRequest({
      entry_id: entry.id,
      recipient_name: 'Jordan Lee',
      recipient_contact: 'jordan@example.com',
      verifier_role: 'SPRAT L3',
      verifier_company: 'Northwind Rope',
    });

    expect(detail.entry.pending_signature_id).toBe(detail.remote_request?.id);
    expect(detail.remote_request).toEqual(
      expect.objectContaining({
        entry_id: entry.id,
        recipient_name: 'Jordan Lee',
        recipient_contact: 'jordan@example.com',
        verifier_role: 'SPRAT L3',
        verifier_company: 'Northwind Rope',
        status: 'pending',
        hash_version: 2,
      }),
    );
    expect(detail.remote_request?.request_code).toHaveLength(10);
    expect(detail.remote_request?.entry_hash).toMatch(/^sha256:/);

    const repeated = await service.createRemoteSignatureRequest({
      entry_id: entry.id,
      recipient_name: 'Another Verifier',
      recipient_contact: 'another@example.com',
    });
    expect(repeated.remote_request?.id).toBe(detail.remote_request?.id);

    const summary = await service.getDashboardSummary();
    expect(summary.pendingSignatureRequests).toBe(1);
  });

  it('cancels a pending remote request when the entry is locally signed', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput({ description: 'Inspected anchor array.', work_hours: 4 }));

    await service.createRemoteSignatureRequest({
      entry_id: entry.id,
      recipient_name: 'Jordan Lee',
      recipient_contact: 'jordan@example.com',
    });

    const signed = await service.signEntryLocal({
      entry_id: entry.id,
      supervisor_name: 'Taylor Smith',
      supervisor_cert_number: 'IRATA-4321',
      signature_path: 'M 140 210 L 340 170',
      attestation_accepted: true,
    });
    const rows = await db.getAll<{ status: string }>(
      'SELECT status FROM remote_signature_requests WHERE entry_id = ?',
      [entry.id],
    );
    const summary = await service.getDashboardSummary();

    expect(signed.entry.pending_signature_id).toBeNull();
    expect(rows).toEqual([{ status: 'cancelled' }]);
    expect(summary.pendingSignatureRequests).toBe(0);
  });

  it('blocks verification when scheme work-log fields are incomplete', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput({ work_task: '', max_height: 0 }));

    await expect(
      service.createRemoteSignatureRequest({
        entry_id: entry.id,
        recipient_name: 'Jordan Lee',
        recipient_contact: 'jordan@example.com',
      }),
    ).rejects.toThrow('entry_incomplete');

    await expect(
      service.signEntryLocal({
        entry_id: entry.id,
        supervisor_name: 'Jordan Lee',
        supervisor_cert_number: 'SPRAT-1234',
        signature_path: 'M 100 200 L 300 160',
        attestation_accepted: true,
      }),
    ).rejects.toThrow('entry_incomplete');
  });
});
