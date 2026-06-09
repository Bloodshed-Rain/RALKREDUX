# Road to 1.0 — what's left and who can unblock it

> Written 2026-06-05 (branch `production-hardening`, off `main` @ `feada72`).
> This is the crisp "what remains" handoff. It supersedes the open-item view in
> `production-readiness-audit.md`, which is a **stale pre-fix snapshot** — almost
> everything it lists as open has since shipped to `main`. See the status banner
> at the top of that file.

## Headline

**The audit-integrity backlog is all but closed.** Every P1 and P2 item from the
production-readiness audit is implemented and (where jest-reachable) regression-tested
on `main` — verified item-by-item against current code this session, not taken on faith
from either doc — **except two**:

- **P1-1** (signer identity outside the hash envelope) — deliberately left for a
  supervised session because it requires an outward-facing Edge Function redeploy.
- **P2-5** (export timestamps render in the ambient zone, not device-local) — still open;
  `partial`, because the timezone-capable formatter exists but every `export.ts` call site
  omits the arg (jest masks it via `TZ=UTC`). High-risk architectural threading — deferred,
  see below.

Both are detailed in **Deferred code** below.

So the remaining distance to 1.0 is **not** more integrity code. It is dominated by
things only you (the user) can do — credentials, device verification, a coordinated
backend redeploy, store submission, and the SPRAT/IRATA acceptance workstream — plus a
short tail of low-risk P3 polish a future autonomous session can finish.

## Verified-fixed this session (do NOT re-investigate)

Confirmed present and correct in current `main` code:

| Item | What it was | Where it lives now |
|---|---|---|
| P1-2 | Double-counted signed hours from multiple amendments | `logbook-service.ts:727` guard + test `logbook-service.test.ts:451` |
| P1-3 | Export "Chain valid" pill shown without verifying | `export.tsx:206-213,447-457` gates on `useVerifyFullChain` |
| P1-4 | Evidence photos stored transient cache URI | `src/ui/attachment-storage.ts` + both call sites persist first |
| P1-5 | Expiry didn't clear `pending_signature_id` | `logbook-service.ts:209-239` (+ autonomous sweep) + test `:562` |
| P1-6 | Offline sign-out poisoned `authedBefore` before revoke | `auth-provider.tsx:87-88` (revoke first) |
| P2-1 | Bulk PDF/CSV dropped signer attestation | `export.ts:57-58,296-297,357-358` |
| P2-2 | Backdated inspection clobbered live next-due | `gear-service.ts:193-204` + test `gear-service.test.ts:86` |
| P2-3 | Restore tests ran with `foreign_keys` OFF | `__tests__/setup.ts:13` enables it + FK restore test `backup-service.test.ts` |
| P2-4 | Hosted fetch collapsed 5xx/400 into 404-null | `remote-signing.ts:204-205` (404→null, else throw) |
| P2-6 | AppLock re-lock unmounted subtree, losing escape ack | `app-lock.tsx:106-112` (children mounted; lock is a sibling) |
| P2-7 | New-entry chips conveyed selection by color only | `new.tsx:804,1038,1060` `accessibilityState` |
| P3-3 | Attachment writes didn't invalidate `['attachmentsAll']` | `use-logbook.ts:124,277` |
| P3-5 | `foreign_keys` pragma native-only | `initialize.ts:37` unconditional |
| P3-12 | Hero kicker hard-coded "ENTRY-HASH V2" | `setup.tsx:136` / `edit.tsx:280` interpolate `ENTRY_HASH_VERSION` |

## Fixed this session (branch `production-hardening`)

- **P3-10** — attachments screen rendered a read failure as the "No attachments yet"
  empty state. Added an explicit `isError` + Retry branch (`app/attachments.tsx`).
- **P3-11** — attach-photo / attach-gear / detach-gear mutations had no `onError`, so
  failures were silent. Added `haptics.error()` + `Alert` to all six call sites
  (`app/entry/[id].tsx`, `app/entry/new.tsx`).

tsc + 244 jest green. UI-only — **device-verification owed** (no unit coverage of the
RN render paths). Commit `8d3d85e`.

---

## Needs YOU — only the user can unblock these

1. **P1-1 — bind signer identity into the hash chain (highest-value integrity fix).**
   `hashSignatureChain` covers entry content + signature metadata but NOT the
   signer-identity fields (`supervisor_*`), the drawn `signature_path`, or
   `signer_attestation` / `attestation_accepted_at`. Rewriting any of those on a signed
   row currently leaves `verifyFullChain` green. The fix is bump `ENTRY_HASH_VERSION`
   **5 → 6**, extend the hashed payload, mirror it into the Deno
   `supabase/functions/_shared/remote-signing.ts`, **and redeploy the live Edge
   Functions in lockstep** — `remote-signing-request` hard-rejects on
   `hash_version !== ENTRY_HASH_VERSION`, so an app/backend skew breaks hosted signing
   with `hash_version_invalid`. This is left for a supervised session precisely because
   the redeploy is outward-facing and must be coordinated with the app build. Keep a
   version short-circuit so existing v5 signatures still verify under v5 semantics, and
   add a tamper regression test.

2. **Auth credentials + dev-client build.** Real provider auth is code-complete but
   blocked on external config: Google Cloud OAuth client IDs, Apple Service ID/key,
   Supabase dashboard provider config, OTP SMTP, and the `EXPO_PUBLIC_GOOGLE_*` /
   `EXPO_PUBLIC_SUPABASE_*` env vars. Full checklist: `docs/auth-setup.md`. Apple
   sign-in is verified; Google + email-OTP need a dev build that includes the native
   modules.

