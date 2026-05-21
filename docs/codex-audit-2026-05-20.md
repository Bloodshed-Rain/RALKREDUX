# RALB Codex Edition — Full Code Audit (2026-05-20)

Scope: whole repo (`app/` ~10.2k LOC, `src/` ~9.8k LOC, `supabase/` ~0.7k LOC, `__tests__/` ~3.0k LOC). Audit method: direct read of the integrity/signing core + edge functions + migrations, plus four parallel sweeps (screens/UI, domain services, test coverage, security/release hygiene). Validation run live on the **current working tree** (which has uncommitted in-flight work).

Target context: paid app, **US$3/month with a 2-week trial**, iOS + Android.

---

## 0. Headline

Two honest completion numbers — they are **not** the same and must not be blurred:

| Lens | Estimate | One-line rationale |
|---|---|---|
| **Functional offline-first logbook** | **~75%** | Clean architecture, the core flows work and are tested — but the "tamper detection" feature is broken two ways, and restore silently loses photos. |
| **Ship-ready as a paid store product** | **~30%** | Monetization 0%, identity/entitlement ~minimal, observability 0%, store-submission assets missing, plus two ship-blocking correctness bugs and no OTA channel to hot-fix them. |

The codebase is a **well-architected logbook engine** with a thin set of production-grade gaps that are mostly *outside* the domain logic (billing, identity, observability, store assets) plus a few *inside* it (integrity verification, backup completeness). The engineering quality of the committed domain/cloud layer is high; the product-shell and risk-hardening are early.

---

## Resolution log — 2026-05-20 (bug-fix pass)

All defects below were fixed in a follow-up pass. **Validation after fixes: `jest` 152/152 (16 suites, +9 new tests), `tsc --noEmit` clean, `npm run functions:check` (Deno check/lint/fmt) clean.** Monetization / identity / observability / store-submission assets were **out of scope** for this pass — they are feature work, not bug fixes, so the **paid-readiness ~30% number is unchanged**.

**P0 — fixed**
- ✅ **BUG-1** `verifyFullChain` now `await`s `verifyChainHashFor`, so entry-content tampering is actually detected.
- ✅ **BUG-2** `verifyFullChain` rebuilt to walk the chain by **linkage** (predecessor→successor), not by timestamp order — signing drafts out of creation order no longer false-positives. `getLatestChainHash` likewise resolves the head by linkage (tie-proof), complementing the fix.
- ✅ **BUG-4** backup now captures + restores `entry_photos` (added to snapshot, both restore orders, and `BackupSnapshot` type) — restore no longer cascade-deletes photos.
- ✅ Migration ledger test fixed (migration 14) + new schema test. New `verify-full-chain.test.ts` (out-of-order, post-hoc tamper, missing-signature, corrupted-link), backup photo round-trip test, CSV-injection test. **+9 tests.**

**P1 — fixed**
- ✅ **BUG-5** signing time is no longer caller-controlled: local sign forces device-`now`; the edge function stamps server-`now` (no longer trusts client `signed_at`); the local import path clamps to `[request created, now]` ± 5 min skew. `signed_at` removed from `SignEntryInput`.
- ✅ Two Fabric `transform: undefined` crash sites (`pull-to-refresh.tsx`, `sync-chip.tsx`) → spread-conditional.
- ✅ CSV formula injection (`export.ts csvCell`) → leading `= + - @`/control chars prefixed with `'`.
- ✅ AppLock wired to the Security toggles: `deviceLockEnabled` gates the lock, `autoLockMinutes` idle timeout enforced, `biometricForSigning` gates the local sign action; FOUC race fixed via a neutral `checking` phase; device-passcode fallback (`disableDeviceFallback: false` + `getEnrolledLevelAsync`). Stale "enforcement pending" banner removed.
- ✅ TamperGuard given an escape hatch (Export / Continue) so it can never brick the app on a false positive (per product decision).
- ✅ Backup forward-version guard: a snapshot from a newer schema now fails with `backup_snapshot_newer_version` instead of an opaque SQL error.

**P2 — fixed**
- ✅ Orphan `NSLocationWhenInUseUsageDescription` removed from `app.config.ts`.
- ✅ Defensive `work_hours ?? 0` guard in `canonicalizeEntry`.

