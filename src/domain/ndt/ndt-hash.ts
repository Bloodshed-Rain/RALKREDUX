import * as Crypto from 'expo-crypto';
import { NdtInspection, NdtSignature } from './types';

// NDT ledger hash version. INDEPENDENT of ENTRY_HASH_VERSION — bumping one must
// never touch the other. v1 is the first version (the rope-access ledger started
// at v2 historically for legacy reasons; the NDT ledger is greenfield at v1).
export const NDT_HASH_VERSION = 1;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface NdtSignerEnvelope {
  name: string;
  certNumber: string | null;
  level: string | null;
  scheme: string | null;
  employer: string | null;
  signaturePath: string | null;
  attestation: string | null;
  attestationAcceptedAt: string | null;
}

// Copied from entry-hash.ts intentionally (NDT stays self-contained).
function stableStringify(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// What the NDT Level III attests to. status / pending_signature_id / created_at /
// updated_at / timezone_offset are intentionally excluded — they are bookkeeping,
// not part of the inspection the verifier is sealing.
export function canonicalizeNdtInspection(inspection: NdtInspection, version: number = NDT_HASH_VERSION): string {
  return stableStringify({
    inspection: {
      amends_inspection_id: inspection.amends_inspection_id,
      client: inspection.client,
      component: inspection.component,
      date_from: inspection.date_from,
      date_to: inspection.date_to,
      description: inspection.description,
      employer: inspection.employer,
      hours: Number((inspection.hours ?? 0).toFixed(2)),
      id: inspection.id,
      linked_entry_id: inspection.linked_entry_id,
      method: inspection.method,
      ndt_level_snapshot: inspection.ndt_level_snapshot,
      ndt_scheme: inspection.ndt_scheme,
      procedure_ref: inspection.procedure_ref,
      site: inspection.site,
      supervised: inspection.supervised,
      technique: inspection.technique,
    },
    schema: 'ralb.ndt.inspection',
    version,
  });
}

export async function hashNdtInspection(inspection: NdtInspection, version: number = NDT_HASH_VERSION): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonicalizeNdtInspection(inspection, version));
}

export async function hashNdtSignatureChain(input: {
  inspectionHash: string;
  signatureId: string;
  signedAt: string;
  method: string;
  previousChainHash: string | null;
  remoteRequestId?: string | null;
  signer?: NdtSignerEnvelope | null;
  version?: number;
}): Promise<string> {
  const version = input.version ?? NDT_HASH_VERSION;
  const signer = input.signer ?? null;
  const signature: { [key: string]: JsonValue } = {
    id: input.signatureId,
    inspection_hash: input.inspectionHash,
    method: input.method,
    remote_request_id: input.remoteRequestId ?? null,
    signed_at: input.signedAt,
    signer: signer
      ? {
          attestation: signer.attestation,
          attestation_accepted_at: signer.attestationAcceptedAt,
          cert_number: signer.certNumber,
          employer: signer.employer,
          level: signer.level,
          name: signer.name,
          scheme: signer.scheme,
          signature_path: signer.signaturePath,
        }
      : null,
  };
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    stableStringify({ schema: 'ralb.ndt.signature-chain', version, previous_chain_hash: input.previousChainHash, signature }),
  );
}

export function ndtSignerEnvelopeFromSignature(signature: NdtSignature): NdtSignerEnvelope {
  return {
    name: signature.verifier_name,
    certNumber: signature.verifier_cert_number,
    level: signature.verifier_level,
    scheme: signature.verifier_scheme,
    employer: signature.verifier_employer,
    signaturePath: signature.signature_path,
    attestation: signature.signer_attestation,
    attestationAcceptedAt: signature.attestation_accepted_at,
  };
}

export async function hashNdtSigningToken(token: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    stableStringify({ schema: 'ralb.ndt.remote-signing-token', token, version: 1 }),
  );
}

export async function verifyNdtChainHashFor(input: {
  inspection: NdtInspection;
  signature: NdtSignature;
}): Promise<boolean> {
  const { inspection, signature } = input;
  if (!signature.chain_hash) return false;
  if (signature.hash_version > NDT_HASH_VERSION || signature.hash_version < 1) return false;

  const currentHash = await hashNdtInspection(inspection, signature.hash_version);
  if (currentHash !== signature.inspection_hash) return false;

  const recomputed = await hashNdtSignatureChain({
    inspectionHash: signature.inspection_hash,
    signatureId: signature.id,
    signedAt: signature.signed_at,
    method: signature.method,
    previousChainHash: signature.previous_chain_hash,
    remoteRequestId: signature.remote_request_id,
    version: signature.hash_version,
    signer: ndtSignerEnvelopeFromSignature(signature),
  });
  return recomputed === signature.chain_hash;
}
