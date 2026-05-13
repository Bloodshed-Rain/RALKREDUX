import * as Linking from 'expo-linking';
import { inferSchemeFromCertNumber } from '@/src/domain/cert-number';
import { buildRemoteSigningToken } from '@/src/domain/logbook/logbook-service';
import {
  CompleteRemoteSignatureRequestInput,
  EntryDetail,
  EntrySignature,
  LogbookEntry,
  RemoteSignatureRequest,
  RemoteSignatureRequestDetail,
} from '@/src/domain/logbook/types';
import { ensureSupabaseSession, getSupabaseClient, isSupabaseConfigured } from './client';

type HostedRemoteSigningResult =
  | { ok: true; verifierUrl: string }
  | { ok: false; reason: 'not_configured' | 'not_authenticated' | 'missing_request' | 'sync_failed' };

type HostedRemoteCancelResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'not_authenticated' | 'cancel_failed' };

const REMOTE_SIGNING_ORIGIN = process.env.EXPO_PUBLIC_REMOTE_SIGNING_ORIGIN?.trim() ?? '';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

function configuredHttpsOrigin(): string | null {
  const origin = REMOTE_SIGNING_ORIGIN.replace(/\/+$/, '');
  if (!origin) return null;
  // Reserve the env override for an https verifier web app. For dev exp://
  // schemes (LAN or tunnel) prefer Linking.createURL so the link tracks the
  // current dev server origin without a manual .env edit.
  return /^https?:\/\//i.test(origin) ? origin : null;
}

export function buildHostedVerifierLink(request: RemoteSignatureRequest): string | null {
  const token = buildRemoteSigningToken(request);
  const httpsOrigin = configuredHttpsOrigin();
  if (httpsOrigin) {
    return `${httpsOrigin}/verify/${request.request_code}?token=${encodeURIComponent(token)}`;
  }

  try {
    return Linking.createURL(`/verify/${request.request_code}`, { queryParams: { token } });
  } catch {
    return null;
  }
}

export async function syncHostedRemoteSigningRequest(detail: EntryDetail): Promise<HostedRemoteSigningResult> {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'not_configured' };
  if (!detail.remote_request) return { ok: false, reason: 'missing_request' };

  const client = getSupabaseClient();
  if (!client) return { ok: false, reason: 'not_configured' };

  const session = await ensureSupabaseSession();
  if (!session) return { ok: false, reason: 'not_authenticated' };

  const request = detail.remote_request;
  const verifierUrl = buildHostedVerifierLink(request);
  if (!verifierUrl) return { ok: false, reason: 'not_configured' };

  const { error } = await client.functions.invoke('remote-signing-request', {
    body: {
      local_request_id: request.id,
      local_entry_id: request.entry_id,
      request_code: request.request_code,
      recipient_name: request.recipient_name,
      recipient_contact: request.recipient_contact,
      verifier_role: request.verifier_role,
      verifier_company: request.verifier_company,
      entry: detail.entry,
      entry_hash: request.entry_hash,
      hash_version: request.hash_version,
      signing_token: buildRemoteSigningToken(request),
      expires_at: request.expires_at,
    },
  });

  if (error) return { ok: false, reason: 'sync_failed' };
  return { ok: true, verifierUrl };
}

export async function cancelHostedRemoteSigningRequest(
  request: RemoteSignatureRequest,
): Promise<HostedRemoteCancelResult> {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'not_configured' };

  const client = getSupabaseClient();
  if (!client) return { ok: false, reason: 'not_configured' };

  const session = await ensureSupabaseSession();
  if (!session) return { ok: false, reason: 'not_authenticated' };

  const { error } = await client.functions.invoke('remote-signing-cancel', {
    body: { request_code: request.request_code },
  });

  if (error) return { ok: false, reason: 'cancel_failed' };
  return { ok: true };
}

function functionUrl(name: string, search?: URLSearchParams): string | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const base = `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/${name}`;
  return search ? `${base}?${search.toString()}` : base;
}

function functionHeaders(): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

