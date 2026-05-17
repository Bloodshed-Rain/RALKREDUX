# Codex Handoff: RALB Codex Edition

Last updated: 2026-05-17

This file is the continuity note for future Codex sessions working from `C:\Users\MC\Desktop\RALB-Codex-Edition`, including sessions started from the user's phone.

## READ THIS FIRST — v2 redesign supersedes the paper-form identity (2026-05-17)

A second high-fidelity redesign has dropped in `design_handoff_ralkredux_v2/` at the repo root. It is a **full reset away from the regulated paper-form identity** documented further down this file. Read `design_handoff_ralkredux_v2/README.md` end-to-end before doing UI work. The earlier paper-form motifs (doc-bands, FORM nn-X · REV n · EFF YYYY.MM, weave + watermark seal, rotated Newsreader-italic stamps) are **out** of the new direction.

Key shifts in v2:

- **Six interchangeable palettes** (Tungsten · Mariner · Verdigris · Heliotype · Sandstone · Mercury) replacing the single Tidewater preset. Switched live from Profile → Appearance.
- **`useTheme()` return shape** is now `{ theme, tokens, setTheme, ...legacyCompat }`. New primitives consume `useTheme().tokens` (semantic keys: `bg`, `surface`, `text`, `accent`, `ok`, `warn`, `danger`, ...). Legacy primitives keep destructuring `{ colors, tidewater, docBand, stamp, ... }` — those compat fields are derived from the active theme's tokens in `src/ui/theme/compat.ts` and die when their last consumer ships.
- **Typography target:** Manrope (display/body) + JetBrains Mono (numbers/hashes/kickers) + Newsreader italic (signature scrawl only). Inter / Archivo / IBM Plex Mono stay loaded during the migration; dropped in the final-sweep task.
- **38 bespoke duotone icons** to port to `react-native-svg`.
- **Six interchangeable palettes** mean status bar must adapt — provider already binds `expo-status-bar` style to `theme.mode`.
- **Compliance copy guardrail unchanged.** Still no "SPRAT-accepted" / "IRATA-accepted" anywhere.

### v2 implementation log

15-step program tracked in this session's task list (1–15). Progress:

- **Step 1 — Theme system + 6 palettes + provider + persistence.** Shipped 2026-05-17. New files: `src/ui/theme/themes.ts` (6 palettes verbatim from handoff + `Theme`/`ThemeTokens`/`ThemeKey` types + `THEMES` / `THEME_ORDER` / `DEFAULT_THEME_KEY` = `'tungsten'`), `src/ui/theme/compat.ts` (one-way legacy derivations). Rewrites: `src/ui/theme/tokens.ts` (now a thin compat shim over `compat.ts` for the default theme, no behavioural change for existing imports), `src/ui/theme/theme-provider.tsx` (state + `AsyncStorage` hydration on key `ralb:pref:theme-key` + reactive value, status bar binding). Static-import migration: `app/_layout.tsx`, `app/index.tsx`, `app/(tabs)/_layout.tsx` now consume `useTheme()` so they react to theme switches. Typecheck clean. Jest 136 tests in 15 suites all pass.

  **Caveat:** Heliotype's 1.5px borders + 2px primary-button drop shadow are *primitive-level* per the handoff (line 122) — they get applied inside each rewritten primitive via `theme.key === 'heliotype'` branches in steps 4–6. They are deliberately not encoded into `ThemeTokens` (would bloat the shape for a single-theme treatment).

  **Hard-gate verification owed.** The user picked the hard gate ("every theme must look acceptable on every existing screen"). Visual check across all 6 palettes is owed once a theme switcher exists. Practical path: defer the visual sweep until step 7 (Profile → Appearance) lands a picker on-device; until then nothing in the app can switch off Tungsten anyway.

