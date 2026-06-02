import {
  canonicalizeEntry,
  ENTRY_HASH_VERSION,
  hashEntry,
  hashSignatureChain,
  signerEnvelopeFromSignature,
  verifyChainHashFor,
} from '@/src/domain/logbook/entry-hash';
import {
  canonicalizeStringList,
  type EntrySignature,
  type LogbookEntry,
} from '@/src/domain/logbook/types';

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
    work_task_list: '["Inspection"]',
    access_method_list: '["Two-rope access"]',
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

describe('canonicalizeEntry — v<5 frozen + v5 multi-value', () => {
  // Realistic entry with hazards set. The v<5 canonical form must stay
  // byte-identical so every v2/v3/v4 signature keeps verifying.
  const e = entry({ hazards: '["Edge","Falling object"]' });

  it('v4 canonical string is frozen', () => {
    expect(canonicalizeEntry(e, 4)).toMatchInlineSnapshot(`"{"entry":{"access_method":"Two-rope access","amends_entry_id":null,"client":"City Works","date_from":"2026-05-09","date_to":"2026-05-09","description":"Inspection","employer":"Northwind","entry_kind":"work","hazards":"[\\"Edge\\",\\"Falling object\\"]","height_unit":"ft","id":"entry_1","irata_level_snapshot":null,"max_height":120,"rescue_cover":null,"site":"Bridge 12","sprat_level_snapshot":"II","structure_type":"Bridge","work_hours":8,"work_task":"Inspection"},"schema":"ralb.logbook.entry","version":4}"`);
  });

  it('v3 canonical string equals v4 except the version field', () => {
    expect(canonicalizeEntry(e, 3)).toBe(
      canonicalizeEntry(e, 4).replace('"version":4', '"version":3'),
    );
  });

  it('v2 omits the v3 entry-content fields and keeps the scalar work_task', () => {
    const v2 = canonicalizeEntry(e, 2);
    expect(v2).toContain('"version":2');
    expect(v2).not.toContain('entry_kind');
    expect(v2).not.toContain('hazards');
    expect(v2).toContain('"work_task":"Inspection"');
  });

  it('v<5 hashes the scalar work_task/access_method, never the lists', () => {
    const v4 = canonicalizeEntry(e, 4);
    expect(v4).toContain('"work_task":"Inspection"');
    expect(v4).toContain('"access_method":"Two-rope access"');
    expect(v4).not.toContain('work_task_list');
    expect(v4).not.toContain('access_method_list');
  });

  it('v5 attests the canonical lists, overriding the scalars under the same keys', () => {
    const e5 = entry({
      work_task: 'Inspection',
      work_task_list: canonicalizeStringList(['Inspection', 'NDT']),
      access_method: 'Two-rope access',
      access_method_list: canonicalizeStringList(['Two-rope access', 'Work positioning']),
    });
    const v5 = canonicalizeEntry(e5, 5);
    expect(v5).toContain('"version":5');
    expect(v5).toContain(`"work_task":${JSON.stringify('["Inspection","NDT"]')}`);
    expect(v5).toContain(`"access_method":${JSON.stringify('["Two-rope access","Work positioning"]')}`);
  });

  it('reordering the work_task list changes the v5 canonical form (order/primary is attested)', () => {
    // Assert on the canonical string, not the length-based mock hash: the two
    // orderings stringify to the same length, so a length-mock can't see the
    // difference — but a real SHA-256 hashes them differently.
    const a = entry({ work_task_list: canonicalizeStringList(['Inspection', 'NDT']) });
    const b = entry({ work_task_list: canonicalizeStringList(['NDT', 'Inspection']) });
    expect(canonicalizeEntry(a, 5)).not.toBe(canonicalizeEntry(b, 5));
  });
});

describe('verifyChainHashFor — v5 backward compatibility', () => {
  it('still verifies a v4-signed entry after the bump to v5', async () => {
    const e = entry();
    const entryHash = await hashEntry(e, 4);
    const base = signature({ entry_hash: entryHash, hash_version: 4 });
    const chainHash = await hashSignatureChain({
      entryHash,
      signatureId: base.id,
      signedAt: base.signed_at,
      method: base.method,
      previousChainHash: null,
      version: 4,
      signer: signerEnvelopeFromSignature(base),
    });
    const s = signature({ entry_hash: entryHash, hash_version: 4, chain_hash: chainHash });
    expect(await verifyChainHashFor({ entry: e, signature: s })).toBe(true);
  });

  it('verifies a v5 multi-value entry round-trip', async () => {
    const e = entry({
      work_task_list: canonicalizeStringList(['Inspection', 'NDT']),
      access_method_list: canonicalizeStringList(['Two-rope access', 'Work positioning']),
    });
    const entryHash = await hashEntry(e, 5);
    const base = signature({ entry_hash: entryHash, hash_version: 5 });
    const chainHash = await hashSignatureChain({
      entryHash,
      signatureId: base.id,
      signedAt: base.signed_at,
      method: base.method,
      previousChainHash: null,
      version: 5,
      signer: signerEnvelopeFromSignature(base),
    });
    const s = signature({ entry_hash: entryHash, hash_version: 5, chain_hash: chainHash });
    expect(await verifyChainHashFor({ entry: e, signature: s })).toBe(true);
  });

  it('rejects a v5 entry whose task list was rewritten after signing', async () => {
    const e = entry({ work_task_list: canonicalizeStringList(['Inspection', 'NDT']) });
    const entryHash = await hashEntry(e, 5);
    const base = signature({ entry_hash: entryHash, hash_version: 5 });
    const chainHash = await hashSignatureChain({
      entryHash,
      signatureId: base.id,
      signedAt: base.signed_at,
      method: base.method,
      previousChainHash: null,
      version: 5,
      signer: signerEnvelopeFromSignature(base),
    });
    const s = signature({ entry_hash: entryHash, hash_version: 5, chain_hash: chainHash });
    const tampered = entry({ work_task_list: canonicalizeStringList(['Welding']) });
    expect(await verifyChainHashFor({ entry: tampered, signature: s })).toBe(false);
  });
});