type HostedRequestPayload = {
  request: Omit<RemoteSignatureRequest, 'id' | 'entry_id'> & {
    id: string;
    local_request_id: string;
    local_entry_id: string;
    entry: LogbookEntry;
    completed_signature?: EntrySignature | null;
  };
};

function toRequestDetail(payload: HostedRequestPayload): RemoteSignatureRequestDetail {
  const { request } = payload;

  return {
    entry: request.entry,
    request: {
      id: request.local_request_id,
      entry_id: request.local_entry_id,
      recipient_name: request.recipient_name,
      recipient_contact: request.recipient_contact,
      verifier_role: request.verifier_role,
      verifier_company: request.verifier_company,
      status: request.status,
      request_code: request.request_code,
      entry_hash: request.entry_hash,
      hash_version: request.hash_version,
      expires_at: request.expires_at,
      completed_signature_id: request.completed_signature_id,
      signing_token_hash: null,
      token_hint: request.token_hint,
      viewed_at: request.viewed_at,
      completed_at: request.completed_at,
      created_at: request.created_at,
      updated_at: request.updated_at,
    },
    signature: request.completed_signature ?? null,
  };
}

export function hostedCompletionInputFromDetail(
  detail: RemoteSignatureRequestDetail,
  signingToken: string,
): CompleteRemoteSignatureRequestInput | null {
  if (detail.request.status !== 'completed' || !detail.signature) return null;
  const signaturePath = detail.signature.signature_path?.trim();
  if (!signaturePath) return null;

  return {
    request_code: detail.request.request_code,
    signing_token: signingToken,
    supervisor_name: detail.signature.supervisor_name,
    supervisor_scheme: inferSchemeFromCertNumber(detail.signature.supervisor_cert_number) ?? 'sprat',
    supervisor_cert_number: detail.signature.supervisor_cert_number,
    signature_path: signaturePath,
    attestation_accepted: true,
    signer_attestation: detail.signature.signer_attestation,
    signed_at: detail.signature.signed_at,
  };
}

export async function fetchHostedRemoteSigningRequest(
  requestCode: string,
  signingToken: string,
): Promise<RemoteSignatureRequestDetail | null> {
  const url = functionUrl('remote-signing-request', new URLSearchParams({
    code: requestCode,
    token: signingToken,
  }));
  if (!url) return null;

  const response = await fetch(url, { headers: functionHeaders() });
  if (!response.ok) return null;

  return toRequestDetail(await response.json() as HostedRequestPayload);
}

export async function completeHostedRemoteSignatureRequest(
  detail: RemoteSignatureRequestDetail,
  input: CompleteRemoteSignatureRequestInput,
): Promise<EntryDetail> {
  const url = functionUrl('remote-signing-complete');
  if (!url) throw new Error('hosted_remote_signing_not_configured');
  if (!input.signing_token) throw new Error('remote_request_token_required');

  const signedAt = input.signed_at ?? new Date().toISOString();
  const signatureId = `hosted_sig_${Date.now()}`;
  const signature: EntrySignature = {
    id: signatureId,
    entry_id: detail.entry.id,
    supervisor_name: input.supervisor_name.trim(),
    supervisor_cert_number: input.supervisor_cert_number.trim(),
    signed_at: signedAt,
    entry_hash: detail.request?.entry_hash ?? '',
    hash_version: detail.request?.hash_version ?? 0,
    method: 'remote',
    remote_request_id: detail.request?.id ?? null,
    signer_attestation: input.signer_attestation?.trim() || null,
    signature_path: input.signature_path.trim(),
    attestation_accepted_at: signedAt,
    previous_chain_hash: null,
    chain_hash: null,
    created_at: signedAt,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: functionHeaders(),
    body: JSON.stringify({
      request_code: input.request_code,
      signing_token: input.signing_token,
      attestation_accepted: input.attestation_accepted,
      signature_id: signature.id,
      signature,
    }),
  });

  if (!response.ok) throw new Error('hosted_remote_signature_failed');
  const completed = toRequestDetail(await response.json() as HostedRequestPayload);

  return {
    entry: { ...completed.entry, status: 'signed', pending_signature_id: null },
    signature: completed.signature ?? signature,
    remote_request: completed.request,
    gear_usage: [],
    attachments: [],
  };
}
