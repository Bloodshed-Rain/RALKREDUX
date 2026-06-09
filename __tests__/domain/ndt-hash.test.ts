jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  // Content-sensitive (NOT length-only) so tamper tests are meaningful: an
  // equal-length identity rewrite still changes the digest. djb2-xor over
  // char codes folds both content and position into the result.
  digestStringAsync: jest.fn(async (_algo: string, value: string) => {
    let h = 5381;
    for (let i = 0; i < value.length; i += 1) {
      h = ((h * 33) ^ value.charCodeAt(i)) >>> 0;
    }
    return `sha256:${value.length}:${h.toString(16)}`;
  }),
}));

import {
  NDT_HASH_VERSION,
  canonicalizeNdtInspection,
  hashNdtInspection,
  hashNdtSignatureChain,
  ndtSignerEnvelopeFromSignature,
  verifyNdtChainHashFor,
} from '@/src/domain/ndt/ndt-hash';
import { NdtInspection, NdtSignature } from '@/src/domain/ndt/types';

function inspection(overrides: Partial<NdtInspection> = {}): NdtInspection {
  return {
    id: 'ndt_1', date_from: '2026-06-01', date_to: '2026-06-01', method: 'UT',
    technique: 'PAUT', ndt_level_snapshot: 'II', supervised: 'independent',
    hours: 4.5, site: 'Platform A', client: 'Acme', employer: 'RopeCo',
    procedure_ref: 'WI-UT-014', component: 'Weld nodes', ndt_scheme: 'ISO 9712',
    description: 'Node weld inspection', linked_entry_id: null, status: 'verified',
    amends_inspection_id: null, pending_signature_id: null, timezone_offset: 0,
    created_at: '2026-06-01T00:00:00.000Z', updated_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function signature(overrides: Partial<NdtSignature> = {}): NdtSignature {
  return {
    id: 'ndtsig_1', inspection_id: 'ndt_1', verifier_name: 'Dana Level3',
    verifier_cert_number: 'L3-UT-9001', verifier_level: 'III', verifier_scheme: 'ISO 9712',
    verifier_employer: 'RopeCo', signed_at: '2026-06-02T00:00:00.000Z',
    inspection_hash: 'hash', hash_version: NDT_HASH_VERSION, method: 'local',
    remote_request_id: null, signer_attestation: 'attest', signature_path: 'M0 0',
    attestation_accepted_at: '2026-06-02T00:00:00.000Z', previous_chain_hash: null,
    chain_hash: null, created_at: '2026-06-02T00:00:00.000Z', ...overrides,
  };
}

describe('canonicalizeNdtInspection', () => {
  it('is deterministic and excludes status/audit-mutable fields', () => {
    const a = canonicalizeNdtInspection(inspection());
    const b = canonicalizeNdtInspection(inspection({ status: 'amended', updated_at: 'x' }));
    expect(a).toBe(b); // status/updated_at are NOT part of what the Level III attests to
  });
  it('changes when an attested field (hours) changes', () => {
    expect(canonicalizeNdtInspection(inspection()))
      .not.toBe(canonicalizeNdtInspection(inspection({ hours: 5 })));
  });
  it('rounds hours to 2 decimals', () => {
    expect(canonicalizeNdtInspection(inspection({ hours: 4.5 })))
      .toBe(canonicalizeNdtInspection(inspection({ hours: 4.5000001 })));
  });
});

describe('verifyNdtChainHashFor', () => {
  it('returns false when no chain hash is stored', async () => {
    expect(await verifyNdtChainHashFor({ inspection: inspection(), signature: signature({ chain_hash: null }) })).toBe(false);
  });
  it('rejects a future hash version', async () => {
    expect(await verifyNdtChainHashFor({
      inspection: inspection(),
      signature: signature({ hash_version: NDT_HASH_VERSION + 1, chain_hash: 'x' }),
    })).toBe(false);
  });
  it('round-trips a valid chain hash', async () => {
    const insp = inspection();
    const inspectionHash = await hashNdtInspection(insp);
    const base = signature({ inspection_hash: inspectionHash });
    const chain = await hashNdtSignatureChain({
      inspectionHash, signatureId: base.id, signedAt: base.signed_at,
      method: base.method, previousChainHash: null,
      signer: ndtSignerEnvelopeFromSignature(base),
    });
    const sig = signature({ inspection_hash: inspectionHash, chain_hash: chain });
    expect(await verifyNdtChainHashFor({ inspection: insp, signature: sig })).toBe(true);
  });
  it('rejects a signature whose verifier identity was rewritten after signing', async () => {
    const insp = inspection();
    const inspectionHash = await hashNdtInspection(insp);
    const base = signature({ inspection_hash: inspectionHash });
    const chain = await hashNdtSignatureChain({
      inspectionHash, signatureId: base.id, signedAt: base.signed_at,
      method: base.method, previousChainHash: null,
      signer: ndtSignerEnvelopeFromSignature(base),
    });
    const tampered = signature({ inspection_hash: inspectionHash, chain_hash: chain, verifier_cert_number: 'REATTRIBUTED' });
    expect(await verifyNdtChainHashFor({ inspection: insp, signature: tampered })).toBe(false);
  });
  it('rejects an EQUAL-LENGTH verifier-cert rewrite (proves the digest is content-sensitive, not length-only)', async () => {
    const insp = inspection();
    const inspectionHash = await hashNdtInspection(insp);
    const base = signature({ inspection_hash: inspectionHash }); // verifier_cert_number 'L3-UT-9001' (10 chars)
    const chain = await hashNdtSignatureChain({
      inspectionHash, signatureId: base.id, signedAt: base.signed_at,
      method: base.method, previousChainHash: null,
      signer: ndtSignerEnvelopeFromSignature(base),
    });
    // 'L3-UT-9002' is the SAME length as 'L3-UT-9001' but different content.
    const tampered = signature({ inspection_hash: inspectionHash, chain_hash: chain, verifier_cert_number: 'L3-UT-9002' });
    expect(await verifyNdtChainHashFor({ inspection: insp, signature: tampered })).toBe(false);
  });
});
