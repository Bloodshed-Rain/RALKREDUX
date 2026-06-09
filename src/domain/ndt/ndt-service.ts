import { DbClient } from '@/src/db/client';
import { createId } from '../id';
import { addDaysIso, isExpiredAt, isValidIsoDateRange, todayLocalIsoDate } from '../date-utils';
import {
  NDT_HASH_VERSION,
  hashNdtInspection,
  hashNdtSignatureChain,
  hashNdtSigningToken,
  ndtSignerEnvelopeFromSignature,
} from './ndt-hash';
import { getNdtInspectionReadiness } from './ndt-readiness';
import { clampSigningTime, createRequestCode, normalizeRequestCode } from './ndt-ids';
import {
  CompleteNdtRemoteRequestInput,
  CreateNdtInspectionInput,
  CreateNdtRemoteRequestInput,
  NdtInspection,
  NdtInspectionDetail,
  NdtMethod,
  NdtMethodLevelTotal,
  NdtMethodTotal,
  NdtRemoteSignatureRequest,
  NdtSignature,
  NdtSummary,
  SignNdtInspectionInput,
  UpdateNdtInspectionInput,
} from './types';

// NDT signing token. Same shape as the rope-access token (so the verifier link
// and the test's reconstruction match), but a DISTINCT deep-link scheme so the
// router can route NDT verifications independently of rope-access ones. The
// rope-access buildRemoteSigningToken/Url are intentionally NOT reused.
export function buildNdtSigningToken(request: Pick<NdtRemoteSignatureRequest, 'id' | 'request_code'>): string {
  return `${normalizeRequestCode(request.request_code)}.${request.id.replace(/[^a-zA-Z0-9]/g, '')}`;
}

export function buildNdtSigningUrl(
  request: Pick<NdtRemoteSignatureRequest, 'id' | 'request_code'>,
  options: { origin?: string | null } = {},
): string {
  const requestCode = normalizeRequestCode(request.request_code);
  const token = buildNdtSigningToken(request);
  const query = `token=${encodeURIComponent(token)}`;
  const origin = options.origin?.trim().replace(/\/+$/, '');

  if (origin) {
    return `${origin}/ndt-verify/${requestCode}?${query}`;
  }

  return `ralb://ndt-verify/${requestCode}?${query}`;
}

// Editable statuses. Once an inspection is verified/amended (sealed) or pending
// (in-flight to a verifier), its attested fields are immutable.
const EDITABLE_STATUSES: ReadonlySet<NdtInspection['status']> = new Set(['draft', 'logged']);
// Statuses a signature may be applied from. NDT flows draft -> logged -> pending
// -> verified, and a technician may sign directly from any pre-verified state.
const SIGNABLE_STATUSES: ReadonlySet<NdtInspection['status']> = new Set(['draft', 'logged', 'pending']);

