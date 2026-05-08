import { DbClient } from '@/src/db/client';
import { createId } from '../id';
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

const DUE_SOON_DAYS = 30;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDateToUtcMs(value: string): number {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

export function getGearStatus(item: GearItem, asOf: string = todayIso()): GearStatus {
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
      `SELECT id, gear_id, inspected_on, result, notes, created_at
       FROM gear_inspections
       WHERE gear_id = ?
       ORDER BY inspected_on DESC, created_at DESC
       LIMIT 1`,
      [gearId],
    );
  }

  async function listGearItems(asOf: string = todayIso()): Promise<GearItemDetail[]> {
    const items = await db.getAll<GearItem>(
      `SELECT * FROM gear_items
       ORDER BY
         retired_at IS NOT NULL ASC,
         next_inspection_due IS NULL ASC,
         next_inspection_due ASC,
         name ASC`,
    );

    return Promise.all(
      items.map(async (item) => ({
        item,
        latest_inspection: await getLatestInspection(item.id),
        status: getGearStatus(item, asOf),
      })),
    );
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
      if (query.length < 2) return [];

      const limit = Math.max(1, Math.min(input.limit ?? 8, 25));
      const terms = query.split(/\s+/).filter(Boolean);
      const clauses = terms.map(() => "LOWER(manufacturer || ' ' || model) LIKE ?");
      const params: unknown[] = terms.map((term) => `%${term}%`);

      let sql = `SELECT id, manufacturer, model, category
        FROM gear_catalog
        WHERE ${clauses.join(' AND ')}`;

      if (input.category) {
        sql += ' AND category = ?';
        params.push(input.category);
      }

      sql += ' ORDER BY manufacturer ASC, model ASC LIMIT ?';
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

      const now = new Date().toISOString();
      const inspectedOn = input.inspected_on ?? todayIso();
      const inspectionId = createId('inspection');
      const nextDue = input.result === 'fail' ? null : input.next_inspection_due?.trim() || null;
      const retiredAt = input.result === 'fail' ? inspectedOn : null;

      await db.exec('BEGIN');
      try {
        await db.run(
          `INSERT INTO gear_inspections (
            id, gear_id, inspected_on, result, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            inspectionId,
            item.id,
            inspectedOn,
            input.result,
            input.notes?.trim() || null,
            now,
          ],
        );
        await db.run(
          'UPDATE gear_items SET next_inspection_due = ?, retired_at = ?, updated_at = ? WHERE id = ?',
          [nextDue, retiredAt, now, item.id],
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

    async getGearSummary(asOf: string = todayIso()): Promise<GearSummary> {
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