- **Step 3 — Manrope + JetBrains Mono + Newsreader fonts.** Shipped 2026-05-17 (commit `065a697`). Added `@expo-google-fonts/manrope` + `@expo-google-fonts/jetbrains-mono` to `package.json`. `src/providers/app-providers.tsx` now loads Manrope 400/500/600/700/800, JetBrains Mono 400/500/600/700, and Newsreader 600 italic alongside the legacy Inter/Archivo/IBM Plex Mono/Newsreader 500+700 families (legacy families stay loaded until paper-form primitives die in step 15). New typography scale at `src/ui/theme/type.ts` — `type.heroNumber / screenTitle / heroCardTitle / sectionTitle / cardTitle / cardSub / body / buttonLabel / monoKicker / monoKickerLg / monoSm / mono / monoMd / monoLg / detailStat / signatureScrawl`. Letter-spacing values converted from CSS em → RN points. Typecheck clean.

- **Step 2 — Port 38 duotone icons to react-native-svg.** Shipped 2026-05-17. New file `src/ui/icons/index.tsx` exports 40 icon components (handoff README under-counted; the icons.jsx source has 40). Each icon: shared `Icon` internal wrapper renders a 24×24 viewBox with an optional duotone fill `<G>` at 28% opacity over an ink shape `<G>`. Defaults resolve via `useTheme().tokens` (`color = tokens.text`, `fill = tokens.accent`); both overridable per-instance via `color` / `fill` / `fillOpacity` props. `GEAR_ICON: Record<GearCategory, IconComponent>` map covers all 10 categories with the handoff's fallbacks (ascender→carabiner, lanyard/sling→rope, pulley→descender, other→carabiner). Typecheck clean.

- **Steps 4, 5, 6 — v2 primitives.** Shipped 2026-05-17. New folder `src/ui/primitives/v2/` houses every primitive the redesigned screens consume; v1 primitives in `src/ui/primitives/*.tsx` stay around until each redesigned screen drops its last legacy import (step 15 sweep). Don't mix v1 and v2 primitives in a single screen.

  Inventory:
  - **Button** (`v2/button.tsx`) — `variant: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'`, `size: 'sm' | 'md' | 'lg'`, leading + trailing icon, `full` width, disabled. Heliotype branch adds a 2 px hard ink drop shadow on `primary`.
  - **IconBtn** (`v2/icon-btn.tsx`) — 28/36/44 px boxes, tone presets, press scales to 0.94.
  - **Card** (`v2/card.tsx`) — `padding` (default 16), `interactive` opt-in for press scale, Heliotype branch bumps border to 1.5 px on `tokens.line` (instead of the 1 px `tokens.lineSoft` everywhere else).
  - **Pill** + **StatusPill** (`v2/pill.tsx`) — `tone: 'chip' | 'accent' | 'ok' | 'warn' | 'danger'`, `size: 'sm' | 'md'`. Heliotype gets an inset 1.5 px currentColor border. `StatusPill` maps the entry-status enum (`draft/signed/amended/pending/void`) onto Pill + icon.
  - **Field** (`v2/field.tsx`) — label kicker + bordered row + helper. Focus state swaps border to 1.5 px accent. Heliotype keeps the heavier 1.5 px line at rest.
  - **ChipSelect** (`v2/chip-select.tsx`) — segmented chip row with `count` badges; generic over the option-value string type.
  - **SectionH** (`v2/section-h.tsx`) — `kicker` + `title` + `action` slot, mono kicker.
  - **TopBar** (`v2/top-bar.tsx`) — compact + large variants; large hides the centered title and renders a 32 px Manrope 800 hero title + subtitle.
  - **TabBar** (`v2/tab-bar.tsx`) — 5-slot bar (Today / Records / [center "+"] / Gear / Profile); raised 60 px disk with accent-ring shadow; Heliotype switches to a hard ink-block shadow. Standalone primitive — Expo Router integration lands when screen redesigns start.
  - **SyncChip** (`v2/sync-chip.tsx`) — `'synced' | 'syncing' | 'queued' | 'offline'`. Syncing state spins the icon via `Animated.loop` (1.6 s linear).
  - **Sheet** (`v2/sheet.tsx`) — `Modal` + `Animated`-driven bottom sheet, 92% height by default, 280 ms cubic-bezier(.2,.7,.3,1.1) slide-up + 200 ms scrim fade.
  - **AnimatedNumber** (`v2/animated-number.tsx`) — RAF-driven cubic-out interpolation (900 ms default), tabular-nums. Respects `useReducedMotion()` → snaps to final value.
  - **HashGlyph** (`v2/hash-glyph.tsx`) — deterministic 8-bar visualization keyed by hex chars 0–7. Bars at index 0/3/6 paint accent; rest paint textDim. Height + opacity derive from char value.
  - **EmptyState** (`v2/empty-state.tsx`) — 88 px tinted plate with concentric SVG rings (dashed outer at r=40, solid inner at r=30) + icon + title + sub + optional action.
  - **PullToRefresh** (`v2/pull-to-refresh.tsx`) — bespoke chain-icon-in-ring indicator, 72 px threshold, 3-stage label ("Pull to refresh" → "Release to sync" → "Syncing chain…"). Built on `PanResponder` + `Animated` (no reanimated/gesture-handler dependency — those are explicit non-installs; if motion polish is needed, swap in step 15). Supports both internal cycle (`onRefresh` returns a promise) and externally-driven `refreshing` prop.

  Heliotype primitive branches live in their respective files via `theme.key === 'heliotype'` checks; nothing is encoded into `ThemeTokens`. Typecheck clean. Jest 136/136 still green.

