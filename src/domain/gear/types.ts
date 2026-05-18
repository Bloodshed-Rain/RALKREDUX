export type GearInspectionResult = 'pass' | 'pass_with_concerns' | 'fail';
export type GearStatus = 'current' | 'due_soon' | 'overdue' | 'unscheduled' | 'retired';
export type GearCategory =
  | 'harness'
  | 'helmet'
  | 'rope'
  | 'lanyard'
  | 'sling'
  | 'descender'
  | 'ascender'
  | 'carabiner'
  | 'pulley'
  | 'other';

export interface GearItem {
  id: string;
  name: string;
  category: GearCategory;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  next_inspection_due: string | null;
  retired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GearInspection {
  id: string;
  gear_id: string;
  inspected_on: string;
  result: GearInspectionResult;
  notes: string | null;
  // Audit-grade: every inspection records who did it. May be null on
  // pre-migration-10 rows; required on every new inspection from the
  // service layer onward.
  inspector_name: string | null;
  inspector_cert_number: string | null;
  created_at: string;
}

export interface GearItemDetail {
  item: GearItem;
  latest_inspection: GearInspection | null;
  status: GearStatus;
}

export interface CreateGearItemInput {
  name: string;
  category: GearCategory;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  next_inspection_due?: string | null;
}

export interface RecordGearInspectionInput {
  gear_id: string;
  result: GearInspectionResult;
  inspected_on?: string;
  notes?: string | null;
  next_inspection_due?: string | null;
  // Required: the inspector's identity. Service throws
  // `inspector_identity_required` if `inspector_name` is empty.
  inspector_name: string;
  inspector_cert_number?: string | null;
}

export interface GearSummary {
  totalItems: number;
  activeItems: number;
  retiredItems: number;
  overdueItems: number;
  dueSoonItems: number;
}

export interface GearCatalogEntry {
  id: string;
  manufacturer: string;
  model: string;
  category: GearCategory;
}

export interface SearchGearCatalogInput {
  query: string;
  category?: GearCategory | null;
  limit?: number;
}
