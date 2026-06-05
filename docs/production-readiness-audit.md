# RALB Codex Edition — Production-Readiness Audit

> ⚠️ **STALE SNAPSHOT (as of 2026-06-05).** This audit was generated against the older
> `ui-ux-audit-fixes` branch. Almost every item below has since been **fixed on `main`** —
> the entire P1 and P2 tier is closed except **P1-1** (deliberately deferred; needs an
> outward-facing Edge redeploy) and **P2-5** (still open — high-risk timezone threading),
> as is most of P3. Each item was re-verified against current
> code on 2026-06-05. **Do not treat the open/closed status here as current** — for the
> authoritative "what's left and who can unblock it," read **`docs/road-to-1.0.md`**. The
> body below is preserved for provenance (the original finding text and fix rationale).

> Generated this session. Lead-engineer audit of the `ui-ux-audit-fixes` branch.
> The codebase is **tsc + jest green but not yet device-verified** — broad refactors are
> deferred as regression risk. Findings below are NEW signal only; settled / intentional /
> already-fixed items are excluded by design.

## Summary

| Severity | New findings |
|----------|--------------|
| **P0** (audit-trail / data / security corruption with an in-app path) | **0** |
| **P1** (integrity defect, requires a specific sequence or out-of-band write) | **6** |
| **P2** | **7** |
| **P3** | **14** |

