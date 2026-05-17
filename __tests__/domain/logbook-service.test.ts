import { createTestClient } from '../setup';
import { createGearService } from '@/src/domain/gear/gear-service';
import { buildRemoteSigningToken, buildRemoteSigningUrl, createLogbookService } from '@/src/domain/logbook/logbook-service';
import { CreateEntryInput } from '@/src/domain/logbook/types';
import { createProfileService } from '@/src/domain/profile/profile-service';

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

  it('rejects inverted work date ranges before they can be signed', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);

    await expect(
      service.createDraft(draftInput({
        date_from: '2026-05-10',
        date_to: '2026-05-09',
      })),
    ).rejects.toThrow('entry_date_range_invalid');

    const entry = await service.createDraft(draftInput({
      date_from: '2026-05-09',
      date_to: '2026-05-10',
    }));

    await expect(
      service.updateDraft({
        ...draftInput({
          date_from: '2026-05-10',
          date_to: '2026-05-09',
        }),
        entry_id: entry.id,
      }),
    ).rejects.toThrow('entry_date_range_invalid');
  });

  it('updates an incomplete draft before signing', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput({
      client: '',
      description: '',
      work_task: 'Inspection',
      structure_type: '',
      max_height: 0,
    }));

    await expect(
      service.signEntryLocal({
        entry_id: entry.id,
        supervisor_name: 'Jordan Lee',
        supervisor_scheme: 'sprat',
        supervisor_cert_number: 'SPRAT-1234',
        signature_path: 'M 100 200 L 300 160',
        attestation_accepted: true,
      }),
    ).rejects.toThrow('entry_incomplete');

    const updated = await service.updateDraft({
      ...draftInput({
        site: 'Bridge 12 North',
        client: 'City Works',
        description: 'Finished anchor inspection and rescue plan review.',
        structure_type: 'Bridge',
        max_height: 140,
      }),
      entry_id: entry.id,
    });

    expect(updated.entry.site).toBe('Bridge 12 North');
    expect(updated.entry.client).toBe('City Works');
    expect(updated.entry.max_height).toBe(140);

    const signed = await service.signEntryLocal({
      entry_id: entry.id,
      supervisor_name: 'Jordan Lee',
      supervisor_scheme: 'sprat',
      supervisor_cert_number: 'SPRAT-1234',
      signature_path: 'M 100 200 L 300 160',
      attestation_accepted: true,
    });

    expect(signed.entry.status).toBe('signed');
    await expect(
      service.updateDraft({ ...draftInput({ site: 'Edited after signing' }), entry_id: entry.id }),
    ).rejects.toThrow('entry_locked');
  });

  it('deletes a draft entry and cascades its gear usage and attachments', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const gearService = createGearService(db);

    const entry = await service.createDraft(draftInput());
    const gear = await gearService.createGearItem({
      name: 'Petzl Avao Bod Croll',
      category: 'harness',
      serial_number: 'A-001',
    });
    await service.attachGearToEntry({ entry_id: entry.id, gear_id: gear.id, role: 'harness' });
    await service.addEntryAttachment({
      entry_id: entry.id,
      label: 'Anchor photo',
      uri: 'file:///tmp/anchor.jpg',
      mime_type: 'image/jpeg',
    });

    const deleted = await service.deleteDraftEntry(entry.id);
    expect(deleted).toEqual({ id: entry.id });

    expect(await service.listEntries()).toHaveLength(0);
    expect(await db.getAll('SELECT * FROM entry_gear_usage WHERE entry_id = ?', [entry.id])).toHaveLength(0);
    expect(await db.getAll('SELECT * FROM entry_attachments WHERE entry_id = ?', [entry.id])).toHaveLength(0);

    await expect(service.deleteDraftEntry(entry.id)).rejects.toThrow('entry_not_found');
  });

  it('refuses to delete a signed entry', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput());

    await service.signEntryLocal({
      entry_id: entry.id,
      supervisor_name: 'Jordan Lee',
      supervisor_scheme: 'sprat',
      supervisor_cert_number: 'SPRAT-1234',
      signature_path: 'M 100 200 L 300 160',
      attestation_accepted: true,
    });

    await expect(service.deleteDraftEntry(entry.id)).rejects.toThrow('entry_not_deletable');
    expect(await service.listEntries()).toHaveLength(1);
  });

  it('refuses to delete a draft with a pending remote signature request', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput());

    await service.createRemoteSignatureRequest({
      entry_id: entry.id,
      recipient_name: 'Jordan Lee',
      recipient_contact: 'jordan@example.com',
    });

    await expect(service.deleteDraftEntry(entry.id)).rejects.toThrow('entry_has_pending_remote_request');
    expect(await service.listEntries()).toHaveLength(1);
  });

  it('locally signs a draft, stores a hash, and locks the entry', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput());

    const detail = await service.signEntryLocal({
      entry_id: entry.id,
      supervisor_name: 'Jordan Lee',
      supervisor_scheme: 'sprat',
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
        previous_chain_hash: null,
        chain_hash: expect.stringMatching(/^sha256:/),
      }),
    );
    expect(detail.signature?.entry_hash).toMatch(/^sha256:/);

    await expect(
      service.signEntryLocal({
        entry_id: entry.id,
        supervisor_name: 'Another Supervisor',
        supervisor_scheme: 'irata',
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

  it('allows local signing when the supervisor has no certification number', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput({ description: 'Supervisor reviewed work.', work_hours: 2 }));

    const detail = await service.signEntryLocal({
      entry_id: entry.id,
      supervisor_name: 'Site Supervisor',
      supervisor_scheme: 'sprat',
      supervisor_cert_number: '',
      signature_path: 'M 100 200 L 300 160',
      attestation_accepted: true,
    });

    expect(detail.entry.status).toBe('signed');
    expect(detail.signature).toEqual(
      expect.objectContaining({
        supervisor_name: 'Site Supervisor',
        supervisor_cert_number: '',
      }),
    );
  });

  it('requires a verifier number for IRATA local signing', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput({
      sprat_level_snapshot: null,
      irata_level_snapshot: 'II',
    }));

    await expect(
      service.signEntryLocal({
        entry_id: entry.id,
        supervisor_name: 'IRATA Supervisor',
        supervisor_scheme: 'irata',
        supervisor_cert_number: '',
        signature_path: 'M 100 200 L 300 160',
        attestation_accepted: true,
      }),
    ).rejects.toThrow('supervisor_cert_required');
  });

  it('signs an amendment draft and marks the original as amended', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const original = await service.createDraft(draftInput({ description: 'Original description.', work_hours: 8 }));

    await service.signEntryLocal({
      entry_id: original.id,
      supervisor_name: 'Jordan Lee',
      supervisor_scheme: 'sprat',
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
      supervisor_scheme: 'irata',
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

  it('lists amendments of a source entry in creation order', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const original = await service.createDraft(draftInput({ description: 'Original work.', work_hours: 8 }));

    await service.signEntryLocal({
      entry_id: original.id,
      supervisor_name: 'Jordan Lee',
      supervisor_scheme: 'sprat',
      supervisor_cert_number: 'SPRAT-1234',
      signature_path: 'M 100 200 L 300 160',
      attestation_accepted: true,
    });

    // No amendments yet — should return [].
    expect(await service.listAmendmentsOf(original.id)).toEqual([]);

    const amendmentInput = {
      entry_id: original.id,
      employer: 'Northwind Rope',
      site: 'Bridge 12',
      client: 'City Works',
      description: 'Corrected hours.',
      work_hours: 6,
      work_task: 'Inspection',
      access_method: 'Two-rope access',
      structure_type: 'Bridge',
      max_height: 120,
      height_unit: 'ft' as const,
      sprat_level_snapshot: 'II' as const,
    };

    const first = await service.createAmendmentDraft(amendmentInput);
    const second = await service.createAmendmentDraft(amendmentInput);

    const list = await service.listAmendmentsOf(original.id);
    expect(list.map((e) => e.id)).toEqual([first.id, second.id]);
    expect(list.every((e) => e.amends_entry_id === original.id)).toBe(true);

    // An entry with no amendments should still return an empty array.
    expect(await service.listAmendmentsOf(first.id)).toEqual([]);
  });

  it('requires a drawn signature and accepted attestation before local signing', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput({ description: 'Inspected anchor array.', work_hours: 4 }));

    await expect(
      service.signEntryLocal({
        entry_id: entry.id,
        supervisor_name: 'Jordan Lee',
        supervisor_scheme: 'sprat',
        supervisor_cert_number: 'SPRAT-1234',
        signature_path: '',
        attestation_accepted: true,
      }),
    ).rejects.toThrow('signature_required');

    await expect(
      service.signEntryLocal({
        entry_id: entry.id,
        supervisor_name: 'Jordan Lee',
        supervisor_scheme: 'sprat',
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
        signing_token_hash: expect.stringMatching(/^sha256:/),
        token_hint: expect.any(String),
      }),
    );
    expect(detail.remote_request?.request_code).toHaveLength(10);
    expect(buildRemoteSigningToken(detail.remote_request!).length).toBeGreaterThan(
      detail.remote_request!.request_code.length + 20,
    );
    expect(detail.remote_request?.entry_hash).toMatch(/^sha256:/);
    expect(detail.remote_request?.token_hint).toBe(buildRemoteSigningToken(detail.remote_request!).slice(-6));
    expect(buildRemoteSigningUrl(detail.remote_request!, { origin: 'http://localhost:8082/' })).toBe(
      `http://localhost:8082/verify/${detail.remote_request!.request_code}?token=${encodeURIComponent(buildRemoteSigningToken(detail.remote_request!))}`,
    );

    const repeated = await service.createRemoteSignatureRequest({
      entry_id: entry.id,
      recipient_name: 'Another Verifier',
      recipient_contact: 'another@example.com',
    });
    expect(repeated.remote_request?.id).toBe(detail.remote_request?.id);

    const summary = await service.getDashboardSummary();
    expect(summary.pendingSignatureRequests).toBe(1);
  });

  it('creates a remote signature request for a new verifier without contact info', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput({ description: 'Completed bolt inspection.', work_hours: 3 }));

    const detail = await service.createRemoteSignatureRequest({
      entry_id: entry.id,
      recipient_name: 'New Verifier',
    });

    expect(detail.remote_request).toEqual(
      expect.objectContaining({
        entry_id: entry.id,
        recipient_name: 'New Verifier',
        recipient_contact: null,
        status: 'pending',
      }),
    );
    expect(detail.entry.pending_signature_id).toBe(detail.remote_request?.id);
  });

  it('cancels a pending remote signature request locally without touching entry status', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput({ description: 'Inspected anchors.', work_hours: 4 }));
    const created = await service.createRemoteSignatureRequest({
      entry_id: entry.id,
      recipient_name: 'Jordan Lee',
    });
    expect(created.entry.pending_signature_id).toBe(created.remote_request?.id);

    const cancelled = await service.cancelRemoteSignatureRequest(entry.id);

    expect(cancelled.remote_request).toBeNull();
    expect(cancelled.entry.pending_signature_id).toBeNull();
    expect(cancelled.entry.status).toBe('draft');

    await expect(service.cancelRemoteSignatureRequest(entry.id)).rejects.toThrow(
      'no_pending_request_to_cancel',
    );
  });

  it('requires named supervisors and remote recipients at the service layer', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput({ description: 'Completed bolt inspection.', work_hours: 3 }));

    await expect(
      service.createRemoteSignatureRequest({
        entry_id: entry.id,
        recipient_name: ' ',
      }),
    ).rejects.toThrow('recipient_name_required');

    await expect(
      service.signEntryLocal({
        entry_id: entry.id,
        supervisor_name: '',
        supervisor_scheme: 'sprat',
        supervisor_cert_number: 'SPRAT-1234',
        signature_path: 'M 100 200 L 300 160',
        attestation_accepted: true,
      }),
    ).rejects.toThrow('supervisor_name_required');
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
      supervisor_scheme: 'irata',
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

  it('completes a pending remote request and signs the entry remotely', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput({ description: 'Inspected anchor array.', work_hours: 4 }));
    const requested = await service.createRemoteSignatureRequest({
      entry_id: entry.id,
      recipient_name: 'Jordan Lee',
      recipient_contact: 'jordan@example.com',
      verifier_role: 'SPRAT L3',
      verifier_company: 'Northwind Rope',
    });
    const requestCode = requested.remote_request?.request_code;
    const signingToken = buildRemoteSigningToken(requested.remote_request!);

    expect(requestCode).toBeTruthy();

    await expect(service.getRemoteSignatureRequestDetail(requestCode!)).rejects.toThrow('remote_request_token_required');
    await expect(
      service.getRemoteSignatureRequestDetail({
        request_code: requestCode!,
        signing_token: 'bad-token',
      }),
    ).rejects.toThrow('remote_request_token_invalid');

    const requestDetail = await service.getRemoteSignatureRequestDetail({
      request_code: requestCode!,
      signing_token: signingToken,
      mark_viewed: true,
    });
    expect(requestDetail?.request.status).toBe('pending');
    expect(requestDetail?.request.viewed_at).toBeTruthy();
    expect(requestDetail?.entry.id).toBe(entry.id);

    await expect(
      service.completeRemoteSignatureRequest({
        request_code: requestCode!,
        supervisor_name: 'Jordan Lee',
        supervisor_scheme: 'sprat',
        supervisor_cert_number: 'SPRAT-1234',
        signature_path: 'M 100 200 L 300 160',
        attestation_accepted: true,
      }),
    ).rejects.toThrow('remote_request_token_required');

    const signed = await service.completeRemoteSignatureRequest({
      request_code: requestCode!,
      signing_token: signingToken,
      supervisor_name: 'Jordan Lee',
      supervisor_scheme: 'sprat',
      supervisor_cert_number: 'SPRAT-1234',
      signature_path: 'M 100 200 L 300 160',
      attestation_accepted: true,
      signer_attestation: 'Verified remotely.',
      signed_at: '2026-05-08T11:00:00.000Z',
    });

    const completedRequest = await service.getRemoteSignatureRequestDetail({
      request_code: requestCode!,
      signing_token: signingToken,
    });
    const summary = await service.getDashboardSummary();

    expect(signed.entry.status).toBe('signed');
    expect(signed.entry.pending_signature_id).toBeNull();
    expect(signed.signature).toEqual(
      expect.objectContaining({
        entry_id: entry.id,
        supervisor_name: 'Jordan Lee',
        supervisor_cert_number: 'SPRAT-1234',
        method: 'remote',
        remote_request_id: requested.remote_request?.id,
        signer_attestation: 'Verified remotely.',
        signed_at: '2026-05-08T11:00:00.000Z',
        chain_hash: expect.stringMatching(/^sha256:/),
      }),
    );
    expect(completedRequest?.request.status).toBe('completed');
    expect(completedRequest?.request.completed_at).toBe('2026-05-08T11:00:00.000Z');
    expect(completedRequest?.request.completed_signature_id).toBe(signed.signature?.id);
    expect(completedRequest?.signature?.id).toBe(signed.signature?.id);
    expect(summary.pendingSignatureRequests).toBe(0);

    await expect(
      service.completeRemoteSignatureRequest({
        request_code: requestCode!,
        signing_token: signingToken,
        supervisor_name: 'Jordan Lee',
        supervisor_scheme: 'sprat',
        supervisor_cert_number: 'SPRAT-1234',
        signature_path: 'M 100 200 L 300 160',
        attestation_accepted: true,
      }),
    ).rejects.toThrow('remote_request_not_pending');
  });

  it('completes a remote signature when the verifier has no certification number', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput({ description: 'Reviewed work area.', work_hours: 2 }));
    const requested = await service.createRemoteSignatureRequest({
      entry_id: entry.id,
      recipient_name: 'Site Supervisor',
    });
    const requestCode = requested.remote_request?.request_code;
    const signingToken = buildRemoteSigningToken(requested.remote_request!);

    const signed = await service.completeRemoteSignatureRequest({
      request_code: requestCode!,
      signing_token: signingToken,
      supervisor_name: 'Site Supervisor',
      supervisor_scheme: 'sprat',
      supervisor_cert_number: '',
      signature_path: 'M 100 200 L 300 160',
      attestation_accepted: true,
      signer_attestation: 'Verified remotely.',
      signed_at: '2026-05-08T12:00:00.000Z',
    });

    expect(signed.entry.status).toBe('signed');
    expect(signed.signature).toEqual(
      expect.objectContaining({
        supervisor_name: 'Site Supervisor',
        supervisor_cert_number: '',
        method: 'remote',
      }),
    );
  });

  it('requires a verifier number for IRATA remote signing', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput({
      description: 'Reviewed IRATA work area.',
      work_hours: 2,
      sprat_level_snapshot: null,
      irata_level_snapshot: 'II',
    }));
    const requested = await service.createRemoteSignatureRequest({
      entry_id: entry.id,
      recipient_name: 'IRATA Supervisor',
    });

    await expect(
      service.completeRemoteSignatureRequest({
        request_code: requested.remote_request!.request_code,
        signing_token: buildRemoteSigningToken(requested.remote_request!),
        supervisor_name: 'IRATA Supervisor',
        supervisor_scheme: 'irata',
        supervisor_cert_number: '',
        signature_path: 'M 100 200 L 300 160',
        attestation_accepted: true,
      }),
    ).rejects.toThrow('supervisor_cert_required');
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
        supervisor_scheme: 'sprat',
        supervisor_cert_number: 'SPRAT-1234',
        signature_path: 'M 100 200 L 300 160',
        attestation_accepted: true,
      }),
    ).rejects.toThrow('entry_incomplete');
  });

  it('supports templates, entry gear links, evidence attachments, and career stats', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const gearService = createGearService(db);

    const template = await service.createEntryTemplate({
      name: 'Wind turbine inspection',
      employer: 'Northwind Rope',
      client: 'Wind Co',
      work_task: 'Inspection',
      access_method: 'Two-rope access',
      structure_type: 'Wind turbine',
      description: 'Inspected tower internals and nacelle access route.',
      work_hours: 9,
      max_height: 240,
      height_unit: 'ft',
    });

    const entry = await service.createDraft(draftInput({
      template_id: template.id,
      site: 'Turbine 4',
      work_task: template.work_task,
      access_method: template.access_method,
      structure_type: template.structure_type,
      description: template.description,
      work_hours: template.work_hours,
      max_height: template.max_height ?? 0,
    }));
    const harness = await gearService.createGearItem({
      name: 'Avao Bod',
      category: 'harness',
      serial_number: 'H-123',
      next_inspection_due: '2026-06-01',
    });

    const withGear = await service.attachGearToEntry({
      entry_id: entry.id,
      gear_id: harness.id,
      role: 'primary harness',
    });
    const withAttachment = await service.addEntryAttachment({
      entry_id: entry.id,
      label: 'Anchor photo',
      uri: 'file:///anchor.jpg',
      mime_type: 'image/jpeg',
    });
    const templates = await service.listEntryTemplates();
    const stats = await service.getCareerStats();

    expect(templates.find((row) => row.id === template.id)?.last_used_at).toEqual(expect.any(String));
    expect(withGear.gear_usage).toHaveLength(1);
    expect(withGear.gear_usage[0].gear.serial_number).toBe('H-123');
    expect(withAttachment.attachments).toEqual([
      expect.objectContaining({
        label: 'Anchor photo',
        uri: 'file:///anchor.jpg',
      }),
    ]);
    expect(stats.totalHours).toBe(9);
    expect(stats.byTask[0]).toEqual({ label: 'Inspection', hours: 9, entries: 1 });
  });

  it('exports signed audit records with profile context and signature hashes', async () => {
    const db = await createTestClient();
    const profileService = createProfileService(db);
    const service = createLogbookService(db);

    await profileService.createProfile({
      full_name: 'Mina Carter',
      primary_scheme: 'sprat',
      sprat_id: 'S-12345',
      sprat_level: 'III',
      sprat_expires_on: '2027-05-08',
    });

    const signedEntry = await service.createDraft(
      draftInput({ date_from: '2026-05-01', site: 'Tower A', work_hours: 8 }),
    );
    const draftEntry = await service.createDraft(
      draftInput({ date_from: '2026-05-02', site: 'Tower B', work_hours: 6 }),
    );

    await service.signEntryLocal({
      entry_id: signedEntry.id,
      supervisor_name: 'Jordan Lee',
      supervisor_scheme: 'sprat',
      supervisor_cert_number: 'SPRAT-1234',
      signature_path: 'M 100 200 L 300 160',
      attestation_accepted: true,
      signed_at: '2026-05-08T10:00:00.000Z',
    });

    const bundle = await service.exportLogbook();

    expect(bundle).toEqual(
      expect.objectContaining({
        export_schema_version: 2,
        app_flavor: 'ralb-codex-edition',
        exported_at: expect.any(String),
        profile: expect.objectContaining({
          full_name: 'Mina Carter',
          sprat_level: 'III',
        }),
        summary: {
          entry_count: 1,
          signed_entry_count: 1,
          amended_entry_count: 0,
          draft_entry_count: 0,
          signed_hours: 8,
        },
      }),
    );
    expect(bundle.entries).toHaveLength(1);
    expect(bundle.entries[0].entry.id).toBe(signedEntry.id);
    expect(bundle.entries[0].entry.id).not.toBe(draftEntry.id);
    expect(bundle.entries[0].signature).toEqual(
      expect.objectContaining({
        entry_id: signedEntry.id,
        entry_hash: expect.stringMatching(/^sha256:/),
        hash_version: 2,
      }),
    );
  });

  it('exports a single signed entry packet and reviewer CSV', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(
      draftInput({ site: 'Tower A, North Face', date_from: '2026-05-01', work_hours: 8 }),
    );

    await expect(service.exportEntryPacket(entry.id)).rejects.toThrow('entry_not_exportable');

    await service.signEntryLocal({
      entry_id: entry.id,
      supervisor_name: 'Jordan Lee',
      supervisor_scheme: 'sprat',
      supervisor_cert_number: 'SPRAT-1234',
      signature_path: 'M 100 200 L 300 160',
      attestation_accepted: true,
      signed_at: '2026-05-08T10:00:00.000Z',
    });

    const packet = await service.exportEntryPacket(entry.id);
    const csv = await service.exportLogbookCsv();

    expect(packet.entry.id).toBe(entry.id);
    expect(packet.verification).toEqual(
      expect.objectContaining({
        hash_version: 2,
        signature_method: 'local',
        signed_at: '2026-05-08T10:00:00.000Z',
      }),
    );
    expect(csv).toContain('"Tower A, North Face"');
    expect(csv).toContain('Jordan Lee,SPRAT-1234');
  });
});

