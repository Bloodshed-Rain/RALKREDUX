// React hooks for the Notifications prefs screen: per-category toggles (persisted
// in local-prefs) and the OS permission state/request. Toggling a category writes
// the pref and immediately reconciles so a silenced category's notifications are
// cancelled (and a re-enabled one re-scheduled) without waiting for the next launch.

import React from 'react';
import {
  DEFAULT_NOTIFICATION_PREFS,
  PrefKeys,
  isNotificationPrefs,
  readPref,
  writePref,
  type NotificationPrefs,
} from '@/src/storage/local-prefs';
import { getPermission, requestPermission, type PermissionState } from './scheduler';
import { reconcileNow } from './reconcile-now';

export function useNotificationPrefs() {
  const [prefs, setPrefs] = React.useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      const raw = await readPref(PrefKeys.notificationPrefs, DEFAULT_NOTIFICATION_PREFS);
      if (!active) return;
      setPrefs(isNotificationPrefs(raw) ? raw : DEFAULT_NOTIFICATION_PREFS);
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const setCategory = React.useCallback((category: keyof NotificationPrefs, on: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [category]: on };
      void writePref(PrefKeys.notificationPrefs, next).then(() => reconcileNow());
      return next;
    });
  }, []);

  return { prefs, loaded, setCategory };
}

export function useNotificationPermission() {
  const [state, setState] = React.useState<PermissionState>({ granted: false, canAskAgain: true });
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(() => {
    void (async () => {
      setLoading(true);
      setState(await getPermission());
      setLoading(false);
    })();
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const request = React.useCallback(async () => {
    setLoading(true);
    const next = await requestPermission();
    setState(next);
    setLoading(false);
    // Newly granted → schedule everything that's currently due.
    if (next.granted) void reconcileNow();
  }, []);

  return {
    granted: state.granted,
    canAskAgain: state.canAskAgain,
    loading,
    request,
    refresh,
  };
}