3. **On-device verification (the "working as intended" gate).** Static analysis and jest
   cannot reach these. From the audit's checklist + this session's UI changes:
   nav duplicate-stack; profile photo capture/crop/remove; brand mark on
   splash/lock/onboarding; the full signing spine (draft → sign → verify portal → amend
   → export); 6-palette contrast sweep; multi-table FK-enforced restore round-trip;
   evidence-photo durable-URI survival across restart; and the two UI fixes shipped this
   session (P3-10 error state, P3-11 error alerts). Notifications finer checks are
   tracked separately on the `native-notifications` branch / PR #7.

4. **Store readiness.** Icons/splash, store listing, privacy disclosures, the benign
   `ITMS-90078` push-entitlement warning (documented in `docs/notifications.md` — a
   warning, not a rejection), and a production EAS build/submit. Not started.

5. **SPRAT/IRATA acceptance workstream.** Separate from audit-readiness; see
   `docs/sprat-irata-compliance-roadmap.md`. Do not describe the app as
   SPRAT/IRATA-accepted in code or copy.

---

## Deferred code — safe for a future autonomous session (with reasons)

Left undone this session because each crosses a line that warrants supervision or a
judgment call beyond a mechanical edit:

- **P3-2 — PDF cover "Signed hours" conflates entry kinds** *(compliance-semantics + a
  contract decision)*. The cover sums `work_hours` across all signed entries regardless
  of `entry_kind`, while the per-entry rows already gate "Rope access hours" to
  `entry_kind==='work'`. The SPRIRATA rope-access advisor ruled this session: headline
  the work figure as **"Signed rope access hours"** (sum where `entry_kind==='work'`),
  with an optional subordinate breakout `Training: Y · Assessment: Z · Rescue drill: W`.
  Two surfaces must change coherently or neither: `buildLogbookExportBundle.summary`
  (`export.ts:231-233`, feeds the PDF cover + JSON) **and** the export-screen preview
  (`app/export.tsx:123-126`, rendered as "{n} signed hrs"). Open decision the advisors
  split on: whether to bump `export_schema_version` 3 → 4 (the domain advisor favored
  keeping the field name + no bump to stay minimal; the rope-access advisor favored a
  bump because the summary figure's meaning changes for an audit artifact). Resolve that
  before implementing; watch `entry_kind` nullability on legacy rows. **No
  `ENTRY_HASH_VERSION` bump — presentation only.**

- **P2-5 — export timestamps render in ambient zone, not device-local** *(architectural
  threading, high regression risk)*. `formatTimestampDate` supports a `timeZone` arg but
  all ~10 call sites in `export.ts` omit it; jest masks the bug via `TZ=UTC`. The fix
  threads the device timezone from the UI through the pure domain export builders without
  breaking their pure-function contract — needs careful design + non-UTC midnight-boundary
  tests.

- **P3-6 — no DB-corruption recovery path** *(destructive)*. Init errors aren't classified;
  "Try again" re-opens the same file. The fix routes `SQLITE_CORRUPT`/`NOTADB` to a
  user-confirmed `deleteDatabaseAsync` + recreate — a destructive path on the canonical
  ledger, so it should be done under supervision.

- **P3-9 — abandoning sign/request after the wizard `replace` strands the draft**
  *(touches the unsaved-guard)*. Routing Back/Cancel through `returnToEntryDetail` risks
  bypassing `useUnsavedGuard`'s `beforeRemove` listener on the dirty-signature path;
  needs careful integration testing.

- **P3-7 — boot has no init-hang timeout** *(med risk, device-verify only)*. Add a
  `Promise.race` against a ~15–20 s timer in `app-providers.tsx` so a stalled
  `initializeDatabase` surfaces the existing Try-again UI instead of an infinite splash.

- **P3-8 — verify portal "Return to logbook" raw-replaces** *(nav, low risk)*. Add a
  `canGoBack()` guard or use `returnToEntryDetail` so an in-app Preview entry doesn't
  duplicate the detail screen. `app/verify/[code].tsx:313`.

- **P3-13 — snapshot "chain head" derived from `signatures[length-1]`** *(low severity,
  clean pure-fn fix)*. `app/(tabs)/more.tsx:983-987` takes the array's last element; the
  correct head is the signature whose `chain_hash` is not any other's
  `previous_chain_hash` (the NOT-EXISTS rule `getLatestChainHash` uses). In practice
  `SELECT *` returns insertion order so it's usually right; the clean fix is a pure helper
  + unit test, then wire into `more.tsx`. Display-only, post-1.0.

- **P3-16 — `today.tsx` recomputes career aggregates every render** *(perf, low value)*.
  `useMemo` the `today` Date + week/month aggregates (`app/(tabs)/today.tsx:166-174`),
  mirroring `records.tsx`.

- **P3-1 — Edge Functions echo raw Postgres `error.message`** *(security, outward-facing
  redeploy)*. Return a fixed generic error; pass through only known validation codes.
  Requires `npm run functions:check` + an Edge redeploy → user-coordinated.

- **P3-4 — cloud restore has no snapshot integrity check** *(audit-integrity, schema +
  upload/download change)*. `sha256_hex` column exists but is never written/verified;
  populate at upload, verify before the destructive restore wipe.

- **P3-14 / P3-15** — dead `timezone_offset` column; reversible token derivation. Both
  tagged post-1.0-non-blocking in the audit; P3-15 is crypto → supervised.