describe('logbook service chain head + remote request lookup', () => {
  beforeEach(() => {
    mockUuidCounter = 0;
  });

  it('returns null chain head before any signature, then exposes the most recent chain hash', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);

    expect(await service.getLatestChainHash()).toBeNull();

    const entry = await service.createDraft(draftInput());
    const signed = await service.signEntryLocal({
      entry_id: entry.id,
      supervisor_name: 'Jordan Lee',
      supervisor_scheme: 'sprat',
      supervisor_cert_number: 'SPRAT-1234',
      signature_path: 'M 100 200 L 300 160',
      attestation_accepted: true,
      signed_at: '2026-05-08T10:00:00.000Z',
    });

    expect(signed.signature?.chain_hash).toBeTruthy();
    expect(await service.getLatestChainHash()).toBe(signed.signature?.chain_hash);
  });

  it('reports the latest chain hash across two signed entries', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);

    const first = await service.createDraft(
      draftInput({ date_from: '2026-05-01', date_to: '2026-05-01' }),
    );
    const firstSigned = await service.signEntryLocal({
      entry_id: first.id,
      supervisor_name: 'Jordan Lee',
      supervisor_scheme: 'sprat',
      supervisor_cert_number: 'SPRAT-1234',
      signature_path: 'M 1 1',
      attestation_accepted: true,
      signed_at: '2026-05-01T10:00:00.000Z',
    });

    const second = await service.createDraft(
      draftInput({ date_from: '2026-05-02', date_to: '2026-05-02' }),
    );
    const secondSigned = await service.signEntryLocal({
      entry_id: second.id,
      supervisor_name: 'Jordan Lee',
      supervisor_scheme: 'sprat',
      supervisor_cert_number: 'SPRAT-1234',
      signature_path: 'M 2 2',
      attestation_accepted: true,
      signed_at: '2026-05-02T10:00:00.000Z',
    });

    expect(secondSigned.signature?.previous_chain_hash).toBe(firstSigned.signature?.chain_hash);
    expect(await service.getLatestChainHash()).toBe(secondSigned.signature?.chain_hash);
  });

  it('returns the latest remote signature request regardless of status', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);

    const entry = await service.createDraft(draftInput());
    expect(await service.getLatestRemoteRequestForEntry(entry.id)).toBeNull();

    const requested = await service.createRemoteSignatureRequest({
      entry_id: entry.id,
      recipient_name: 'K. Briggs',
    });
    expect(requested.remote_request?.status).toBe('pending');

    const pendingLookup = await service.getLatestRemoteRequestForEntry(entry.id);
    expect(pendingLookup?.status).toBe('pending');
    expect(pendingLookup?.id).toBe(requested.remote_request?.id);

    const completed = await service.completeRemoteSignatureRequest({
      request_code: requested.remote_request!.request_code,
      signing_token: buildRemoteSigningToken(requested.remote_request!),
      supervisor_name: 'K. Briggs',
      supervisor_scheme: 'irata',
      supervisor_cert_number: 'IRATA-99',
      signature_path: 'M 5 5',
      attestation_accepted: true,
      signed_at: '2026-05-08T11:00:00.000Z',
    });

    expect(completed.signature?.method).toBe('remote');

    const completedLookup = await service.getLatestRemoteRequestForEntry(entry.id);
    expect(completedLookup?.status).toBe('completed');
    expect(completedLookup?.id).toBe(requested.remote_request?.id);
  });
});
