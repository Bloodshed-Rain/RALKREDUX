import { router } from 'expo-router';

/**
 * Return to an entry's detail screen after a sub-screen action (sign / edit /
 * request remote). These sub-screens are reachable from two origins, and the
 * correct exit differs:
 *
 *  - **Pushed on top of an existing entry detail** (`origin === 'detail'`, set
 *    by the detail screen via `?from=detail`). The detail is already in the
 *    stack, so `replace` would swap the *sub-screen* for a brand-new detail and
 *    leave the original underneath — stacking a duplicate. Back would then land
 *    on the same record several times. Pop back to the existing instance.
 *  - **Reached from the new-entry wizard**, which `replace`d its way here, so
 *    the detail isn't in the stack yet. `replace` forward onto a fresh detail.
 *
 * react-query invalidation refreshes the still-mounted detail, so popping back
 * shows the post-action (e.g. signed) state without a duplicate.
 */
export function returnToEntryDetail(entryId: string, origin?: string | null): void {
  if (origin === 'detail' && router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(`/entry/${entryId}` as never);
}
