import React from 'react';
import { Alert } from 'react-native';
import { useNavigation } from 'expo-router';

/**
 * Intercepts back / swipe-dismiss navigation while `enabled` is true and asks
 * the user to confirm before discarding unsaved input. Mirrors the keep/discard
 * pattern the new-entry wizard uses for its close button, but also covers the
 * OS back gesture and modal swipe-dismiss via the navigator's `beforeRemove`
 * event.
 *
 * IMPORTANT: pass `enabled: false` once a successful save is navigating away,
 * or the guard will intercept the success navigation too.
 */
export function useUnsavedGuard(
  enabled: boolean,
  opts?: { title?: string; message?: string; confirmLabel?: string },
): void {
  const navigation = useNavigation();
  React.useEffect(() => {
    if (!enabled) return;
    // `beforeRemove` is provided by stack / native-stack navigators; expo-router
    // sits on top of React Navigation so the listener is available at runtime.
    const sub = (navigation as unknown as {
      addListener: (
        type: 'beforeRemove',
        cb: (e: { preventDefault: () => void; data: { action: unknown } }) => void,
      ) => () => void;
    }).addListener('beforeRemove', (e) => {
      e.preventDefault();
      Alert.alert(
        opts?.title ?? 'Discard changes?',
        opts?.message ?? 'Your unsaved changes will be lost if you leave now.',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: opts?.confirmLabel ?? 'Discard',
            style: 'destructive',
            onPress: () =>
              (navigation as unknown as { dispatch: (action: unknown) => void }).dispatch(
                e.data.action,
              ),
          },
        ],
      );
    });
    return sub;
  }, [enabled, navigation, opts?.title, opts?.message, opts?.confirmLabel]);
}
