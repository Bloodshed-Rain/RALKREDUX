# Codex Handoff: RALB Codex Edition

Last updated: 2026-05-14

This file is the continuity note for future Codex sessions working from `C:\Users\MC\Desktop\RALB-Codex-Edition`, including sessions started from the user's phone.

## READ THIS FIRST — UI redesign incoming, audit complete

The user has dropped a high-fidelity redesign spec in `design_handoff_ralkredux/` at the repo root. Open `design_handoff_ralkredux/README.md` end-to-end before doing UI work; the JSX files under `design_handoff_ralkredux/prototype/` and `design_handoff_ralkredux/brand/` are annotated reference implementations to mine for tokens/primitives/SVG. The folder can be edited (the earlier "do not modify" wording was just to keep it from being deleted during the handoff) but it remains the spec of record.

Short version of the redesign:

- Concept: reframe the app as a **regulated document system** — every screen reads like a numbered government form ("FORM 27-A · REV 4 · EFF 2026.05"), with doc-bands top and bottom, hairline borders (no shadows), high density, mono numbers, and rotated Newsreader-italic stamps.
- Palette: "Tidewater" (the prototype's actual `tidewater` preset in `official.jsx:1257`, not the README's quoted hexes which match `orange` instead) — `#0e3a40` ink, `#e6ece8` paper, `#5cb3c4` teal accent (primary action), `#d4a514` amber yellow (warning only), `#2c7256` green, `#b03020` red, plus tinted soft variants and hairline rules at three opacities.
- Type: **Archivo** display (700–900) for titles/all-caps labels, **Inter** (400–700) for body, **IBM Plex Mono** (400–600) for form IDs / numbers / chips, **Newsreader italic** (500–700) for stamps. These are brand identity — do not substitute.
- Nav: 5-item bottom tab bar — Today · Records · **New** (center, raised, opens 3-step modal) · Gear · More.
- Screens listed in spec: Splash → Today (home) → Records list → New record (3-step modal) → Record detail → PPE/Gear → Audit export → Settings/Profile.

**Audit completed 2026-05-11.** Full document: `docs/redesign-audit.md`. Locked decisions after rope-access advisor pushback:

| # | Topic | Decision |
|---|---|---|
| D1 | Witness signing | **Removed from scope.** No `entry_type` enum, no multi-signature refactor, no hash-version bump. |
| D2 | `FILED` stamp | **Renamed to `SYNCED`.** Derives from `remote_signature_requests.status = 'completed'`. |
| D3 | Amended-original stamp | **Keep `AMENDED`.** Matches existing `entry.status`. |
| D4 | `VERIFIED` auto-stamp | **Renamed to `CHAIN OK`.** `VERIFIED` reserved for future human verification. |

Resulting stamp set: `DRAFT · PENDING · CHAIN OK · AMENDED · SYNCED · EXPIRED (gear/certs only)`.

## Where the user paused

Audit complete, decisions locked, **Phase A complete (Clusters 1–4 implemented and validated)** — TypeScript clean, Jest 75 tests across 11 suites all pass. Ready for Phase B (UI rebuild) on user go-ahead.

Phase A scope (full detail in `docs/redesign-audit.md` §3):

