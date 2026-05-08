import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getClient } from '@/src/db/initialize';
import { createBackupService } from './backup-service';
import { BackupSnapshot } from './types';

export function useCreateBackupSnapshot() {
  return useMutation({
    mutationFn: () => createBackupService(getClient()).createSnapshot(),
  });
}

export function useRestoreBackupSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (snapshot: BackupSnapshot) => createBackupService(getClient()).restoreSnapshot(snapshot),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