Plus **4 confirmed known/deferred** items (#32, #33, gear lifecycle, shared async convention).

There is **no P0**: the verifier reasoned several candidates *down* from P0 because no in-app
corruption path exists — the audit chain protects entry content, and signed entries have no
in-app edit path. The P1 tier is where the real audit-integrity exposure lives.

---

## P1 — Audit-integrity / data / security (highest priority)

### P1-1 · Signer identity, drawn signature, and attestation text are outside the hash-chain envelope
- **Severity / category:** P1 · audit-integrity
- **Files:** `src/domain/logbook/entry-hash.ts`, `src/domain/logbook/logbook-service.ts`, `app/entry/[id].tsx`, `supabase/functions/_shared/remote-signing.ts`
- **Evidence:** `hashSignatureChain` (entry-hash.ts:65-89) folds in only `entry_hash`, `signatureId`, `signedAt`, `method`, `previousChainHash`, `remoteRequestId`. `canonicalizeEntry` covers entry **content** only. The signed row *does* persist `supervisor_name/scheme/cert_number/role/employer`, `signature_path`, `signer_attestation`, `attestation_accepted_at` (logbook-service.ts signEntryLocal ~855-880, completeRemoteSignatureRequest ~973-999) — but **none** are passed into the hash. `verifyChainHashFor` (entry-hash.ts:102-129) recomputes only entry_hash + chain_hash, so the green "Verified" pill (`useEntryChainValid`) and `verifyFullChain` both stay `true` after a signed row's `supervisor_cert_number`, `signature_path`, or `signer_attestation` is rewritten. For an audit logbook whose entire value is *who attested*, the WHO and the drawn mark are not tamper-evident.
- **Fix:** Bump `ENTRY_HASH_VERSION` → 4; extend `hashSignatureChain`'s payload to include the signer-identity fields + `signature_path` + `signer_attestation` + `attestation_accepted_at`; pass them from both sign paths. Keep the version short-circuit so existing v3 signatures still verify under v3 semantics (which omit these). Mirror the identical change into `_shared/remote-signing.ts` (the two modules are documented as lockstep). Add a tamper regression test: mutate `supervisor_cert_number`/`signature_path` on a v4 signature → assert `verifyFullChain` is false.

### P1-2 · Multiple signed amendments of one source entry double-count signed hours
- **Severity / category:** P1 · audit-integrity
- **Files:** `src/domain/logbook/logbook-service.ts`
- **Evidence:** `createAmendmentDraft` gates only on `original.status !== 'signed'` (logbook-service.ts:671) — no single-active-amendment guard (`listAmendmentsOf` exists at ~425 but is unused; `amends_entry_id` is a plain non-unique FK). Two amendment drafts of one signed source can both be created and both signed. The first signing flips the source `signed → amended` (`... WHERE id=? AND status='signed'`); the second signing's source-flip is a silent 0-row no-op, but the second amendment's own `UPDATE ... SET status='signed'` runs unconditionally. Result: **two** entries `status='signed'` pointing at one `amended` source. `getCareerStats` sums `CASE WHEN status='signed' THEN work_hours` (logbook-service.ts:1091), so an 8 h job amended twice reports 16 signed hours. These hours feed SPRAT/IRATA progression thresholds. The chain stays valid (both signatures link cleanly), so `verifyFullChain` will **not** catch it.
- **Fix:** In `createAmendmentDraft`, after the status check, reject if an active amendment already exists: `if ((await listAmendmentsOf(original.id)).some(a => a.status !== 'amended')) throw new Error('entry_already_amended');`. Add a regression test that signs two amendments of one source and asserts `getCareerStats().signedHours` is not double-counted.

### P1-3 · Audit-export preview asserts "Chain valid" without running any verification
- **Severity / category:** P1 · audit-integrity
- **Files:** `app/export.tsx`, `src/domain/logbook/use-logbook.ts`
- **Evidence:** `PreviewCard` renders `<Pill tone="ok" icon={IconVerified}>Chain valid</Pill>` (export.tsx:409) and `… signed hrs · chain verifiable` (export.tsx:405) **unconditionally**. The screen's only chain data is `useChainHead()` → `getLatestChainHash()`, a plain `SELECT` of the head hash that performs **no** verification. The real verifier (`useVerifyFullChain` / `verifyFullChain` / `verifyChainHashFor`) exists but is never imported into `app/`. A tampered or broken chain still shows the auditor a green tick — the same false-green class as the already-fixed entry-detail pill, on a different, un-gated surface.
- **Fix:** Wire `useVerifyFullChain()` into `ExportScreen`; gate the pill + subline on its result, mirroring the entry-detail pattern (`true` → green "Chain valid"; `undefined` → neutral "Checking…"; `false`/error → warn "Chain integrity unverified").

### P1-4 · Evidence photos store the picker's transient cache URI — sealed-entry evidence rots to a dangling pointer
- **Severity / category:** P1 · audit-integrity
- **Files:** `app/entry/[id].tsx`, `app/entry/new.tsx`, `src/domain/logbook/logbook-service.ts`, `src/ui/photo-picker.ts`, `src/ui/avatar-storage.ts`
- **Evidence:** `captureOrPickPhoto` returns `asset.uri` straight from expo-image-picker (photo-picker.ts:67-71) — a transient cache-dir path the OS evicts. Both call sites (entry/[id].tsx:247-257, new.tsx:698-708) pass `uri: photo.uri` through, and `addEntryAttachment` INSERTs it verbatim (logbook-service.ts:1173-1186). The avatar path deliberately copies into `documentDirectory` first (`persistAvatarFile`, avatar-storage.ts:27-34), and that file's own header comment states the picker URI "neither survives app restarts." Because the entry locks on sign (`entry_locked` guard), the dangling URI can never be repaired — the audit packet's photo evidence is permanently lost. (Not an attested field, so the hash chain is intact → P1 not P0.)
- **Fix:** Copy the picked image into `documentDirectory` (mirror `persistAvatarFile`) inside `addEntryAttachment` so both call sites are covered; store the durable URI. Only fixes new attachments — existing cache-path rows are unrecoverable.

### P1-5 · Remote-signing expiry never clears `entries.pending_signature_id` — strands a draft in unrecoverable false-"pending"
- **Severity / category:** P1 · correctness
- **Files:** `src/domain/logbook/logbook-service.ts`, `app/entry/[id].tsx`, `src/domain/logbook/records-derivations.ts`
- **Evidence:** Every clean exit from "pending" clears the entry mirror (cancel:801, local-sign:888, complete:1010) — except expiry. `maybeExpireRemoteRequest` (184-195) only flips the request row to `expired` and never touches `entries`. After expiry, `getPendingRemoteRequestForEntry` (filters `status='pending'`) returns null → the REMOTE REQUEST card and its Cancel button disappear (entry/[id].tsx:620), yet `pending_signature_id` is still set so `statusKey`/`getEntryListStatus` resolve to PENDING. The draft is now un-editable (`updateDraft` throws), un-deletable, **and** un-cancelable (no pending row to cancel) with no visible affordance — only local-sign escapes. Nothing autonomously expires a request on the technician side, so a never-opened request inflates the dashboard's `WHERE status='pending'` count forever.
- **Fix:** Inside `maybeExpireRemoteRequest`, after flipping the request, also `UPDATE entries SET pending_signature_id = NULL, updated_at = ? WHERE id = ? AND pending_signature_id = ?` in the same transaction. Add an autonomous sweep (boot / `listEntries` / `getDashboardSummary`) that expires `status='pending' AND expires_at < now` requests and clears the matching entry mirror.

### P1-6 · Offline sign-out poisons `authedBefore=false` before the revoke runs — locks an established offline user out of their local logbook
- **Severity / category:** P1 · correctness
- **Files:** `src/providers/auth-provider.tsx`, `src/cloud/supabase/auth.ts`, `app/account.tsx`
- **Evidence:** `signOut` (auth-provider.tsx:79-84) writes the persisted flag **first** (`writePref(PrefKeys.authedBefore, false)`), then calls `authSignOut()`, which `throw`s on any error. Supabase's `_signOut` only swallows `AuthApiError` 404/401/403 — a network failure is an `AuthRetryableFetchError` and is **returned** before `_removeSession()`, so offline it throws and never fires SIGNED_OUT. The flag is now durably `false`, so the next offline cold start reads it (`setStatus(authedBefore ? 'signed_in' : 'signed_out')`) → `signed_out` → AuthGate renders the AuthScreen, which needs connectivity to clear. An established offline technician is hard-gated out of their canonical local logbook after one button tap, and `account.tsx` onSignOut catches silently (haptic only, no Alert).
- **Fix:** Reorder: `await authSignOut()` **first**, persist `authedBefore=false` only after it resolves, so a failed/offline revoke leaves offline access intact. Companion (P3): give `account.tsx` a non-silent failure Alert ("Could not reach the server. You are still signed in; try again when online.").

---

## P2 — Correctness / compliance / accessibility

### P2-1 · Full-logbook PDF/CSV drops the signer attestation statement the per-entry packet includes
- **P2 · audit-integrity** · `src/domain/logbook/export.ts`
- The per-entry packet renders `Attestation` + `Attestation accepted at` (export.ts:570,578), but `buildLogbookEntrySection` (306-345) and `CSV_HEADERS` (28-56) emit neither for any record. The bulk artifact an auditor reviews drops the explicit statement each supervisor agreed to. JSON keeps it; parity-only gap.
- **Fix:** Add an `Attestation` (and `Attestation accepted at`) row to `buildLogbookEntrySection`; add `signer_attestation` / `attestation_accepted_at` columns to `CSV_HEADERS` + the row mapping. No hash impact.

### P2-2 · `recordInspection` overwrites `next_inspection_due` even for a backdated (older) inspection
- **P2 · correctness** · `src/domain/gear/gear-service.ts`, `app/gear/[id].tsx`
- `recordInspection` always writes the just-submitted next-due to `gear_items` (gear-service.ts:171,192-195) with no check that it is the latest by `inspected_on`. `getLatestInspection` orders DESC, so a backdated row is correctly not "latest" for history yet still clobbers the live deadline. The form permits arbitrary past dates (`maxDate={todayLocalIsoDate()}` only). Recording a historic inspection silently replaces a correct future due-date with a stale past one → flips a "current" item to "overdue" and feeds a false deadline to every advisory. Derived field, recoverable → P2 not P1.
- **Fix:** Only update `gear_items.next_inspection_due` when the new inspection is latest by `inspected_on` (created_at tiebreak); keep retire-on-fail unconditional. Add a regression test recording an older inspection after a newer one and asserting the due-date is unchanged.

### P2-3 · Backup/restore tests run with `foreign_keys` OFF — the deferred-FK COMMIT path the restore relies on is never verified
- **P2 · correctness** · `src/db/initialize.ts`, `__tests__/setup.ts`, `src/domain/backup/backup-service.ts`, restore tests
- Production enables `PRAGMA foreign_keys = ON` (initialize.ts:30, native only); `createTestClient` never does, and better-sqlite3 defaults FK enforcement OFF. `restoreSnapshot` relies on `defer_foreign_keys = ON` + ordered DELETE/INSERT inside one transaction, whose deferred-FK validation at COMMIT is the load-bearing restore guarantee — exercised by **zero** tests. `docs/codex-audit-2026-05-20.md` records a prior data-loss bug (BUG-4) that was *invisible to tests for exactly this reason*. Insert order is correct today (so device restore works), but a future order edit would pass CI green and fail only on-device.
- **Fix:** Enable `PRAGMA foreign_keys = ON` in `createTestClient` (after open, before migrations); add an FK-enforced multi-table round-trip restore test (entry + signature + remote_signature_request + gear_usage). Add multi-table on-device restore to the verification checklist.

### P2-4 · Hosted-request fetch collapses 5xx/400 into the same `null` as a real 404
- **P2 · correctness** · `src/cloud/supabase/remote-signing.ts`, `app/verify/[code].tsx`, `src/cloud/supabase/use-remote-signing-sync.ts`
- `fetchHostedRemoteSigningRequest` does `if (!response.ok) return null` (remote-signing.ts:197-200). The Edge GET returns 404 only for a genuinely missing request but 400 for any thrown internal error. **Manifestation 1:** a transient backend 400/5xx → null → `isError` false → the verify screen falls through to "Request not found · Check the request code", contradicting the code's own comment that reaching there "means a connection problem, not a bad code" — a verifier with a valid link is told their code is wrong. **Manifestation 2:** the auto-sync tick maps the same null to `reason:'not_completed'` and resets `failureCount=0`, so a persistently-erroring backend never backs off and polls every 5 s forever.
- **Fix:** `if (response.status === 404) return null; if (!response.ok) throw new Error('hosted_remote_signing_unavailable'); …`. A throw lands the query in `isError` (correct "Couldn't connect" card) and increments the auto-sync failure count so polling backs off.

### P2-5 · Audit export renders `signed_at`/`exported_at` in UTC, not local — one-day shift near the UTC-midnight boundary
- **P2 · audit-integrity** · `src/domain/date-format.ts`, `src/domain/logbook/export.ts`
- `formatDate` slices the calendar prefix out of the stored ISO string with **no** local conversion (date-format.ts:3-5; test pins `'2026-05-09T18:30:00.000Z' → '05/09/2026'`). `signed_at` is a UTC instant; fed through `formatDate` for the signed date and export stamp, a signature captured at 20:00 local in UTC+5 (`…T01:00:00Z`) prints the **next** calendar day. `date_from`/`date_to` are stored as local `YYYY-MM-DD` and are unaffected.
- **Fix:** Display-only — do **not** change how `signed_at` is stored (it feeds `hashSignatureChain`). Format timestamp-bearing values from a Date in the device zone (or render a zone-qualified label); keep date-only values on `formatDate`. **Cross-link:** consuming the inert `timezone_offset` column (see P3 dead-code) is the natural anchor for this fix.

### P2-6 · AppLock re-lock loses the user's "Continue to app" tamper-escape acknowledgment — covered under **#33** (known)
- **P2 · correctness** · `src/providers/tamper-guard.tsx`, `src/providers/app-lock.tsx`
- `escape` is component-local state and the only way past a `valid:false` verdict; AppLock returns the lock overlay *instead of* children on re-lock, unmounting TamperGuard and resetting `escape` to null. On a (possibly false-positive) broken chain, the user is re-thrown onto the red integrity screen after **every** unlock — violating the documented "never an inescapable dead-end" guarantee. Same root cause and same fix as **#33** below; listed here as a second symptom, not a separate defect.

### P2-7 · New-entry supervisor chips and ft/m toggle convey selection by color alone (no `accessibilityState`)
- **P2 · accessibility** · `app/entry/new.tsx`
- Supervisor chips (incl. "None") and the height-unit toggle set their active state only with an accent background and never set `accessibilityState` — while the sibling gear tiles in the same file *do* (`accessibilityState={{ selected: active }}`), as do the shared `ChipSelect`/`MultiChipSelect`/`ThemeTile`. VoiceOver/TalkBack announces no "selected"; in glare/gloved field use selection is color-only.
- **Fix:** Add `accessibilityState={{ selected: active }}` to both supervisor-chip Pressables (pass `selectedSupervisorId == null` for "None") and the ft/m Pressables, matching the gear tiles.

---

## P3 — Lower-priority correctness, hardening, and cleanup

| # | Title | Cat | File(s) | Fix (terse) |
|---|-------|-----|---------|-------------|
| P3-1 | Edge Functions echo raw Postgres `error.message` to unauthenticated callers (CWE-209) | security | `supabase/functions/remote-signing-{complete,request,cancel}/index.ts` | Log server-side; return a fixed generic `{error:"remote_request_failed"}`; pass through only the known validation codes. |
| P3-2 | PDF cover "Signed hours" total conflates training/assessment/rescue-drill hours | compliance | `src/domain/logbook/export.ts`, `app/export.tsx` | Restrict the cover total to `entry_kind==='work'` + relabel "Signed work hours", or bucket per kind. No hash impact. |
| P3-3 | `entry_attachments` writes never invalidate `['attachmentsAll']` → stale Attachments index | correctness | `src/domain/logbook/use-logbook.ts`, `app/attachments.tsx` | Add `invalidateQueries(['attachmentsAll'])` to `useAddEntryAttachment` + `useDeleteDraftEntry` onSuccess. |
| P3-4 | Cloud restore parses owner-supplied blob with no integrity check; `sha256_hex` column defined but never written/verified | audit-integrity | `src/cloud/supabase/backup-cloud.ts`, `src/domain/cloud-backup/cloud-backup-service.ts`, backup migration | Populate `sha256_hex` at upload; verify on download before the destructive wipe; interim: cross-check parsed snapshot counts/byte-size vs metadata. |
| P3-5 | `foreign_keys` pragma set native-only → web preview runs `ON DELETE CASCADE` as a no-op; `deleteDraftEntry` orphans child rows on web | correctness | `src/db/initialize.ts`, `src/domain/logbook/logbook-service.ts` | Move `PRAGMA foreign_keys = ON` out of the native-only branch (connection pragma, harmless on web). **Cross-link:** same root pragma asymmetry as the test-harness gap (P2-3). |
| P3-6 | No corruption-recovery path for the canonical native DB — "Try again" re-opens the same corrupt file forever | correctness | `src/db/initialize.ts`, `src/providers/app-providers.tsx` | Classify init error (transient vs `SQLITE_CORRUPT`/`NOTADB`/`PRAGMA integrity_check`); stop offering a no-op retry; route corruption to an explicit user-confirmed `deleteDatabaseAsync` + recreate (then optional restore). |
| P3-7 | `initializeDatabase` boot has no hang timeout (fonts have one) — a stalled open/migration wedges the splash with no Try-again | correctness | `src/providers/app-providers.tsx`, `src/db/initialize.ts` | `Promise.race` init against a ~15-20 s rejecting timer so a hang surfaces the existing error/Try-again UI (`clientPromise` is already nulled on reject). |
| P3-8 | Verifier portal "Return to logbook" raw-replaces into entry detail → duplicate detail when reached via in-app Preview | correctness | `app/verify/[code].tsx`, `app/entry/[id].tsx` | Route the exit through `returnToEntryDetail(entry.id, navOrigin)` (pass `from=detail` on the Preview push) or guard with `canGoBack() ? back() : replace(...)`. |
| P3-9 | Abandoning sign/request after the wizard `replace` strands the just-committed draft (Back lands on a tab) | correctness | `app/entry/new.tsx`, `app/entry/[id]/sign.tsx`, `app/entry/[id]/request-signature.tsx` | On Back/Cancel route through `returnToEntryDetail(entryId, navOrigin)` so a null origin replaces forward onto `/entry/[id]` instead of `router.back()`. Draft is persisted → recoverability, not data loss. |
| P3-10 | Entry-detail / gear-detail / attachments render a read **failure** as "not found" / "no attachments" (no `isError` branch) | async-error | `app/entry/[id].tsx`, `app/gear/[id].tsx`, `app/attachments.tsx` | Add an explicit `isError` branch with a "Try again" refetch ahead of the not-found/empty branch, mirroring shipped today.tsx/records.tsx. (Instance of the deferred shared-async convention.) |
| P3-11 | Draft mutations attach-photo / attach-gear / detach-gear `.mutate()` with no `onError` and no global handler → silent failure | async-error | `app/entry/[id].tsx`, `app/entry/new.tsx`, `src/providers/app-providers.tsx` | Add `onError` (Alert + `haptics.error()`) to each, matching the shipped `recordInspection`/`createGearItem` pattern. |
| P3-12 | Setup + edit hero kickers display "ENTRY-HASH V2" but `ENTRY_HASH_VERSION` is 3 | correctness | `app/(onboarding)/setup.tsx`, `app/entry/[id]/edit.tsx` | Interpolate the live constant `ENTRY-HASH V${ENTRY_HASH_VERSION}` (export.tsx/today.tsx already do). |
| P3-13 | Snapshot "chain head" in the restore rewind warning is derived from an unordered `SELECT *` | correctness | `src/domain/backup/backup-service.ts`, `app/(tabs)/more.tsx` | Resolve the preview head by the same NOT-EXISTS linkage rule `getLatestChainHash` uses (or carry an explicit head field), not array position. Display-only. **(post-1.0, non-blocking)** |
| P3-14 | Migration-14 `timezone_offset` is written but never read — comment overstates protection it doesn't provide | dead-code | `src/db/migrations.ts`, `src/domain/logbook/logbook-service.ts` | Consume it where intended (folds into P2-5), or remove the write + comment. Non-attesting metadata — no `ENTRY_HASH_VERSION` bump. **(post-1.0, non-blocking)** |
| P3-15 | Remote-signing token is a reversible function of the request id; public `request_code` is a slice of that same id; at-rest hash is unsalted SHA-256 | security | `src/domain/logbook/logbook-service.ts`, `src/domain/logbook/entry-hash.ts`, `supabase/functions/_shared/remote-signing.ts` | Generate the token from independent CSPRNG bytes (not derived from / overlapping the request id); optionally upgrade at-rest hash to keyed HMAC-SHA256. No demonstrated exploit (~60-84 residual bits, online-only). **(post-1.0, non-blocking)** |
| P3-16 | Today dashboard recomputes career-hours aggregates over the whole logbook on every render (incl. benign sheet toggles) | performance | `app/(tabs)/today.tsx` | `useMemo` the `today` Date and the week/month aggregates, mirroring records.tsx. **(post-1.0, non-blocking)** |

> P3-15 and P3-16 are pure non-correctness hygiene/perf and are tagged **(post-1.0, non-blocking)** per the refactor gate. P3-13/P3-14 likewise.

---

## Confirmed known / deferred (cross-referenced, not rediscovered)

- **#32 — Remote verifier payload carries only the entry record (no gear register, no photo evidence) yet the attestation states the full "work record" was reviewed.** Confirmed unchanged: `_shared/remote-signing.ts` `sanitizeRequest` returns only `entry: row.entry_payload`; the verifier WORK RECORD card renders entry scalars only; the hosted EntryDetail hard-codes `gear_usage: []` / `attachments: []`; `ATTESTATION_VERIFIER`/`ATTESTATION_DELEGATE` both claim review of "this remote request and work record." *(Findings #5 and #13 in the source set both reduce to this one item.)* Needs backend payload + Edge Function change, **or** narrow the attestation wording to exactly what the verifier saw. Deferred.
- **#33 — AppLock returns the lock overlay *instead of* children on re-lock, unmounting the subtree.** Confirmed: `app-lock.tsx:106` renders children only when unlocked; the locked branch returns the overlay and unmounts AuthGate's descendants, destroying in-memory `useState`. Two symptoms: (a) a captured-but-unsaved supervisor signature on the sign screen is lost on an idle re-lock during handoff; (b) the tamper-escape acknowledgment is lost (P2-6 above). Single fix: render children unconditionally and layer the lock as an absolute-fill sibling (the overlay already uses `absoluteFill` + `zIndex:9999`). Deferred.
- **Gear lifecycle gaps** — no manufacture / in-service date, service-life, or lot/batch columns, so the schema cannot compute mandatory end-of-life retirement deadlines (textiles ~10 y from manufacture); an item can read "current" on its inspection cycle while past retirement. Tracked under the deferred gear-lifecycle item. Deferred.
- **Shared async loading/error/empty convention** — P3-10 is one concrete instance; the broad cross-screen convention remains deferred.

---

## Notifications plan

Reconciles the proposed design with its fact-check critique. **Phase A is local-only and ships; Phase B (push) is deferred behind a privacy boundary.** SDK 54 APIs verified against the v54 docs; `expo-notifications` is not yet installed (needs a dev/standalone build, like auth).

### Phase A — local-first scheduled reminders (MVP)

Replace the in-development stub (`src/ui/sheets/notifications-stub-sheet.tsx`) with a pure/impure seam over two data sources already in local SQLite: gear `next_inspection_due` (due-soon + overdue, computed exactly like `getGearStatus`, `DUE_SOON_DAYS=30`) and technician cert expiry (`profiles.sprat_expires_on` / `irata_expires_on`).

**Files / APIs:**
- `src/domain/notifications/types.ts` *(new)* — `NotificationCategory` (`gear_due_soon` | `gear_overdue_digest` | `cert_expiry`), `NotificationDescriptor`, `NotificationLogRow`, `NotificationPrefs`.
- `src/domain/notifications/notification-service.ts` *(new, DbClient-only, jest-testable, zero `expo-notifications`)* — `computeDesiredNotifications(db, prefs, now): NotificationDescriptor[]` returning a **bounded (≤64)** prioritized array; reuses `listGearItems`/`getGearStatus` and `getProfile` (never re-derives); owns `notification_log` read/write.
- `src/domain/notifications/notification-scheduler.ts` *(new, the ONLY `expo-notifications` importer; `Platform.OS!=='web'` + module-availability + permission guarded)* — owns permission/handler/channel/listeners; `reconcile(desired)` = `cancelAllScheduledNotificationsAsync()` then `scheduleNotificationAsync()` per descriptor (cancel-all + reschedule-all is the simplest correct idempotent impl because the set is bounded). *Caveat (critique P2): document that this module owns the entire local schedule, so a future feature must coordinate rather than blind-cancel.*
- `src/domain/notifications/use-notifications.ts` *(new)* — `useNotificationPrefs`, `useNotificationPermission`, `useNotificationLog`, `useNotificationReconciler`.
- `app/notifications.tsx` *(new route, cloned from `app/security.tsx`)* — master opt-in toggle (`requestPermissionsAsync` on first enable), live permission state + "denied → open Settings", per-category toggles, gear lead-days `ChipSelect`, delivery-log preview.
- `src/db/migrations.ts` — **migration 16** (`notification_log`); `src/storage/local-prefs.ts` — new `PrefKeys`; `app.config.ts` — `expo-notifications` plugin (icon/color + Android channel); repoint `more.tsx`/`today.tsx` entry points to `router.push('/notifications')`; delete the stub.
- **SDK 54:** `setNotificationHandler` returns `shouldShowBanner`/`shouldShowList` (not the removed `shouldShowAlert`); `scheduleNotificationAsync({ trigger:{ type: SchedulableTriggerInputTypes.DATE, date } })`; `setNotificationChannelAsync('gear-cert-reminders', { importance: AndroidImportance.DEFAULT })`.

**Reconcile triggers** (`useNotificationReconciler` keyed on `useGearItems()` + `useProfile()` + prefs — inherits mutation-triggered reconcile for free from existing `['gearItems']`/`['gearSummary']`/`['profile']` invalidations; do **not** edit each `onSuccess`):
1. React-Query data change (inspection recorded, gear retired/added, cert set).
2. Cold-launch / mount = **re-hydration** (never schedule-once-and-forget).
3. AppState `'active'` foreground.
> Cert reconcile fires on profile **creation only** today — `profile-service` has no cert-update path; a future `updateProfile` extends it. Do not claim an edit path that doesn't exist.

**Mount point (critique P1 — corrected):** the reconciler must live in a **new wrapper component rendered inside `AppProviders` / `AuthGate` (so `QueryClientProvider` and the DB are present) but *outside* `AppLock`** (so a #33 idle re-lock doesn't unmount and thrash scheduling). Calling the hook directly in `RootLayout`'s body as the draft worded it crashes with "No QueryClient set."

**64-cap bound + rehydrate policy (`computeDesiredNotifications`):**
- Reserve ~6 cert slots: per scheme (SPRAT + IRATA) a 60/30/7-day-before-expiry lead set, skipping any descriptor whose `fireAt` is already past.
- Reserve 1 **gear-overdue digest** (single rolled-up "N items overdue", not per-item).
- Remaining ~55 slots → soonest-due gear ascending, one due-soon reminder each.
- **Always drop descriptors with `fireAt <= now`.**

**Overdue-digest trigger (critique P1 — corrected):** a past `DATE` trigger is rejected by the OS and there is no "immediate DATE" variant. Deliver the overdue digest either at a **future ~09:00** local time with an "N overdue" body, **or** immediately via `scheduleNotificationAsync({ trigger: null })` — never a past date.

**Fire-time correctness (critique P1):** build `fireAt` as ~09:00 **local** on `dueDate − leadDays` (and on `dueDate`) via `isoToLocalDate` (`date-utils.ts`), **not** `isoDateToUtcMs` (a day-counting helper that fires at the wrong local time).

**Delivery log is best-effort, not audit-grade** — notifications delivered while the app is killed never hit the JS listener; backfill via `getPresentedNotificationsAsync()` on launch and keep the log off any compliance/attestation surface.

### Phase B — push (deferred behind the privacy boundary)

Push is **not** in Phase A. The deferral reason is the opt-in privacy line, not effort: an Expo push token is data that leaves the device. Phase B needs (1) `getExpoPushTokenAsync({ projectId })` — EAS projectId (already in `app.config.ts`), a real dev/standalone build, an APNs key (iOS) and FCM/`google-services` config (Android); (2) a server-side device-token table in Postgres with RLS scoping tokens to the signed-in user (the only place a token may be persisted); (3) an Edge Function trigger fired from the existing `remote-signing-complete` / `remote-signing-cancel` (and a backup-completed hook) calling the Expo Push API, consistent with the in-function-auth model (gateway JWT verification stays disabled). Phase B requires its own distinct consent.

*Minor critique note (non-blocking): local/scheduled notifications do work in Expo Go on iOS; only remote push is unavailable there. The scheduler treats Expo Go / web / module-unavailable / permission-denied as opt-out no-ops, which degrades cleanly regardless.*

---

## Runtime verification checklist

**OWED ON-DEVICE RUNTIME CONFIRMATIONS** (a static audit cannot verify these — they are the "working as intended" gate, tracked SEPARATELY from code findings):

1. nav duplicate-stack fix — open entry, Edit/Sign, back once → no repeat;
2. profile photo capture/pick/crop/remove + initials fallback;
3. brand mark renders as climber silhouette on splash/lock/onboarding;
4. auth: Apple sign-in CONFIRMED working; Google sign-in PENDING (needs a current dev build that contains the native module); email-OTP unconfirmed;
5. signing spine end-to-end on device: draft → sign (seal anim, dirty guard) → verify portal → amend → audit export (PDF/JSON/CSV);
6. on-device 6-palette visual + contrast sweep.

---

## Recommended sequence to 1.0

**Fix first (P1 — audit/data integrity, before any release):**
1. **P1-1** hash-chain envelope (bump v4, bind signer identity + signature + attestation) — the single most important integrity fix; coordinate `entry-hash.ts` + `_shared/remote-signing.ts` in lockstep with a tamper test.
2. **P1-2** single-active-amendment guard — stops permanent, undetectable signed-hours inflation feeding progression.
3. **P1-3** gate the export "Chain valid" pill on real verification.
4. **P1-4** persist evidence photos to `documentDirectory` — irreversible evidence loss on every signed entry until fixed.
5. **P1-5** clear `pending_signature_id` on expiry + autonomous sweep.
6. **P1-6** reorder offline sign-out (revoke before flag) — one tap currently locks a field tech out.

**Then (P2):** attestation in bulk PDF/CSV (P2-1); gear backdated-inspection guard (P2-2); FK-on test harness + restore test (P2-3); hosted-fetch 404-vs-error split (P2-4); local-zone export dates (P2-5); a11y selection state (P2-7). Resolve **#33** here (fixes P2-6 + the lost-signature symptom) — it is a P1-class data-loss vector despite the P2 tag on the escape symptom.

**Build (net-new):** Notifications Phase A (local-only) per the plan above — independent of the integrity fixes, can proceed in parallel.

**Defer post-1.0:** #32 remote verifier payload parity (backend + Edge Function); gear lifecycle (manufacture/service-life/lot-batch/quarantine); the shared async loading/error/empty convention (P3-10 is one instance); full typography sweep; Notifications Phase B push; all **(post-1.0, non-blocking)** P3 hygiene (P3-13/14/15/16). Triage the remaining P3 correctness items (P3-3/5/6/7/8/9/11/12) into the 1.0 polish pass as capacity allows.

**Must be device-verified before 1.0 (beyond the 6-item checklist above):** multi-table FK-enforced restore round-trip (from P2-3); evidence-photo capture → durable-URI survival across app restart (from P1-4); Notifications Phase A smoke test (permission grant, schedule, overdue-digest delivery, reconcile-on-mutation, rehydrate on cold launch).
</invoke>
