import { createTestClient } from '../setup';
import { createLogbookService } from '@/src/domain/logbook/logbook-service';
import { CreateEntryInput } from '@/src/domain/logbook/types';

let mockUuidCounter = 0;

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  // Content-sensitive digest (djb2) so tampering actually changes the hash —
  // a length-only stub would not catch a same-length edit and could collide.
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) => {
    let h = 5381;
    for (let i = 0; i < value.length; i += 1) {
      h = ((h << 5) + h + value.charCodeAt(i)) >>> 0;
    }
    return `sha256:${h.toString(16)}`;
  }),
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

async function signDraft(
  service: ReturnType<typeof createLogbookService>,
  entryId: string,
) {
  return service.signEntryLocal({
    entry_id: entryId,
    supervisor_name: 'Jordan Lee',
    supervisor_scheme: 'sprat',
    supervisor_cert_number: 'SPRAT-1234',
    signature_path: 'M 100 200 L 300 160',
    attestation_accepted: true,
  });
}

describe('verifyFullChain', () => {
  beforeEach(() => {
    mockUuidCounter = 0;
  });

  it('is valid for an empty logbook', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    expect(await service.verifyFullChain()).toEqual({ valid: true });
  });

  it('is valid for a single signed entry', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput());
    await signDraft(service, entry.id);
    expect(await service.verifyFullChain()).toEqual({ valid: true });
  });

  // Regression for BUG-2: the chain is built in SIGNING order, not
  // draft-creation order. Signing a later-created draft first must NOT trip
  // a false "tampered" verdict.
  it('is valid when drafts are signed out of creation order', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const first = await service.createDraft(
      draftInput({ site: 'Tower A', description: 'Drafted first, signed last.' }),
    );
    const second = await service.createDraft(
      draftInput({ site: 'Bridge Number Twelve North', description: 'Drafted second, signed first.' }),
    );
    // Sign the SECOND-created draft before the first.
    await signDraft(service, second.id);
    await signDraft(service, first.id);
    expect(await service.verifyFullChain()).toEqual({ valid: true });
  });

  // Regression for BUG-1: verifyChainHashFor was called without `await`, so a
  // bare (always-truthy) Promise meant content tampering was never detected.
  it('detects a signed entry tampered directly in the database', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput());
    await signDraft(service, entry.id);
    expect((await service.verifyFullChain()).valid).toBe(true);

    // Mutate the immutable signed entry behind the service's back.
    await db.run('UPDATE entries SET work_hours = ? WHERE id = ?', [999, entry.id]);

    const result = await service.verifyFullChain();
    expect(result.valid).toBe(false);
    expect(result.brokenAtEntryId).toBe(entry.id);
  });

  it('detects a signed entry whose signature row is missing', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput());
    await signDraft(service, entry.id);
    await db.run('DELETE FROM signatures WHERE entry_id = ?', [entry.id]);

    const result = await service.verifyFullChain();
    expect(result.valid).toBe(false);
    expect(result.brokenAtEntryId).toBe(entry.id);
  });

  it('detects a corrupted chain link', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const first = await service.createDraft(draftInput({ site: 'Tower A' }));
    const second = await service.createDraft(draftInput({ site: 'Bridge B (longer name)' }));
    await signDraft(service, first.id);
    await signDraft(service, second.id);
    expect((await service.verifyFullChain()).valid).toBe(true);

    await db.run(
      "UPDATE signatures SET previous_chain_hash = 'sha256:deadbeef' WHERE entry_id = ?",
      [second.id],
    );
    expect((await service.verifyFullChain()).valid).toBe(false);
  });

  // Regression for the v4 hash bump (P1-1): the signer's identity is what an
  // audit logbook exists to certify, so re-attributing a sealed signature must
  // break the chain. Pre-v4, the chain hash folded in only entry/timestamp/
  // method, so the WHO and the drawn mark were not tamper-evident.
  it('detects a re-attributed signer cert number on a sealed entry', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput());
    await signDraft(service, entry.id);
    expect((await service.verifyFullChain()).valid).toBe(true);

    await db.run('UPDATE signatures SET supervisor_cert_number = ? WHERE entry_id = ?', [
      'SPRAT-9999',
      entry.id,
    ]);

    const result = await service.verifyFullChain();
    expect(result.valid).toBe(false);
    expect(result.brokenAtEntryId).toBe(entry.id);
  });

  it('detects a re-attributed signer name on a sealed entry', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput());
    await signDraft(service, entry.id);
    await db.run('UPDATE signatures SET supervisor_name = ? WHERE entry_id = ?', [
      'Someone Else',
      entry.id,
    ]);
    expect((await service.verifyFullChain()).valid).toBe(false);
  });

  it('detects a rewritten drawn signature path on a sealed entry', async () => {
    const db = await createTestClient();
    const service = createLogbookService(db);
    const entry = await service.createDraft(draftInput());
    await signDraft(service, entry.id);
    await db.run('UPDATE signatures SET signature_path = ? WHERE entry_id = ?', [
      'M 0 0 L 9 9 forged mark',
      entry.id,
    ]);
    expect((await service.verifyFullChain()).valid).toBe(false);
  });
});