**Carry-overs / not done (with reason)**
- ➖ **Edge-function deploy is user-owned.** The `remote-signing-complete` server-now change is committed + Deno-clean but **not deployed**. Run `supabase functions deploy remote-signing-complete` to make it live.
- ➖ A few service tests still pass a now-ignored `signed_at` to `signEntryLocal` (runtime-harmless; field removed from the type). Strip them, or add `__tests__` to a `tsconfig.test.json` so excess-property use is caught — left as a known carry-over.
- ➖ At-rest DB encryption (SEC-4/M4 plaintext SQLite, token re-derivability) and typography/async-state polish are unchanged — design/feature decisions, not defects.

---

## 1. Validation baseline (run 2026-05-20 on the dirty tree)

| Check | Result |
|---|---|
| `tsc --noEmit` | **PASS** (exit 0) — but see note |
| `jest --runInBand` | **1 failed, 142 passed, 143 total** |
| `functions:check` | not run here (needs Deno toolchain); last known good per handoff |

- **Test suite is RED on the working tree.** `__tests__/db/migrations.test.ts` asserts the ledger ends at id 13, but the in-flight migration **14 `timezone-anchoring-and-photos`** was added to `src/db/migrations.ts:552` without updating the test. CLAUDE.md explicitly requires migration-test coverage for every schema change; this rule was violated by the uncommitted work. The handoff's "141/141 green" no longer holds (count is now 143, and one fails).
- **`tsc` passing is partly illusory.** `tsconfig.json` sets `include: ["app","src","app.config.ts"]` and `exclude: ["…","supabase"]` — **`__tests__/` is never type-checked.** Test fixtures (`logbook-export.test.ts`) are already missing the v3/v14 required entry fields, but that drift is invisible to `npm run typecheck`. Recommend a separate `tsconfig.test.json` or adding `__tests__` to the typecheck pass.
- **The uncommitted migration-14 work is half-built — land it cleanly or revert it; do not commit as-is.** It adds `timezone_offset` (`logbook-service.ts:498` writes `getTimezoneOffset()`) but **no consumer reads it** — every day-boundary derivation still parses local midnight, so the documented "prevent day-shifting across timezones" protection does not exist. It also adds the `entry_photos` table that **breaks restore** (BUG-4). And it leaves the migration test red. Net: a dormant column + a destructive table + a red suite.

---

## 2. Architecture & layering — **Strong (A)**

- **No layering violations in `app/`.** Zero raw SQL, zero `expo-sqlite` imports, zero `DbClient` usage in screens. All data access goes through `use-*` React Query hooks. This is the cleanest part of the codebase and matches CLAUDE.md's strict layering.
- Domain services are `DbClient`-only and run under both `expo-sqlite` (runtime) and `better-sqlite3` (tests). Good.
- Migrations are disciplined: numbered, idempotent (PRAGMA `table_info` guards before `ALTER`), each wrapped in its own `BEGIN/COMMIT/ROLLBACK` transaction (`migrations.ts:595-609`).
- Minor: CLAUDE.md still describes tokens as `colors/spacing/typography` from `tokens.ts`, but the live system is `useTheme().tokens` + `type.*`. Doc drift, not a code problem.

---

## 3. Integrity / signing core — **the crown jewels, and where the worst bugs live**

The per-entry hashing and the two signing functions are **excellent**. The orchestration that the "tamper guard" relies on is **broken**.

### What's right
- `entry-hash.ts` — version-aware canonicalization; `verifyChainHashFor` recomputes against the signature's *own* `hash_version` (so old v2 signatures verify correctly against a v2 canonical shape) and rejects out-of-range versions. This is **better** than the handoff describes (the handoff claims a blanket short-circuit that no longer exists).
- `signEntryLocal` / `completeRemoteSignatureRequest` (`logbook-service.ts:734`, `:830`) — transactional; gate on draft status + readiness; enforce scheme-based cert/role/employer rules; remote completion re-checks `entry_hash` **and** `hash_version` so a modified entry can't be signed against a stale request. Solid audit discipline.
- Edge functions canonicalize entry payloads field-for-field in lockstep with the client (`_shared/remote-signing.ts:113`), with strict type validation that throws on malformed input.

