# Codex Handoff: RALB Codex Edition

Last updated: 2026-06-05 (production-readiness backlog verified closed; road-to-1.0 handoff)

This file is the continuity note for future Codex sessions working from `C:\Users\MC\Desktop\RALB-Codex-Edition`, including sessions started from the user's phone.

## READ THIS FIRST — audit-integrity backlog is closed; see road-to-1.0, 2026-06-05

The `production-readiness-audit.md` backlog was re-verified item-by-item against current
`main` this session: **the entire P1 and P2 tier is implemented and (where jest-reachable)
tested**, except **P1-1** (signer identity outside the hash envelope), which is deliberately
left for a supervised session because it needs a coordinated **Edge Function redeploy**
(`ENTRY_HASH_VERSION` 5→6 lockstep). Most of P3 is done too. `production-readiness-audit.md`
is now a **stale snapshot** (banner added) — the authoritative "what's left and who can
unblock it" is **`docs/road-to-1.0.md`**.

What remains to 1.0 is mostly **not code**: P1-1 redeploy, auth credentials + a dev-client
build, on-device verification, store submission, and the SPRAT/IRATA acceptance workstream.
A short tail of low-risk P3 polish (P3-2 hours-label, P3-7/8/13/16, P3-1/4) is specced with
reasons in `road-to-1.0.md` for a future autonomous session.

Shipped this session on branch `production-hardening` (off `main` @ `feada72`, commit
`8d3d85e`): **P3-10** (attachments screen now surfaces read errors instead of showing an
empty state) and **P3-11** (`onError` alerts on the six previously-silent attach/detach
draft mutations). tsc + 244 jest green; UI-only, device-verification owed. Not yet merged.

## READ THIS FIRST — real auth replaces anonymous, hard gate, 2026-05-20

Google / Apple / email-OTP sign-in now **hard-gates** the app (`AuthGate` in `app/_layout.tsx`, between `AuthProvider` and `AppLock`). Anonymous Supabase auth is GONE.

- **Offline invariant:** only the first sign-in needs connectivity. `AuthProvider` (`src/providers/auth-provider.tsx`) resolves the persisted session; because Supabase `getSession()` returns `null` when it can't refresh an expired token offline, it falls back to a persisted `authedBefore` flag (`local-prefs`) so a known user stays in offline. Only a definitive `SIGNED_OUT` event (explicit sign-out / server-confirmed invalid token) clears it.
- **Unconfigured = no gate.** If `EXPO_PUBLIC_SUPABASE_*` is unset, `AuthGate` falls through to local-only (preserves dev / web preview / offline-first).
- **Native SDKs:** `expo-apple-authentication` + `@react-native-google-signin/google-signin` (v16). Requires an **EAS dev-client rebuild** — Expo Go won't work. Apple button is iOS-only.
- **Code map:** `src/cloud/supabase/auth.ts` (sign-in fns, Apple nonce, Google idToken, OTP), `src/cloud/supabase/client.ts` (anon removed), `src/providers/auth-provider.tsx` + `auth-gate.tsx`, `src/ui/auth/auth-screen.tsx`, `app/account.tsx` (sign-out), More tab → Account row.
- **Backend unchanged:** RLS + Edge Functions were already `authenticated`-scoped (`auth.uid() = owner_id`); real sessions satisfy them. Hosted remote-signing now runs as the real user.
- **OWED before it works:** Google Cloud OAuth client IDs, Apple Service ID/key, Supabase dashboard provider config, SMTP for OTP email, and the `EXPO_PUBLIC_GOOGLE_*` env vars. Full checklist: `docs/auth-setup.md`. Validated at typecheck + 152/152 jest only — NOT runtime-tested (needs the rebuild + credentials).
- Preview-stage: anonymous rows are NOT migrated/linked to new accounts.

Also this session: a full code audit (`docs/codex-audit-2026-05-20.md`) plus a bug-fix pass that fixed the tamper-verification logic (missing `await` + chain-order), backup photo data-loss, CSV injection, two Fabric crash sites, wired up AppLock enforcement, and added a TamperGuard escape hatch. See the audit's "Resolution log".

## READ THIS FIRST — site signers ('site' scheme), 2026-05-18

The user pushed back on commit `0a42003` ("Require SPRAT cert number for signers") and was right to. The original audit assumed every signer is rope-access certified; real-world rope-access work records are often signed by **site authority** — safety officer, shift lead, superintendent — who is responsible for the work but is NOT SPRAT or IRATA certified. The rope-access advisor's ruling is filed in `.claude/agent-memory/sprirata-rope-access-advisor/signer-authority-site-vs-scheme.md`.