- **Step 8 — Today screen redesign.** Shipped 2026-05-17. `app/(tabs)/today.tsx` rewritten end-to-end against v2 primitives. New layout, top to bottom:
  - Large `TopBar` with greeting (`Good morning|afternoon|evening, {firstName}.`), sub `${weekHours}h this week · ${career} career entries`, leading `IconBtn(IconBrand)`, trailing `SyncChip` (state derived from awaiting-signature count) + bell.
  - `CareerHero` `Card` — `CAREER HOURS` mono kicker + accent "Live" `Pill` with `IconBolt`, 56 px `AnimatedNumber` (cubic-out 900 ms) for total signed hours, 3-column mini-stats: This week / This month / Entries. New helper `signedHoursInLastDays(entries, today, days)` lives inline in the screen (kept off the domain layer to avoid a derivation + test surface change in this task).
  - `QuickLogCard` — accent-soft disk + `IconBolt`, "Duplicate · {last site}" header, three chips (Same as last / Request signature / Photo log). Wiring is placeholder — each chip pushes `/entry/new` or `/records` for now; full duplicate-last-entry intent lands when step 10's New-entry sheet rebuilds.
  - `ChainHeadCard` — accent-soft disk + `IconChain`, `CHAIN HEAD` kicker, `{first 8}…{last 4}` hash short + `HashGlyph`, "Last sealed · {date} · {site}" sublabel. Tap → routes to the most recent signed entry. Card is `interactive` only when a signed entry exists.
  - `ActionTileGrid` 2×2: Open drafts (warn), Awaiting signature (ok), Gear overdue (danger), Gear due soon (warn). Counts come from `useDashboardSummary()`; routes drop into `/records` or `/gear`. Empty tiles dim their icon plate to `surface2`.
  - `EntryRow` list (max 5 most recent). New primitive at `src/ui/primitives/v2/entry-row.tsx` — 44 px date column (large day number + mono uppercase month abbr) + site title + task/hours mono sub + `HashGlyph` + `StatusPill` + chevron. `rowStatus(entry)` derives `'draft' | 'signed' | 'amended' | 'pending'` (pending uses `pending_signature_id`).
  - Whole screen wrapped in `PullToRefresh`; pulling invalidates `entries / dashboardSummary / careerStats / chainHead / gearItems` query keys.

  Dropped from this iteration (lived on the old Today screen): cert-progression dials (SPRAT/IRATA % toward target), advisory ladder with hold-to-ack, today's-actions ladder, "signed today" stamp card, and the `DocBand` top/footer chrome. Those advisory + cert-progression ideas can come back as their own sub-views if needed; the v2 spec deliberately moved the home screen toward "what's on your plate" rather than "where you are on the cert ladder."

  Typecheck clean. Jest 136/136 still green. Visual hard-gate verification across all 6 palettes still owed — but with both Profile (step 7) and Today (step 8) on the new primitives, the palette switcher meaningfully exercises the new design surface now, not just the legacy compat layer.

