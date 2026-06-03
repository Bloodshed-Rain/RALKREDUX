import { describeClosedRemoteRequest, nextVerifierStep } from '@/src/domain/logbook/remote-signing-status';
import { EntrySignature, LogbookEntry, RemoteSignatureRequest } from '@/src/domain/logbook/types';

const entry: LogbookEntry = {
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
};

const request: RemoteSignatureRequest = {
  id: 'remote_sig_1',
  entry_id: 'entry_1',
  recipient_name: 'Jordan Lee',
  recipient_contact: 'jordan@example.com',
  verifier_role: 'SPRAT L3',
  verifier_company: 'Northwind Rope',
  status: 'pending',
  request_code: 'ABC1234567',
  entry_hash: 'entry_hash',
  hash_version: 2,
  expires_at: '2026-05-24T10:00:00.000Z',
  completed_signature_id: null,
  signing_token_hash: null,
  token_hint: '123456',
  viewed_at: '2026-05-10T10:05:00.000Z',
  completed_at: null,
  created_at: '2026-05-10T10:00:00.000Z',
  updated_at: '2026-05-10T10:00:00.000Z',
};

const signature: EntrySignature = {
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
};

describe('describeClosedRemoteRequest', () => {
  it('returns null while the request is still actionable', () => {
    expect(describeClosedRemoteRequest(request, entry, null)).toBeNull();
  });

  it('flags completed requests with signer details when present', () => {
    expect(
      describeClosedRemoteRequest(
        { ...request, status: 'completed', completed_at: '2026-05-10T10:10:00.000Z' },
        entry,
        signature,
      ),
    ).toEqual({
      kind: 'completed',
      signed_at: '2026-05-10T10:10:00.000Z',
      signer_name: 'Jordan Lee',
    });
  });

  it('falls back to completed_at when no signature row is loaded', () => {
    expect(
      describeClosedRemoteRequest(
        { ...request, status: 'completed', completed_at: '2026-05-10T10:10:00.000Z' },
        entry,
        null,
      ),
    ).toEqual({
      kind: 'completed',
      signed_at: '2026-05-10T10:10:00.000Z',
      signer_name: null,
    });
  });

  it('surfaces the expiry date when the request is expired', () => {
    expect(
      describeClosedRemoteRequest({ ...request, status: 'expired' }, entry, null),
    ).toEqual({ kind: 'expired', expires_at: '2026-05-24T10:00:00.000Z' });
  });

  it('marks cancelled requests', () => {
    expect(
      describeClosedRemoteRequest({ ...request, status: 'cancelled' }, entry, null),
    ).toEqual({ kind: 'cancelled' });
  });

  it('treats locally-signed entries with a pending request as pre-empted', () => {
    expect(
      describeClosedRemoteRequest(request, { ...entry, status: 'signed' }, signature),
    ).toEqual({ kind: 'pre_empted', entry_status: 'signed' });
  });
});

describe('nextVerifierStep', () => {
  const ready = {
    hasName: true,
    certReady: true,
    siteFieldsReady: true,
    hasSignature: true,
    attestationAccepted: true,
  };

  it('returns null when every required step is satisfied', () => {
    expect(nextVerifierStep(ready)).toBeNull();
  });

  it('asks for the name first', () => {
    expect(nextVerifierStep({ ...ready, hasName: false })).toBe('Enter your name');
  });

  it('asks a scheme verifier for the cert number', () => {
    expect(nextVerifierStep({ ...ready, certReady: false })).toBe('Add your cert number');
  });

  it('asks a site signer for role & employer', () => {
    expect(nextVerifierStep({ ...ready, siteFieldsReady: false })).toBe('Add your role & employer');
  });

  it('asks for the signature', () => {
    expect(nextVerifierStep({ ...ready, hasSignature: false })).toBe('Draw your signature');
  });

  it('asks to confirm the attestation last', () => {
    expect(nextVerifierStep({ ...ready, attestationAccepted: false })).toBe('Confirm the attestation');
  });

  it('reports the earliest missing step first', () => {
    expect(
      nextVerifierStep({
        hasName: false,
        certReady: false,
        siteFieldsReady: false,
        hasSignature: false,
        attestationAccepted: false,
      }),
    ).toBe('Enter your name');
  });
});
