import { GearInspection, GearItem } from '../gear/types';
import {
  EntryAttachment,
  EntryGearUsage,
  EntryPhoto,
  EntrySignature,
  EntryTemplate,
  LogbookEntry,
  RemoteSignatureRequest,
  SupervisorContact,
} from '../logbook/types';
import { Profile } from '../profile/types';

export interface BackupSnapshot {
  backup_schema_version: 1;
  exported_at: string;
  app_flavor: 'ralb-codex-edition';
  schema_migrations: Array<{
    id: number;
    name: string;
    applied_at: string;
  }>;
  data: {
    profiles: Profile[];
    entries: LogbookEntry[];
    signatures: EntrySignature[];
    remote_signature_requests: RemoteSignatureRequest[];
    supervisors: SupervisorContact[];
    gear_items: GearItem[];
    gear_inspections: GearInspection[];
    entry_gear_usage: EntryGearUsage[];
    entry_attachments: EntryAttachment[];
    entry_photos: EntryPhoto[];
    entry_templates: EntryTemplate[];
  };
}

export interface RestoreBackupResult {
  restored_at: string;
  entries: number;
  gear_items: number;
  attachments: number;
}