export function createNdtService(db: DbClient) {
  async function getInspectionById(id: string): Promise<NdtInspection | null> {
    return db.get<NdtInspection>('SELECT * FROM ndt_inspections WHERE id = ?', [id]);
  }

  async function getSignatureForInspection(inspectionId: string): Promise<NdtSignature | null> {
    return db.get<NdtSignature>(
      `SELECT
        id, inspection_id, verifier_name, verifier_cert_number, verifier_level,
        verifier_scheme, verifier_employer, signed_at, inspection_hash, hash_version,
        method, remote_request_id, signer_attestation, signature_path,
        attestation_accepted_at, previous_chain_hash, chain_hash, created_at
      FROM ndt_signatures
      WHERE inspection_id = ?
      LIMIT 1`,
      [inspectionId],
    );
  }

  async function getPendingRequestForInspection(inspectionId: string): Promise<NdtRemoteSignatureRequest | null> {
    return db.get<NdtRemoteSignatureRequest>(
      `SELECT
        id, inspection_id, recipient_name, recipient_contact, verifier_role, verifier_company,
        status, request_code, inspection_hash, hash_version, expires_at, completed_signature_id,
        signing_token_hash, token_hint, viewed_at, completed_at, created_at, updated_at
      FROM ndt_remote_signature_requests
      WHERE inspection_id = ? AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1`,
      [inspectionId],
    );
  }

  async function getRequestByCode(requestCode: string): Promise<NdtRemoteSignatureRequest | null> {
    return db.get<NdtRemoteSignatureRequest>(
      `SELECT
        id, inspection_id, recipient_name, recipient_contact, verifier_role, verifier_company,
        status, request_code, inspection_hash, hash_version, expires_at, completed_signature_id,
        signing_token_hash, token_hint, viewed_at, completed_at, created_at, updated_at
      FROM ndt_remote_signature_requests
      WHERE request_code = ?
      LIMIT 1`,
      [normalizeRequestCode(requestCode)],
    );
  }

  async function validateNdtSigningToken(
    request: NdtRemoteSignatureRequest,
    signingToken: string | null | undefined,
  ): Promise<void> {
    if (!request.signing_token_hash) return;

    const token = signingToken?.trim();
    if (!token) throw new Error('ndt_remote_request_token_required');

    const tokenHash = await hashNdtSigningToken(token);
    if (tokenHash !== request.signing_token_hash) {
      throw new Error('ndt_remote_request_token_invalid');
    }
  }

  // Lazily expire a never-completed request and self-heal the inspection mirror,
  // mirroring logbook-service maybeExpireRemoteRequest. A pending NDT request
  // strands its inspection in a false 'pending' (un-editable, un-deletable), so
  // on expiry we flip the request to 'expired' and restore the inspection to
  // 'logged' (NOT 'draft' — it had already been logged to reach pending).
  async function maybeExpireNdtRequest(
    request: NdtRemoteSignatureRequest,
    now: string,
  ): Promise<NdtRemoteSignatureRequest> {
    if (request.status !== 'pending' || !isExpiredAt(request.expires_at, now)) {
      return request;
    }

    await db.run(
      "UPDATE ndt_remote_signature_requests SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'pending'",
      [now, request.id],
    );
    await db.run(
      "UPDATE ndt_inspections SET status = 'logged', pending_signature_id = NULL, updated_at = ? WHERE id = ? AND pending_signature_id = ?",
      [now, request.inspection_id, request.id],
    );

    return { ...request, status: 'expired', updated_at: now };
  }

  // The chain head is the signature whose chain_hash nothing else points back to
  // (the tail of the linked list). Resolving it by linkage rather than by
  // signed_at is robust to equal timestamps: two signatures created in the same
  // millisecond would otherwise make the head ambiguous and could fork the
  // chain. The ORDER BY is only a defensive tiebreaker for a malformed
  // (multi-tail) chain. INDEPENDENT of the rope-access signatures chain.
  // Copied algorithm from logbook-service getLatestChainHash, over ndt_signatures.
  async function getLatestNdtChainHash(): Promise<string | null> {
    const row = await db.get<{ chain_hash: string | null }>(
      `SELECT s.chain_hash
         FROM ndt_signatures s
        WHERE s.chain_hash IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM ndt_signatures p WHERE p.previous_chain_hash = s.chain_hash
          )
        ORDER BY s.signed_at DESC, s.created_at DESC
        LIMIT 1`,
    );
    return row?.chain_hash ?? null;
  }

  async function getLinkedEntryLabel(linkedEntryId: string | null): Promise<string | null> {
    if (!linkedEntryId) return null;
    const entry = await db.get<{ site: string | null; date_to: string | null }>(
      'SELECT site, date_to FROM entries WHERE id = ?',
      [linkedEntryId],
    );
    if (!entry) return null;
    const parts = [entry.site?.trim(), entry.date_to?.trim()].filter((p): p is string => Boolean(p));
    return parts.length ? parts.join(' · ') : null;
  }

  async function getInspectionDetail(id: string): Promise<NdtInspectionDetail | null> {
    const inspection = await getInspectionById(id);
    if (!inspection) return null;
    return {
      inspection,
      signature: await getSignatureForInspection(id),
      remote_request: await getPendingRequestForInspection(id),
      linked_entry_label: await getLinkedEntryLabel(inspection.linked_entry_id),
    };
  }

  return {
    async listInspections(): Promise<NdtInspection[]> {
      return db.getAll<NdtInspection>(
        'SELECT * FROM ndt_inspections ORDER BY date_from DESC, created_at DESC',
      );
    },

    // Bulk fetch for the audit export's NDT section: all inspections plus a
    // lookup of the (at most one) signature per inspection. Kept here (vs. N×
    // getInspectionDetail) so the export screen does a single round-trip. The
    // ascending order matches the rope-access export's record ledger ordering.
    async listInspectionsWithSignatures(): Promise<{
      inspections: NdtInspection[];
      signaturesById: Record<string, NdtSignature>;
    }> {
      const inspections = await db.getAll<NdtInspection>(
        'SELECT * FROM ndt_inspections ORDER BY date_from ASC, created_at ASC',
      );
      const signatures = await db.getAll<NdtSignature>(
        `SELECT
          id, inspection_id, verifier_name, verifier_cert_number, verifier_level,
          verifier_scheme, verifier_employer, signed_at, inspection_hash, hash_version,
          method, remote_request_id, signer_attestation, signature_path,
          attestation_accepted_at, previous_chain_hash, chain_hash, created_at
        FROM ndt_signatures
        ORDER BY signed_at ASC, created_at ASC`,
      );
      const signaturesById: Record<string, NdtSignature> = {};
      for (const sig of signatures) {
        signaturesById[sig.inspection_id] = sig;
      }
      return { inspections, signaturesById };
    },

    getInspectionById,

    getInspectionDetail,

    getLatestNdtChainHash,

    async createInspection(input: CreateNdtInspectionInput): Promise<NdtInspection> {
      const now = new Date().toISOString();
      const id = createId('ndt');
      const dateFrom = input.date_from ?? todayLocalIsoDate();
      const dateTo = input.date_to ?? dateFrom;
      if (!isValidIsoDateRange(dateFrom, dateTo)) throw new Error('ndt_date_range_invalid');
      if (!input.site || !input.site.trim()) throw new Error('ndt_site_required');

      await db.run(
        `INSERT INTO ndt_inspections (
          id, date_from, date_to, method, technique, ndt_level_snapshot, supervised,
          hours, site, client, employer, procedure_ref, component, ndt_scheme,
          description, linked_entry_id, status, amends_inspection_id,
          pending_signature_id, timezone_offset, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, NULL, ?, ?, ?)`,
        [
          id,
          dateFrom,
          dateTo,
          input.method,
          input.technique?.trim() || null,
          input.ndt_level_snapshot ?? null,
          input.supervised,
          input.hours,
          input.site.trim(),
          input.client?.trim() || null,
          input.employer?.trim() || null,
          input.procedure_ref?.trim() || null,
          input.component?.trim() || null,
          input.ndt_scheme ?? null,
          input.description?.trim() || null,
          input.linked_entry_id ?? null,
          input.amends_inspection_id ?? null,
          input.timezone_offset ?? new Date().getTimezoneOffset(),
          now,
          now,
        ],
      );

      const inspection = await getInspectionById(id);
      if (!inspection) throw new Error('ndt_create_failed');
      return inspection;
    },

    async updateInspection(input: UpdateNdtInspectionInput): Promise<NdtInspection> {
      const existing = await getInspectionById(input.id);
      if (!existing) throw new Error('ndt_not_found');
      if (!EDITABLE_STATUSES.has(existing.status)) throw new Error('ndt_locked');
      if (existing.pending_signature_id) throw new Error('ndt_pending_signature');

      const now = new Date().toISOString();
      const dateFrom = input.date_from ?? existing.date_from;
      const dateTo = input.date_to ?? dateFrom;
      if (!isValidIsoDateRange(dateFrom, dateTo)) throw new Error('ndt_date_range_invalid');
      const site = input.site === undefined ? existing.site : input.site?.trim() || '';
      if (!site.trim()) throw new Error('ndt_site_required');

      const result = await db.run(
        `UPDATE ndt_inspections
         SET date_from = ?, date_to = ?, method = ?, technique = ?, ndt_level_snapshot = ?,
             supervised = ?, hours = ?, site = ?, client = ?, employer = ?,
             procedure_ref = ?, component = ?, ndt_scheme = ?, description = ?,
             linked_entry_id = ?, amends_inspection_id = ?, timezone_offset = ?, updated_at = ?
         WHERE id = ? AND status IN ('draft', 'logged') AND pending_signature_id IS NULL`,
        [
          dateFrom,
          dateTo,
          input.method ?? existing.method,
          input.technique === undefined ? existing.technique : input.technique?.trim() || null,
          input.ndt_level_snapshot === undefined ? existing.ndt_level_snapshot : input.ndt_level_snapshot ?? null,
          input.supervised ?? existing.supervised,
          input.hours ?? existing.hours,
          site.trim(),
          input.client === undefined ? existing.client : input.client?.trim() || null,
          input.employer === undefined ? existing.employer : input.employer?.trim() || null,
          input.procedure_ref === undefined ? existing.procedure_ref : input.procedure_ref?.trim() || null,
          input.component === undefined ? existing.component : input.component?.trim() || null,
          input.ndt_scheme === undefined ? existing.ndt_scheme : input.ndt_scheme ?? null,
          input.description === undefined ? existing.description : input.description?.trim() || null,
          input.linked_entry_id === undefined ? existing.linked_entry_id : input.linked_entry_id ?? null,
          input.amends_inspection_id === undefined ? existing.amends_inspection_id : input.amends_inspection_id ?? null,
          input.timezone_offset === undefined ? existing.timezone_offset : input.timezone_offset ?? null,
          now,
          existing.id,
        ],
      );
      if (result.changes !== 1) throw new Error('ndt_update_failed');

      const inspection = await getInspectionById(existing.id);
      if (!inspection) throw new Error('ndt_not_found');
      return inspection;
    },

    async deleteInspection(id: string): Promise<void> {
      const existing = await getInspectionById(id);
      if (!existing) throw new Error('ndt_not_found');
      if (!EDITABLE_STATUSES.has(existing.status)) throw new Error('ndt_not_deletable');

      const pending = await getPendingRequestForInspection(id);
      if (pending) throw new Error('ndt_has_pending_remote_request');
      if (existing.pending_signature_id) throw new Error('ndt_pending_signature');

      await db.exec('BEGIN');
      try {
        // Clean up any non-pending remote requests (cancelled / expired). No
        // 'completed' rows exist while the inspection is still editable.
        await db.run('DELETE FROM ndt_remote_signature_requests WHERE inspection_id = ?', [id]);
        const result = await db.run(
          "DELETE FROM ndt_inspections WHERE id = ? AND status IN ('draft', 'logged') AND pending_signature_id IS NULL",
          [id],
        );
        if (result.changes !== 1) throw new Error('ndt_delete_failed');
        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }
    },

    async markLogged(id: string): Promise<NdtInspection> {
      const existing = await getInspectionById(id);
      if (!existing) throw new Error('ndt_not_found');
      if (existing.status !== 'draft') throw new Error('ndt_not_loggable');
      const readiness = getNdtInspectionReadiness(existing);
      if (!readiness.ready) {
        throw new Error(`ndt_incomplete: ${readiness.missingFields.join(', ')}`);
      }

      const now = new Date().toISOString();
      const result = await db.run(
        "UPDATE ndt_inspections SET status = 'logged', updated_at = ? WHERE id = ? AND status = 'draft'",
        [now, id],
      );
      if (result.changes !== 1) throw new Error('ndt_log_failed');

      const inspection = await getInspectionById(id);
      if (!inspection) throw new Error('ndt_not_found');
      return inspection;
    },

    async signNdtLocal(input: SignNdtInspectionInput): Promise<NdtInspectionDetail> {
      const now = new Date().toISOString();
      const signaturePath = input.signature_path.trim();
      if (input.verifier_name.trim().length < 2) throw new Error('ndt_verifier_name_required');
      if (!signaturePath) throw new Error('ndt_signature_required');
      if (!input.attestation_accepted) throw new Error('ndt_attestation_required');
      // Cert number is ALWAYS required for NDT — a Level III without a cert
      // number is meaningless.
      if (input.verifier_cert_number.trim().length < 2) throw new Error('ndt_verifier_cert_required');

      await db.exec('BEGIN');
      try {
        const inspection = await getInspectionById(input.inspection_id);
        if (!inspection) throw new Error('ndt_not_found');
        if (!SIGNABLE_STATUSES.has(inspection.status)) throw new Error('ndt_not_signable');
        const readiness = getNdtInspectionReadiness(inspection);
        if (!readiness.ready) {
          throw new Error(`ndt_incomplete: ${readiness.missingFields.join(', ')}`);
        }

        const signatureId = createId('ndtsig');
        // Local signing is always device-now. Never trust a caller-supplied
        // timestamp: it would allow backdating and reorder the hash chain.
        const signedAt = now;
        const inspectionHash = await hashNdtInspection(inspection);
        const previousChainHash = await getLatestNdtChainHash();

        // Build the signature row in memory FIRST, then derive the chain
        // envelope from that exact row. This makes an envelope/stored-row field
        // mismatch (which would make verifyNdtChainHashFor reject every fresh
        // signature) structurally impossible.
        const sigRow: NdtSignature = {
          id: signatureId,
          inspection_id: inspection.id,
          verifier_name: input.verifier_name.trim(),
          verifier_cert_number: input.verifier_cert_number.trim(),
          verifier_level: input.verifier_level ?? null,
          verifier_scheme: input.verifier_scheme?.trim() || null,
          verifier_employer: input.verifier_employer?.trim() || null,
          signed_at: signedAt,
          inspection_hash: inspectionHash,
          hash_version: NDT_HASH_VERSION,
          method: 'local',
          remote_request_id: null,
          signer_attestation: input.signer_attestation?.trim() || null,
          signature_path: signaturePath,
          attestation_accepted_at: signedAt,
          previous_chain_hash: previousChainHash,
          chain_hash: null,
          created_at: now,
        };
        const chainHash = await hashNdtSignatureChain({
          inspectionHash,
          signatureId,
          signedAt,
          method: 'local',
          previousChainHash,
          remoteRequestId: null,
          signer: ndtSignerEnvelopeFromSignature(sigRow),
        });

        await db.run(
          `INSERT INTO ndt_signatures (
            id, inspection_id, verifier_name, verifier_cert_number, verifier_level,
            verifier_scheme, verifier_employer, signed_at, inspection_hash, hash_version,
            method, remote_request_id, signer_attestation, signature_path,
            attestation_accepted_at, previous_chain_hash, chain_hash, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local', NULL, ?, ?, ?, ?, ?, ?)`,
          [
            sigRow.id,
            sigRow.inspection_id,
            sigRow.verifier_name,
            sigRow.verifier_cert_number,
            sigRow.verifier_level,
            sigRow.verifier_scheme,
            sigRow.verifier_employer,
            sigRow.signed_at,
            sigRow.inspection_hash,
            sigRow.hash_version,
            sigRow.signer_attestation,
            sigRow.signature_path,
            sigRow.attestation_accepted_at,
            sigRow.previous_chain_hash,
            chainHash,
            sigRow.created_at,
          ],
        );

        await db.run(
          "UPDATE ndt_inspections SET status = 'verified', pending_signature_id = NULL, updated_at = ? WHERE id = ?",
          [now, inspection.id],
        );
        await db.run(
          "UPDATE ndt_remote_signature_requests SET status = 'cancelled', updated_at = ? WHERE inspection_id = ? AND status = 'pending'",
          [now, inspection.id],
        );

        if (inspection.amends_inspection_id) {
          await db.run(
            "UPDATE ndt_inspections SET status = 'amended', updated_at = ? WHERE id = ? AND status = 'verified'",
            [now, inspection.amends_inspection_id],
          );
        }

        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }

      const detail = await getInspectionDetail(input.inspection_id);
      if (!detail) throw new Error('ndt_sign_failed');
      return detail;
    },

    async createRemoteRequest(input: CreateNdtRemoteRequestInput): Promise<NdtInspectionDetail> {
      const now = new Date().toISOString();
      const inspection = await getInspectionById(input.inspection_id);
      if (!inspection) throw new Error('ndt_not_found');
      if (inspection.status !== 'logged') throw new Error('ndt_not_requestable');
      if (input.recipient_name.trim().length < 2) throw new Error('ndt_recipient_name_required');
      const readiness = getNdtInspectionReadiness(inspection);
      if (!readiness.ready) {
        throw new Error(`ndt_incomplete: ${readiness.missingFields.join(', ')}`);
      }

      const existing = await getPendingRequestForInspection(inspection.id);
      if (existing) {
        const detail = await getInspectionDetail(inspection.id);
        if (!detail) throw new Error('ndt_not_found');
        return detail;
      }

      const requestId = createId('ndt_remote');
      const requestCode = createRequestCode(requestId);
      const signingToken = buildNdtSigningToken({ id: requestId, request_code: requestCode });
      const signingTokenHash = await hashNdtSigningToken(signingToken);
      const inspectionHash = await hashNdtInspection(inspection);
      const expiresAt = input.expires_at ?? addDaysIso(14);

      await db.exec('BEGIN');
      try {
        await db.run(
          `INSERT INTO ndt_remote_signature_requests (
            id, inspection_id, recipient_name, recipient_contact, verifier_role, verifier_company,
            status, request_code, inspection_hash, hash_version, expires_at, completed_signature_id,
            signing_token_hash, token_hint, viewed_at, completed_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, ?, ?)`,
          [
            requestId,
            inspection.id,
            input.recipient_name.trim(),
            input.recipient_contact?.trim() || null,
            input.verifier_role?.trim() || null,
            input.verifier_company?.trim() || null,
            requestCode,
            inspectionHash,
            NDT_HASH_VERSION,
            expiresAt,
            signingTokenHash,
            signingToken.slice(-6),
            now,
            now,
          ],
        );
        await db.run(
          "UPDATE ndt_inspections SET status = 'pending', pending_signature_id = ?, updated_at = ? WHERE id = ?",
          [requestId, now, inspection.id],
        );
        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }

      const detail = await getInspectionDetail(inspection.id);
      if (!detail) throw new Error('ndt_remote_request_failed');
      return detail;
    },

    async cancelRemoteRequest(inspectionId: string): Promise<NdtInspectionDetail> {
      const now = new Date().toISOString();
      const inspection = await getInspectionById(inspectionId);
      if (!inspection) throw new Error('ndt_not_found');
      const pending = await getPendingRequestForInspection(inspectionId);
      if (!pending) throw new Error('ndt_no_pending_request_to_cancel');

      await db.exec('BEGIN');
      try {
        await db.run(
          "UPDATE ndt_remote_signature_requests SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = 'pending'",
          [now, pending.id],
        );
        // Restore to 'logged' (NOT 'draft'): the inspection had already been
        // logged to reach 'pending'.
        await db.run(
          "UPDATE ndt_inspections SET status = 'logged', pending_signature_id = NULL, updated_at = ? WHERE id = ?",
          [now, inspection.id],
        );
        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }

      const detail = await getInspectionDetail(inspection.id);
      if (!detail) throw new Error('ndt_cancel_remote_request_failed');
      return detail;
    },

    async getRemoteRequestDetail(args: {
      request_code: string;
      signing_token?: string | null;
      mark_viewed?: boolean;
    }): Promise<{ inspection: NdtInspection; request: NdtRemoteSignatureRequest } | null> {
      const now = new Date().toISOString();
      const existing = await getRequestByCode(args.request_code);
      if (!existing) return null;

      await validateNdtSigningToken(existing, args.signing_token);
      let request = await maybeExpireNdtRequest(existing, now);
      if (args.mark_viewed && request.status === 'pending' && !request.viewed_at) {
        await db.run(
          'UPDATE ndt_remote_signature_requests SET viewed_at = ?, updated_at = ? WHERE id = ? AND viewed_at IS NULL',
          [now, now, request.id],
        );
        request = { ...request, viewed_at: now, updated_at: now };
      }

      const inspection = await getInspectionById(request.inspection_id);
      if (!inspection) return null;
      return { inspection, request };
    },

    async getSummary(): Promise<NdtSummary> {
      const ACCRUED = `'logged','pending','verified'`;

      // Scalar sums
      const selfRow = await db.get<{ hours: number | null }>(
        `SELECT SUM(hours) AS hours FROM ndt_inspections WHERE status IN ('logged','pending')`,
      );
      const verifiedRow = await db.get<{ hours: number | null }>(
        `SELECT SUM(hours) AS hours FROM ndt_inspections WHERE status = 'verified'`,
      );
      const selfLoggedHours = Number(((selfRow?.hours ?? 0)).toFixed(2));
      const verifiedHours = Number(((verifiedRow?.hours ?? 0)).toFixed(2));

      // byMethod — accrued statuses grouped by method
      const byMethodRaw = await db.getAll<{ method: NdtMethod; hours: number | null; inspections: number }>(
        `SELECT method, SUM(hours) AS hours, COUNT(*) AS inspections
         FROM ndt_inspections
         WHERE status IN (${ACCRUED})
         GROUP BY method
         ORDER BY method`,
      );
      const byMethod: NdtMethodTotal[] = byMethodRaw.map((r) => ({
        method: r.method,
        hours: Number((r.hours ?? 0).toFixed(2)),
        inspections: r.inspections,
      }));

      // byMethodVerified — verified only, grouped by method
      const byMethodVerifiedRaw = await db.getAll<{ method: NdtMethod; hours: number | null; inspections: number }>(
        `SELECT method, SUM(hours) AS hours, COUNT(*) AS inspections
         FROM ndt_inspections
         WHERE status = 'verified'
         GROUP BY method
         ORDER BY method`,
      );
      const byMethodVerified: NdtMethodTotal[] = byMethodVerifiedRaw.map((r) => ({
        method: r.method,
        hours: Number((r.hours ?? 0).toFixed(2)),
        inspections: r.inspections,
      }));

      // byMethodLevel — accrued statuses grouped by method + level
      const byMethodLevelRaw = await db.getAll<{ method: NdtMethod; level: string; hours: number | null }>(
        `SELECT method,
                COALESCE(ndt_level_snapshot, 'Unspecified') AS level,
                SUM(hours) AS hours
         FROM ndt_inspections
         WHERE status IN (${ACCRUED})
         GROUP BY method, COALESCE(ndt_level_snapshot, 'Unspecified')
         ORDER BY method, level`,
      );
      const byMethodLevel: NdtMethodLevelTotal[] = byMethodLevelRaw.map((r) => ({
        method: r.method,
        level: r.level as NdtMethodLevelTotal['level'],
        hours: Number((r.hours ?? 0).toFixed(2)),
      }));

      // supervisedSplit — per method, supervised vs independent, over accrued statuses
      const supervisedRaw = await db.getAll<{
        method: NdtMethod;
        supervised: number | null;
        independent: number | null;
      }>(
        `SELECT method,
                SUM(CASE WHEN supervised = 'supervised' THEN hours ELSE 0 END) AS supervised,
                SUM(CASE WHEN supervised = 'independent' THEN hours ELSE 0 END) AS independent
         FROM ndt_inspections
         WHERE status IN (${ACCRUED})
         GROUP BY method
         ORDER BY method`,
      );
      const supervisedSplit = supervisedRaw.map((r) => ({
        method: r.method,
        supervised: Number((r.supervised ?? 0).toFixed(2)),
        independent: Number((r.independent ?? 0).toFixed(2)),
      }));

      // last12mByMethod — byMethod-shape filtered to last 12 months
      const last12mRaw = await db.getAll<{ method: NdtMethod; hours: number | null; inspections: number }>(
        `SELECT method, SUM(hours) AS hours, COUNT(*) AS inspections
         FROM ndt_inspections
         WHERE status IN (${ACCRUED})
           AND date_from >= date('now', '-12 months')
         GROUP BY method
         ORDER BY method`,
      );
      const last12mByMethod: NdtMethodTotal[] = last12mRaw.map((r) => ({
        method: r.method,
        hours: Number((r.hours ?? 0).toFixed(2)),
        inspections: r.inspections,
      }));

      return {
        selfLoggedHours,
        verifiedHours,
        byMethod,
        byMethodVerified,
        byMethodLevel,
        supervisedSplit,
        last12mByMethod,
      };
    },

    async completeRemoteRequest(input: CompleteNdtRemoteRequestInput): Promise<NdtInspectionDetail> {
      const now = new Date().toISOString();
      const requestCode = normalizeRequestCode(input.request_code);
      const signaturePath = input.signature_path.trim();
      if (!requestCode) throw new Error('ndt_remote_request_code_required');
      if (input.verifier_name.trim().length < 2) throw new Error('ndt_verifier_name_required');
      if (!signaturePath) throw new Error('ndt_signature_required');
      if (!input.attestation_accepted) throw new Error('ndt_attestation_required');
      if (input.verifier_cert_number.trim().length < 2) throw new Error('ndt_verifier_cert_required');

      let inspectionId: string | null = null;

      await db.exec('BEGIN');
      try {
        const existing = await getRequestByCode(requestCode);
        if (!existing) throw new Error('ndt_remote_request_not_found');
        await validateNdtSigningToken(existing, input.signing_token);
        const request = await maybeExpireNdtRequest(existing, now);
        if (request.status === 'expired') throw new Error('ndt_remote_request_expired');
        if (request.status !== 'pending') throw new Error('ndt_remote_request_not_pending');
        if (isExpiredAt(request.expires_at, now)) throw new Error('ndt_remote_request_expired');

        const inspection = await getInspectionById(request.inspection_id);
        if (!inspection) throw new Error('ndt_not_found');
        // The inspection is 'pending' (in-flight to the verifier), NOT 'draft'.
        if (inspection.status !== 'pending') throw new Error('ndt_not_signable');
        if (inspection.pending_signature_id && inspection.pending_signature_id !== request.id) {
          throw new Error('ndt_remote_request_mismatch');
        }

        const currentHash = await hashNdtInspection(inspection);
        if (currentHash !== request.inspection_hash || request.hash_version !== NDT_HASH_VERSION) {
          throw new Error('ndt_inspection_hash_mismatch');
        }

        const signatureId = createId('ndtsig');
        // The hosted edge function stamps signed_at server-side; the local
        // verify path passes none (-> now). Clamp to [request created, now]
        // (+skew) so a corrupt/hostile payload can't backdate the attestation.
        const signedAt = clampSigningTime(input.signed_at, request.created_at, now);
        const previousChainHash = await getLatestNdtChainHash();

        const sigRow: NdtSignature = {
          id: signatureId,
          inspection_id: inspection.id,
          verifier_name: input.verifier_name.trim(),
          verifier_cert_number: input.verifier_cert_number.trim(),
          verifier_level: input.verifier_level ?? null,
          verifier_scheme: input.verifier_scheme?.trim() || null,
          verifier_employer: input.verifier_employer?.trim() || null,
          signed_at: signedAt,
          inspection_hash: request.inspection_hash,
          hash_version: request.hash_version,
          method: 'remote',
          remote_request_id: request.id,
          signer_attestation: input.signer_attestation?.trim() || null,
          signature_path: signaturePath,
          attestation_accepted_at: signedAt,
          previous_chain_hash: previousChainHash,
          chain_hash: null,
          created_at: now,
        };
        const chainHash = await hashNdtSignatureChain({
          inspectionHash: request.inspection_hash,
          signatureId,
          signedAt,
          method: 'remote',
          previousChainHash,
          remoteRequestId: request.id,
          version: request.hash_version,
          signer: ndtSignerEnvelopeFromSignature(sigRow),
        });

        await db.run(
          `INSERT INTO ndt_signatures (
            id, inspection_id, verifier_name, verifier_cert_number, verifier_level,
            verifier_scheme, verifier_employer, signed_at, inspection_hash, hash_version,
            method, remote_request_id, signer_attestation, signature_path,
            attestation_accepted_at, previous_chain_hash, chain_hash, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'remote', ?, ?, ?, ?, ?, ?, ?)`,
          [
            sigRow.id,
            sigRow.inspection_id,
            sigRow.verifier_name,
            sigRow.verifier_cert_number,
            sigRow.verifier_level,
            sigRow.verifier_scheme,
            sigRow.verifier_employer,
            sigRow.signed_at,
            sigRow.inspection_hash,
            sigRow.hash_version,
            sigRow.remote_request_id,
            sigRow.signer_attestation,
            sigRow.signature_path,
            sigRow.attestation_accepted_at,
            sigRow.previous_chain_hash,
            chainHash,
            sigRow.created_at,
          ],
        );

        await db.run(
          "UPDATE ndt_inspections SET status = 'verified', pending_signature_id = NULL, updated_at = ? WHERE id = ?",
          [now, inspection.id],
        );
        await db.run(
          "UPDATE ndt_remote_signature_requests SET status = 'completed', completed_signature_id = ?, completed_at = ?, updated_at = ? WHERE id = ?",
          [signatureId, signedAt, now, request.id],
        );

        if (inspection.amends_inspection_id) {
          await db.run(
            "UPDATE ndt_inspections SET status = 'amended', updated_at = ? WHERE id = ? AND status = 'verified'",
            [now, inspection.amends_inspection_id],
          );
        }

        inspectionId = inspection.id;
        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }

      if (!inspectionId) throw new Error('ndt_remote_completion_failed');
      const detail = await getInspectionDetail(inspectionId);
      if (!detail) throw new Error('ndt_remote_completion_failed');
      return detail;
    },
  };
}
