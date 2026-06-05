import { Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getClient } from '@/src/db/initialize';
import { createSupabaseBackupPort } from '@/src/cloud/supabase/backup-cloud';
import { notifyEvent } from '@/src/notifications/notify';
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
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: CLOUD_BACKUPS_KEY });
      // A user-initiated backup that fails warrants an immediate heads-up. The
      // service resolves (never throws) on failure, so detect it here; the
      // not_configured / not_authenticated reasons are benign local-only no-ops.
      if (!result.ok && result.reason === 'backup_failed') {
        notifyEvent(
          'backup',
          'Backup didn’t finish',
          'Your last backup didn’t complete. Your data is still saved on this device. Try backing up again when you have a connection.',
        );
      } else if (result.ok) {
        // A successful manual backup is a known-good cloud copy — clear the auto-backup
        // failure streak so a later single auto-fail can't fire a false "failed several
        // times / isn't backed up yet" alert moments after this snapshot uploaded.
        resetAutoBackupFailureStreak();
      }
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
// Auto-backups run unattended, so a single offline blip is noise. Only a *persistent*
// failure (the tech believes they have a cloud copy but don't) is worth interrupting for.
let consecutiveAutoBackupFailures = 0;

/** Clear the streak after any known-good cloud copy (e.g. a successful manual backup). */
export function resetAutoBackupFailureStreak(): void {
  consecutiveAutoBackupFailures = 0;
}

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
      .then((result) => {
        // backupNow resolves (does not throw) on failure, so inspect the result.
        if (result.ok) {
          consecutiveAutoBackupFailures = 0;
          return;
        }
        if (result.reason !== 'backup_failed') return; // benign local-only no-op
        consecutiveAutoBackupFailures += 1;
        if (consecutiveAutoBackupFailures >= 3) {
          consecutiveAutoBackupFailures = 0;
          notifyEvent(
            'backup',
            'Backups not completing',
            'Automatic backup has failed several times. Your data is safe on this device but isn’t backed up yet. Open Backup to retry.',
          );
        }
      })
      .catch(() => {
        // A genuine throw (not a resolved failure) — best-effort; manual path surfaces it.
      });
  }, AUTO_BACKUP_DEBOUNCE_MS);
}