### 🔴 BUG-1 (P0) — full-chain verification never checks entry hashes (missing `await`)
`logbook-service.ts:1251`
```ts
const isValid = verifyChainHashFor({ entry, signature }); // returns a Promise
if (!isValid) { … }                                       // a Promise is always truthy
```
`verifyChainHashFor` is `async`. Called without `await`, `isValid` is a Promise, so `!isValid` is always `false` and the branch never runs. The only checks `verifyFullChain` actually performs are "signature row exists" and the stored-hash linkage walk. **Editing an entry's content directly in SQLite is not detected.** The headline "Logbook Integrity Compromised" guard is, for the most important tamper class, security theater. (Note: the *unit* function is correct and tested; the orchestrator that wraps it is not — and the orchestrator has zero tests, which is exactly why this shipped.)

### 🔴 BUG-2 (P0) — full-chain verification false-positives and bricks the app
`logbook-service.ts:1231-1262` vs `:202-211`
- The chain is built in **signing order**: each new signature's `previous_chain_hash = getLatestChainHash()`, which is `ORDER BY signed_at DESC, created_at DESC LIMIT 1`.
- `verifyFullChain` walks signed/amended entries `ORDER BY created_at ASC` — i.e. **draft-creation order** — and asserts each `signature.previous_chain_hash === runningChainHash`.

These two orderings only agree if drafts are always signed in the order they were created. They diverge in routine use (create A then B, sign B before A) and `signed_at` is even caller-supplied (`input.signed_at ?? now`, `:760/:875`). On divergence, `verifyFullChain` returns `{valid:false}` → **`TamperGuard` renders an unescapable full-screen "Red Screen of Death"** over the entire app, including the Export and Restore screens, advising the user to "restore from a verified backup" they cannot reach. There is **no OTA channel** (`expo-updates` absent) to hot-fix this — recovery would require a store resubmission. This is an outage shipped in the box.

### 🟠 BUG-3 / design (P1) — `TamperGuard` has no escape hatch and blocks recovery
`src/providers/tamper-guard.tsx` wraps `ThemedStack`. Even with BUG-1/2 fixed, *any* future false positive (a serialization change, a partial chain after an interrupted sign, a legitimately corrupt row) locks the user out with no in-app path to export raw data or restore. If this feature ships, it needs: (a) a hardened false-positive surface, (b) an export-only/read-only escape, (c) telemetry when it fires. Recommend gating it behind a setting and *not* making it a hard global block.

### 🟠 BUG-5 (P1) — `signed_at` is caller-supplied
`logbook-service.ts:760`, `:875` (`input.signed_at ?? now`). For an audit-grade record, an arbitrary input-supplied signing timestamp is an integrity gap independent of the chain bugs: it permits **backdating** a signature to any wall-clock value, and a backdated `signed_at` also **reorders the chain** via `getLatestChainHash` (compounding BUG-2). Constrain to device-`now` on the local path and server-`now` on the edge function, with a small skew tolerance validated against the request window. A real auditor will ask about this.

### Blast-radius note (good news)
`verifyFullChain` / `useVerifyFullChain` is consumed **only** by `TamperGuard` (confirmed by grep). So BUG-1's false-negative does **not** also silently green-light a separate "Verified ✓" badge elsewhere — the per-entry chain panel on entry detail uses different derivations. The damage from BUG-1/2 is contained to the guard.

### Minor
- `canonicalizeEntry` does `entry.work_hours.toFixed(2)` with no null guard (max_height is guarded). Safe today because signing is readiness-gated, but a latent crash if ever hashed pre-gate.

---

## 4. Data layer & backup — **Good schema, one data-loss bug**

