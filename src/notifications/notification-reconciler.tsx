// Mounted as a descendant of AppProviders (QueryClient + DB ready) and AuthGate
// (reachable in local-only mode), above AppLock. It keeps OS-scheduled notifications
// in sync with the data: it reconciles on mount, whenever the gear list or active
// remote-requests change (React Query data signal — fed by the same invalidations
// the mutations already fire), and when the app returns to the foreground (a due
// date may have passed, or a request expired/completed while we were closed).
// Renders children untouched; a pure side-effect wrapper.

import React from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { useGearItems } from '@/src/domain/gear/use-gear';
import { useActiveRemoteSignatureRequests } from '@/src/domain/logbook/use-logbook';
import { reconcileNow } from './reconcile-now';

export function NotificationReconciler({ children }: { children: React.ReactNode }) {
  const gear = useGearItems();
  const requests = useActiveRemoteSignatureRequests();

  // Mount + data-change. reconcileNow re-reads SQLite fresh, so the timestamps are
  // only a trigger, not the data source.
  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    void reconcileNow();
  }, [gear.dataUpdatedAt, requests.dataUpdatedAt]);

  // Returning to foreground.
  React.useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void reconcileNow();
    });
    return () => sub.remove();
  }, []);

  return <>{children}</>;
}