- **Step 7 — Profile screen + theme picker.** Shipped 2026-05-17. `app/(tabs)/more.tsx` rewritten end-to-end against v2 primitives. Filename preserved per the earlier decision; tab label + icon swapped (`MoreHorizontal` → `User2` lucide icon, label "More" → "Profile") in `app/(tabs)/_layout.tsx`. Layout: large `TopBar` ("Profile" / "Your record · your certifications") → `OperatorCard` (58 px accent-tile initials + name + employer line + Active pill + 2-col SPRAT/IRATA `CertCard` row with `<120 d` expiry warn coloring) → Appearance section (2-col `ThemePicker` showing all 6 palettes with split swatch row + name + sub + active-tile accent ring + check icon) → Manage section (`SettingsRow` for Audit export, Sync & backup, Chain integrity, Security; Sync & backup expands inline to host the existing share/restore flow against the new visual language) → Preferences (default new-entry action `ChipSelect`, haptics on/off `ChipSelect`) → Support section (placeholder rows for Notifications, Attachments) → footer (brand mark + `RALB · v1.0 · chain {first 8}`). Live theme switching works on-device: tapping a tile calls `setTheme(key)` → `useTheme()` value updates → the whole app re-renders against the new palette + writes the new key through to AsyncStorage. Functionality preserved from the old screen: profile display, backup share/restore (now inline-expandable), terminal-action preference, haptics preference. Dropped from this iteration: linked-supervisors section (data still in the DB — surface on a dedicated sub-screen later if needed), the doc-band chrome + form-numbered sections (replaced by v2 Card + SectionH). Manage section rows for Audit export / Chain integrity / Security currently have no `onPress` — they're placeholders for sub-screens that land in later steps (Audit export in step 13). Typecheck clean. Jest 136/136 still green.

## SUPERSEDED — paper-form identity (2026-05-11 to 2026-05-14)

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

## Polish tail — 2026-05-14

Worked the redesign follow-up tail in isolated commits (tsc + jest green after each). The user ran the on-device single-device + two-device smoke and reported everything working; the haptics below landed after that and are **not** yet on-device validated.

- `19a79e2` **Haptics wired across the app** — `5fd2bb8` added `src/ui/haptics.ts` (best-effort wrapper over `expo-haptics`, cached enabled flag, never throws) + a HAPTIC FEEDBACK on/off toggle in More → Preferences (persisted via local-prefs, loaded in `AppProviders`). `19a79e2` applied it at the "key moments + selection" scope: selection ticks on tabs/chips/segmented controls, success on sign/request/completion/amendment/gear/backup/profile/ack/template, warning before destructive-confirm Alerts, error on failed mutations. Plain draft saves + keypad digits intentionally stay silent.
- `f9a569c` **Full-logbook PDF export** — `buildLogbookPdfHtml` + `buildLogbookExportFileName` in `export.ts` (weave + seal cover, one compact section per signed/amended record, hashes carried through). Records footer's "PDF (per entry, see detail)" placeholder is now a live PDF action via expo-print/expo-sharing.
- `34f9991` **Wizard Step 2 gear + evidence** — § 13 Gear toggle chips (`useAttachGearToEntry` / `useRemoveGearFromEntry`) and § 14 Evidence photo attach (`useAddEntryAttachment` + expo-image-picker), both writing through the draft committed on Step 1→2. Step 3 sections renumbered 13/14/15 → 15/16/17.
- `2d4cb3c` **Local UI preference persistence** — new `src/storage/` (`local-prefs.ts` AsyncStorage wrapper + pure `advisory-acks.ts` with 24h TTL). Today advisory acknowledgements persist with 24h TTL re-surface; Records range chip persists; More gained a Preferences section (§ 04) with a default new-record-action selector that Step 3 reads to order/emphasize its terminal actions.
- `c0f818a` **Save-as-template affordance** — `SaveTemplateRow` in wizard Step 3.