**`SignerScheme = 'sprat' | 'irata' | 'site'`** — defined in `src/domain/profile/types.ts` alongside the unchanged `CertScheme = 'sprat' | 'irata'` (which still gates the technician's own profile). Signature-related types use `SignerScheme`; profile types stay on `CertScheme`.

**Migration 12** (`site-signer-role-employer`) adds three columns to `signatures`:
- `supervisor_scheme TEXT NOT NULL DEFAULT 'sprat' CHECK (...)`. The scheme was captured at sign time but never persisted before — for SPRAT/IRATA it was implied by cert format. Now explicit. Default 'sprat' on pre-migration-12 rows; the cert format still resolves the actual scheme via `inferSchemeFromCertNumber` if anyone needs to backfill.
- `supervisor_role TEXT`, `supervisor_employer TEXT` — captured only when scheme is `'site'`. Nullable.

**Service contract** (`src/domain/logbook/logbook-service.ts`):
- `requiresVerifierCertNumber(scheme)` returns `scheme !== 'site'`.
- When `supervisor_scheme === 'site'`, service requires non-empty role + employer (throws `site_signer_role_required` / `site_signer_employer_required`).
- Both `signEntryLocal` and `completeRemoteSignatureRequest` enforce the same contract; both INSERT and all four SELECTs from `signatures` carry the new columns.
- SPRAT and IRATA still require cert numbers — the `0a42003` enforcement stays for those two schemes.

**UI** — `app/entry/[id]/sign.tsx` and `app/verify/[code].tsx` add a third `'Site'` chip to `SCHEME_OPTIONS`. When the scheme is `'site'`, the IRATA/SPRAT cert field group hides and a Role / Employer Field pair takes its place. Both fields are required (≥2 chars after trim). Switching schemes clears the irrelevant fields so we don't persist drift. `app/entry/[id]/request-signature.tsx` line 270 placeholder widened from "IRATA L3 / Rope access manager" to "Site supervisor / IRATA L3 / Safety officer" so the request copy doesn't presuppose a rope-access role.

**Hosted-flow gotcha caught + fixed** (commit `a52bda6`): `hostedCompletionInputFromDetail` in `src/cloud/supabase/remote-signing.ts` was inferring `supervisor_scheme` from cert format. A site signer has an empty cert, so inference falls back to 'sprat', and the local-side `completeRemoteSignatureRequest` would reject with `supervisor_cert_required`. Fixed to prefer the persisted `detail.signature.supervisor_scheme` (post-migration-12), with cert-format inference kept as a fallback for old hosted signatures that pre-date the column. Role + employer pass through. **No edge function changes needed** — the hosted DB stores the signature payload as JSON, and the JSON automatically carries the new fields.

**No hash version bump.** Signer identity is signature metadata, not entry attestation. `ENTRY_HASH_VERSION` stays at 3.

If you add a fourth signer scheme later, the lockstep points are:
1. `src/domain/profile/types.ts` — extend `SignerScheme` union
2. `src/db/migrations.ts` — relax / extend the `supervisor_scheme` CHECK constraint (SQLite needs a table rebuild to change a CHECK; easiest is a new migration that drops + recreates the column with the wider constraint)
3. `requiresVerifierCertNumber` in `logbook-service.ts` — decide whether the new scheme needs a cert
4. UI `SCHEME_OPTIONS` arrays in `sign.tsx`, `verify/[code].tsx`, anywhere else that lists schemes
5. Tests covering the new path

### Cosmetic note for future polish

The `Field` primitive has a placeholder/cursor visual fusion when the leading placeholder character is a vertical-stem letter (I, l, J, etc.) and the field is focused at position 0: the text cursor `|` overlaps the leading character, making `IRATA L3 / …` read as `RATA L3 / …` to a casual glance. Sidestepped on the request-signature Role field by reordering the placeholder to start with `S` ("Site supervisor"). If a future placeholder happens to start with `I`/`l`/`J`, either reorder or pad with a leading space. A more durable fix would be in `src/ui/primitives/v2/field.tsx` (placeholder positioning / cursor styling) but isn't worth it for a single-character cosmetic.

## READ THIS NEXT — v3 hash + audit-grade sweep (2026-05-17 → 2026-05-18)

A full-app audit pass and a series of audit-grade fixes shipped on top of the v2 redesign across two days, 26 commits, 35+ items closed. Everything below is live on `main`, hosted Edge Functions deployed, typecheck + 141/141 jest green.

**`ENTRY_HASH_VERSION` is now 3.** The new fields on `entries` that signers attest to:
- `entry_kind` — 'work' | 'training' | 'assessment' | 'rescue_drill'. Defaults to 'work' at the SQL layer so pre-v3 rows keep their meaning.
- `rescue_cover` — free-text rescue-cover summary, nullable.
- `hazards` — sorted-JSON-stringified TEXT (`canonicalizeHazards` normalises on write; `parseHazards` reads). Nullable.

`canonicalizeEntry` and the edge function's `canonicalizeEntryPayload` were updated in lockstep. The edge function rejects v2 payloads with `hash_version_invalid`. Existing v2 signatures stay valid via the `verifyChainHashFor` short-circuit (`if (signature.hash_version !== ENTRY_HASH_VERSION) return true`) — we trust their stored chain hash because we can't recompute against an older shape.

**If you bump the hash version again, the lockstep update points are:**
1. `src/domain/logbook/entry-hash.ts` — `ENTRY_HASH_VERSION` constant + `canonicalizeEntry` field list
2. `supabase/functions/_shared/remote-signing.ts` — same constant + `canonicalizeEntryPayload`
3. `__tests__/domain/entry-hash.test.ts` — factory `entry()` shape
4. `__tests__/domain/logbook-service.test.ts` — assertions that read the constant directly
5. Edge function redeploys: `supabase functions deploy remote-signing-request remote-signing-complete remote-signing-cancel`

**Edge Functions are deployed** at version 2 on Supabase project `zooxewiwaurbfmulkwia` as of 2026-05-17. All three (`remote-signing-request`, `remote-signing-complete`, `remote-signing-cancel`) carry the v3 hash check. A pre-existing config bug was fixed in this session: `remote-signing-cancel` was missing its `[functions.remote-signing-cancel]` block in `supabase/config.toml` — re-deploys were silently falling back to default settings (no import_map, JWT verification on). The block is in place now; future deploys work cleanly.

**`@expo/ngrok` is now a declared devDependency.** The CLI prompts to install on first tunnel use, and the prompt only fires in TTY mode — in CI / background invocations it would silently fail with a confusing "Cannot read properties of undefined (reading 'body')". Declaring it explicitly avoids that.

### Audit-grade items closed in this sweep

Roughly grouped by theme. Commit IDs are pinned for quick navigation.

**Schema + hash discipline (the v3 bundle)** — `5f5a9b6` → `ab10b1a` → `b4aa2bb` + edge function deploy + `56ea4b9` (cancel config fix). Migration 9 adds the three entry-attestation fields; entry hash bumps 2→3; service INSERT/UPDATE/AMEND all wired; edge function in lockstep. UI surfaces (new-entry wizard, edit, amend, sign, verifier portal, entry detail) all set and display the new fields.

**Schema additions, no hash bump** — Migration 10 (`db96211`) adds `inspector_name` + `inspector_cert_number` to `gear_inspections`; service throws `inspector_identity_required` when missing; UI inspection form requires the name and disables submit until typed. Migration 11 (`c0c6585`) adds optional `image_url` to `gear_catalog` — schema-ready for a future licensed image set without breaking anything today.

**Audit-grade rope-access fixes** — Sign-vs-verify field parity (`d99a368`: local sign screen now shows the full Work Record card the remote verifier always saw — same labels, same order, same attestation text binds identical evidence). Amendment lineage chips on entry detail (`a23edd3`: "Amends YYYY-MM-DD · A1B2C3D4" and "Amended by …" navigate in both directions; new `listAmendmentsOf(entryId)` service method). SPRAT cert number now required for signers (`0a42003`: was IRATA-only; service-level enforcement plus UI helper text). Verifier identity reconcile (`06e7c1a`: requested vs actual signer surfaced as distinct fields with a "Different signer" warn pill when they diverge). Amendment "what changed" diff (`612d73c`: live was→is comparison on the amend hero card).

**v2 primitives + a11y + Fabric crash** — Heliotype `danger` differentiation on Pill / Button / SyncChip (`1fcb47e`: the palette's `accent === danger === #8B1F1A` oxblood collapse — now distinguished by SHAPE, danger goes outlined ink-on-bone). IconBtn 44px hit-target via `hitSlop` (no visual change). `useReducedMotion()` on Sheet + SyncChip spin. Retire-gear dead button wired. Sealing screen tap-to-skip (`852cce8`: 3s setTimeout was forced wait). **Fabric crash fix** (`283429e`): `style={({pressed}) => ({ ..., transform: pressed ? [...] : undefined })}` serializes `undefined` to `null` on the native side under new arch, tripping `_validateTransforms`. Pattern-fixed across 5 sites — spread-conditional transform key (`pressed ? { transform: [...] } : null` in a style array). If a new screen / primitive sets `transform: undefined` inline, it will crash; use the spread pattern.

**UX polish** — Tap-to-skip seal, deep-link filters from Today tiles (`?filter=pending` / `?filter=drafts`), dated AMENDS label that strips the `entry_` prefix, expiry-cert "Expired" pill, restore chain-rewind warning showing current vs snapshot head, "Embed chain proof" toggle replaced with a static "Always" indicator, loading-vs-empty distinguishing on Today and Records, double-header fix on six screens that render their own `TopBar` (`4bfcc48`), explicit delete affordance on draft entry rows in Records.

**Field-context** — Camera-first photo capture (`e96098d`: shared `captureOrPickPhoto()` helper in `src/ui/photo-picker.ts`; both `entry/new.tsx` and `entry/[id].tsx` use it. Library fallback still available via the action sheet). Today QuickLog "Same as last" preload (`29d0fe0`: `/entry/new?seed=last` reads the most recent entry and pre-fills site / employer / client / task / access / structure / height / kind / rescue / hazards; date / hours / description stay blank).

**Gear catalog browser** (`c0c6585`) — `/gear/catalog` route with debounced search (200ms), category filter, tap-to-pick. Handoff back to the gear tab via `src/storage/gear-catalog-pick.ts` (transient AsyncStorage slot consumed by `useFocusEffect` on the Add-gear form). The legacy catalog autocomplete was dropped in step 12; this brings it back as a dedicated screen. `image_url` column ready for future licensed images; UI falls back to the category icon when null.

### Things explicitly NOT done — pushback on file

**Hotlinking manufacturer product images** — the user asked about pulling images from corresponding manufacturer websites. Pushed back: copyright grey-area (Petzl / DMM / Beal / Camp all enforce), per-vendor scraping is fragile (no standard URL pattern), trashes the offline-first budget. Schema is ready (`gear_catalog.image_url` column) for a future curated, license-cleared image set; that's a procurement workstream, not a code one. Don't add a scraper or hotlinker; if a curated set ever lands, it can drop into the existing column and the UI picks it up without changes.

### Things still on the audit board

Lower priority but documented for the next session:

- **Restore document picker** — needs `expo-document-picker` package; currently paste-only via the Profile → Sync & backup card.
- **Setup expiry date picker** — needs a date-picker package decision (we just dropped `@react-native-community/datetimepicker` because it wasn't being used).
- **Gear lifecycle gaps** — manufacture date, in-service date, lot/batch on `gear_items`; quarantine state between active and retired (a `quarantined_at TEXT` column to support "withdrawn pending second opinion"). Migration 12 territory.
- **Typography drift across 13 screens** — every screen still hand-rolling `fontFamily/fontWeight/fontSize` instead of consuming `type.*` from `src/ui/theme/type.ts`. Mechanical refactor.

### Tunnel + dev server notes

`npx expo start --tunnel --port 8082` is the canonical invocation. The randomness `hdIUe_o` is pinned in `.expo/settings.json`, so the tunnel URL is stable across restarts: `exp://hdiue_o-bloodshed_ra1n-8082.exp.direct`. Don't use `CI=1` for dev work — it disables file-watcher and suppresses QR/URL output. The `--non-interactive` flag is not recognized by Expo CLI; pass `--port 8082` explicitly to avoid the "use 8083 instead?" prompt that hangs background invocations.

## READ THIS NEXT — v2 redesign supersedes the paper-form identity (2026-05-17)

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

Dual-cert SPRAT+IRATA support at setup landed in step 14 (2026-05-17). The new `app/(onboarding)/setup.tsx` exposes a primary scheme `ChipSelect` plus an "Add SPRAT/IRATA cert" outline button that materialises a second `CertCard` so the technician can register both credentials in one pass.

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

- **Post-step-15 cross-palette static sweep.** 2026-05-17. Static audit across all six palettes (Tungsten / Mariner / Verdigris / Heliotype / Sandstone / Mercury) looking for token combinations that produce poor contrast or hardcoded colors that ignore the active palette. Surveyed every screen + v2 primitive.

  Heliotype is the wildcard (light theme, `line` = `#1A1410` near-black ink, `accent` == `danger` == `#8B1F1A` oxblood, `accentSoft` == `dangerSoft`). All heliotype-specific border + shadow branches in primitives (Button, Card, Field, Pill, TabBar) verified — they're scoped to `theme.key === 'heliotype'` and apply the 1.5 px ink-on-paper treatment. The `accent`/`danger` color collapse on Heliotype is documented and intentional (oxblood is the only red the palette has).

  Bugs found + fixed:
  - `app/entry/[id]/sign.tsx` — attestation `IconCheck` was painted with `tokens.okSoft` over a `tokens.ok`-filled box. Soft tokens are pale-on-pale backgrounds, NOT foreground colors — the check rendered near-invisible on every palette. Patched to `tokens.bg` (cleanest contrast against any saturated fill: dark themes get dark check on light fill, light themes get cream check on dark fill).
  - `app/(tabs)/more.tsx` — same bug on the restore-confirm `IconVerified`. Same fix.
  - `app/verify/[code].tsx` — `AttestationRow`'s `IconCheck` was painted with `tokens.accentInk` over a `tokens.ok` fill. accentInk pairs with `accent`, not `ok`; cross-palette this was inconsistent (on Heliotype/Sandstone/Mercury accentInk is cream — fine on dark green; on Tungsten/Mariner/Verdigris accentInk is dark brown/navy — also fine, but mixing semantic tokens is fragile). Standardised to `tokens.bg` to match the sign + more screens.
  - `app/(tabs)/gear.tsx` — `DeadlineRow` icon tile used a literal `rgba(0,0,0,0.05)` background, which was near-invisible on the already-dark `dangerSoft`/`warnSoft` row on dark themes. Swapped to `tokens.bg` so the embedded-tile feel reads on every palette.

  Surveyed but left as-is:
  - `app/entry/new.tsx` `ChoiceRow` emphasis uses `rgba(0,0,0,0.12)` for an inner icon tile on a saturated-accent row. The 12 % black inset reads as "depressed" on every accent hue (orange/cyan/gold/oxblood/terracotta/violet) so the local hex is intentional, not a cross-palette bug.
  - Custom `borderWidth: 1` containers in a few screens (sticky headers, footer hairlines, choice rows). Primitives Card/Field/Pill correctly bump to 1.5 px on Heliotype; bumping every custom container would create a sprawling diff for marginal "ink-on-paper" feel. The primary surfaces (Cards, Buttons, Pills, Fields) carry the heavier border treatment, which is what reads as the Heliotype signature.

  Pill / Button / Field / Card / Pill-on-soft-bg combinations were spot-checked across all six palettes' token tables — every tone pair (chip · accent · ok · warn · danger) renders with safe contrast on every palette.

  Typecheck clean. Jest 137/137 still green.

- **Step 15 — Final sweep: 4 screens migrated, all legacy primitives + fonts + compat deleted.** Shipped 2026-05-17. The remaining four screens that were still on the paper-form chrome were rewritten on v2 primitives, then every v1 surface was deleted:

  - Screens rewritten on v2 primitives:
    - `app/entry/[id]/edit.tsx` — Edit-draft form (~494 → ~390 lines). v2 chrome: small `TopBar` (back leading), hero `Card` (DRAFT kicker · echoed site title · `Pill` row: Audit-ready / hours / height · inline `IconWarn` callout if the entry is no longer editable). Four `SectionH` groupings (Site & task · Dates & parties · Structure & height · Notes) with `Field`s + `ChipSelect`s for task/access/structure presets. Pinned-footer primary `Button` ("Save audit-ready draft" / "Save draft" / "Saving…"). Custom 88-px `UnitToggle` for ft/m.
    - `app/entry/[id]/request-signature.tsx` — Remote-request form (~317 → ~270 lines). Hero `Card` with readiness `Pill`s + an `IconWarn` callout for blocking states (non-draft entry · already-open request · missing required fields). SectionH "01 VERIFIER" with a saved-contacts chip row (sourced from `useSupervisorContacts`) + name/contact `Field`s + a tap-to-reveal Role/Company expander. Pinned-footer primary button cycles "Add verifier name" → "Finish entry first" → "Create remote request" → "Creating request…".
    - `app/entry/[id]/amend.tsx` — Amend-from-signed form (~400 → ~340 lines). Same v2 chrome pattern as edit; hero `Card` shows `AMENDS XXXXXX` kicker + on-file hours + missing-count `Pill` + locked-source `IconWarn` callout when the source isn't signed. Four sections (Site & parties · Task & method · Hours & height · Notes). Pinned footer primary "Create amendment draft".
    - `app/verify/[code].tsx` — Verifier portal (~775 → ~545 lines). Multi-state screen: completed (post-signature) shows `SigFill` of the signer's name + `Row` list of method/signed/chain-hash; no-token, loading, not-found render minimal `Card` states; the actionable state has a Request-readiness hero `Card` plus three info `Card`s (Request · Work record · Record change check) followed by an Authorization section with verifier `Field`s, scheme `ChipSelect`, IRATA-level `ChipSelect`, `SigPad` (with a header "Clear" pressable that drives the new `SigPadHandle.clear()`), and a custom `AttestationRow` (square check + `ATTESTATION_TEXT`, turns `okSoft` when accepted). Closed-state `ClosedStateCard` colors by reason kind (completed/expired/cancelled/closed). Pinned-footer primary "Submit remote signature" or fallback "Close".

  - Bootstrap splash (`src/providers/app-providers.tsx`) rewritten — no longer references v1 `SplashScreen`/`MarkPlate`. Renders the centered `IconBrand`, "RALB" wordmark, `ActivityIndicator`, and a status caption directly inside the `ThemeProvider` while fonts/DB load. Falls back to platform-default font rendering during the brief `Loading typeface` phase.

  - Layouts ported off the compat layer:
    - `app/(tabs)/_layout.tsx` — custom `AppTabBar` now uses v2 icons (`IconToday` / `IconRecords` / `IconGear` / `IconProfile` / `IconPlus`), v2 tokens (`bg`/`lineSoft`/`text`/`textDim`/`textFaint`/`accent`/`accentInk`), and Manrope. Raised-center "+" disk preserves the v2 spec's accent-shadow on most palettes + Heliotype's hard-block shadow branch.
    - `app/_layout.tsx` — stack `screenOptions` migrated to `tokens.surface` / `tokens.text` / `tokens.bg` + Manrope 700 for header titles.

  - Deletions (final sweep):
    - `src/ui/primitives/*.tsx` (28 v1 files): `action-tile`, `animated-counter`, `animated-stamp`, `button`, `card`, `checkbox-row`, `chip`, `date-field`, `doc-action-button`, `doc-band`, `field`, `form-cell`, `index.ts`, `load-gauge`, `mark-plate`, `marquee-text`, `pulley-spinner`, `row-doc`, `screen`, `section-h`, `signature-fill`, `signature-pad`, `splash-screen`, `stamp`, `stat-row`, `swipe-row`, `watermark-seal`, `weave-backdrop`. Only `src/ui/primitives/v2/` remains.
    - `src/ui/theme/compat.ts` — gone. `src/ui/theme/tokens.ts` — gone.
    - `ThemeContextValue` slimmed to `{ theme, tokens, setTheme }`. No more `colors`/`tidewater`/`hairlines`/`docBand`/`stamp`/`typography`/`spacing`/`radii`/`touchTarget` exits.
    - Legacy font packages removed from `package.json` via `npm uninstall`: `@expo-google-fonts/inter`, `@expo-google-fonts/archivo`, `@expo-google-fonts/ibm-plex-mono`. Only Manrope, JetBrains Mono, and Newsreader 600 italic remain. `AppProviders` `useFonts` call is down to those three.
    - `lucide-react-native` survives — `verify/[code].tsx` still uses `BadgeCheck` / `CalendarClock` / `ShieldOff` for the closed-state callouts (no clean equivalents in the v2 icon set).

  Typecheck clean. Jest 137/137 still green. The v2 redesign program is now complete; the hard-gate cross-palette visual sweep remains an open follow-up but isn't gated on code.

- **Step 14 — Splash + 3-card Onboarding intro + dual-cert Setup rewrite.** Shipped 2026-05-17. Three pieces:

  - `app/index.tsx` rewritten as the **v2 Splash**. Centered `IconBrand` (80 px) over a Manrope 800 "RALB" wordmark and a mono "Rope Access Logbook" caption (tracked 2.4 px). Below: a 140×3 indeterminate progress bar — a 56 px accent block sweeps from -56 → 140 px via `Animated.loop(timing(... 1300 ms inOut(ease)))`. The screen always holds for a minimum of 1800 ms (regardless of how fast `useProfile()` resolves); once both the min-hold elapses AND the profile + `onboardingSeen` pref reads are in, it redirects: profile present → `/today`; profile missing + `onboardingSeen` → `/setup`; otherwise → `/intro`. Honors `useReducedMotion()` — sweep doesn't start, but the 1800 ms hold still applies (per the v2 reduced-motion note).

  - `app/(onboarding)/intro.tsx` new **3-card onboarding** before setup. Pages: "Your logbook, in your pocket." (`IconBrand`) → "Tamper-evident by design." (`IconChain`) → "Works off-rope, works off-grid." (`IconOffline`). Each card: mono `01 / 03` step kicker (top-left), `Skip` text button (top-right), 96 px square accent-filled hero plate with the slide's icon, 32 px Manrope 800 title (whitespace-preserved with `\n`), 15 px dim sub-copy, 24×6 active-dot indicator at bottom, primary `Button` ("Continue" → "Continue" → "Get started"). Hero plate pops via two-stage `scale(0.6 → 1.05 → 1)` + opacity (600 ms `cubic-bezier(.2,.7,.3,1.4)`); text rises 8 px after 80 ms delay (480 ms ease-out). Skip and final-card press both write `PrefKeys.onboardingSeen = true` and route to `/setup`. Honors reduced motion.

  - `app/(onboarding)/setup.tsx` rewritten on v2 primitives **with dual-cert support**. Layout: small `TopBar` ("Set up") → hero `Card` (mono `FIRST RUN · ENTRY-HASH V2` kicker, 26 px Manrope 800 headline that echoes the typed name, sub line, status `Pill`s: Identity OK/warn + scheme combo + Cert details added). Section `01 IDENTITY` (Full name `Field`). Section `02 CERTIFICATION` — primary scheme `ChipSelect` (sprat/irata), then a `CertCard` for the primary scheme. When secondary isn't enabled, an outline `Button` ("Add IRATA/SPRAT cert") reveals a second `CertCard` with a `PRIMARY` / `SECONDARY` `Pill` and an `X` close button on the secondary card. Each `CertCard` has its own level `ChipSelect` (I/II/III), number `Field` (IRATA digit-normalised + folded into `formatIrataNumber(level, ...)` with a 5-digit `maxLength`; SPRAT normalised via `normalizeSpratNumber`), and optional expiry `Field`. Section `03 WHAT THIS BUILDS` — a `Card` with four accent-bullet rows. Pinned footer with the primary `Button` (`IconLock` leading, label flips "Add your name" → "Create logbook" → "Creating logbook…"). On submit, `createProfile.mutate(...)` is called with `primary_scheme` set to the selected primary and both `sprat_*` and `irata_*` field groups populated whenever their scheme is included (primary or secondary).

  - New primitive enhancement: `Field` gained a passthrough `maxLength` prop (used by the setup screen's IRATA cert-number input). No call-site changes elsewhere.

  - New AsyncStorage pref `PrefKeys.onboardingSeen` (key `ralb:pref:onboarding-seen`) so re-opens after a partial setup don't loop the user through the intro cards again.

  - Stack registration: `app/_layout.tsx` adds `(onboarding)/intro` (`headerShown: false`).

  Typecheck clean. Jest 137/137 still green.

- **Step 13 — Audit export screen + ToggleRow.** Shipped 2026-05-17. New primitive + new screen + minimal domain-hook extension:

  - `src/ui/primitives/v2/toggle-row.tsx` — 14 px-padded surface row (label + sub kicker) with a 40×24 pill switch on the right. The 20 px knob slides 16 px via `Animated.timing` over 200 ms on `cubic-bezier(.2,.7,.3,1.4)`; the track background interpolates from `surface2` → `accent`. `useReducedMotion()` snaps the animation. Supports `disabled` (dims to 0.6 + suppresses presses); `accessibilityRole` is `switch` with `accessibilityState.checked`.

  - `app/export.tsx` new screen — small `TopBar` ("Audit export", back leading). Preview `Card` (concentric SVG rings top-right, embossed `IconBrand` watermark bottom-right at 6 % opacity rotated -8 deg, mono `AUDIT PACKET · V2` kicker, 26 px `{n} entries` headline, `{hours} signed hrs · chain verifiable` sub, hairline rule, `Chain valid` (ok+IconVerified) / `Hash v2` (chip+IconLock) / `{n} links` (chip+IconChain) `Pill` row, and a mono `HEAD · {first 8}…{last 4}` line when `useChainHead()` resolves). Options section: a Range `ChipSelect` (All time / This year / This quarter / Custom) — Custom reveals two `Field`s (From / To, ISO date). Three `ToggleRow`s: Include drafts (default off) · Include attachments (default on) · Embed chain proof (forced on, `disabled`). Format section: a 3-tile `FormatTile` grid (PDF / JSON / CSV) — selected tile uses `accentSoft` background + 1.5 px accent border. Primary lg `Button` with `IconExport` leading shows `Export {n} entries` (or `Nothing to export`, or `Building export…` during the mutation).

  - Range filter is applied **in-screen** (no domain change beyond the hook tweak below). `inRange` keys on `entry.date_to` for `year` (≥ start of current local year) / `quarter` (≥ start of current local quarter, 0/3/6/9-month boundaries) and on the `customFrom`/`customTo` `Field`s for `custom`. `customRangeValid` allows open-ended single-sided ranges (only one of From/To set) and gates only when both are set + ordered. Submission re-filters the bundle returned by `useExportLogbook({ includeDrafts })`, optionally strips attachments per-entry when `Include attachments` is off, and re-runs `buildLogbookExportBundle(...)` so the summary counts + signed-hours match what was kept. PDF goes through `Print.printToFileAsync` + `Sharing.shareAsync`; JSON/CSV go through the `Share` API. Filename via `buildLogbookExportFileName`.

  - Minimal domain-hook extension: `useExportLogbook` and `useExportLogbookCsv` now take an `ExportLogbookOptions` argument (default `{}`) instead of being argless — so the export screen can pass `{ includeDrafts: true }` through. No service signature change (the underlying methods already accepted options).

  - Wiring updates:
    - `app/(tabs)/records.tsx` — the export `IconBtn` in the `TopBar` now routes to `/export` instead of toggling the inline PDF/JSON/CSV row. The inline three-button row + its `sharePdf`/`shareJson`/`shareCsv` handlers + the `expo-print` / `expo-sharing` / `expo-file-system` / `Share` / `buildLogbookExportFileName` / `buildLogbookPdfHtml` imports are dropped from the screen (now centralised in `app/export.tsx`).
    - `app/(tabs)/more.tsx` — the Audit-export `SettingsRow` `onPress` now routes to `/export`.
    - `app/_layout.tsx` — registers `export` stack screen with `headerShown: false` (the screen owns its `TopBar`).

  Typecheck clean. Jest 137/137 still green.

- **Step 12 — Gear list + Gear detail + GearCard + CountdownDial.** Shipped 2026-05-17. Two new primitives + screen rewrites + a domain expansion:

  - `src/ui/primitives/v2/gear-card.tsx` — 48 px square icon plate · name + mono `manufacturer · serial · category` sub · right-side `Pill` whose tone + label encode the inspection state (`overdue` / `due soon` / `due today` / `Nd` / `Retired` / `No date`) · 4 px progress bar pinned to the card's bottom edge that fills based on the fraction of the inspection cycle elapsed. Press scales to 0.99. Pulls the category icon from `GEAR_ICON`.

  - `src/ui/primitives/v2/countdown-dial.tsx` — 76 px (size-configurable) SVG ring with a soft background ring + an accent stroke whose `strokeDashoffset` encodes the elapsed-cycle fraction. Center prints the days-remaining (or `Nd` overdue / `TODAY` / `—`) plus a mono `TO GO` / `OVERDUE` / `DUE` / `RETIRED` caption. Color palette branches on status (`overdue` → danger, `due_soon` → warn, `retired`/`unscheduled` → faint, else accent).

  - `app/(tabs)/gear.tsx` rewritten — large `TopBar` ("Gear" + `${n} active · ${n} overdue · ${n} due ≤14d` sub) with a trailing `+` `IconBtn` that toggles an inline Add-gear `Card` (name `Field` + category `ChipSelect` + Serial/Next-due 2-col `Field`s + primary submit `Button`). Below: an Inspection-Deadlines summary `Card` (only rendered when any overdue or due-soon exist) showing up to 3 highlighted rows with `dangerSoft`/`warnSoft` backgrounds + countdown captions + chevron. Then a horizontally-scrolling category-filter `ChipSelect` (All + 10 categories) and a `SectionH` ("ALL GEAR" · count). Body renders the `GearCard` list; an inline empty-state `Card` appears when the filter has no matches. Each `GearCard` routes to `/gear/${id}`.

  - `app/gear/[id].tsx` new screen — small `TopBar` (category as title, back leading). Hero `Card` (64 px square icon + mono manufacturer/model kicker + 20 px name + mono `S/N` line + status `Pill`), hairline rule, then a 2-col row: `CountdownDial` (76 px) + right-column "NEXT INSPECTION" mono kicker + 20 px date + colored remaining/overdue caption. Below the hero: a primary "Record inspection" `Button` + a ghost `IconLock` retire `IconBtn`. The Record-inspection button toggles an inline `NEW INSPECTION` `Card` with a result `ChipSelect` (Pass / Concerns / Fail — retire), 2-col Inspected-on + Next-due `Field`s, Notes multiline `Field`, and a primary submit. `Fail` triggers a destructive confirm dialog (retires the gear); `Pass with concerns` and `Pass` save inline. Inspection History section uses a `SectionH` + a `Card` listing up to 4 history rows with 32 px tinted-bg result icons (`IconCheck` / `IconWarn` / `IconVoid`). `useGearItemDetail(id)` + `useGearInspections(id, 8)` are new React Query hooks; the screen is registered in `app/_layout.tsx` as `gear/[id]` with `headerShown: false` so the `TopBar` owns the chrome.

  - Domain layer: `src/domain/gear/gear-service.ts` gains `getGearItemDetailById(id, asOf?)` (resolves a single item's `GearItemDetail`) and `listInspectionsForGear(gearId, limit?)` (newest first, capped 1..50). `src/domain/gear/use-gear.ts` adds `useGearItemDetail` and `useGearInspections` (both `enabled` on truthy id) and extends the `useRecordGearInspection` `onSuccess` invalidator to bust `['gearItem', id]` + `['gearInspections', id]`. New test in `__tests__/domain/gear-service.test.ts` covers the history ordering, the explicit `limit`, the detail resolver's status derivation, and the not-found path.

  Dropped from this iteration vs. the legacy gear screen (~1074 lines → 404): the paper-form `DocBand` chrome, the per-item `RowDoc` rendering, the inline inspection-recording sheet inside the list screen (now lives on the detail screen), the catalog-search affordance (still reachable via the existing `useGearCatalogSearch` hook — surface in a sub-screen later if needed), and per-row gear-edit fields (renames + serial edits will return on a dedicated edit screen). The `Linked entries` block from the v2 spec is deferred — the domain layer doesn't yet expose "entries that used this gear" and adding it is a separate Phase A-style task.

  Typecheck clean. Jest 137/137 (was 136/136; +1 from the new gear-service history test).

- **Step 11 — Sign screen + SealAnim.** Shipped 2026-05-17. Two new primitives + screen rewrite:

  - `src/ui/primitives/v2/sig-pad.tsx` — 180 px tall signature surface wrapping `react-native-signature-canvas`. Custom `webStyle` strips the library's built-in footer; a hairline baseline sits 32 px from the bottom and a mono `✕  SIGN HERE` hint sits at the lower-left until the first stroke. Exposes a `SigPadHandle` ref with a `clear()` method so parent screens can put the clear button in their section header (per v2 spec, instead of inside the pad).

  - `src/ui/primitives/v2/seal-anim.tsx` — bespoke 200×200 sealing dial. 24 evenly-spaced ticks around an inner radius, an outer accent ring that draws via animated `strokeDashoffset` (528 → 0) over 1.4 s with `cubic-bezier(.65,.05,.36,1)`, a center 88×72 accent-fill stamp that fades in over 360 ms on ring complete, and an `IconBrand` mark that fades in 120 ms later. Caption transitions "Sealing chain…" → "Sealed in chain" once the brand reveal lands. Honors `useReducedMotion()` — jumps straight to the sealed state.

  - `app/entry/[id]/sign.tsx` rewritten — small `TopBar` ("Seal in chain"), Context `Card` (mono SIGNING kicker + site title + hours · task sub + `StatusPill`, plus an inline `warnSoft` chip listing missing fields when readiness fails). Supervisor section: known-supervisor chip row sourced from `useSupervisorContacts`, SPRAT/IRATA `ChipSelect`, name `Field`, cert number `Field` (helper text changes by scheme — required for IRATA, optional for SPRAT), IRATA-level `ChipSelect` when scheme = 'irata'. Signature section: `SectionH` with a "Clear" text action that drives the `SigPad` ref, then the `SigPad`. Attestation row: full-width pressable card with a 22 px square check + `ATTESTATION_TEXT`; turns `okSoft` background + `ok` border when accepted. Primary "Seal in chain" `Button` in a footer pinned above the safe-area insets.

  On successful `signEntry.mutate`, the screen swaps to a full-bleed `SealAnim` with the truncated chain hash printed below the dial. After 3 s the screen routes to `/entry/${signed.entry.id}` so the user reads "Sealed in chain" briefly before landing on the signed-record view.

  Functionality preserved: prefill-from-supervisor query param, scheme inference from cert number, IRATA digit normalization + level digit folding into `formatIrataNumber`, draft-vs-signed readiness gating, scroll-disabled-while-drawing (prevents the page from scrolling under the pad), full attestation text in the persisted signature. Typecheck clean. Jest 136/136 still green.

- **Step 10 — New entry 3-step sheet + PhotoStrip.** Shipped 2026-05-17. `app/entry/new.tsx` rewritten end-to-end (was ~2000 lines of paper-form chrome; now ~800 lines on v2 primitives). New primitive at `src/ui/primitives/v2/photo-strip.tsx` — horizontally-scrolling 88 px tile row. Leading accent-filled `Capture` tile with `IconCamera`, then real photo tiles with mono filename overlay, then dashed-outline `Anchors / Workzone / Hazard` slot placeholders that collapse from the trailing side as photos accumulate. `disabled` (no draft yet) and `capturePending` states wired.

  Wizard layout: bottom-sheet-styled header (grab handle + 3-bar progress strip + close X + 28 px Manrope 800 title + sub). Body scrolls under a `KeyboardAvoidingView`. Footer with ghost Back + primary Continue on steps 1–2; step 3 has inline `ChoiceRow` actions instead of a footer.

  Step 1 (Where) — recent-sites chip row (top 6 distinct sites from `useEntries`), Site / Client / Employer `Field`s, two-column Date from / Date to `Field`s with `isValidIsoDateRange` helper.

  Step 2 (What) — `ChipSelect` for Work task / Structure / Access method, two-column Hours + Max height `Field`s with an inline ft/m toggle in the height suffix, description multiline `Field`, 4-col gear grid (uses `GEAR_ICON`; active tiles get the accent ring + tinted bg), and the new `PhotoStrip`. Gear toggling and photo capture both mutate against the already-committed draft (Step 1 → 2 transition commits via `useCreateEntry`).

  Step 3 (Review) — summary `Card` (mono kicker + site title + sub + 3-col `Stat` row), optional supervisor-pick chip row sourced from `useSupervisorContacts`, ordered `ChoiceRow` stack honoring `PrefKeys.defaultTerminalAction` (the user's pick from Profile bubbles the matching action up + applies the accent primary treatment + adds a "Default" pill on it), and a `warnSoft` immutability advisory chip with `IconWarn`.

  Functionality preserved: 3-step state machine, draft auto-save on Step 1 → 2 (and again on Step 2 → 3), keep-or-delete-draft dialog on close, cert level snapshot prefill from `profile.data`, gear attach/detach with toggle, photo attach via ImagePicker, supervisor pass-through to `/entry/[id]/sign` and `/entry/[id]/request-signature` via the existing `withSupervisor(path, id)` helper, terminal-action routing (sign / request / draft).

  Dropped from this iteration: hours +/- bump buttons + custom keypad (replaced by a plain decimal-pad `Field`), save-template inline UI, template-recall list on Step 1, the duplicated-from-last-entry banner, the FORM-numbered section headers. The "save current as template" affordance is gone for now — the underlying mutation hook stays, so it can come back as a sub-screen later if templates get used heavily. Typecheck clean. Jest 136/136 still green.

- **Step 9 — Records list + Record detail + ChainLink + SigFill.** Shipped 2026-05-17. Two new primitives + two screen rewrites:

  - `src/ui/primitives/v2/chain-link.tsx` — vertical chain-ladder visualization. Each link row = bullet (with accent ring) on a rail + hash short + label + `HashGlyph`. A single continuous rail clips between the first and last bullets so the ladder reads as one chain rather than a stack of cards. `head` flag renders an accent "HEAD" `Pill`; `dim` greys the bullet (used for previous-chain links pulled from `signature.previous_chain_hash`).

  - `src/ui/primitives/v2/sig-fill.tsx` — supervisor name "writes onto the line" via an Animated `width` interpolation from 0 → 240 px over 2.2 s on mount, with the Newsreader 600 italic typeface against a hairline baseline. Honors `useReducedMotion()` — snaps to full width instantly.

  - `app/(tabs)/records.tsx` rewritten — large `TopBar` ("Records" + count sub), trailing export + filter `IconBtn`. `Field` (search-icon suffix) for query, `ChipSelect` for All / Drafts / Signed / Amended filter with live counts derived from the entries query. List body groups entries by month (`MonthGroup` reducer keyed on `YYYY-MM`, sticky `bg`-colored header per group with a `Pill` showing per-group count) and renders the new `EntryRow` from step 8. `EmptyState` for no-match (echoes the query in the title + offers "Clear filters" outline `Button`). The export icon toggles an inline format-row (PDF/JSON/CSV) for now — placeholder until step 13's dedicated audit-export screen lands. Long-press on a draft row triggers the existing delete-draft confirm.

  - `app/entry/[id].tsx` rewritten — small `TopBar` (`Entry {first 8 of id}`, leading back, trailing export + more). Hero `Card` (mono date kicker + 22 px site title + `{client} · {task}` sub + `StatusPill` top-right + 1 px hairline + 3-col `DetailStat` row: hours / height / access). Conditional cards follow: work-description, gear-used (with v2 `GEAR_ICON` map + detach controls for drafts), evidence (with attach-from-photos button for drafts), `SignatureBlock` (signed → `SigFill` + supervisor + cert + "Verified" `Pill` + 2-col meta + drawn-signature SVG frame; unsigned → "Sign now" primary + "Request remote" outline buttons), remote-request status panel (with share / sync / preview / cancel buttons preserved from the legacy screen), `ChainLink` ladder (previous + current = 2 rungs, since the domain layer doesn't expose a "recent signed entries with chain context" query yet — flagged for follow-up if a deeper ladder is wanted), and a `FooterActions` block (draft → Edit; signed → PDF + Audit packet + Amend ghost button; amended → PDF + Audit packet).

  Functionality preserved: draft editing, gear attach/detach, photo evidence attach, remote-request share/sync/cancel, PDF + audit packet export, AMEND routing. Dropped: the `DocBand`/`Stamp`/`Chip` doc-form chrome, the `AnimatedStamp` slam, the "READY" / "MISSING" / hash-drift chip cluster (replaced by inline `Pill` shorthand). Typecheck clean. Jest 136/136 still green.

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