- [x] Expose `useChainHead()` hook (and `getLatestChainHash` / `getLatestRemoteRequestForEntry` on the logbook service).
- [x] Add `src/domain/logbook/entry-stamps.ts` — pure `deriveEntryStamps(...)` helper. Stamp set: `DRAFT | PENDING | CHAIN_OK | AMENDED | SYNCED`.
- [x] Add `useEntryCloudState(entryId)` hook → `'local' | 'queued' | 'synced'`.
- [x] Add `verifyChainHashFor(entry, signature)` pure helper in `entry-hash.ts` for `CHAIN OK` derivation; detects entry-hash and chain-hash tampering when `hash_version` matches the running app.
- [x] Font load: Archivo 700/800/900, IBM Plex Mono 400/500/600, Newsreader italic 500/700, Inter 700 in `AppProviders`.
- [x] Theme overhaul: Tidewater palette + `tidewater` / `hairlines` / `docBand` / `stamp` token groups + display/mono/italic/formNumber typography scales. Existing screens get an instant facelift via remapped `colors` keys.
- [x] New primitives: `DocBand`, `FormCell`, `Stamp`, `Chip`, `RowDoc`, `SectionH` (all in `src/ui/primitives/`, exported from `index.ts`).
- [x] 5-tab nav restructure: `Today / Records / New (raised center) / Gear / More`. `dashboard.tsx` → `today.tsx`, `profile.tsx` → `more.tsx`, `new.tsx` is a `Redirect` placeholder (tab-bar override pushes to `/entry/new` directly). Bar labels are mono-uppercase; raised center is a 56px circle filled with `colors.accentPrimary` (teal after the `9c3f4b3` palette swap) with a `Plus` icon and a single ink-tinted shadow (the spec's one allowed exception to "hairlines, not shadows").

Phase A consumers that still need a Phase B pass: screen bodies (today/records/gear/more) still use the legacy Inter typography scales — they now render in Tidewater colors thanks to the remapped `colors` keys, but the doc-band chrome, form-cell layout, and stamp surfaces only land when each screen is rebuilt in Phase B.

Phase B (UI rebuild — Splash / Today / Records / 3-step New modal / Record detail / Gear / More) is a separate proposal once Phase A is green.

New tests landing in this cluster:
- `__tests__/domain/entry-stamps.test.ts` — 10 cases covering every stamp combination + defensive paths.
- `__tests__/domain/entry-hash.test.ts` — 6 cases for `verifyChainHashFor` including hash-version mismatch, entry-hash tampering, chain-hash tampering, and chained sigs with `previous_chain_hash`.
- `__tests__/domain/logbook-service.test.ts` (extended) — 3 cases for `getLatestChainHash` + `getLatestRemoteRequestForEntry`.

Suggested commit message:

```
Expose chain head, derived stamps, cloud-state hook

Phase A Cluster 1 of the redesign back-end shore-up:
- Expose getLatestChainHash and getLatestRemoteRequestForEntry on the
  logbook service; add useChainHead and useEntryCloudState hooks.
- New entry-stamps.ts derives the stamp set (DRAFT / PENDING / CHAIN_OK /
  AMENDED / SYNCED) from entry + signature + remote-request + chain
  validity.
- New verifyChainHashFor helper in entry-hash.ts recomputes a signature's
  chain hash and detects tampering when hash_version matches the app.
- Sign + remote-request mutations invalidate chainHead and
  entryCloudState query keys.

No schema changes, no ENTRY_HASH_VERSION bump.
```

## Backend wiring audit — 2026-05-14

Full pass over the backend piping to confirm nothing is halfway finished. Validation gates all green: `tsc --noEmit` clean, Jest **127 tests / 14 suites** pass, `npm run functions:check` clean on all three Edge Functions.

**Hosted remote-signing — fully wired, no dead ends.** All three Edge Functions have live callers:

- `remote-signing-request` ← `syncHostedRemoteSigningRequest` (entry detail Share) + `fetchHostedRemoteSigningRequest` (verifier portal).
- `remote-signing-complete` ← `completeHostedRemoteSignatureRequest` (verifier submit) + the auto-sync hook.
- `remote-signing-cancel` ← `cancelHostedRemoteSigningRequest`. Two-stage cancel confirmed: local SQLite cancel runs first and always succeeds, hosted push is best-effort with graceful error UI.
- All six exports in `src/cloud/supabase/remote-signing.ts` are consumed. Graceful degradation when `EXPO_PUBLIC_SUPABASE_*` is unset (`isSupabaseConfigured()` gate → local-only verifier link, no crash). `useAutoSyncHostedRemoteSignature` is wired into `app/entry/[id].tsx` and properly gated.

**Local domain layer — strict layering intact.** All four features (logbook, gear, profile, backup) connect screens → hooks → services → `DbClient`. 33 of 34 hooks are consumed by screens; all seven pure modules (`entry-stamps`, `entry-readiness`, `entry-hash`, `today-derivations`, `records-derivations`, `remote-signing-status`, `export`) are consumed. Every mutation invalidates the correct query keys (sign / amend / complete / cancel chains verified). The 8 migrations match `__tests__/db/migrations.test.ts`.

**Loose thread closed — `useCreateEntryTemplate` is now wired.** The hook had zero consumers; `app/entry/new.tsx` Step 3 now has a collapsed `SaveTemplateRow` affordance below `SAVE AS DRAFT`. It expands to a name input + `SAVE TEMPLATE` button, gates on the activity shape being complete (`templateMissing` — task / access / structure / notes / hours), calls `useCreateEntryTemplate` via `handleSaveTemplate`, and shows a `✓ TEMPLATE SAVED` confirmation. `busy` union extended with `'template'`. The saved template flows straight back into the Step 1 template picker (`useEntryTemplates` → `applyTemplate`). Nothing else in the codebase is half-finished. TypeScript clean, 127 tests pass.

## Most recent landings on `main`

- `9e835c0` Rebuild new-entry screen as a 3-step Tidewater wizard — Phase B step 4. Replaces `app/entry/new.tsx` with a wizard: Step 1 job particulars (date range, employer, site, client, work task + presets, access method + presets, structure, height + ft/m segmented unit), Step 2 activity (Archivo-900 hours stepper with ± controls and the yellow→accent decimal flag, work-performed textarea, SPRAT/IRATA cert-level segmented chips pre-filled from profile), Step 3 verify-and-submit (record summary card, supervisor picker single-select from `useSupervisorContacts`, missing-fields advisory or lock confirmation, and three terminal actions: Sign now / Request remote signature / Save as draft). Auto-saves the draft to SQLite on Step 1→2 transition once `date + (employer OR site)` is filled (UX agent's "field reliability over UX purity" call); subsequent transitions update the existing draft. Cancel from Step 1 with typed content shows a Discard/Keep-editing confirm; from later steps it just steps back. Closes the existing entry-creation flow's three outcomes through the new chrome — `/entry/[id]/sign` and `/entry/[id]/request-signature` are still where the actual signing happens. Witness signing remains out of scope (D1).
- `9c3f4b3` Switch to the prototype's actual Tidewater palette — Cluster 2 had matched the README's documented hex codes, which turn out not to match the prototype's actual `tidewater` preset in `official.jsx:1257` (the README values are closer to the `orange` preset). Real Tidewater is teal-based: `ink #0e3a40 / paper #e6ece8 / accent #5cb3c4 / yellow #d4a514 / red #b03020 / green #2c7256`. Added `tidewater.accent` + `accentSoft` and remapped `colors.accentPrimary / accentPressed / accentTint / navBarActive / certL1` onto the teal accent (was yellow). Yellow now reads as warning-only, not primary-action. Today + Records picked up the new accent where they were calling `tidewater.yellow` for action moments.
- `f025f13` Rebuild Records screen as a ranged ledger — Phase B step 3. Range chip strip (`7D / 30D / 90D / YTD / ALL`), KPI row (`HR SHOWN` + `DAYS ON ROPE`) with the spec's `+ ADD` button, doc-style table with hairline rows and 3-letter status code (`OK / PEN / DRF / AMD`) in tone-coded mono, JSON + CSV export remain in the footer, empty states discriminate "no entries on file" vs "no entries in range". New pure module `src/domain/logbook/records-derivations.ts` (range filtering + KPIs + status mapping) with 12 unit tests.
- `6755450` Rebuild Today screen on Tidewater foundation — Phase B step 2. Doc-band top (rolling `DAY n / 365`), Archivo-900 hours hero with yellow `.5` decimal, dual SPRAT/IRATA cert dials with progress bar, advisory card derived from gear + cert state (P1 red overdue-gear/expired-cert = not dismissible; P2 due-soon gear with HOLD TO ACK 1.2 s long-press; P3/P4 cert expiry), 3-rung action ladder with ghost rungs when sparse, signed-today banner with rotated Newsreader stamp, doc-band footer with chain head. Pull-to-refresh + focus-invalidation wired. New pure module `src/domain/logbook/today-derivations.ts` + 30 unit tests.
- `de56c74` Restructure tabs to 5-slot nav with raised center — 5-tab nav (Today / Records / New raised-center / Gear / More); `AppTabBar` renders the new-tab as a yellow circle with ink shadow; tap pushes directly to `/entry/new`. `dashboard.tsx` → `today.tsx`, `profile.tsx` → `more.tsx`. Mono-uppercase labels via IBM Plex Mono 500.
- `2f6dc2d` Add Tidewater document primitives — six new primitives (`DocBand`, `FormCell`, `Stamp`, `Chip`, `RowDoc`, `SectionH`) under `src/ui/primitives/`, all token-driven, no inline hex. Used by Phase B screens.
- `8139ce3` Load Tidewater fonts and apply token foundation — Archivo 700/800/900, IBM Plex Mono 400/500/600, Newsreader italic 500/700, Inter 700 loaded in `AppProviders`; `tokens.ts` swapped to Tidewater + new `tidewater` / `hairlines` / `docBand` / `stamp` token groups + display/mono/italic/formNumber typography. Existing screens get an instant facelift via remapped `colors` keys.
- `d4680e2` Expose chain head, derived stamps, cloud-state hook — public `useChainHead()` + `useEntryCloudState()`, pure `deriveEntryStamps` helper in `entry-stamps.ts`, pure `verifyChainHashFor` in `entry-hash.ts`. Sign + remote-request mutations invalidate `chainHead` and `entryCloudState`. No schema changes, no `ENTRY_HASH_VERSION` bump.
- `0de3b33` Polish local sign screen and signature pad — pad height bumped to 240, taken out of its Card so it spans full Screen content width, in-pad "Sign here" baseline hint, proper bordered Clear button (icon + label) only shown once a stroke starts, Keyboard.dismiss on touch-down, `keyboardDismissMode="on-drag"` so scrolling kills the keyboard early. Sign screen dropped `presentation: 'modal'` from `app/_layout.tsx` so the iOS swipe-down-to-dismiss can no longer fight the signature input. Signature and attestation collapsed into one "Signature & attestation" section with a single Ready pill that lights up green only when both are done.
- `b16e28e` Document stale-request verifier UX in handoff log.
- `a6071b1` Surface why a remote signing request is closed — new pure helper `src/domain/logbook/remote-signing-status.ts` classifies the closed reason as a discriminated union (`completed` / `expired` / `cancelled` / `pre_empted`), and `app/verify/[code].tsx` renders a tone-coded card hoisted to the top of the verify screen with signer/expiry detail. Submit footer hides when not actionable, and a Close button lets the verifier leave the page. Tests in `__tests__/domain/remote-signing-status.test.ts` cover all four closed reasons plus the actionable-null case. Visually verified on iPhone for the `completed` variant; `expired` / `cancelled` / `pre_empted` covered by tests only.
- `2465e6a` Document auto-sync and tunnel-aware verifier link.
- `5bcf4bf` Derive hosted verifier link at runtime — `buildHostedVerifierLink` now uses `Linking.createURL` so LAN-vs-tunnel switching no longer needs a `.env` edit. `EXPO_PUBLIC_REMOTE_SIGNING_ORIGIN` is only honored when it starts with `http(s)://`, reserved for a future hosted verifier web app.
- `39026e5` Auto-sync pending hosted remote signatures — `useAutoSyncHostedRemoteSignature` hook polls every 5 s via `useFocusEffect` while the open entry has a pending hosted request, stops on success/expiry/status-change/unfocus/3-failures. Manual `Sync` button stays as recovery affordance.

Earlier in this chat (prior to the auto-sync work):

- Replaced the app palette with `#222121`, `#398F30`, `#CACCC5`, and `#1D2B46`; committed and pushed `70d1f2e Apply RALB brand palette`.
- Continued the hosted remote-signing layer toward true two-device testing:
  - Added `@react-native-async-storage/async-storage` for persisted Supabase Auth sessions.
  - Updated `src/cloud/supabase/client.ts` to persist sessions and bootstrap an anonymous session with `signInAnonymously()` when hosted upload needs auth.
  - Added hosted completion mapping in `src/cloud/supabase/remote-signing.ts`.
  - Added `src/cloud/supabase/use-remote-signing-sync.ts` so the technician device can import a completed hosted signature into local SQLite.
  - Added a `Sync` action beside `Share` and `Preview` on pending remote requests in `app/entry/[id].tsx`.
  - Added `__tests__/cloud/remote-signing.test.ts` for hosted completion mapping.
- Linked this checkout to the Supabase project `zooxewiwaurbfmulkwia` (`Rope Access Logbook`).
- Applied `supabase/migrations/20260509085611_hosted_remote_signing.sql` to the linked Supabase database and marked migration history as applied.
- Deployed `remote-signing-request` and `remote-signing-complete` Edge Functions with gateway JWT verification disabled; both are active and use the function-body token/auth checks.
- Enabled anonymous sign-ins for the current preview auth bootstrap, while restoring the previous auth settings shown by the CLI diff.
- Created a local, gitignored `.env` with public Supabase client settings and `EXPO_PUBLIC_REMOTE_SIGNING_ORIGIN=exp://172.20.10.8:8081/--` for the current LAN Expo Go preview.
- Live hosted backend smoke passed: anonymous auth, hosted request create, token-gated read, completion, one-time replay rejection (`409`), and smoke-row cleanup.
- Validation after these code changes: TypeScript passed, Jest passed with 44 tests, `npm run functions:check` passed, and `expo config --type public` passed.
- Watch item: the first auth config push applied Supabase CLI defaults, then the important prior auth settings were restored. The CLI could not restore `external.apple.enabled = true` without a local Apple client id, so re-enable Apple auth in the dashboard if that provider was intentionally active.

Recent user-tested remote-signature fixes:

- iOS verifier sharing now works. The entry detail `Share` action passes the verifier link as the native iOS `url` payload instead of burying it inside message text.
- Verifier links remain token-gated. Opening a request code alone should show the secure-link-required state; opening the full shared link should authorize the remote verifier view.
- Native verifier links preserve the token; web verifier links remove the visible token from the URL only after request details load.
- Verifier screens reset local state when moving from one request code to another, so signing one request should not poison the next request.
- Signature drawing is much better on phone. The shared `Screen` wrapper now disables scrolling only while the signature pad is actively capturing a stroke, and otherwise lets the page scroll normally.
- Verifier pages can scroll, including down to the submit button and footer area.
- After a remote signature completes, the user returns to the entry detail for confirmation. Signed/amended entry detail footers now include a `Records` button so the user is not trapped with only `PDF`, `Packet`, and `Amend`.

Immediate next-chat smoke test:

1. Run `npm.cmd run start -- --tunnel` (LAN works too; tunnel survives bad Wi-Fi).
2. With the new tunnel-aware verifier link there is no longer a `.env` edit per session; just confirm both phones connect to the same Expo Go session.
3. On phone A (technician), create a fresh draft entry and remote request.
4. Tap `Share`; the hosted sync runs before the share sheet opens and the shared link uses the current dev origin.
5. Open the full verifier link on phone B (verifier) and submit the remote signature.
6. Back on phone A, watch the pending request flip to signed automatically within ~5 s without tapping `Sync` (manual `Sync` is still there as the fallback).
7. Confirm signature drawing does not drag the page and the verifier page still scrolls when not drawing.

## Project Intent

`RALB-Codex-Edition` is a clean rebuild of the user's existing Desktop `RALB` rope-access logbook app. The original app is an Expo / React Native product with local SQLite, signatures, PDF export, Supabase backup/restore, remote supervisor signing, RevenueCat, notifications, and gear tracking.

The rebuild should keep the serious domain goals, but with cleaner architecture:

- Local-first core before cloud complexity.
- Explicit SQLite migrations from the beginning.
- Immutable signed records.
- Amendment records instead of editing signed entries.
- SPRAT/IRATA readiness treated as a first-class product requirement.
- Shared Expo app targeting iOS and Android, with web preview kept working for fast development.

Important caveat: do not claim this app is officially accepted by SPRAT or IRATA unless written confirmation is obtained from the relevant organization. The app can be built toward audit-ready logging, but official acceptance is a separate workstream.

## Current Folder State

The rebuild folder is:

`C:\Users\MC\Desktop\RALB-Codex-Edition`

This folder is currently a git repository on `main`. Use normal status/diff checks, but keep unrelated local changes intact.

Key docs:

- `README.md`: concise project summary and commands.
- `docs/current-ralb-audit.md`: audit of the original Desktop `RALB` folder.
- `docs/rebuild-blueprint.md`: architecture direction for the rebuild.
- `docs/sprat-irata-compliance-roadmap.md`: SPRAT/IRATA acceptance roadmap and disclaimers.
- `docs/hosted-remote-signing.md`: Supabase-hosted verifier link contract and app integration checklist.
- `docs/CODEX_HANDOFF.md`: this file.

## Implemented Features

The first local-first slice is live:

- Local profile setup.
- Tabbed dashboard.
- Draft logbook entry creation.
- Entry list and detail screens.
- Scheme-oriented entry fields:
  - employer
  - site/location
  - client
  - work task
  - access method
  - structure type
  - rope-access hours
  - maximum height
  - height unit
  - work description
  - SPRAT/IRATA level snapshots
- Local supervisor signing:
  - supervisor name
  - supervisor certification number
  - drawn touch signature
  - attestation checkbox beneath the signature
  - canonical entry hash
  - immutable signed entry state
- Remote signature request foundation:
  - request creation from a draft entry
  - verifier name/contact
  - verifier role/company
  - pending request code
  - requested entry hash and hash version
  - pending request display on entry detail
  - verifier signing route at `app/verify/[code].tsx`
  - remote completion transaction writes a `remote` signature, completes the request, and locks the entry
  - local signing cancels pending remote requests
  - requests now store an expiry, token hash, token hint, and completion timestamp fields for the secure-link path
  - shared verifier links now include a signing token, verifier detail loading requires the token, request views stamp `viewed_at`, and remote completion validates the token before signing
- Audit export:
  - JSON bundle from the Records tab
  - CSV export from the Records tab
  - single-entry JSON audit packet from signed/amended entry detail
  - single-entry PDF export from signed/amended entry detail using the same packet data
  - profile context
  - signed and amended entries by default
  - signatures, entry hashes, hash-chain fields, gear usage, evidence attachments, supervisor contacts, and summary totals
- Backup/restore:
  - `src/domain/backup/*` creates local recovery snapshots
  - snapshots include profile, entries, signatures, remote requests, supervisors, gear, inspections, entry gear usage, attachments, and templates
  - Profile tab can share a snapshot and restore from pasted snapshot JSON
- Amendments:
  - signed entries remain locked
  - replacement amendment drafts can be created
  - signing an amendment marks the original as amended
- Gear inventory:
  - bundled 767-row rope-access gear catalog seeded from `src/db/seeds/gear-catalog.json`
  - make/model autocomplete filtered by gear type in the Gear tab
  - catalog matches are convenience only; free-form gear entry still works
  - add local gear items with category, serial number, and next inspection due date
  - due status calculation for current, due soon, overdue, unscheduled, and retired gear
  - log pass, pass-with-concerns, and fail inspections
  - failed gear is retired and blocked from later inspection updates
  - draft entries can attach active gear so signed records preserve equipment history
- Entry speed and evidence:
  - seeded smart entry templates for tower inspection, bridge maintenance, and rescue standby
  - user-created entry templates from the new-entry form
  - duplicate-last-entry action for fast repeated field logging
  - native photo picker evidence attachments on draft entries
- Supervisor mode:
  - local and remote signing save supervisor contacts
  - local signing and remote request forms can reuse known supervisors
- Dashboard totals:
  - total entries
  - draft entries
  - signed entries
  - amended entries
  - pending signatures
  - draft hours
  - signed hours
  - cert expiry readiness
  - overdue/due-soon gear counts
  - career stats and top work-task hour buckets
- UX cleanup:
  - Dashboard, Records, Gear, Profile, entry detail, new entry, remote verifier, setup, amendment, and remote-request screens have been reduced toward compact cards, chips, icons, and sticky primary actions.
  - First-run setup now supports explicit SPRAT/IRATA Level I/II/III selection instead of defaulting every profile to Level II.
  - Remote request creation now separates required verifier identity from optional role/company details.

## Important Product Decisions

- Local signing and remote signing should both exist.
- Android and iOS are both product targets.
- Web preview is for development and quick QA.
- Remote signing should eventually send a secure request link to a verifier so they can sign from their own phone/tablet/computer without needing to install the app.
- Remote signing should not merely be "someone clicked a link." It needs signer identity, request expiry, one-time token behavior, entry hash, timestamps, attestation, and eventually audit metadata.
- SPRAT/IRATA acceptance is very important to the user, but the product must stay honest until written approval is obtained.
- The hosted remote-signature layer now has Supabase schema, Edge Function contracts, app upload/read/complete wiring, anonymous-session bootstrap, and a manual technician sync-back action. Live project deployment and automatic polling/realtime sync are still pending.

## Key Source Map

Routes:

- `app/index.tsx`: redirects to setup or dashboard.
- `app/(onboarding)/setup.tsx`: compact local profile setup with scheme/level chips.
- `app/(tabs)/dashboard.tsx`: dashboard and summary.
- `app/(tabs)/records.tsx`: entry list and JSON audit export.
- `app/(tabs)/gear.tsx`: gear inventory, inspection logging, and due-status list.
- `app/(tabs)/profile.tsx`: profile display plus backup/restore snapshot actions.
- `app/entry/new.tsx`: draft entry form, templates, duplicate-last-entry action.
- `app/entry/[id].tsx`: entry detail, gear usage, evidence, signature state, remote request state.
- `app/entry/[id]/sign.tsx`: local touch-signature flow with known-supervisor reuse.
- `app/entry/[id]/request-signature.tsx`: compact remote request form with readiness summary, known-supervisor reuse, and optional verifier details.
- `app/entry/[id]/amend.tsx`: amendment draft form with grouped work/method/time sections and missing-field summary.
- `app/verify/[code].tsx`: verifier-facing remote signature completion route.

Domain:

- `src/domain/logbook/types.ts`: logbook entry, signature, request, dashboard types.
- `src/domain/logbook/logbook-service.ts`: local SQLite-backed logbook operations.
- `src/domain/logbook/use-logbook.ts`: React Query hooks.
- `src/domain/logbook/export.ts`: JSON packet, CSV, PDF HTML, and export filename builders.
- `src/domain/logbook/entry-hash.ts`: canonical entry hashing.
- `src/domain/logbook/entry-readiness.ts`: required-field gate before verification.
- `src/domain/backup/*`: local recovery snapshot create/restore.
- `src/domain/profile/*`: profile model/service/hooks.
- `src/domain/gear/*`: gear inventory model/service/hooks.

Data:

- `src/db/migrations.ts`: migration ledger and schema.
- `src/db/client.ts`: DB client interface.
- `src/db/initialize.ts`: runtime DB init.

UI:

- `src/ui/primitives/*`: button, card, field, screen, checkbox, signature pad, stat row.
- `src/ui/theme/*`: tokens and theme provider.

Tests:

- `__tests__/db/migrations.test.ts`
- `__tests__/domain/logbook-export.test.ts`
- `__tests__/domain/logbook-service.test.ts`
- `__tests__/domain/gear-service.test.ts`
- `__tests__/domain/backup-service.test.ts`
- `__tests__/domain/cert-number.test.ts`
- `__tests__/domain/date-format.test.ts`
- `__tests__/domain/remote-signing-status.test.ts`
- `__tests__/cloud/remote-signing.test.ts`

## Current Schema Notes

Current migrations:

1. `core-local-logbook`
2. `gear-and-cloud-placeholders`
3. `signature-trust-state`
4. `drawn-signatures-and-attestation`
5. `remote-signature-requests`
6. `scheme-work-log-fields`
7. `gear-catalog`
8. `field-ops-foundation`

The entry hash version is currently `2` in `src/domain/logbook/entry-hash.ts`. Version 2 includes the scheme-oriented work-log fields, max height, and height unit. If export fixtures are added, lock expectations around this version.

## Validation Status

Last known good checks:

```bash
.\node_modules\.bin\tsc.cmd --noEmit
.\node_modules\.bin\jest.cmd --runInBand
npm run functions:check
```

Result: TypeScript passed, Jest passed with **117 tests across 13 suites**, `functions:check` passed.

Latest code-validation commits cover all of Phase A and Phase B steps 2–3:

- `d4680e2` Expose chain head, derived stamps, cloud-state hook (Phase A Cluster 1)
- `8139ce3` Load Tidewater fonts and apply token foundation (Phase A Cluster 2)
- `2f6dc2d` Add Tidewater document primitives (Phase A Cluster 3)
- `de56c74` Restructure tabs to 5-slot nav with raised center (Phase A Cluster 4)
- `6755450` Rebuild Today screen on Tidewater foundation (Phase B step 2)
- `f025f13` Rebuild Records screen as a ranged ledger (Phase B step 3)

**Phone smoke is still owed.** Two redesign screens have landed (Today + Records) without on-device validation. Before step 4 (3-step New modal) ships, open `npm run start -- --tunnel` and walk: Today (advisory, ladder, cert dials, doc-band footer) → Records (range chips swap counts, tap row → entry detail, ADD → /entry/new, JSON/CSV exports share) → 5-tab nav. Anything that doesn't render correctly here will be cheaper to fix now than after the New modal lands.

Last phone preview target:

Expo `--tunnel` (URL changes per session; `Linking.createURL` keeps the verifier link in sync automatically).

Last smoke flow passed:

1. Create profile.
2. Create entry with required scheme-oriented fields.
3. Confirm Save is disabled until required height is filled.
4. Confirm entry detail renders work classification fields.
5. Create remote signature request.
6. Confirm pending request status, verifier, request code, requested hash.
7. Open the full shared verifier link, not just the request code.
8. Complete a remote signature from the verifier route.
9. Confirm signing returns to entry detail and the footer includes a `Records` exit.
10. Confirm no unmatched route and no console/page errors.

To restart the phone preview:

```bash
npm.cmd run start -- --host lan
```

## Recommended Next Step

Phase A is complete (closing scorecard in `docs/redesign-audit.md` §3). Phase B is the UI rebuild on top of the new foundation — see `docs/redesign-audit.md` §4 for the screen-by-screen data-source list.

Suggested approach for Phase B (separate commits per screen, matching the project cadence):

1. **Phone preview smoke** — `npm run start -- --tunnel`. **Owed: confirm fonts + palette + nav + new Today screen on iOS and Android before shipping step 3.**
2. **[x] Today** (`app/(tabs)/today.tsx`) — done in `6755450`. UX-locked decisions baked in: rolling `DAY n / 365` from profile creation; P1 advisories (overdue gear / expired cert) are not dismissible; P2+ require HOLD TO ACK (1.2 s long-press, in-memory acknowledge); ladder caps at 3 rungs with `+N more` tail; primary CTA is the tab bar `+` only (no duplicate Today CTA). Open follow-ups: (a) persist advisory acknowledge across launches (currently in-memory); (b) re-surface acknowledged advisories after 24 h or on new-advisory-of-same-kind state change.
3. **[x] Records** (`app/(tabs)/records.tsx`) — done in `f025f13`. Range chip strip persists range state to component memory (no AsyncStorage yet — resets on launch). KPIs are hours-in-range + distinct op-days. Table rows derive status via `getEntryListStatus`: `SIGNED` (entry.status='signed'), `AMENDED` (entry.status='amended'), `PENDING` (draft + pending_signature_id), `DRAFT` (vanilla draft). Tone-coded 3-letter chip in last column. Export footer keeps JSON/CSV (full-logbook PDF still owed; per-entry PDF stays on detail). Open follow-ups: persist last range across launches, full-logbook PDF export.
4. **[x] 3-step New modal** — done in `9e835c0`. Wizard scope shipped is **phase 1**: existing field set rewired into 3 steps with auto-save on Step 1→2 transition. Step 2's gear-chip toggle + photo attachments are deferred to phase 2 (currently still captured on entry detail post-creation). Terminal actions kick to `/entry/[id]/sign` and `/entry/[id]/request-signature` rather than subsuming them (preserves the existing signature pad + attestation flow). Open follow-ups: (a) Step 2 gear chips reading from `useGearItems()` filtered to non-retired; (b) Step 2 photo attach via `useAddEntryAttachment`; (c) pass `selectedSupervisorId` forward to `/sign` and `/request-signature` so the picker pre-fills; (d) Settings preference for default terminal action; ~~(e) "save current as template" affordance from Step 3~~ — **done 2026-05-14, `SaveTemplateRow` in Step 3**.
5. **Record detail** (`app/entry/[id].tsx`) — full doc-style view with `DocBand` chrome, `FormCell` rows, `Stamp` overlay set from `deriveEntryStamps()`, chain-hash footer.
6. **Gear** (`app/(tabs)/gear.tsx`) — `useGearItems` + `useGearSummary` + `useRecordGearInspection`. `RowDoc` list with due-offset chip + tone-coded `Stamp` for `OVR` / `SOON` items.
7. **More** (`app/(tabs)/more.tsx`) — operator card, counter-signing officer roster, backup/restore, export buttons, settings sheet (sections A.1–A.5 per `prototype.jsx`).
8. **PDF audit-export cover** — extend `src/domain/logbook/export.ts` with watermark seal + security-weave cover page. **Spec chrome (`FORM 27-A · REV 4 · EFF 2026.05`) is brand decoration only — it must not leak into the auditor-facing PDF.** See `docs/redesign-audit.md` §5 risk note.

Earlier roadmap items not yet redesign-blocked:

- Cloud backup storage and conflict resolution on top of the local snapshot format.
- Visual export preview and full-logbook PDF if reviewer feedback calls for it.
- Native iOS/Android QA builds.

## User Testing Help Needed

Ask the user to test field realism:

- Are "work task," "access method," "structure type," and "maximum height" the right labels?
- Should "site" be "location" or should both exist?
- Should "client" be required in every real logbook entry?
- Are access methods better as free text or a picker?
- Does the touch signature feel usable on a phone?
- Does the attestation wording sound correct for a supervisor?
- Does the remote request detail show enough for a verifier to trust what they are signing?

## Design/Implementation Preferences

- Keep using Expo Router.
- Routes belong only in `app/`; reusable components and utilities belong under `src/`.
- Keep forms practical and work-focused, not marketing-like.
- Keep signed records immutable.
- Add service tests and migration tests with each domain/schema change.
- Use local-first SQLite APIs before adding cloud behavior.
- Keep web working as a development target, but do not design around web at the expense of iOS/Android.
- Be careful with official acceptance language around SPRAT/IRATA.
