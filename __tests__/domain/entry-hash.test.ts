import {
  ENTRY_HASH_VERSION,
  hashEntry,
  hashSignatureChain,
  signerEnvelopeFromSignature,
  verifyChainHashFor,
} from '@/src/domain/logbook/entry-hash';
import type { EntrySignature, LogbookEntry } from '@/src/domain/logbook/types';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async (_algo: string, value: string) => `sha256:${value.length}`),
}));

function entry(overrides: Partial<LogbookEntry> = {}): LogbookEntry {
  return {
    id: 'entry_1',
    date_from: '2026-05-09',
    date_to: '2026-05-09',
    employer: 'Northwind',
    site: 'Bridge 12',
    client: 'City Works',
    description: 'Inspection',
    work_hours: 8,
    work_task: 'Inspection',
    access_method: 'Two-rope access',
    structure_type: 'Bridge',
    max_height: 120,
    height_unit: 'ft',
    sprat_level_snapshot: 'II',
    irata_level_snapshot: null,
    entry_kind: 'work',
    rescue_cover: null,
    hazards: null,
    status: 'signed',
    amends_entry_id: null,
    pending_signature_id: null,
    created_at: '2026-05-09T00:00:00.000Z',
    updated_at: '2026-05-09T00:00:00.000Z',
    ...overrides,
  };
}

function signature(overrides: Partial<EntrySignature> = {}): EntrySignature {
  return {
    id: 'sig_1',
    entry_id: 'entry_1',
    supervisor_name: 'K. Briggs',
    supervisor_scheme: 'irata',
    supervisor_cert_number: 'IR-30219',
    supervisor_role: null,
    supervisor_employer: null,
    signed_at: '2026-05-10T12:00:00.000Z',
    entry_hash: 'sha256:placeholder',
    hash_version: ENTRY_HASH_VERSION,
    method: 'local',
    remote_request_id: null,
    signer_attestation: null,
    signature_path: 'M0,0 L1,1',
    attestation_accepted_at: '2026-05-10T12:00:00.000Z',
    previous_chain_hash: null,
    chain_hash: null,
    created_at: '2026-05-10T12:00:00.000Z',
    ...overrides,
  };
}

describe('verifyChainHashFor', () => {
  it('returns false when no chain hash is stored', async () => {
    const e = entry();
    const s = signature({ chain_hash: null });
    expect(await verifyChainHashFor({ entry: e, signature: s })).toBe(false);
  });

  it('rejects signatures from a future hash version to prevent bypass attacks', async () => {
    const e = entry();
    const s = signature({
      hash_version: ENTRY_HASH_VERSION + 1,
      chain_hash: 'sha256:future_version_chain',
    });
    expect(await verifyChainHashFor({ entry: e, signature: s })).toBe(false);
  });

  it('returns true when the chain hash recomputes to the same value', async () => {
    const e = entry();
    const entryHash = await hashEntry(e);
    const base = signature({ entry_hash: entryHash });
    const chainHash = await hashSignatureChain({
      entryHash,
      signatureId: base.id,
      signedAt: base.signed_at,
      method: base.method,
      previousChainHash: null,
      signer: signerEnvelopeFromSignature(base),
    });
    const s = signature({ entry_hash: entryHash, chain_hash: chainHash });
    expect(await verifyChainHashFor({ entry: e, signature: s })).toBe(true);
  });

  it('rejects a v4 signature whose bound signer identity was rewritten after signing', async () => {
    const e = entry();
    const entryHash = await hashEntry(e);
    const base = signature({ entry_hash: entryHash });
    const chainHash = await hashSignatureChain({
      entryHash,
      signatureId: base.id,
      signedAt: base.signed_at,
      method: base.method,
      previousChainHash: null,
      signer: signerEnvelopeFromSignature(base),
    });
    // Same chain hash, but the persisted cert number was re-attributed. (The
    // mock digest here is length-based, so use a different-length value; the
    // content-sensitive proof lives in verify-full-chain.test.ts.)
    const tampered = signature({
      entry_hash: entryHash,
      chain_hash: chainHash,
      supervisor_cert_number: 'IR-30219-REATTRIBUTED',
    });
    expect(await verifyChainHashFor({ entry: e, signature: tampered })).toBe(false);
  });

  it('returns false when the stored entry hash diverges from the current canonical hash', async () => {
    const e = entry();
    const entryHash = await hashEntry(e);
    const chainHash = await hashSignatureChain({
      entryHash,
      signatureId: 'sig_1',
      signedAt: '2026-05-10T12:00:00.000Z',
      method: 'local',
      previousChainHash: null,
    });
    const s = signature({ entry_hash: 'sha256:tampered_entry_hash', chain_hash: chainHash });
    expect(await verifyChainHashFor({ entry: e, signature: s })).toBe(false);
  });

  it('returns false when the chain hash does not match the recomputation', async () => {
    const e = entry();
    const entryHash = await hashEntry(e);
    const s = signature({ entry_hash: entryHash, chain_hash: 'sha256:wrong_chain_hash' });
    expect(await verifyChainHashFor({ entry: e, signature: s })).toBe(false);
  });

  it('verifies a chained signature whose previous_chain_hash is set', async () => {
    const e = entry();
    const entryHash = await hashEntry(e);
    const base = signature({
      id: 'sig_2',
      entry_hash: entryHash,
      method: 'remote',
      previous_chain_hash: 'sha256:prior_chain_link',
      remote_request_id: 'req_42',
    });
    const chainHash = await hashSignatureChain({
      entryHash,
      signatureId: base.id,
      signedAt: base.signed_at,
      method: base.method,
      previousChainHash: base.previous_chain_hash,
      remoteRequestId: base.remote_request_id,
      signer: signerEnvelopeFromSignature(base),
    });
    const s = { ...base, chain_hash: chainHash };
    expect(await verifyChainHashFor({ entry: e, signature: s })).toBe(true);
  });
});
