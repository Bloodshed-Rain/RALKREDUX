# Local notifications

Native iOS/Android **local** notifications via `expo-notifications` (SDK 54). OS-scheduled,
offline-first, **no push server / no Expo push tokens** — nothing leaves the device. Requires a
dev-client or standalone build for production fidelity (local scheduling also works in Expo Go).

> **The `expo-notifications` config plugin is intentionally NOT added to `app.config.ts`.** Its iOS
> mod unconditionally adds the `aps-environment` entitlement + `remote-notification` background mode
> (both push-only), which makes EAS demand an APNs push key and fails the iOS build with
> *"provisioning profile doesn't include the aps-environment entitlement."* Local notifications need
> no entitlement: the native module autolinks without the plugin, Android `POST_NOTIFICATIONS` ships
> in the library's bundled manifest, and channels are created at runtime in `scheduler.ts`. The only
> thing lost is the plugin's build-time Android small-icon/accent-color — re-add later via a custom
> Android-only plugin alongside a real icon asset. **Do not re-add the plugin without provisioning a
> push key, or the iOS build breaks again.**

## Categories (3)

| Category | Mechanism | Trigger | Fire condition |
|---|---|---|---|
| Gear · due soon (30d) | pre-scheduled `date` | `next_inspection_due − 30d` @ 07:00 local | not retired/unscheduled; lead instant in future |
| Gear · due this week (7d) | pre-scheduled `date` | `next_inspection_due − 7d` @ 07:00 local | as above; a single catch-up fires if a late-entered item is already inside its 7-day window |
| Gear · overdue | pre-scheduled `weekly` (repeats) | due-date weekday @ 07:00 local | status `overdue`; cancelled once inspected/retired |
| Signing · expired | pre-scheduled `date` | at `expires_at` | request still `pending` with a future expiry |
| Signing · completed | event-driven (`trigger: null`) | on hosted import success (in-app) | `useImportHostedRemoteSignatureCompletion.onSuccess`, `imported === true` |
| Backup · explicit fail | event-driven | immediately | `useBackupNow` resolves `{ ok:false, reason:'backup_failed' }` |
| Backup · auto fail | event-driven | after **3 consecutive** auto-backup failures | `scheduleCloudBackupAfterSigning` |

Lead reminders are **coalesced per (tier, due-day)** — a fleet of gear due the same day produces
one `{n} items` notification, keeping us well under iOS's ~64 pending-notification cap. `unscheduled`
and `retired` gear are silent. No SPRAT/IRATA-acceptance or "certified/safe" language (compliance rule).

## Architecture

```
planner.ts        PURE (no expo/RN/DbClient) — maps gear+requests+prefs → PlannedNotification[]   ← unit-tested
scheduler.ts      ONLY expo-notifications importer — handler, channels, permission, reconcile, presentNow
notify.ts         lazy facade — dynamic-imports scheduler so expo-notifications stays out of node tests
reconcile-now.ts  reads SQLite fresh + prefs → planner → scheduler.reconcile (single source of truth)
use-notifications.ts   useNotificationPrefs (toggles → reconcile) + useNotificationPermission
notification-reconciler.tsx   app-level wrapper: reconcile on mount / data-change / foreground
app/notifications.tsx  prefs screen (permission row + per-category toggles); replaced the old stub sheet
```

- **Boot:** `app-providers.tsx` calls `scheduler.ensureSetup()` (handler + Android channels) — channels
  must exist before `POST_NOTIFICATIONS` is requested on Android 13+.
- **Reconciler** is mounted between `<AuthGate>` and `<AppLock>` in `app/_layout.tsx` so QueryClient + DB
  are structurally ready and it works in local-only mode.
- **Prefs:** `src/storage/local-prefs.ts` → `notificationPrefs: { gear, signing, backup }` (default all on;
  OS permission is the master switch).
- **Reconcile** is idempotent: re-scheduling a stable identifier replaces it; only `gear-`/`signing-`-prefixed
  ids are ever read/cancelled (foreign notifications untouched); permission-off cancels our set.

Web preview: `expo export --platform web` bundles cleanly (the `expo-notifications` native bindings
are `.native.js`, excluded on web; every scheduler call is `Platform.OS === 'web'` guarded), so web
boot is safe. A one-time in-browser render check is still worthwhile but low-risk.

## Device-verification TODO (could not be checked without a build)

1. **WEEKLY weekday index** — planner uses `getDay()+1` (1=Sunday). Confirm `gear-overdue` fires on the
   due-date's weekday; adjust the mapping if off-by-one.
2. **iOS ~64 cap** — coalescing mitigates; confirm a large inventory doesn't silently drop. If near the cap,
   drop the 30-day tier first (planner can grow cap-aware pruning).
3. **Immediate-notification channel** — `presentNow` routes Android immediates via a `{ channelId }` trigger to
   the matching per-category channel (iOS uses `null`). Confirm backup/signing immediates show under the right
   channel in Android settings.
4. **Notification icon** — no config plugin (see note above), so Android falls back to the app icon for
   the notification small icon → may render as a white square. Before store release, add a custom
   Android-only config plugin that sets a monochrome 96×96 transparent notification icon + accent color
   (the bit the stock `expo-notifications` plugin would do — but kept push-free).
5. **signing-expired false-positive** — a request completed/cancelled while the app is closed, never reopened
   before `expires_at`, still fires the pre-scheduled "expired" (no server to cancel). Self-corrects on next
   foreground. Accepted local-only limitation.
