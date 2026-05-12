import { hostedCompletionInputFromDetail } from '@/src/cloud/supabase/remote-signing';
import { shouldAutoSyncHostedRemoteSignature } from '@/src/cloud/supabase/use-remote-signing-sync';
import { EntryDetail, RemoteSignatureRequestDetail } from '@/src/domain/logbook/types';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const baseDetail: RemoteSignatureRequestDetail = {
  entry: {
    id: 'entry_1',
    date_from: '2026-05-10',
    date_to: '2026-05-10',
    employer: 'Northwind Rope',
    site: 'Bridge 12',
    client: 'City Works',
    description: 'Inspected anchors.',
    work_hours: 4,
    work_task: 'Inspection',
    access_method: 'Two-rope access',
    structure_type: 'Bridge',
    max_height: 120,
    height_unit: 'ft',
    sprat_level_snapshot: 'II',
    irata_level_snapshot: null,
    status: 'draft',
    amends_entry_id: null,
    pending_signature_id: 'remote_sig_1',
    created_at: '2026-05-10T10:00:00.000Z',
    updated_at: '2026-05-10T10:00:00.000Z',
  },
  request: {
    id: 'remote_sig_1',
    entry_id: 'entry_1',
    recipient_name: 'Jordan Lee',
    recipient_contact: 'jordan@example.com',
    verifier_role: 'SPRAT L3',
    verifier_company: 'Northwind Rope',
    status: 'completed',
    request_code: 'ABC1234567',
    entry_hash: 'entry_hash',
    hash_version: 2,
    expires_at: '2026-05-24T10:00:00.000Z',
    completed_signature_id: 'hosted_sig_1',
    signing_token_hash: null,
    token_hint: '123456',
    viewed_at: '2026-05-10T10:05:00.000Z',
    completed_at: '2026-05-10T10:10:00.000Z',
    created_at: '2026-05-10T10:00:00.000Z',
    updated_at: '2026-05-10T10:10:00.000Z',
  },
  signature: {
    id: 'hosted_sig_1',
    entry_id: 'entry_1',
    supervisor_name: 'Jordan Lee',
    supervisor_cert_number: 'SPRAT-1234',
    signed_at: '2026-05-10T10:10:00.000Z',
    entry_hash: 'entry_hash',
    hash_version: 2,
    method: 'remote',
    remote_request_id: 'remote_sig_1',
    signer_attestation: 'Verified remotely.',
    signature_path: 'M 100 200 L 300 160',
    attestation_accepted_at: '2026-05-10T10:10:00.000Z',
    previous_chain_hash: null,
    chain_hash: null,
    created_at: '2026-05-10T10:10:00.000Z',
  },
};

describe('hosted remote signing sync', () => {
  it('builds a local completion input from a completed hosted signature', () => {
    expect(hostedCompletionInputFromDetail(baseDetail, 'secret-token')).toEqual({
      request_code: 'ABC1234567',
      signing_token: 'secret-token',
      supervisor_name: 'Jordan Lee',
      supervisor_scheme: 'sprat',
      supervisor_cert_number: 'SPRAT-1234',
      signature_path: 'M 100 200 L 300 160',
      attestation_accepted: true,
      signer_attestation: 'Verified remotely.',
      signed_at: '2026-05-10T10:10:00.000Z',
    });
  });

  it('waits when the hosted request is not complete yet', () => {
    expect(hostedCompletionInputFromDetail({
      ...baseDetail,
      request: { ...baseDetail.request, status: 'pending' },
    }, 'secret-token')).toBeNull();
  });

  it('does not import a completed request without a drawn signature', () => {
    expect(hostedCompletionInputFromDetail({
      ...baseDetail,
      signature: { ...baseDetail.signature!, signature_path: null },
    }, 'secret-token')).toBeNull();
  });
});

describe('shouldAutoSyncHostedRemoteSignature', () => {
  const now = Date.parse('2026-05-10T12:00:00.000Z');
  const pendingRequest = {
    ...baseDetail.request,
    status: 'pending' as const,
    expires_at: '2026-05-24T10:00:00.000Z',
    completed_at: null,
    completed_signature_id: null,
  };
  const detail: EntryDetail = {
    entry: { ...baseDetail.entry, status: 'draft' },
    signature: null,
    remote_request: pendingRequest,
    gear_usage: [],
    attachments: [],
  };

  it('polls a draft entry with a pending hosted request', () => {
    expect(shouldAutoSyncHostedRemoteSignature(detail, { supabaseConfigured: true, now })).toBe(true);
  });

  it('does not poll when Supabase is not configured', () => {
    expect(shouldAutoSyncHostedRemoteSignature(detail, { supabaseConfigured: false, now })).toBe(false);
  });

  it('does not poll once the entry is signed', () => {
    expect(shouldAutoSyncHostedRemoteSignature(
      { ...detail, entry: { ...detail.entry, status: 'signed' } },
      { supabaseConfigured: true, now },
    )).toBe(false);
  });

  it('does not poll when there is no remote request', () => {
    expect(shouldAutoSyncHostedRemoteSignature(
      { ...detail, remote_request: null },
      { supabaseConfigured: true, now },
    )).toBe(false);
  });

  it('does not poll a request that is no longer pending', () => {
    expect(shouldAutoSyncHostedRemoteSignature(
      { ...detail, remote_request: { ...pendingRequest, status: 'completed' } },
      { supabaseConfigured: true, now },
    )).toBe(false);
  });

  it('stops polling once the request has expired', () => {
    expect(shouldAutoSyncHostedRemoteSignature(
      { ...detail, remote_request: { ...pendingRequest, expires_at: '2026-05-09T10:00:00.000Z' } },
      { supabaseConfigured: true, now },
    )).toBe(false);
  });
});
