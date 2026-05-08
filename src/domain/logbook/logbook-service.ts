import { DbClient } from '@/src/db/client';
import { createId } from '../id';
import { getEntryVerificationReadiness } from './entry-readiness';
import { ENTRY_HASH_VERSION, hashEntry } from './entry-hash';
import {
  CreateAmendmentInput,
  CreateEntryInput,
  CreateRemoteSignatureRequestInput,
  DashboardSummary,
  EntryDetail,
  EntrySignature,
  LogbookEntry,
  RemoteSignatureRequest,
  SignEntryInput,
} from './types';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createLogbookService(db: DbClient) {
  async function getEntryById(id: string): Promise<LogbookEntry | null> {
    return db.get<LogbookEntry>('SELECT * FROM entries WHERE id = ?', [id]);
  }

  async function getSignatureForEntry(entryId: string): Promise<EntrySignature | null> {
    return db.get<EntrySignature>(
      `SELECT
        id, entry_id, supervisor_name, supervisor_cert_number, signed_at,
        entry_hash, hash_version, method, remote_request_id, signer_attestation,
        signature_path, attestation_accepted_at, created_at
      FROM signatures
      WHERE entry_id = ?
      LIMIT 1`,
      [entryId],
    );
  }

  async function getPendingRemoteRequestForEntry(entryId: string): Promise<RemoteSignatureRequest | null> {
    return db.get<RemoteSignatureRequest>(
      `SELECT
        id, entry_id, recipient_name, recipient_contact, verifier_role, verifier_company,
        status, request_code, entry_hash, hash_version, expires_at, completed_signature_id,
        created_at, updated_at
      FROM remote_signature_requests
      WHERE entry_id = ? AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1`,
      [entryId],
    );
  }

  async function getEntryDetail(entryId: string): Promise<EntryDetail | null> {
    const entry = await getEntryById(entryId);
    if (!entry) return null;
    return {
      entry,
      signature: await getSignatureForEntry(entryId),
      remote_request: await getPendingRemoteRequestForEntry(entryId),
    };
  }

  function createRequestCode(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase();
  }

  return {
    async listEntries(): Promise<LogbookEntry[]> {
      return db.getAll<LogbookEntry>(
        'SELECT * FROM entries ORDER BY date_from DESC, created_at DESC',
      );
    },

    getEntryDetail,

    async createDraft(input: CreateEntryInput): Promise<LogbookEntry> {
      const now = new Date().toISOString();
      const id = createId('entry');
      const dateFrom = input.date_from ?? todayIso();
      const dateTo = input.date_to ?? dateFrom;
      await db.run(
        `INSERT INTO entries (
          id, date_from, date_to, employer, site, client, description, work_hours,
          work_task, access_method, structure_type, max_height, height_unit,
          sprat_level_snapshot, irata_level_snapshot, status, amends_entry_id,
          pending_signature_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', NULL, NULL, ?, ?)`,
        [
          id,
          dateFrom,
          dateTo,
          input.employer.trim(),
          input.site.trim(),
          input.client.trim(),
          input.description.trim(),
          input.work_hours,
          input.work_task.trim(),
          input.access_method.trim(),
          input.structure_type.trim(),
          input.max_height,
          input.height_unit,
          input.sprat_level_snapshot ?? null,
          input.irata_level_snapshot ?? null,
          now,
          now,
        ],
      );
      const entry = await db.get<LogbookEntry>('SELECT * FROM entries WHERE id = ?', [id]);
      if (!entry) throw new Error('entry_create_failed');
      return entry;
    },

    async createAmendmentDraft(input: CreateAmendmentInput): Promise<LogbookEntry> {
      const original = await getEntryById(input.entry_id);
      if (!original) throw new Error('entry_not_found');
      if (original.status !== 'signed') throw new Error('entry_not_amendable');

      const now = new Date().toISOString();
      const id = createId('entry');
      const dateFrom = input.date_from ?? original.date_from;
      const dateTo = input.date_to ?? dateFrom;

      await db.run(
        `INSERT INTO entries (
          id, date_from, date_to, employer, site, client, description, work_hours,
          work_task, access_method, structure_type, max_height, height_unit,
          sprat_level_snapshot, irata_level_snapshot, status, amends_entry_id,
          pending_signature_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, NULL, ?, ?)`,
        [
          id,
          dateFrom,
          dateTo,
          input.employer.trim(),
          input.site.trim(),
          input.client.trim(),
          input.description.trim(),
          input.work_hours,
          input.work_task.trim(),
          input.access_method.trim(),
          input.structure_type.trim(),
          input.max_height,
          input.height_unit,
          input.sprat_level_snapshot ?? original.sprat_level_snapshot,
          input.irata_level_snapshot ?? original.irata_level_snapshot,
          original.id,
          now,
          now,
        ],
      );

      const draft = await getEntryById(id);
      if (!draft) throw new Error('amendment_create_failed');
      return draft;
    },

    async createRemoteSignatureRequest(input: CreateRemoteSignatureRequestInput): Promise<EntryDetail> {
      const now = new Date().toISOString();
      const entry = await getEntryById(input.entry_id);
      if (!entry) throw new Error('entry_not_found');
      if (entry.status !== 'draft') throw new Error('entry_not_requestable');
      if (!getEntryVerificationReadiness(entry).ready) throw new Error('entry_incomplete');

      const existing = await getPendingRemoteRequestForEntry(entry.id);
      if (existing) {
        const detail = await getEntryDetail(entry.id);
        if (!detail) throw new Error('entry_not_found');
        return detail;
      }

      const requestId = createId('remote_sig');
      const requestCode = createRequestCode(requestId);
      const entryHash = await hashEntry(entry);

      await db.exec('BEGIN');
      try {
        await db.run(
          `INSERT INTO remote_signature_requests (
            id, entry_id, recipient_name, recipient_contact, verifier_role, verifier_company,
            status, request_code, entry_hash, hash_version, expires_at, completed_signature_id,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NULL, ?, ?)`,
          [
            requestId,
            entry.id,
            input.recipient_name.trim(),
            input.recipient_contact?.trim() || null,
            input.verifier_role?.trim() || null,
            input.verifier_company?.trim() || null,
            requestCode,
            entryHash,
            ENTRY_HASH_VERSION,
            input.expires_at ?? null,
            now,
            now,
          ],
        );
        await db.run(
          'UPDATE entries SET pending_signature_id = ?, updated_at = ? WHERE id = ?',
          [requestId, now, entry.id],
        );
        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }

      const detail = await getEntryDetail(entry.id);
      if (!detail) throw new Error('remote_signature_request_failed');
      return detail;
    },

    async signEntryLocal(input: SignEntryInput): Promise<EntryDetail> {
      const now = new Date().toISOString();
      const signaturePath = input.signature_path.trim();
      if (!signaturePath) throw new Error('signature_required');
      if (!input.attestation_accepted) throw new Error('attestation_required');

      await db.exec('BEGIN');
      try {
        const entry = await getEntryById(input.entry_id);
        if (!entry) throw new Error('entry_not_found');
        if (entry.status !== 'draft') throw new Error('entry_not_signable');
        if (!getEntryVerificationReadiness(entry).ready) throw new Error('entry_incomplete');

        const signatureId = createId('sig');
        const signedAt = input.signed_at ?? now;
        const entryHash = await hashEntry(entry);

        await db.run(
          `INSERT INTO signatures (
            id, entry_id, supervisor_name, supervisor_cert_number, signed_at,
            entry_hash, hash_version, method, remote_request_id, signer_attestation,
            signature_path, attestation_accepted_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'local', NULL, ?, ?, ?, ?)`,
          [
            signatureId,
            entry.id,
            input.supervisor_name.trim(),
            input.supervisor_cert_number.trim(),
            signedAt,
            entryHash,
            ENTRY_HASH_VERSION,
            input.signer_attestation?.trim() || null,
            signaturePath,
            signedAt,
            now,
          ],
        );

        await db.run(
          "UPDATE entries SET status = 'signed', pending_signature_id = NULL, updated_at = ? WHERE id = ?",
          [now, entry.id],
        );
        await db.run(
          "UPDATE remote_signature_requests SET status = 'cancelled', updated_at = ? WHERE entry_id = ? AND status = 'pending'",
          [now, entry.id],
        );

        if (entry.amends_entry_id) {
          await db.run(
            "UPDATE entries SET status = 'amended', updated_at = ? WHERE id = ? AND status = 'signed'",
            [now, entry.amends_entry_id],
          );
        }

        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }

      const detail = await getEntryDetail(input.entry_id);
      if (!detail) throw new Error('entry_sign_failed');
      return detail;
    },

    async getDashboardSummary(): Promise<DashboardSummary> {
      const row = await db.get<{
        totalEntries: number;
        draftEntries: number;
        signedEntries: number;
        amendedEntries: number;
        pendingSignatureRequests: number;
        draftHours: number | null;
        signedHours: number | null;
      }>(
        `SELECT
          (SELECT COUNT(*) FROM entries) AS totalEntries,
          (SELECT COUNT(*) FROM entries WHERE status = 'draft') AS draftEntries,
          (SELECT COUNT(*) FROM entries WHERE status = 'signed') AS signedEntries,
          (SELECT COUNT(*) FROM entries WHERE status = 'amended') AS amendedEntries,
          (SELECT COUNT(*) FROM remote_signature_requests WHERE status = 'pending') AS pendingSignatureRequests,
          (SELECT COALESCE(SUM(work_hours), 0) FROM entries WHERE status = 'draft') AS draftHours,
          (SELECT COALESCE(SUM(work_hours), 0) FROM entries WHERE status = 'signed') AS signedHours`,
      );

      return {
        totalEntries: row?.totalEntries ?? 0,
        draftEntries: row?.draftEntries ?? 0,
        signedEntries: row?.signedEntries ?? 0,
        amendedEntries: row?.amendedEntries ?? 0,
        pendingSignatureRequests: row?.pendingSignatureRequests ?? 0,
        draftHours: row?.draftHours ?? 0,
        signedHours: row?.signedHours ?? 0,
      };
    },
  };
}
