import * as Crypto from 'expo-crypto';
import { EntrySignature, LogbookEntry } from './types';

// v3 added the three rope-access-audit fields that were missing from v2:
// entry_kind (work / training / assessment / rescue_drill), rescue_cover,
// and hazards. All three are part of what a signer attests to, so they
// must be included in the canonical entry hash.
export const ENTRY_HASH_VERSION = 3;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function stableStringify(value: JsonValue): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

export function canonicalizeEntry(entry: LogbookEntry, version: number = ENTRY_HASH_VERSION): string {
  const payload: any = {
    entry: {
      amends_entry_id: entry.amends_entry_id,
      client: entry.client,
      date_from: entry.date_from,
      date_to: entry.date_to,
      description: entry.description,
      employer: entry.employer,
      access_method: entry.access_method,
      height_unit: entry.height_unit,
      id: entry.id,
      irata_level_snapshot: entry.irata_level_snapshot,
      max_height: entry.max_height === null ? null : Number(entry.max_height.toFixed(2)),
      site: entry.site,
      sprat_level_snapshot: entry.sprat_level_snapshot,
      structure_type: entry.structure_type,
      work_task: entry.work_task,
      work_hours: Number(entry.work_hours.toFixed(2)),
    },
    schema: 'ralb.logbook.entry',
    version,
  };

  // v3 added these three fields.
  if (version >= 3) {
    payload.entry.entry_kind = entry.entry_kind;
    payload.entry.hazards = entry.hazards;
    payload.entry.rescue_cover = entry.rescue_cover;
  }

  return stableStringify(payload);
}

export async function hashEntry(entry: LogbookEntry, version: number = ENTRY_HASH_VERSION): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonicalizeEntry(entry, version));
}

export async function hashSignatureChain(input: {
  entryHash: string;
  signatureId: string;
  signedAt: string;
  method: string;
  previousChainHash: string | null;
  remoteRequestId?: string | null;
  version?: number;
}): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    stableStringify({
      schema: 'ralb.logbook.signature-chain',
      version: input.version ?? ENTRY_HASH_VERSION,
      previous_chain_hash: input.previousChainHash,
      signature: {
        entry_hash: input.entryHash,
        id: input.signatureId,
        method: input.method,
        remote_request_id: input.remoteRequestId ?? null,
        signed_at: input.signedAt,
      },
    }),
  );
}

export async function hashRemoteSigningToken(token: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    stableStringify({
      schema: 'ralb.remote-signing-token',
      token,
      version: 1,
    }),
  );
}

export async function verifyChainHashFor(input: {
  entry: LogbookEntry;
  signature: EntrySignature;
}): Promise<boolean> {
  const { entry, signature } = input;
  if (!signature.chain_hash) return false;

  // Reject future/unknown hash versions to prevent bypass attacks.
  if (signature.hash_version > ENTRY_HASH_VERSION || signature.hash_version < 1) {
    return false;
  }

  const currentEntryHash = await hashEntry(entry, signature.hash_version);
  if (currentEntryHash !== signature.entry_hash) return false;

  const recomputedChain = await hashSignatureChain({
    entryHash: signature.entry_hash,
    signatureId: signature.id,
    signedAt: signature.signed_at,
    method: signature.method,
    previousChainHash: signature.previous_chain_hash,
    remoteRequestId: signature.remote_request_id,
    version: signature.hash_version,
  });

  return recomputedChain === signature.chain_hash;
}
