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

export function canonicalizeEntry(entry: LogbookEntry): string {
  return stableStringify({
    entry: {
      amends_entry_id: entry.amends_entry_id,
      client: entry.client,
      date_from: entry.date_from,
      date_to: entry.date_to,
      description: entry.description,
      employer: entry.employer,
      access_method: entry.access_method,
      // v3 fields. `hazards` is the canonical (sorted, JSON-stringified) TEXT
      // that lives in the DB column — hashing the raw string is safe because
      // service write paths run input through `canonicalizeHazards`.
      entry_kind: entry.entry_kind,
      hazards: entry.hazards,
      rescue_cover: entry.rescue_cover,
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
    version: ENTRY_HASH_VERSION,
  });
}

export async function hashEntry(entry: LogbookEntry): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonicalizeEntry(entry));
}

export async function hashSignatureChain(input: {
  entryHash: string;
  signatureId: string;
  signedAt: string;
  method: string;
  previousChainHash: string | null;
  remoteRequestId?: string | null;
}): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    stableStringify({
      schema: 'ralb.logbook.signature-chain',
      version: ENTRY_HASH_VERSION,
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

  // If the signature was made at a different hash version than the running app,
  // we can't faithfully recompute it; trust the stored chain hash exists.
  if (signature.hash_version !== ENTRY_HASH_VERSION) return true;

  const currentEntryHash = await hashEntry(entry);
  if (currentEntryHash !== signature.entry_hash) return false;

  const recomputedChain = await hashSignatureChain({
    entryHash: signature.entry_hash,
    signatureId: signature.id,
    signedAt: signature.signed_at,
    method: signature.method,
    previousChainHash: signature.previous_chain_hash,
    remoteRequestId: signature.remote_request_id,
  });

  return recomputedChain === signature.chain_hash;
}