### 🔴 BUG-4 (P0/P1) — Restore silently destroys all entry photos
`src/domain/backup/backup-service.ts` + `migrations.ts:566-574`
Migration 14 adds `entry_photos` with `entry_id … ON DELETE CASCADE`. The backup service predates it and **does not know the table exists**: it's absent from `RESTORE_CLEAR_ORDER`, `RESTORE_INSERT_ORDER`, the snapshot dump, and the `BackupSnapshot` type. On a real device (`PRAGMA foreign_keys = ON`, `initialize.ts:30`), restore's `DELETE FROM entries` **cascade-deletes every photo row**, and the snapshot never recaptures or reinserts them → permanent loss of attached photos on the one operation users run when desperate. Invisible to tests (the harness doesn't enable FKs, the test never creates a photo, and it restores into a fresh DB).

### 🟠 (P1) — No forward-version guard on restore
`backup_schema_version` is frozen at `1` and isn't bumped as the DB schema grows (migrations 9–14 added columns/tables). Restoring a newer snapshot onto an older build throws raw `no such column` SQL errors instead of a clean "snapshot is from a newer version" message. The transaction does roll back (no partial corruption), but the UX is opaque.

### Notes
- `insertRows` derives columns from `rows[0]` only — a sharp edge for heterogeneous/hand-edited snapshots.
- Restore is otherwise atomic and uses `defer_foreign_keys`. `gear_catalog` correctly excluded (re-seeded by migration 7).

---

## 5. Security & privacy — **Sound core, soft edges**

Verified-safe (good news): no hardcoded secrets in tracked files (only EAS projectId + public anon key from env); SQL is fully parameterized (the two dynamic-SQL spots interpolate union-literal column names / const table names, not user input); only one `console.*` in the tree (a benign WAL warning — no token/PII logging); PDF/HTML export is HTML-escaped; no `eval`/`Function`/`dangerouslySetInnerHTML`; deep-link token validated by hash before use.

| ID | Sev | Finding |
|---|---|---|
| SEC-1 | 🟠 P1 | **CSV formula injection.** `export.ts:53` `csvCell` quote-wraps but does not neutralize leading `= + - @`. User fields (site/client/task/names/cert/gear) flow in unescaped → `=HYPERLINK(...)` executes in Excel/Sheets. The test named "escaped reviewer-facing fields" only checks quoting (false confidence). |
| SEC-2 | 🟠 P1 | **AppLock toggles are decorative.** `app/security.tsx` persists `deviceLockEnabled`/`autoLockMinutes`/`biometricForSigning`, but `app-lock.tsx` reads none of them — it gates purely on `__DEV__` + biometric enrollment. The screen's own banner admits "enforcement is pending." Shipping non-functional security settings in a paid audit tool is a trust problem. |
| SEC-3 | 🟠 P1 | **AppLock is a soft React gate, not encryption-at-rest, and has a FOUC race.** `isSupported` starts `false`, and `if (unlocked || !isSupported)` renders children before the async hardware check resolves → brief unlocked flash. No enrolled biometrics ⇒ `setUnlocked(true)` (open) with no passcode fallback. The SQLite DB is plaintext (no SQLCipher); PII (names, cert numbers, signatures) sits unencrypted. Defensible as an OS-filesystem-encryption decision, but the "lock" framing oversells it. |
| SEC-4 | 🟡 P2 | **Remote-signing token is re-derivable from local plaintext.** `buildRemoteSigningToken = `${request_code}.${id}`` and both parts are stored plaintext in `remote_signature_requests` (and in backup snapshots). Server only stores the hash (good), but anyone reading the local DB/backup can regenerate a pending token. Bounded by 14-day expiry + pending-status. Make the threat model explicit. |
| SEC-5 | 🟡 P2 | Edge functions store `completed_user_agent` raw and `Access-Control-Allow-Origin: *`. Acceptable for a token-gated public verifier endpoint; note the UA in the privacy policy. |

---

## 6. Cloud / remote signing (Supabase) — **Strong (A-)**

- In-function auth is correct and matches the documented trust model: anon-JWT `getAuthenticatedUser` for `POST /remote-signing-request`; `request_code` + **hashed**-token lookup (`findRequestByToken`) for verifier read/complete. Gateway JWT verification stays disabled by design.
- Service-role key only via `requireEnv('SUPABASE_SERVICE_ROLE_KEY')` — never client-side, never hardcoded. `sanitizeRequest` strips `signing_token_hash` and `owner_id` from responses.
- Two RLS migrations present; `remote-signing-cancel` config block fixed (handoff). Edge functions deployed at v2 with the v3 hash check.
- Gaps: **zero edge-function tests**; auto-sync hook (`use-remote-signing-sync.ts`) decision logic is unit-tested but the polling/invalidation/error paths are not. Anonymous auth is still a flagged "preview decision" — see §8 (it collides with the paid-identity requirement).

---

## 7. UI / UX / accessibility — **Good, with two real bugs**

- **a11y is a strength**: `IconBtn` always sets `accessibilityLabel` + ≥44px hit targets; `useReducedMotion()` is honored across all animated primitives and entrance animations; status is never color-only.
- 🟠 **Two live Fabric crash sites (P1):** `src/ui/primitives/v2/pull-to-refresh.tsx:292` and `sync-chip.tsx:119` both set `transform: cond ? [...] : undefined` inside a `react-native` `Animated.View`. `undefined` serializes to `null` under the new architecture and trips `_validateTransforms` — and **both render on the Today tab in their idle state.** Use the spread-conditional pattern the rest of the app already adopted.
- 🟡 **Typography drift (P2):** 13 screens hand-roll `fontFamily/fontWeight/fontSize` instead of spreading `type.*`. Because the +18% scale (`UI_SCALE`) is applied *inside* `type.*` via `scaled()`, these hand-rolled blocks render **visibly smaller** than the surrounding UI — a real inconsistency, not just style.
- 🟡 **Thin async-state UX (P2):** loading states mostly `return null` (blank), and `isError` is essentially unhandled — a query failure shows nothing. Tab roots (today/records/gear) should get skeletons + error states.
- `app/security.tsx` and `app/attachments.tsx` aren't registered in the `_layout` Stack (will show the default native header; possible double-header if they also render `TopBar`).

---

## 8. Monetization & store-submission readiness — **the dominant gap (~10%)**

This is the difference between "a logbook" and "a paid app," and it is almost entirely absent.

- 🔴 **Monetization: 0%.** No `react-native-purchases` (RevenueCat) or `expo-in-app-purchases` in deps. No paywall, no trial logic, no entitlement check, no "Restore Purchases" UI (Apple 3.1.1 requires it), no subscription-management deep link. The only trace is two placeholder keys in `.env.example`. **A 2-week trial + $3/mo subscription has to be built from zero**, including the server-side entitlement/receipt-validation story.
- 🔴 **Identity vs. entitlement.** Auth is anonymous-only with no account system. A subscription must bind to *something* that survives reinstalls and travels across the two remote-signing paths. Decide now: pure store receipts (RevenueCat handles cross-platform) vs. real Supabase auth + Sign in with Apple. This cascades into the hosted remote-signing trust model.
- 🔴 **Apple/Google policy:** subscriptions for app functionality **must** use native IAP (no Stripe/web billing for the unlock). Plan for the 30/15% cut in the $3 price.
- 🟠 **Submission assets missing:** no Privacy Policy URL, no Support URL, no data-safety / privacy-nutrition-label content anywhere in the repo. Required to submit.
- 🟠 **Orphan permission = review rejection risk:** `NSLocationWhenInUseUsageDescription` is declared (`app.config.ts:20`) but `expo-location` is **not** a dependency and is used nowhere. Declared-but-unused location strings get apps bounced (Guideline 5.1.1). Remove it until the feature ships. (Camera/Photos permissions *are* justified — keep them.)
- 🟡 Bundle-ID drift: iOS `com.ropeaccess.logbook` vs Android `com.ropeaccess.logbook.codex`. CLAUDE.md justifies the iOS id but not the Android `.codex` suffix — confirm it's intentional before store identity is locked.

---

## 9. Observability & operations — **0% (a retention/risk problem for paid)**

- **No crash reporting** (no Sentry/Bugsnag/Crashlytics). For a paid, audit-grade tool, shipping blind to crashes is a churn bomb — and you'd never learn that BUG-2 bricked someone.
- **No analytics** (trial-conversion funnel is invisible — you can't tune the very thing the business depends on).
- **No OTA / `expo-updates`** — every fix is a full store resubmission. Given the TamperGuard brick risk, an OTA channel (or removing the hard block) is close to mandatory before launch.
- `runtimeVersion: fingerprint` is set but there's no update channel wired to it.
- DB-init failure leaves the user on a dead-end boot splash with no retry.

---

## 10. Testing — **Good domain unit coverage, critical orchestration untested**

- ~143 tests across 15 suites; strong on derivations, gear lifecycle, export packet, single-entry hash verification, remote-status logic.
- **Untested where it hurts most:** `verifyFullChain` (the TamperGuard engine — both P0 bugs would have been caught by a 3-entry out-of-order-signing test), `app-lock`/`tamper-guard` providers, all Edge Functions, the auto-sync polling hook, and **every screen** (zero component tests). Backup has a single happy-path test that never exercises the destructive populated-DB restore (so BUG-4 is invisible).
- Tests run only against `better-sqlite3`; the real `expo-client.ts` adapter is never exercised by CI.

---

## 11. Prioritized blocker list

**P0 — must fix before any paid launch (correctness/data loss):**
1. BUG-1 `verifyFullChain` missing `await` → tamper detection is inert.
2. BUG-2 chain-walk order mismatch → false-positive Red-Screen lockout with no recovery and no OTA.
3. BUG-4 restore destroys `entry_photos` (silent data loss).
4. Fix the red migration test + add a `verifyFullChain` multi-entry/out-of-order test (this is the regression that proves 1 & 2).

**P0 — must build before paid launch (product shell):**
5. Subscription + 2-week trial via native IAP/RevenueCat, entitlement gating, Restore Purchases.
6. Identity/entitlement-persistence decision (store receipts vs. real auth).
7. Privacy Policy + Support URLs; data-safety labels; remove orphan location permission.
8. Crash reporting (Sentry) + an OTA/update channel (or drop the hard TamperGuard block).

**P1:**
9. Two Fabric crash sites (today-tab hot path).
10. CSV formula-injection escaping.
11. AppLock: either wire the security toggles + passcode fallback + fix FOUC, or hide the toggles and re-frame.
12. Backup forward-version guard.
13. Constrain `signed_at` to device/server `now` (BUG-5) — backdating + chain-reorder vector.

**P2:** typography `type.*` refactor (13 screens), async error/loading states, token-derivability threat-model note, edge-function + screen tests, doc drift (handoff + CLAUDE.md), bundle-id confirmation, UA/CORS privacy note.

---

## 12. Completion scorecard

| Area | Grade | Done |
|---|---|---|
| Architecture & layering | A | 95% |
| Schema & migrations | A- | 90% |
| Signing core (sign/amend/remote) | A- | 90% |
| **Integrity verification (TamperGuard)** | **D** | 40% (built but broken + untested) |
| Backup/restore | C+ | 70% (photo data-loss) |
| Cloud / Edge Functions | A- | 85% |
| UI / UX / a11y | B | 80% |
| Testing | B- | 65% (domain) / 10% (orchestration+UI) |
| Security/privacy hardening | C+ | 60% |
| **Monetization** | **F** | ~3% |
| Identity/entitlement | F | ~10% |
| Observability/ops | F | 0% |
| Store-submission assets | D | 10% |

**Composite — functional logbook: ~75%. Composite — paid, store-ready product: ~30%.**

> **Decision lever:** TamperGuard is uncommitted — you haven't actually committed to shipping it. If it's **deferred to v2**, the integrity-verification row drops out of the scorecard and logbook completion lands closer to **~82%**. Make this call deliberately: *keeping a broken integrity feature is worse than shipping without it.* The paid-product ~30% does not move either way — it's gated by monetization/identity/observability, not by TamperGuard.

### Suggested path to launch (rough order)
1. Land the in-flight migration-14 work cleanly (fix the test) so the suite is green again — everything else is hard to validate on a red tree.
2. Fix P0 correctness bugs (1–4) + add the missing chain test.
3. Make the identity/entitlement decision, then build IAP + trial + paywall + Restore Purchases.
4. Add Sentry + an update channel; decide TamperGuard's final shape (gated/soft, with escape + telemetry).
5. Privacy/Support URLs, data-safety labels, remove orphan permission, confirm bundle ids.
6. P1 polish, then a real on-device QA pass on iOS + Android (phone smoke is still owed per the handoff).
