import { Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getClient } from '@/src/db/initialize';
import { createSupabaseBackupPort } from '@/src/cloud/supabase/backup-cloud';
import { createCloudBackupService } from './cloud-backup-service';

const CLOUD_BACKUPS_KEY = ['cloudBackups'];

/** Debounce window so a burst of signings coalesces into one auto-backup. */
const AUTO_BACKUP_DEBOUNCE_MS = 4000;

function deviceLabel(): string {
  return `${Platform.OS} ${String(Platform.Version)}`;
}

function buildService() {
  return createCloudBackupService({
    db: getClient(),
    port: createSupabaseBackupPort(),
    deviceLabel: deviceLabel(),
  });
}

export function useCloudBackups() {
  return useQuery({
    queryKey: CLOUD_BACKUPS_KEY,
    queryFn: () => buildService().listBackups(),
  });
}

export function useBackupNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => buildService().backupNow(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLOUD_BACKUPS_KEY });
    },
  });
}

export function useRestoreFromCloud() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ backupId, force }: { backupId: string; force?: boolean }) =>
      buildService().restoreFromCloud(backupId, { force }),
    onSuccess: (result) => {
      // A successful restore rewrites every local table — refetch everything.
      if (result.ok) queryClient.invalidateQueries();
    },
  });
}

let autoBackupTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Fire-and-forget auto-backup, debounced. Called from signing mutations: the
 * moment new immutable evidence is created is exactly when the cloud copy
 * should refresh. No-ops cheaply when Supabase is unconfigured or the user
 * isn't signed in (the service's identify() gate), so it never blocks signing
 * and never runs in offline/local-only builds.
 */
export function scheduleCloudBackupAfterSigning(): void {
  if (autoBackupTimer) clearTimeout(autoBackupTimer);
  autoBackupTimer = setTimeout(() => {
    autoBackupTimer = null;
    void buildService()
      .backupNow()
      .catch(() => {
        // Auto-backup is best-effort; failures surface on the manual path.
      });
  }, AUTO_BACKUP_DEBOUNCE_MS);
}
