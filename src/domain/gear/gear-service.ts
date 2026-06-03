import { DbClient } from '@/src/db/client';
import { createId } from '../id';
import { todayLocalIsoDate } from '../date-utils';
import {
  CreateGearItemInput,
  GearCatalogEntry,
  GearInspection,
  GearItem,
  GearItemDetail,
  GearStatus,
  GearSummary,
  RecordGearInspectionInput,
  SearchGearCatalogInput,
} from './types';

export const DUE_SOON_DAYS = 30;

function isoDateToUtcMs(value: string): number {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

export function getGearStatus(item: GearItem, asOf: string = todayLocalIsoDate()): GearStatus {
  if (item.retired_at) return 'retired';
  if (!item.next_inspection_due) return 'unscheduled';

  const daysUntilDue = Math.ceil(
    (isoDateToUtcMs(item.next_inspection_due) - isoDateToUtcMs(asOf)) / 86_400_000,
  );

  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= DUE_SOON_DAYS) return 'due_soon';
  return 'current';
}

export function createGearService(db: DbClient) {
  async function getGearItemById(id: string): Promise<GearItem | null> {
    return db.get<GearItem>('SELECT * FROM gear_items WHERE id = ?', [id]);
  }

  async function getLatestInspection(gearId: string): Promise<GearInspection | null> {
    return db.get<GearInspection>(
      `SELECT id, gear_id, inspected_on, result, notes, inspector_name, inspector_cert_number, created_at
       FROM gear_inspections
       WHERE gear_id = ?
       ORDER BY inspected_on DESC, created_at DESC
       LIMIT 1`,
      [gearId],
    );
  }

  async function listGearItems(asOf: string = todayLocalIsoDate()): Promise<GearItemDetail[]> {
    const items = await db.getAll<GearItem>(
      `SELECT * FROM gear_items
       ORDER BY
         retired_at IS NOT NULL ASC,
         next_inspection_due IS NULL ASC,
         next_inspection_due ASC,
         name ASC`,
    );

    const inspections = await db.getAll<GearInspection>(
      `SELECT id, gear_id, inspected_on, result, notes, inspector_name, inspector_cert_number, created_at
       FROM (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY gear_id ORDER BY inspected_on DESC, created_at DESC) as rn
         FROM gear_inspections
       )
       WHERE rn = 1`
    );
    const latestInspectionByGearId = new Map<string, GearInspection>();
    for (const inspection of inspections) {
      latestInspectionByGearId.set(inspection.gear_id, inspection);
    }

    return items.map((item) => ({
      item,
      latest_inspection: latestInspectionByGearId.get(item.id) ?? null,
      status: getGearStatus(item, asOf),
    }));
  }

  return {
    listGearItems,

    async createGearItem(input: CreateGearItemInput): Promise<GearItem> {
      const name = input.name.trim();
      const category = input.category.trim();
      if (!name) throw new Error('gear_name_required');
      if (!category) throw new Error('gear_category_required');

      const now = new Date().toISOString();
      const id = createId('gear');
      await db.run(
        `INSERT INTO gear_items (
          id, name, category, manufacturer, model, serial_number,
          next_inspection_due, retired_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        [
          id,
          name,
          category,
          input.manufacturer?.trim() || null,
          input.model?.trim() || null,
          input.serial_number?.trim() || null,
          input.next_inspection_due?.trim() || null,
          now,
          now,
        ],
      );

      const item = await getGearItemById(id);
      if (!item) throw new Error('gear_create_failed');
      return item;
    },

    async searchGearCatalog(input: SearchGearCatalogInput): Promise<GearCatalogEntry[]> {
      const query = input.query.trim().toLowerCase();
      // Default limit is intentionally small for autocomplete (8). The
      // catalog browser screen passes a larger limit (50) for category
      // browsing. When BOTH query and category are empty we return [] —
      // the caller should prompt the user to start typing or pick a
      // category rather than dumping the whole 960-row catalog.
      const limit = Math.max(1, Math.min(input.limit ?? 8, 100));
      const terms = query.length >= 2 ? query.split(/\s+/).filter(Boolean) : [];
      const hasQuery = terms.length > 0;
      const hasCategory = Boolean(input.category);
      if (!hasQuery && !hasCategory) return [];

      const clauses: string[] = [];
      const params: unknown[] = [];
      for (const term of terms) {
        clauses.push("LOWER(manufacturer || ' ' || model) LIKE ?");
        params.push(`%${term}%`);
      }
      if (hasCategory) {
        clauses.push('category = ?');
        params.push(input.category);
      }

      let sql = `SELECT id, manufacturer, model, category, image_url
        FROM gear_catalog
        WHERE ${clauses.join(' AND ')}
        ORDER BY manufacturer ASC, model ASC LIMIT ?`;
      params.push(limit);

      return db.getAll<GearCatalogEntry>(sql, params);
    },

    async listGearCatalogCategories(): Promise<Array<{ category: string; count: number }>> {
      return db.getAll<{ category: string; count: number }>(
        `SELECT category, COUNT(*) AS count
         FROM gear_catalog
         GROUP BY category
         ORDER BY category ASC`,
      );
    },

    async recordInspection(input: RecordGearInspectionInput): Promise<GearItemDetail> {
      const item = await getGearItemById(input.gear_id);
      if (!item) throw new Error('gear_not_found');
      if (item.retired_at) throw new Error('gear_retired');

      // Audit-grade: every inspection must record who did it. An anonymous
      // inspection has no signer authority, so the chain breaks at this row.
      const inspectorName = input.inspector_name?.trim() ?? '';
      if (inspectorName.length < 2) throw new Error('inspector_identity_required');
      const inspectorCertNumber = input.inspector_cert_number?.trim() || null;

      const now = new Date().toISOString();
      const inspectedOn = input.inspected_on ?? todayLocalIsoDate();
      const inspectionId = createId('inspection');
      const isFail = input.result === 'fail';
      const submittedNextDue = isFail ? null : input.next_inspection_due?.trim() || null;
      const retiredAt = isFail ? inspectedOn : null;

      await db.exec('BEGIN');
      try {
        await db.run(
          `INSERT INTO gear_inspections (
            id, gear_id, inspected_on, result, notes,
            inspector_name, inspector_cert_number, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            inspectionId,
            item.id,
            inspectedOn,
            input.result,
            input.notes?.trim() || null,
            inspectorName,
            inspectorCertNumber,
            now,
          ],
        );
        // Only the LATEST inspection (by inspected_on, created_at tiebreak —
        // the same ordering getLatestInspection uses) owns the live deadline.
        // A backdated inspection recorded after a newer one must not clobber
        // gear_items.next_inspection_due with a stale date. A failure always
        // retires and clears the deadline regardless of inspection date.
        const latest = await db.get<{ id: string }>(
          `SELECT id FROM gear_inspections WHERE gear_id = ?
           ORDER BY inspected_on DESC, created_at DESC LIMIT 1`,
          [item.id],
        );
        const isLatest = latest?.id === inspectionId;
        const nextDueToWrite = isFail ? null : isLatest ? submittedNextDue : item.next_inspection_due;
        await db.run(
          'UPDATE gear_items SET next_inspection_due = ?, retired_at = ?, updated_at = ? WHERE id = ?',
          [nextDueToWrite, retiredAt, now, item.id],
        );
        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }

      const updated = await getGearItemById(item.id);
      if (!updated) throw new Error('gear_inspection_failed');
      return {
        item: updated,
        latest_inspection: await getLatestInspection(item.id),
        status: getGearStatus(updated),
      };
    },

    async getGearItemDetailById(id: string, asOf: string = todayLocalIsoDate()): Promise<GearItemDetail | null> {
      const item = await getGearItemById(id);
      if (!item) return null;
      return {
        item,
        latest_inspection: await getLatestInspection(id),
        status: getGearStatus(item, asOf),
      };
    },

    async listInspectionsForGear(gearId: string, limit = 8): Promise<GearInspection[]> {
      return db.getAll<GearInspection>(
        `SELECT id, gear_id, inspected_on, result, notes,
                inspector_name, inspector_cert_number, created_at
         FROM gear_inspections
         WHERE gear_id = ?
         ORDER BY inspected_on DESC, created_at DESC
         LIMIT ?`,
        [gearId, Math.max(1, Math.min(limit, 50))],
      );
    },

    async getGearSummary(asOf: string = todayLocalIsoDate()): Promise<GearSummary> {
      const details = await listGearItems(asOf);
      return {
        totalItems: details.length,
        activeItems: details.filter(({ status }) => status !== 'retired').length,
        retiredItems: details.filter(({ status }) => status === 'retired').length,
        overdueItems: details.filter(({ status }) => status === 'overdue').length,
        dueSoonItems: details.filter(({ status }) => status === 'due_soon').length,
      };
    },
  };
}
