import { DbClient } from '@/src/db/client';
import { createId } from '../id';
import { addDaysIso, isExpiredAt, isValidIsoDateRange, todayLocalIsoDate } from '../date-utils';
import { SignerScheme } from '../profile/types';
import { getEntryVerificationReadiness } from './entry-readiness';
import { ENTRY_HASH_VERSION, hashEntry, hashRemoteSigningToken, hashSignatureChain, verifyChainHashFor } from './entry-hash';
import { buildEntryExportPacket, buildLogbookCsv, buildLogbookExportBundle } from './export';
import {
  AddEntryAttachmentInput,
  AttachGearToEntryInput,
  CareerStats,
  CompleteRemoteSignatureRequestInput,
  CreateAmendmentInput,
  CreateEntryInput,
  CreateEntryTemplateInput,
  CreateRemoteSignatureRequestInput,
  DashboardSummary,
  EntryDetail,
  EntryAttachment,
  EntryAttachmentWithEntry,
  EntryGearUsageDetail,
  EntrySignature,
  EntryTemplate,
  ExportLogbookOptions,
  LogbookEntry,
  LogbookExportBundle,
  LogbookExportPacket,
  RemoteSignatureRequest,
  RemoteSignatureAccessInput,
  RemoteSignatureRequestDetail,
  RemoveGearFromEntryInput,
  SignEntryInput,
  SupervisorContact,
  UpdateDraftEntryInput,
  canonicalizeHazards,
  parseHazards,
} from './types';

