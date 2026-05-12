import { deriveEntryStamps } from '@/src/domain/logbook/entry-stamps';
import type { EntrySignature, LogbookEntry, RemoteSignatureRequest } from '@/src/domain/logbook/types';

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
    status: 'draft',
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
    supervisor_cert_number: 'IR-30219',
    signed_at: '2026-05-10T12:00:00.000Z',
    entry_hash: 'sha256:hash_x',
    hash_version: 2,
    method: 'local',
    remote_request_id: null,
    signer_attestation: null,
    signature_path: 'M0,0 L1,1',
    attestation_accepted_at: '2026-05-10T12:00:00.000Z',
    previous_chain_hash: null,
    chain_hash: 'sha256:chain_x',
    created_at: '2026-05-10T12:00:00.000Z',
    ...overrides,
  };
}

function remoteRequest(overrides: Partial<RemoteSignatureRequest> = {}): RemoteSignatureRequest {
  return {
    id: 'req_1',
    entry_id: 'entry_1',
    recipient_name: 'K. Briggs',
    recipient_contact: null,
    verifier_role: null,
    verifier_company: null,
    status: 'pending',
    request_code: 'ABC123',
    entry_hash: 'sha256:hash_x',
    hash_version: 2,
    expires_at: '2026-05-20T00:00:00.000Z',
    completed_signature_id: null,
    signing_token_hash: null,
    token_hint: null,
    viewed_at: null,
    completed_at: null,
    created_at: '2026-05-10T12:00:00.000Z',
    updated_at: '2026-05-10T12:00:00.000Z',
    ...overrides,
  };
}

describe('deriveEntryStamps', () => {
  it('returns DRAFT for a fresh draft entry', () => {
    expect(
      deriveEntryStamps({
        entry: entry(),
        signature: null,
        remote_request: null,
        chain_valid: false,
      }),
    ).toEqual(['DRAFT']);
  });

  it('adds PENDING to DRAFT when a remote request is outstanding', () => {
    expect(
      deriveEntryStamps({
        entry: entry(),
        signature: null,
        remote_request: remoteRequest({ status: 'pending' }),
        chain_valid: false,
      }),
    ).toEqual(['DRAFT', 'PENDING']);
  });

  it('does not surface PENDING when the outstanding request has lapsed', () => {
    expect(
      deriveEntryStamps({
        entry: entry(),
        signature: null,
        remote_request: remoteRequest({ status: 'expired' }),
        chain_valid: false,
      }),
    ).toEqual(['DRAFT']);
  });

  it('renders CHAIN_OK on a locally signed entry with a valid chain', () => {
    expect(
      deriveEntryStamps({
        entry: entry({ status: 'signed' }),
        signature: signature({ method: 'local' }),
        remote_request: null,
        chain_valid: true,
      }),
    ).toEqual(['CHAIN_OK']);
  });

  it('omits CHAIN_OK when the chain does not validate', () => {
    expect(
      deriveEntryStamps({
        entry: entry({ status: 'signed' }),
        signature: signature(),
        remote_request: null,
        chain_valid: false,
      }),
    ).toEqual([]);
  });

  it('renders CHAIN_OK + SYNCED for an entry that travelled the hosted path', () => {
    expect(
      deriveEntryStamps({
        entry: entry({ status: 'signed' }),
        signature: signature({ method: 'remote', remote_request_id: 'req_1' }),
        remote_request: null,
        chain_valid: true,
      }),
    ).toEqual(['CHAIN_OK', 'SYNCED']);
  });

  it('renders AMENDED + CHAIN_OK for a locally-signed amended original', () => {
    expect(
      deriveEntryStamps({
        entry: entry({ status: 'amended' }),
        signature: signature({ method: 'local' }),
        remote_request: null,
        chain_valid: true,
      }),
    ).toEqual(['AMENDED', 'CHAIN_OK']);
  });

  it('renders AMENDED + CHAIN_OK + SYNCED for a remotely-signed amended original', () => {
    expect(
      deriveEntryStamps({
        entry: entry({ status: 'amended' }),
        signature: signature({ method: 'remote' }),
        remote_request: null,
        chain_valid: true,
      }),
    ).toEqual(['AMENDED', 'CHAIN_OK', 'SYNCED']);
  });

  it('ignores stale pending requests once the entry is signed', () => {
    expect(
      deriveEntryStamps({
        entry: entry({ status: 'signed' }),
        signature: signature(),
        remote_request: remoteRequest({ status: 'pending' }),
        chain_valid: true,
      }),
    ).toEqual(['CHAIN_OK']);
  });

  it('renders nothing for a signed entry missing its signature row (defensive)', () => {
    expect(
      deriveEntryStamps({
        entry: entry({ status: 'signed' }),
        signature: null,
        remote_request: null,
        chain_valid: false,
      }),
    ).toEqual([]);
  });
});