Deferred (intentionally, lower value than first scoped): advisory "re-emit on new-advisory-of-same-kind state change" — advisory IDs in `today-derivations.ts` are stable constants, not state-derived, so this would need explicit fingerprinting. The 24h TTL covers the important half, and only dismissible advisories (P2 gear-due-soon, cert warnings) can be acknowledged at all — P1 DO-NOT-DEPLOY advisories are non-dismissible upstream.

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
2. **[x] Today** (`app/(tabs)/today.tsx`) — done in `6755450`. UX-locked decisions baked in: rolling `DAY n / 365` from profile creation; P1 advisories (overdue gear / expired cert) are not dismissible; P2+ require HOLD TO ACK (1.2 s long-press, in-memory acknowledge); ladder caps at 3 rungs with `+N more` tail; primary CTA is the tab bar `+` only (no duplicate Today CTA). ~~Open follow-ups: (a) persist advisory acknowledge across launches; (b) re-surface acknowledged advisories after 24 h~~ — **done 2026-05-14 (`2d4cb3c`)**. The "new-advisory-of-same-kind" half of (b) is intentionally deferred (see Polish tail note).
3. **[x] Records** (`app/(tabs)/records.tsx`) — done in `f025f13`. Range chip strip persists range state to component memory (no AsyncStorage yet — resets on launch). KPIs are hours-in-range + distinct op-days. Table rows derive status via `getEntryListStatus`: `SIGNED` (entry.status='signed'), `AMENDED` (entry.status='amended'), `PENDING` (draft + pending_signature_id), `DRAFT` (vanilla draft). Tone-coded 3-letter chip in last column. Export footer keeps JSON/CSV (full-logbook PDF still owed; per-entry PDF stays on detail). ~~Open follow-ups: persist last range across launches, full-logbook PDF export.~~ — **both done 2026-05-14** (`2d4cb3c` range persistence, `f9a569c` full-logbook PDF).
4. **[x] 3-step New modal** — done in `9e835c0`. Wizard scope shipped is **phase 1**: existing field set rewired into 3 steps with auto-save on Step 1→2 transition. Step 2's gear-chip toggle + photo attachments are deferred to phase 2 (currently still captured on entry detail post-creation). Terminal actions kick to `/entry/[id]/sign` and `/entry/[id]/request-signature` rather than subsuming them (preserves the existing signature pad + attestation flow). Open follow-ups: ~~(a) Step 2 gear chips~~ — **done 2026-05-14 (`34f9991`)**; ~~(b) Step 2 photo attach~~ — **done 2026-05-14 (`34f9991`)**; ~~(c) pass `selectedSupervisorId` forward to `/sign` and `/request-signature`~~ — **already shipped** (the `withSupervisor()` helper + param-read in both screens was in place before the audit; doc was stale); ~~(d) Settings preference for default terminal action~~ — **done 2026-05-14 (`2d4cb3c`)**; ~~(e) "save current as template" affordance from Step 3~~ — **done 2026-05-14 (`c0f818a`, `SaveTemplateRow`)**. All New-modal phase-2 follow-ups now closed.
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