function isoDateToUtcMs(value: string): number {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

function expirationAlert(label: string, value: string | null): DashboardSummary['expiringCerts'][number] {
  if (!value) {
    return { label, value, severity: 'missing', daysRemaining: null };
  }

  const today = todayLocalIsoDate();
  const daysRemaining = Math.ceil((isoDateToUtcMs(value) - isoDateToUtcMs(today)) / 86_400_000);
  const severity = daysRemaining < 0 ? 'expired' : daysRemaining <= 60 ? 'warning' : 'ok';
  return { label, value, severity, daysRemaining };
}

function rowLimit(limit: number | undefined, fallback = 6): number {
  return Math.max(1, Math.min(limit ?? fallback, 25));
}

function normalizeRequestCode(requestCode: string): string {
  return requestCode.trim().toUpperCase();
}

// Backdating guard for remote signatures. A signing time is only trusted if it
// falls within [request created, now] (+ a small clock-skew tolerance);
// anything else (missing, unparseable, before the request existed, or in the
// future) falls back to `now`.
const SIGNING_TIME_SKEW_MS = 5 * 60 * 1000;
function clampSigningTime(
  candidate: string | null | undefined,
  notBefore: string,
  now: string,
): string {
  if (!candidate) return now;
  const t = new Date(candidate).getTime();
  const lower = new Date(notBefore).getTime();
  const upper = new Date(now).getTime() + SIGNING_TIME_SKEW_MS;
  // Apply the skew tolerance to BOTH bounds: the verifier's server clock and
  // the technician's device clock can differ by a few seconds, so a legitimate
  // server-stamped time may land just outside the raw [created_at, now] window.
  if (
    !Number.isFinite(t) ||
    (Number.isFinite(lower) && t < lower - SIGNING_TIME_SKEW_MS) ||
    t > upper
  ) {
    return now;
  }
  return candidate;
}

export function buildRemoteSigningToken(request: Pick<RemoteSignatureRequest, 'id' | 'request_code'>): string {
  return `${normalizeRequestCode(request.request_code)}.${request.id.replace(/[^a-zA-Z0-9]/g, '')}`;
}

export function buildRemoteSigningUrl(
  request: Pick<RemoteSignatureRequest, 'id' | 'request_code'>,
  options: { origin?: string | null } = {},
): string {
  const requestCode = normalizeRequestCode(request.request_code);
  const token = buildRemoteSigningToken(request);
  const query = `token=${encodeURIComponent(token)}`;
  const origin = options.origin?.trim().replace(/\/+$/, '');

  if (origin) {
    return `${origin}/verify/${requestCode}?${query}`;
  }

  return `ralb://verify/${requestCode}?${query}`;
}

export function createLogbookService(db: DbClient) {
  async function getEntryById(id: string): Promise<LogbookEntry | null> {
    return db.get<LogbookEntry>('SELECT * FROM entries WHERE id = ?', [id]);
  }

  async function getSignatureForEntry(entryId: string): Promise<EntrySignature | null> {
    return db.get<EntrySignature>(
      `SELECT
        id, entry_id, supervisor_name, supervisor_scheme, supervisor_cert_number,
        supervisor_role, supervisor_employer, signed_at, entry_hash, hash_version,
        method, remote_request_id, signer_attestation, signature_path,
        attestation_accepted_at, previous_chain_hash, chain_hash, created_at
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
        signing_token_hash, token_hint, viewed_at, completed_at, created_at, updated_at
      FROM remote_signature_requests
      WHERE entry_id = ? AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1`,
      [entryId],
    );
  }

  async function getLatestRemoteRequestForEntry(entryId: string): Promise<RemoteSignatureRequest | null> {
    return db.get<RemoteSignatureRequest>(
      `SELECT
        id, entry_id, recipient_name, recipient_contact, verifier_role, verifier_company,
        status, request_code, entry_hash, hash_version, expires_at, completed_signature_id,
        signing_token_hash, token_hint, viewed_at, completed_at, created_at, updated_at
      FROM remote_signature_requests
      WHERE entry_id = ?
      ORDER BY created_at DESC
      LIMIT 1`,
      [entryId],
    );
  }

  async function getRemoteRequestByCode(requestCode: string): Promise<RemoteSignatureRequest | null> {
    return db.get<RemoteSignatureRequest>(
      `SELECT
        id, entry_id, recipient_name, recipient_contact, verifier_role, verifier_company,
        status, request_code, entry_hash, hash_version, expires_at, completed_signature_id,
        signing_token_hash, token_hint, viewed_at, completed_at, created_at, updated_at
      FROM remote_signature_requests
      WHERE request_code = ?
      LIMIT 1`,
      [normalizeRequestCode(requestCode)],
    );
  }

  async function validateRemoteSigningToken(
    request: RemoteSignatureRequest,
    signingToken: string | null | undefined,
  ): Promise<void> {
    if (!request.signing_token_hash) return;

    const token = signingToken?.trim();
    if (!token) throw new Error('remote_request_token_required');

    const tokenHash = await hashRemoteSigningToken(token);
    if (tokenHash !== request.signing_token_hash) {
      throw new Error('remote_request_token_invalid');
    }
  }

  async function maybeExpireRemoteRequest(request: RemoteSignatureRequest, now: string): Promise<RemoteSignatureRequest> {
    if (request.status !== 'pending' || !isExpiredAt(request.expires_at, now)) {
      return request;
    }

    await db.run(
      "UPDATE remote_signature_requests SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'pending'",
      [now, request.id],
    );
    // P1-5: also clear the entry's pending mirror. Without this the draft is
    // stranded in a false 'pending' — un-editable, un-deletable, and with no
    // pending request left to cancel.
    await db.run(
      'UPDATE entries SET pending_signature_id = NULL, updated_at = ? WHERE id = ? AND pending_signature_id = ?',
      [now, request.entry_id, request.id],
    );

    return { ...request, status: 'expired', updated_at: now };
  }

  // P1-5: autonomous sweep. Nothing on the technician side expires a
  // never-opened request, so a stale 'pending' inflates dashboard counts and
  // strands its draft forever. Called from the list/summary read paths so the
  // mirror self-heals on next app use. Clears entry mirrors BEFORE flipping the
  // requests (the subquery keys on status='pending').
  async function sweepExpiredRemoteRequests(now: string): Promise<void> {
    await db.run(
      `UPDATE entries SET pending_signature_id = NULL, updated_at = ?
         WHERE pending_signature_id IN (
           SELECT id FROM remote_signature_requests
           WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < ?
         )`,
      [now, now],
    );
    await db.run(
      `UPDATE remote_signature_requests SET status = 'expired', updated_at = ?
         WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < ?`,
      [now, now],
    );
  }

  function remoteAccessInput(input: string | RemoteSignatureAccessInput): RemoteSignatureAccessInput {
    return typeof input === 'string' ? { request_code: input } : input;
  }

  async function getRemoteSignatureRequestDetail(
    input: string | RemoteSignatureAccessInput,
  ): Promise<RemoteSignatureRequestDetail | null> {
    const access = remoteAccessInput(input);
    const now = new Date().toISOString();
    const existing = await getRemoteRequestByCode(access.request_code);
    if (!existing) return null;

    await validateRemoteSigningToken(existing, access.signing_token);
    let request = await maybeExpireRemoteRequest(existing, now);
    if (access.mark_viewed && request.status === 'pending' && !request.viewed_at) {
      await db.run(
        'UPDATE remote_signature_requests SET viewed_at = ?, updated_at = ? WHERE id = ? AND viewed_at IS NULL',
        [now, now, request.id],
      );
      request = { ...request, viewed_at: now, updated_at: now };
    }

    const entry = await getEntryById(request.entry_id);
    if (!entry) return null;
    return {
      entry,
      request,
      signature: request.completed_signature_id
        ? await getSignatureForEntry(entry.id)
      : null,
    };
  }

  async function getLatestChainHash(): Promise<string | null> {
    // The chain head is the signature whose chain_hash nothing else points back
    // to (the tail of the linked list). Resolving it by linkage rather than by
    // signed_at is robust to equal timestamps: two signatures created in the
    // same millisecond would otherwise make the head ambiguous and could fork
    // the chain. The ORDER BY is only a defensive tiebreaker for a malformed
    // (multi-tail) chain.
    const row = await db.get<{ chain_hash: string | null }>(
      `SELECT s.chain_hash
         FROM signatures s
        WHERE s.chain_hash IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM signatures p WHERE p.previous_chain_hash = s.chain_hash
          )
        ORDER BY s.signed_at DESC, s.created_at DESC
        LIMIT 1`,
    );
    return row?.chain_hash ?? null;
  }

  /**
   * Cert-number requirement is gated on the SIGNER'S scheme, not the
   * technician's certification on the entry. The signer is the one
   * authorizing the signature with their own card / member number.
   */
  function requiresVerifierCertNumber(supervisorScheme: SignerScheme): boolean {
    // SPRAT and IRATA supervisors must supply a card / member number — for
    // them, the cert is the basis of signer authority. SITE signers (safety
    // officer / shift lead / superintendent who isn't rope-access certified
    // but is responsible on site) DON'T have a scheme cert; the audit trail
    // captures role + employer for those instead. The role/employer
    // requirement is enforced separately below at sign time.
    return supervisorScheme !== 'site';
  }

  async function upsertSupervisorContact(input: {
    name: string;
    certNumber?: string | null;
    contact?: string | null;
    role?: string | null;
    company?: string | null;
    lastSignedAt?: string | null;
  }): Promise<void> {
    const now = new Date().toISOString();
    const certNumber = input.certNumber?.trim() || null;
    const contact = input.contact?.trim() || null;
    if (!input.name.trim() || (!certNumber && !contact)) return;

    const existing = await db.get<SupervisorContact>(
      certNumber
        ? 'SELECT * FROM supervisors WHERE cert_number = ? LIMIT 1'
        : 'SELECT * FROM supervisors WHERE contact = ? AND name = ? LIMIT 1',
      certNumber ? [certNumber] : [contact, input.name.trim()],
    );

    if (existing) {
      await db.run(
        `UPDATE supervisors
         SET name = ?, contact = COALESCE(?, contact), role = COALESCE(?, role),
             company = COALESCE(?, company), last_signed_at = COALESCE(?, last_signed_at),
          updated_at = ?
         WHERE id = ?`,
        [
          input.name.trim(),
          contact,
          input.role?.trim() || null,
          input.company?.trim() || null,
          input.lastSignedAt ?? null,
          now,
          existing.id,
        ],
      );
      return;
    }

    await db.run(
      `INSERT INTO supervisors (
        id, name, cert_number, contact, role, company, last_signed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createId('supervisor'),
        input.name.trim(),
        certNumber,
        contact,
        input.role?.trim() || null,
        input.company?.trim() || null,
        input.lastSignedAt ?? null,
        now,
        now,
      ],
    );
  }

  async function getGearUsageForEntry(entryId: string): Promise<EntryGearUsageDetail[]> {
    return db.getAll<EntryGearUsageDetail>(
      `SELECT
        egu.entry_id AS "usage.entry_id",
        egu.gear_id AS "usage.gear_id",
        egu.role AS "usage.role",
        egu.created_at AS "usage.created_at",
        gi.id AS "gear.id",
        gi.name AS "gear.name",
        gi.category AS "gear.category",
        gi.manufacturer AS "gear.manufacturer",
        gi.model AS "gear.model",
        gi.serial_number AS "gear.serial_number",
        gi.next_inspection_due AS "gear.next_inspection_due",
        gi.retired_at AS "gear.retired_at",
        gi.created_at AS "gear.created_at",
        gi.updated_at AS "gear.updated_at"
       FROM entry_gear_usage egu
       JOIN gear_items gi ON gi.id = egu.gear_id
       WHERE egu.entry_id = ?
       ORDER BY gi.category ASC, gi.name ASC`,
      [entryId],
    ).then((rows) =>
      rows.map((row) => {
        const flat = row as unknown as Record<string, unknown>;
        return {
          usage: {
            entry_id: flat['usage.entry_id'] as string,
            gear_id: flat['usage.gear_id'] as string,
            role: flat['usage.role'] as string | null,
            created_at: flat['usage.created_at'] as string,
          },
          gear: {
            id: flat['gear.id'] as string,
            name: flat['gear.name'] as string,
            category: flat['gear.category'] as EntryGearUsageDetail['gear']['category'],
            manufacturer: flat['gear.manufacturer'] as string | null,
            model: flat['gear.model'] as string | null,
            serial_number: flat['gear.serial_number'] as string | null,
            next_inspection_due: flat['gear.next_inspection_due'] as string | null,
            retired_at: flat['gear.retired_at'] as string | null,
            created_at: flat['gear.created_at'] as string,
            updated_at: flat['gear.updated_at'] as string,
          },
        };
      }),
    );
  }

  async function getAttachmentsForEntry(entryId: string): Promise<EntryAttachment[]> {
    return db.getAll<EntryAttachment>(
      `SELECT id, entry_id, label, uri, mime_type, notes, created_at
       FROM entry_attachments
       WHERE entry_id = ?
       ORDER BY created_at ASC`,
      [entryId],
    );
  }

  // Flat list of every attachment in the ledger, joined with the entry's
  // site and date so the Attachments index can group and label them without
  // a second round-trip per row.
  async function listAttachmentsWithEntry(): Promise<EntryAttachmentWithEntry[]> {
    return db.getAll<EntryAttachmentWithEntry>(
      `SELECT
         a.id, a.entry_id, a.label, a.uri, a.mime_type, a.notes, a.created_at,
         e.site AS entry_site,
         e.date_to AS entry_date,
         e.status AS entry_status
       FROM entry_attachments a
       INNER JOIN entries e ON e.id = a.entry_id
       ORDER BY a.created_at DESC`,
    );
  }

  async function getEntryDetail(entryId: string): Promise<EntryDetail | null> {
    const entry = await getEntryById(entryId);
    if (!entry) return null;
    return {
      entry,
      signature: await getSignatureForEntry(entryId),
      remote_request: await getPendingRemoteRequestForEntry(entryId),
      gear_usage: await getGearUsageForEntry(entryId),
      attachments: await getAttachmentsForEntry(entryId),
    };
  }

  function createRequestCode(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase();
  }

  return {
    async listEntries(): Promise<LogbookEntry[]> {
      await sweepExpiredRemoteRequests(new Date().toISOString());
      return db.getAll<LogbookEntry>(
        'SELECT * FROM entries ORDER BY date_from DESC, created_at DESC',
      );
    },

    // Entries that point back to `entryId` via `amends_entry_id`. Lets a signed
    // source entry surface "Amended by …" lineage without the UI doing a full
    // table scan client-side. Ordered oldest-first so the chain reads in the
    // order the amendments were drafted.
    async listAmendmentsOf(entryId: string): Promise<LogbookEntry[]> {
      return db.getAll<LogbookEntry>(
        'SELECT * FROM entries WHERE amends_entry_id = ? ORDER BY created_at ASC',
        [entryId],
      );
    },

    // Distinct prior values of a classification column, most-recent-first.
    // Raw (unsuppressed) — the UI layer applies the preset/denylist filter via
    // `filterRecentValues`. The column name comes from a fixed allow-list, never
    // user input, so the interpolation is safe (SQLite can't bind identifiers).
    async listRecentClassificationValues(
      field: 'work_task' | 'access_method' | 'structure_type',
    ): Promise<string[]> {
      const allowed = { work_task: 'work_task', access_method: 'access_method', structure_type: 'structure_type' } as const;
      const column = allowed[field];
      if (!column) throw new Error('invalid_classification_field');
      const rows = await db.getAll<{ value: string }>(
        `SELECT ${column} AS value, MAX(created_at) AS last_used
         FROM entries
         WHERE ${column} IS NOT NULL AND TRIM(${column}) <> ''
         GROUP BY ${column}
         ORDER BY last_used DESC
         LIMIT 50`,
      );
      return rows.map((r) => r.value);
    },

    // Distinct hazard strings across all entries, most-recent-first. Hazards are
    // stored as canonical JSON, so we parse and flatten in JS.
    async listRecentHazardValues(): Promise<string[]> {
      const rows = await db.getAll<{ hazards: string | null }>(
        `SELECT hazards FROM entries
         WHERE hazards IS NOT NULL AND TRIM(hazards) <> ''
         ORDER BY created_at DESC
         LIMIT 200`,
      );
      const seen = new Set<string>();
      const out: string[] = [];
      for (const row of rows) {
        for (const hazard of parseHazards(row.hazards)) {
          const key = hazard.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            out.push(hazard);
          }
        }
      }
      return out;
    },

    getEntryDetail,

    getRemoteSignatureRequestDetail,

    getLatestChainHash,

    getLatestRemoteRequestForEntry,

    listAttachmentsWithEntry,

    async listEntryTemplates(): Promise<EntryTemplate[]> {
      return db.getAll<EntryTemplate>(
        `SELECT
          id, name, employer, client, work_task, access_method, structure_type,
          description, work_hours, max_height, height_unit, created_at, updated_at, last_used_at
         FROM entry_templates
         ORDER BY last_used_at DESC, name ASC`,
      );
    },

    async createEntryTemplate(input: CreateEntryTemplateInput): Promise<EntryTemplate> {
      const now = new Date().toISOString();
      const id = createId('template');
      const name = input.name.trim();
      if (!name) throw new Error('template_name_required');

      await db.run(
        `INSERT INTO entry_templates (
          id, name, employer, client, work_task, access_method, structure_type,
          description, work_hours, max_height, height_unit, created_at, updated_at, last_used_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
        ON CONFLICT(name) DO UPDATE SET
          employer = excluded.employer,
          client = excluded.client,
          work_task = excluded.work_task,
          access_method = excluded.access_method,
          structure_type = excluded.structure_type,
          description = excluded.description,
          work_hours = excluded.work_hours,
          max_height = excluded.max_height,
          height_unit = excluded.height_unit,
          updated_at = excluded.updated_at`,
        [
          id,
          name,
          input.employer?.trim() || '',
          input.client?.trim() || '',
          input.work_task.trim(),
          input.access_method.trim(),
          input.structure_type.trim(),
          input.description.trim(),
          input.work_hours,
          input.max_height ?? null,
          input.height_unit,
          now,
          now,
        ],
      );

      const template = await db.get<EntryTemplate>('SELECT * FROM entry_templates WHERE name = ? LIMIT 1', [name]);
      if (!template) throw new Error('template_create_failed');
      return template;
    },

    async listSupervisorContacts(limit?: number): Promise<SupervisorContact[]> {
      return db.getAll<SupervisorContact>(
        `SELECT id, name, cert_number, contact, role, company, last_signed_at, created_at, updated_at
         FROM supervisors
         ORDER BY last_signed_at IS NULL ASC, last_signed_at DESC, name ASC
         LIMIT ?`,
        [rowLimit(limit, 8)],
      );
    },

    async createDraft(input: CreateEntryInput): Promise<LogbookEntry> {
      const now = new Date().toISOString();
      const id = createId('entry');
      const dateFrom = input.date_from ?? todayLocalIsoDate();
      const dateTo = input.date_to ?? dateFrom;
      if (!isValidIsoDateRange(dateFrom, dateTo)) throw new Error('entry_date_range_invalid');
      await db.run(
        `INSERT INTO entries (
          id, date_from, date_to, employer, site, client, description, work_hours,
          work_task, access_method, structure_type, max_height, height_unit,
          sprat_level_snapshot, irata_level_snapshot, timezone_offset, entry_kind, rescue_cover,
          hazards, status, amends_entry_id, pending_signature_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', NULL, NULL, ?, ?)`,
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
          new Date().getTimezoneOffset(),
          input.entry_kind ?? 'work',
          input.rescue_cover?.trim() || null,
          canonicalizeHazards(input.hazards),
          now,
          now,
        ],
      );
      if (input.template_id) {
        await db.run(
          'UPDATE entry_templates SET last_used_at = ?, updated_at = ? WHERE id = ?',
          [now, now, input.template_id],
        );
      }
      const entry = await db.get<LogbookEntry>('SELECT * FROM entries WHERE id = ?', [id]);
      if (!entry) throw new Error('entry_create_failed');
      return entry;
    },

    async updateDraft(input: UpdateDraftEntryInput): Promise<EntryDetail> {
      const existing = await getEntryById(input.entry_id);
      if (!existing) throw new Error('entry_not_found');
      if (existing.status !== 'draft') throw new Error('entry_locked');
      if (existing.pending_signature_id) throw new Error('entry_pending_signature');

      const now = new Date().toISOString();
      const dateFrom = input.date_from ?? existing.date_from;
      const dateTo = input.date_to ?? dateFrom;
      if (!isValidIsoDateRange(dateFrom, dateTo)) throw new Error('entry_date_range_invalid');
      const result = await db.run(
        `UPDATE entries
         SET date_from = ?, date_to = ?, employer = ?, site = ?, client = ?,
             description = ?, work_hours = ?, work_task = ?, access_method = ?,
             structure_type = ?, max_height = ?, height_unit = ?,
             sprat_level_snapshot = ?, irata_level_snapshot = ?,
             entry_kind = ?, rescue_cover = ?, hazards = ?, updated_at = ?
         WHERE id = ? AND status = 'draft' AND pending_signature_id IS NULL`,
        [
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
          input.sprat_level_snapshot ?? existing.sprat_level_snapshot,
          input.irata_level_snapshot ?? existing.irata_level_snapshot,
          input.entry_kind ?? existing.entry_kind,
          input.rescue_cover === undefined
            ? existing.rescue_cover
            : input.rescue_cover?.trim() || null,
          input.hazards === undefined ? existing.hazards : canonicalizeHazards(input.hazards),
          now,
          existing.id,
        ],
      );
      if (result.changes !== 1) throw new Error('entry_update_failed');

      const detail = await getEntryDetail(existing.id);
      if (!detail) throw new Error('entry_not_found');
      return detail;
    },

    async deleteDraftEntry(entryId: string): Promise<{ id: string }> {
      const existing = await getEntryById(entryId);
      if (!existing) throw new Error('entry_not_found');
      if (existing.status !== 'draft') throw new Error('entry_not_deletable');

      const pendingRemote = await getPendingRemoteRequestForEntry(entryId);
      if (pendingRemote) throw new Error('entry_has_pending_remote_request');
      if (existing.pending_signature_id) throw new Error('entry_pending_signature');

      // Clean up any non-pending remote signature requests (cancelled / expired).
      // There won't be a 'completed' one since this is still a draft.
      await db.run('DELETE FROM remote_signature_requests WHERE entry_id = ?', [entryId]);
      // entry_gear_usage and entry_attachments cascade automatically via ON DELETE CASCADE.
      const result = await db.run(
        "DELETE FROM entries WHERE id = ? AND status = 'draft' AND pending_signature_id IS NULL",
        [entryId],
      );
      if (result.changes !== 1) throw new Error('entry_delete_failed');
      return { id: entryId };
    },

    async createAmendmentDraft(input: CreateAmendmentInput): Promise<LogbookEntry> {
      const original = await getEntryById(input.entry_id);
      if (!original) throw new Error('entry_not_found');
      if (original.status !== 'signed') throw new Error('entry_not_amendable');
      // P1-2: one active amendment per source. Without this, two amendment
      // drafts of the same signed entry can both be signed — the first flips
      // the source to 'amended', the second's source-flip silently no-ops —
      // leaving two 'signed' rows for one entry and double-counting signed
      // hours into SPRAT/IRATA progression totals (the chain still verifies).
      const activeAmendment = await db.get<{ id: string }>(
        "SELECT id FROM entries WHERE amends_entry_id = ? AND status IN ('draft', 'signed') LIMIT 1",
        [original.id],
      );
      if (activeAmendment) throw new Error('entry_already_amended');

      const now = new Date().toISOString();
      const id = createId('entry');
      const dateFrom = input.date_from ?? original.date_from;
      const dateTo = input.date_to ?? dateFrom;
      if (!isValidIsoDateRange(dateFrom, dateTo)) throw new Error('entry_date_range_invalid');

      await db.run(
        `INSERT INTO entries (
          id, date_from, date_to, employer, site, client, description, work_hours,
          work_task, access_method, structure_type, max_height, height_unit,
          sprat_level_snapshot, irata_level_snapshot, timezone_offset, entry_kind, rescue_cover,
          hazards, status, amends_entry_id, pending_signature_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, NULL, ?, ?)`,
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
          original.timezone_offset,
          input.entry_kind ?? original.entry_kind,
          input.rescue_cover === undefined
            ? original.rescue_cover
            : input.rescue_cover?.trim() || null,
          input.hazards === undefined ? original.hazards : canonicalizeHazards(input.hazards),
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
      if (input.recipient_name.trim().length < 2) throw new Error('recipient_name_required');
      if (!getEntryVerificationReadiness(entry).ready) throw new Error('entry_incomplete');

      const existing = await getPendingRemoteRequestForEntry(entry.id);
      if (existing) {
        const detail = await getEntryDetail(entry.id);
        if (!detail) throw new Error('entry_not_found');
        return detail;
      }

      const requestId = createId('remote_sig');
      const requestCode = createRequestCode(requestId);
      const signingToken = buildRemoteSigningToken({ id: requestId, request_code: requestCode });
      const signingTokenHash = await hashRemoteSigningToken(signingToken);
      const entryHash = await hashEntry(entry);
      const expiresAt = input.expires_at ?? addDaysIso(14);

      await db.exec('BEGIN');
      try {
        await db.run(
          `INSERT INTO remote_signature_requests (
            id, entry_id, recipient_name, recipient_contact, verifier_role, verifier_company,
            status, request_code, entry_hash, hash_version, expires_at, completed_signature_id,
            signing_token_hash, token_hint, viewed_at, completed_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, ?, ?)`,
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
            expiresAt,
            signingTokenHash,
            signingToken.slice(-6),
            now,
            now,
          ],
        );
        await upsertSupervisorContact({
          name: input.recipient_name,
          contact: input.recipient_contact,
          role: input.verifier_role,
          company: input.verifier_company,
        });
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

    async cancelRemoteSignatureRequest(entryId: string): Promise<EntryDetail> {
      const now = new Date().toISOString();
      const entry = await getEntryById(entryId);
      if (!entry) throw new Error('entry_not_found');
      const pending = await getPendingRemoteRequestForEntry(entryId);
      if (!pending) throw new Error('no_pending_request_to_cancel');

      await db.exec('BEGIN');
      try {
        await db.run(
          "UPDATE remote_signature_requests SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = 'pending'",
          [now, pending.id],
        );
        await db.run(
          'UPDATE entries SET pending_signature_id = NULL, updated_at = ? WHERE id = ?',
          [now, entry.id],
        );
        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }

      const detail = await getEntryDetail(entry.id);
      if (!detail) throw new Error('cancel_remote_signature_request_failed');
      return detail;
    },

    async signEntryLocal(input: SignEntryInput): Promise<EntryDetail> {
      const now = new Date().toISOString();
      const signaturePath = input.signature_path.trim();
      if (!signaturePath) throw new Error('signature_required');
      if (!input.attestation_accepted) throw new Error('attestation_required');
      if (input.supervisor_name.trim().length < 2) throw new Error('supervisor_name_required');

      await db.exec('BEGIN');
      try {
        const entry = await getEntryById(input.entry_id);
        if (!entry) throw new Error('entry_not_found');
        if (entry.status !== 'draft') throw new Error('entry_not_signable');
        if (!getEntryVerificationReadiness(entry).ready) throw new Error('entry_incomplete');
        if (requiresVerifierCertNumber(input.supervisor_scheme) && input.supervisor_cert_number.trim().length < 2) {
          throw new Error('supervisor_cert_required');
        }
        // Site signers (non-rope-access-certified site authority) capture
        // role + employer instead of a cert number.
        const supervisorRole = input.supervisor_role?.trim() || null;
        const supervisorEmployer = input.supervisor_employer?.trim() || null;
        if (input.supervisor_scheme === 'site') {
          if (!supervisorRole) throw new Error('site_signer_role_required');
          if (!supervisorEmployer) throw new Error('site_signer_employer_required');
        }

        const signatureId = createId('sig');
        // Local signing is always device-now. Never trust a caller-supplied
        // timestamp: it would allow backdating and would reorder the hash chain
        // (getLatestChainHash orders by signed_at; see verifyFullChain).
        const signedAt = now;
        const entryHash = await hashEntry(entry);
        const previousChainHash = await getLatestChainHash();
        // v4 binds the signer envelope into the chain. These values MUST match
        // exactly what is INSERTed below, or verifyChainHashFor would reject
        // every fresh signature.
        const signerAttestation = input.signer_attestation?.trim() || null;
        const chainHash = await hashSignatureChain({
          entryHash,
          signatureId,
          signedAt,
          method: 'local',
          previousChainHash,
          signer: {
            name: input.supervisor_name.trim(),
            scheme: input.supervisor_scheme,
            certNumber: input.supervisor_cert_number.trim(),
            role: supervisorRole,
            employer: supervisorEmployer,
            signaturePath,
            attestation: signerAttestation,
            attestationAcceptedAt: signedAt,
          },
        });

        await db.run(
          `INSERT INTO signatures (
            id, entry_id, supervisor_name, supervisor_scheme, supervisor_cert_number,
            supervisor_role, supervisor_employer, signed_at, entry_hash, hash_version,
            method, remote_request_id, signer_attestation, signature_path,
            attestation_accepted_at, previous_chain_hash, chain_hash, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local', NULL, ?, ?, ?, ?, ?, ?)`,
          [
            signatureId,
            entry.id,
            input.supervisor_name.trim(),
            input.supervisor_scheme,
            input.supervisor_cert_number.trim(),
            supervisorRole,
            supervisorEmployer,
            signedAt,
            entryHash,
            ENTRY_HASH_VERSION,
            signerAttestation,
            signaturePath,
            signedAt,
            previousChainHash,
            chainHash,
            now,
          ],
        );
        await upsertSupervisorContact({
          name: input.supervisor_name,
          certNumber: input.supervisor_cert_number,
          lastSignedAt: signedAt,
        });

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

    async completeRemoteSignatureRequest(input: CompleteRemoteSignatureRequestInput): Promise<EntryDetail> {
      const now = new Date().toISOString();
      const requestCode = normalizeRequestCode(input.request_code);
      const signaturePath = input.signature_path.trim();
      if (!requestCode) throw new Error('remote_request_code_required');
      if (input.supervisor_name.trim().length < 2) throw new Error('supervisor_name_required');
      if (!signaturePath) throw new Error('signature_required');
      if (!input.attestation_accepted) throw new Error('attestation_required');

      let entryId: string | null = null;

      await db.exec('BEGIN');
      try {
        const existing = await getRemoteRequestByCode(requestCode);
        if (!existing) throw new Error('remote_request_not_found');
        await validateRemoteSigningToken(existing, input.signing_token);
        const request = await maybeExpireRemoteRequest(existing, now);
        if (request.status === 'expired') throw new Error('remote_request_expired');
        if (request.status !== 'pending') throw new Error('remote_request_not_pending');
        if (isExpiredAt(request.expires_at, now)) {
          throw new Error('remote_request_expired');
        }

        const entry = await getEntryById(request.entry_id);
        if (!entry) throw new Error('entry_not_found');
        if (entry.status !== 'draft') throw new Error('entry_not_signable');
        if (requiresVerifierCertNumber(input.supervisor_scheme) && input.supervisor_cert_number.trim().length < 2) {
          throw new Error('supervisor_cert_required');
        }
        const supervisorRole = input.supervisor_role?.trim() || null;
        const supervisorEmployer = input.supervisor_employer?.trim() || null;
        if (input.supervisor_scheme === 'site') {
          if (!supervisorRole) throw new Error('site_signer_role_required');
          if (!supervisorEmployer) throw new Error('site_signer_employer_required');
        }
        if (entry.pending_signature_id && entry.pending_signature_id !== request.id) {
          throw new Error('remote_request_mismatch');
        }

        const currentHash = await hashEntry(entry);
        if (currentHash !== request.entry_hash || request.hash_version !== ENTRY_HASH_VERSION) {
          throw new Error('entry_hash_mismatch');
        }

        const signatureId = createId('sig');
        // The hosted edge function stamps signed_at server-side; the local
        // verify path passes none (-> now). Clamp to [request created, now]
        // (+skew) so a corrupt/hostile payload can't backdate the attestation.
        const signedAt = clampSigningTime(input.signed_at, request.created_at, now);
        const previousChainHash = await getLatestChainHash();
        // v4 binds the signer envelope — must match the INSERT below exactly.
        const signerAttestation = input.signer_attestation?.trim() || null;
        const chainHash = await hashSignatureChain({
          entryHash: request.entry_hash,
          signatureId,
          signedAt,
          method: 'remote',
          previousChainHash,
          remoteRequestId: request.id,
          version: request.hash_version,
          signer: {
            name: input.supervisor_name.trim(),
            scheme: input.supervisor_scheme,
            certNumber: input.supervisor_cert_number.trim(),
            role: supervisorRole,
            employer: supervisorEmployer,
            signaturePath,
            attestation: signerAttestation,
            attestationAcceptedAt: signedAt,
          },
        });

        await db.run(
          `INSERT INTO signatures (
            id, entry_id, supervisor_name, supervisor_scheme, supervisor_cert_number,
            supervisor_role, supervisor_employer, signed_at, entry_hash, hash_version,
            method, remote_request_id, signer_attestation, signature_path,
            attestation_accepted_at, previous_chain_hash, chain_hash, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'remote', ?, ?, ?, ?, ?, ?, ?)`,
          [
            signatureId,
            entry.id,
            input.supervisor_name.trim(),
            input.supervisor_scheme,
            input.supervisor_cert_number.trim(),
            supervisorRole,
            supervisorEmployer,
            signedAt,
            request.entry_hash,
            request.hash_version,
            request.id,
            signerAttestation,
            signaturePath,
            signedAt,
            previousChainHash,
            chainHash,
            now,
          ],
        );
        await upsertSupervisorContact({
          name: input.supervisor_name,
          certNumber: input.supervisor_cert_number,
          contact: request.recipient_contact,
          role: request.verifier_role,
          company: request.verifier_company,
          lastSignedAt: signedAt,
        });

        await db.run(
          "UPDATE entries SET status = 'signed', pending_signature_id = NULL, updated_at = ? WHERE id = ?",
          [now, entry.id],
        );
        await db.run(
          "UPDATE remote_signature_requests SET status = 'completed', completed_signature_id = ?, completed_at = ?, updated_at = ? WHERE id = ?",
          [signatureId, signedAt, now, request.id],
        );

        if (entry.amends_entry_id) {
          await db.run(
            "UPDATE entries SET status = 'amended', updated_at = ? WHERE id = ? AND status = 'signed'",
            [now, entry.amends_entry_id],
          );
        }

        entryId = entry.id;
        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }

      if (!entryId) throw new Error('remote_signature_completion_failed');
      const detail = await getEntryDetail(entryId);
      if (!detail) throw new Error('remote_signature_completion_failed');
      return detail;
    },

    async getDashboardSummary(): Promise<DashboardSummary> {
      // Self-heal stale pending requests so the pending count + the entry
      // mirrors are accurate before we read them. (P1-5)
      await sweepExpiredRemoteRequests(new Date().toISOString());
      const row = await db.get<{
        totalEntries: number;
        draftEntries: number;
        signedEntries: number;
        amendedEntries: number;
        pendingSignatureRequests: number;
        draftHours: number | null;
        signedHours: number | null;
        overdueGearItems: number;
        dueSoonGearItems: number;
      }>(
        `SELECT
          (SELECT COUNT(*) FROM entries) AS totalEntries,
          (SELECT COUNT(*) FROM entries WHERE status = 'draft') AS draftEntries,
          (SELECT COUNT(*) FROM entries WHERE status = 'signed') AS signedEntries,
          (SELECT COUNT(*) FROM entries WHERE status = 'amended') AS amendedEntries,
          (SELECT COUNT(*) FROM remote_signature_requests WHERE status = 'pending') AS pendingSignatureRequests,
          (SELECT COALESCE(SUM(work_hours), 0) FROM entries WHERE status = 'draft') AS draftHours,
          (SELECT COALESCE(SUM(work_hours), 0) FROM entries WHERE status = 'signed') AS signedHours,
          (SELECT COUNT(*) FROM gear_items WHERE retired_at IS NULL AND next_inspection_due IS NOT NULL AND next_inspection_due < date('now')) AS overdueGearItems,
          (SELECT COUNT(*) FROM gear_items WHERE retired_at IS NULL AND next_inspection_due IS NOT NULL AND next_inspection_due >= date('now') AND next_inspection_due <= date('now', '+30 days')) AS dueSoonGearItems`,
      );
      const profile = await db.get<LogbookExportBundle['profile']>('SELECT * FROM profiles LIMIT 1');

      return {
        totalEntries: row?.totalEntries ?? 0,
        draftEntries: row?.draftEntries ?? 0,
        signedEntries: row?.signedEntries ?? 0,
        amendedEntries: row?.amendedEntries ?? 0,
        pendingSignatureRequests: row?.pendingSignatureRequests ?? 0,
        draftHours: row?.draftHours ?? 0,
        signedHours: row?.signedHours ?? 0,
        expiringCerts: [
          expirationAlert('SPRAT certification', profile?.sprat_expires_on ?? null),
          expirationAlert('IRATA certification', profile?.irata_expires_on ?? null),
        ],
        overdueGearItems: row?.overdueGearItems ?? 0,
        dueSoonGearItems: row?.dueSoonGearItems ?? 0,
      };
    },

    async getCareerStats(): Promise<CareerStats> {
      const summary = await db.get<{
        totalEntries: number;
        signedEntries: number;
        totalHours: number | null;
        signedHours: number | null;
      }>(
        `SELECT
          COUNT(*) AS totalEntries,
          SUM(CASE WHEN status = 'signed' THEN 1 ELSE 0 END) AS signedEntries,
          COALESCE(SUM(work_hours), 0) AS totalHours,
          COALESCE(SUM(CASE WHEN status = 'signed' THEN work_hours ELSE 0 END), 0) AS signedHours
         FROM entries`,
      );

      async function bucket(column: 'work_task' | 'access_method' | 'structure_type' | 'employer') {
        return db.getAll<CareerStats['byTask'][number]>(
          `SELECT
            COALESCE(NULLIF(${column}, ''), 'Unspecified') AS label,
            COALESCE(SUM(work_hours), 0) AS hours,
            COUNT(*) AS entries
           FROM entries
           GROUP BY COALESCE(NULLIF(${column}, ''), 'Unspecified')
           ORDER BY hours DESC, entries DESC
           LIMIT 8`,
        );
      }

      const byYear = await db.getAll<CareerStats['byYear'][number]>(
        `SELECT
          substr(date_from, 1, 4) AS label,
          COALESCE(SUM(work_hours), 0) AS hours,
          COUNT(*) AS entries
         FROM entries
         GROUP BY substr(date_from, 1, 4)
         ORDER BY label DESC
         LIMIT 8`,
      );

      return {
        totalEntries: summary?.totalEntries ?? 0,
        signedEntries: summary?.signedEntries ?? 0,
        totalHours: summary?.totalHours ?? 0,
        signedHours: summary?.signedHours ?? 0,
        byTask: await bucket('work_task'),
        byAccessMethod: await bucket('access_method'),
        byStructureType: await bucket('structure_type'),
        byEmployer: await bucket('employer'),
        byYear,
      };
    },

    async attachGearToEntry(input: AttachGearToEntryInput): Promise<EntryDetail> {
      const entry = await getEntryById(input.entry_id);
      if (!entry) throw new Error('entry_not_found');
      if (entry.status !== 'draft') throw new Error('entry_locked');

      const gear = await db.get<{ retired_at: string | null }>('SELECT retired_at FROM gear_items WHERE id = ?', [input.gear_id]);
      if (!gear) throw new Error('gear_not_found');
      if (gear.retired_at) throw new Error('gear_retired');

      await db.run(
        `INSERT OR REPLACE INTO entry_gear_usage (entry_id, gear_id, role, created_at)
         VALUES (?, ?, ?, ?)`,
        [entry.id, input.gear_id, input.role?.trim() || null, new Date().toISOString()],
      );

      const detail = await getEntryDetail(entry.id);
      if (!detail) throw new Error('entry_not_found');
      return detail;
    },

    async removeGearFromEntry(input: RemoveGearFromEntryInput): Promise<EntryDetail> {
      const entry = await getEntryById(input.entry_id);
      if (!entry) throw new Error('entry_not_found');
      if (entry.status !== 'draft') throw new Error('entry_locked');

      await db.run(
        'DELETE FROM entry_gear_usage WHERE entry_id = ? AND gear_id = ?',
        [entry.id, input.gear_id],
      );

      const detail = await getEntryDetail(entry.id);
      if (!detail) throw new Error('entry_not_found');
      return detail;
    },

    async addEntryAttachment(input: AddEntryAttachmentInput): Promise<EntryDetail> {
      const entry = await getEntryById(input.entry_id);
      if (!entry) throw new Error('entry_not_found');
      if (entry.status !== 'draft') throw new Error('entry_locked');
      if (!input.uri.trim()) throw new Error('attachment_uri_required');

      await db.run(
        `INSERT INTO entry_attachments (
          id, entry_id, label, uri, mime_type, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          createId('attachment'),
          entry.id,
          input.label.trim() || 'Evidence photo',
          input.uri.trim(),
          input.mime_type?.trim() || null,
          input.notes?.trim() || null,
          new Date().toISOString(),
        ],
      );

      const detail = await getEntryDetail(entry.id);
      if (!detail) throw new Error('entry_not_found');
      return detail;
    },

    async exportLogbook(options: ExportLogbookOptions = {}): Promise<LogbookExportBundle> {
      const includeDrafts = options.includeDrafts ?? false;
      const profile = await db.get<LogbookExportBundle['profile']>('SELECT * FROM profiles LIMIT 1');
      const entries = await db.getAll<LogbookEntry>(
        includeDrafts
          ? 'SELECT * FROM entries ORDER BY date_from ASC, created_at ASC'
          : "SELECT * FROM entries WHERE status IN ('signed', 'amended') ORDER BY date_from ASC, created_at ASC",
      );

      if (!entries.length) {
        return buildLogbookExportBundle({
          profile,
          entries: [],
          supervisors: await db.getAll<SupervisorContact>('SELECT * FROM supervisors ORDER BY name ASC'),
        });
      }

      const statusFilter = includeDrafts ? '' : "WHERE entry_id IN (SELECT id FROM entries WHERE status IN ('signed', 'amended'))";

      const signatures = await db.getAll<EntrySignature>(
        `SELECT
          id, entry_id, supervisor_name, supervisor_scheme, supervisor_cert_number,
          supervisor_role, supervisor_employer, signed_at, entry_hash, hash_version,
          method, remote_request_id, signer_attestation, signature_path,
          attestation_accepted_at, previous_chain_hash, chain_hash, created_at
        FROM signatures
        ${statusFilter}
        ORDER BY signed_at ASC, created_at ASC`
      );
      const signatureByEntryId = new Map(signatures.map((signature) => [signature.entry_id, signature]));

      const attachments = await db.getAll<EntryAttachment>(
        `SELECT id, entry_id, label, uri, mime_type, notes, created_at
         FROM entry_attachments
         ${statusFilter}
         ORDER BY created_at ASC`
      );
      const attachmentsByEntryId = new Map<string, EntryAttachment[]>();
      for (const a of attachments) {
        if (!attachmentsByEntryId.has(a.entry_id)) attachmentsByEntryId.set(a.entry_id, []);
        attachmentsByEntryId.get(a.entry_id)!.push(a);
      }

      const gearUsagesRows = await db.getAll<any>(
        `SELECT
          egu.entry_id AS "usage.entry_id",
          egu.gear_id AS "usage.gear_id",
          egu.role AS "usage.role",
          egu.created_at AS "usage.created_at",
          gi.id AS "gear.id",
          gi.name AS "gear.name",
          gi.category AS "gear.category",
          gi.manufacturer AS "gear.manufacturer",
          gi.model AS "gear.model",
          gi.serial_number AS "gear.serial_number",
          gi.next_inspection_due AS "gear.next_inspection_due",
          gi.retired_at AS "gear.retired_at",
          gi.created_at AS "gear.created_at",
          gi.updated_at AS "gear.updated_at"
         FROM entry_gear_usage egu
         JOIN gear_items gi ON gi.id = egu.gear_id
         ${includeDrafts ? '' : "WHERE egu.entry_id IN (SELECT id FROM entries WHERE status IN ('signed', 'amended'))"}
         ORDER BY gi.category ASC, gi.name ASC`
      );
      const gearUsageByEntryId = new Map<string, EntryGearUsageDetail[]>();
      for (const row of gearUsagesRows) {
        const flat = row as Record<string, any>;
        const entryId = flat['usage.entry_id'];
        if (!gearUsageByEntryId.has(entryId)) gearUsageByEntryId.set(entryId, []);
        gearUsageByEntryId.get(entryId)!.push({
          usage: {
            entry_id: entryId,
            gear_id: flat['usage.gear_id'],
            role: flat['usage.role'],
            created_at: flat['usage.created_at'],
          },
          gear: {
            id: flat['gear.id'],
            name: flat['gear.name'],
            category: flat['gear.category'],
            manufacturer: flat['gear.manufacturer'],
            model: flat['gear.model'],
            serial_number: flat['gear.serial_number'],
            next_inspection_due: flat['gear.next_inspection_due'],
            retired_at: flat['gear.retired_at'],
            created_at: flat['gear.created_at'],
            updated_at: flat['gear.updated_at'],
          },
        });
      }

      const exportEntries = entries.map((entry) => ({
        entry,
        signature: signatureByEntryId.get(entry.id) ?? null,
        gear_usage: gearUsageByEntryId.get(entry.id) ?? [],
        attachments: attachmentsByEntryId.get(entry.id) ?? [],
      }));
      
      const supervisors = await db.getAll<SupervisorContact>(
        `SELECT id, name, cert_number, contact, role, company, last_signed_at, created_at, updated_at
         FROM supervisors
         ORDER BY name ASC`,
      );

      return buildLogbookExportBundle({
        profile,
        entries: exportEntries,
        supervisors,
      });
    },

    async exportLogbookCsv(options: ExportLogbookOptions = {}): Promise<string> {
      return buildLogbookCsv(await this.exportLogbook(options));
    },

    async exportEntryPacket(entryId: string): Promise<LogbookExportPacket> {
      const detail = await getEntryDetail(entryId);
      if (!detail) throw new Error('entry_not_found');
      if (detail.entry.status === 'draft') throw new Error('entry_not_exportable');
      if (!detail.signature) throw new Error('entry_signature_missing');

      const profile = await db.get<LogbookExportBundle['profile']>('SELECT * FROM profiles LIMIT 1');
      return buildEntryExportPacket({ profile, detail });
    },

    async verifyFullChain(): Promise<{ valid: boolean; brokenAtEntryId?: string }> {
      const entries = await db.getAll<LogbookEntry>(
        "SELECT * FROM entries WHERE status IN ('signed', 'amended')"
      );
      if (!entries.length) return { valid: true };

      const signatures = await db.getAll<EntrySignature>(
        'SELECT * FROM signatures WHERE chain_hash IS NOT NULL'
      );
      const signatureByEntryId = new Map(signatures.map((s) => [s.entry_id, s]));

      // 1. Every signed/amended entry must have a signature whose entry hash and
      //    chain hash still recompute. `verifyChainHashFor` is ASYNC — it MUST be
      //    awaited; a bare Promise is always truthy and would silently pass every
      //    entry (this was the original tamper-detection bypass).
      for (const entry of entries) {
        const signature = signatureByEntryId.get(entry.id);
        if (!signature) return { valid: false, brokenAtEntryId: entry.id };
        const ok = await verifyChainHashFor({ entry, signature });
        if (!ok) return { valid: false, brokenAtEntryId: entry.id };
      }

      // 2. The signatures must link into exactly one unbroken chain. We rebuild
      //    it by following `previous_chain_hash -> chain_hash` links rather than
      //    by any timestamp ordering: the chain is appended in SIGNING order
      //    (`getLatestChainHash` = latest by signed_at), which need not match the
      //    draft-creation order entries are stored in. Walking by linkage is
      //    order-independent, so signing drafts out of the order they were
      //    created can no longer produce a false "tampered" verdict.
      // Index each signature by its predecessor hash. The genesis signature
      // (no predecessor) is tracked separately so we never need a sentinel
      // string that could collide with a real chain hash.
      let genesis: EntrySignature | null = null;
      const byPrevHash = new Map<string, EntrySignature>();
      for (const signature of signatures) {
        if (signature.previous_chain_hash === null) {
          if (genesis) {
            // Two signatures with no predecessor — a fork, not one chain.
            return { valid: false, brokenAtEntryId: signature.entry_id };
          }
          genesis = signature;
          continue;
        }
        if (byPrevHash.has(signature.previous_chain_hash)) {
          // Two signatures claim the same predecessor — a fork, not a chain.
          return { valid: false, brokenAtEntryId: signature.entry_id };
        }
        byPrevHash.set(signature.previous_chain_hash, signature);
      }

      if (!genesis) return { valid: false, brokenAtEntryId: entries[0].id };

      const visited = new Set<string>();
      let current: EntrySignature | null = genesis;
      while (current) {
        if (visited.has(current.id)) {
          return { valid: false, brokenAtEntryId: current.entry_id }; // cycle
        }
        visited.add(current.id);
        current = (current.chain_hash && byPrevHash.get(current.chain_hash)) || null;
      }

      // Any signature unreachable from genesis is an orphaned/broken link.
      if (visited.size !== signatures.length) {
        const orphan = signatures.find((s) => !visited.has(s.id));
        return { valid: false, brokenAtEntryId: orphan?.entry_id };
      }

      return { valid: true };
    },
  };
}
