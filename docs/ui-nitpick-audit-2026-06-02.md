# RALB Codex Edition — UI Nitpick Audit (Synthesized)

Scope: 10 finders, all findings already adversarially verified against the code and the intentional baseline. This report deduplicates, tiers real defects above nits, and folds in the three owner-requested redesign proposals. Every concrete item keeps its `file:line` citation. Pure-visual polish (exact spacing/look on-device) is NOT verifiable by static code reading and is segregated into section 4 for a device/screenshot pass.

---

## Top defects (code-confirmed, fix these)

Highest blast radius / confidence first. Numbered D1…Dn. Items that belong to an owner-requested bucket are intentionally NOT duplicated here (they live in section 2).

### D1 — Systemic icon box-size bug: wrapper sized pre-`scaledIcon`, no centering → every icon paints ~1.4× larger than its box and anchors top-left

**Basis:** code-confirmed · **Confidence:** high · **Severity:** P2 (blast radius is app-wide; one finder logged the Button instance as P1, then a second downgraded to P2 with explicit reasoning that a few-px cosmetic offset cannot outrank the silent data-drop also held at P2 — leading with P2 by that reasoning, but treat as the top fix-leverage item because one primitive change resolves dozens of call sites).

**Root cause (single):** Each icon wrapper `View` is sized to `spec.iconSize` / `spec.icon`, which is the **intermediate** `scaled(N)` value, while the child `<Icon size=…>` re-applies `scaledIcon()` internally (`icons/index.tsx:76` Icon, `:93` CustomIcon → `scaledIcon` multiplies sizes ≤36 by ICON_SCALE=1.4; `scale.ts:25-27`). The painted SVG is therefore ~1.4× the wrapper box. The wrapper has **no `alignItems`/`justifyContent`**, so the oversized SVG anchors top-left and overflows down-and-right. The large icon *size* is owner-approved/intentional; the defect is the **box not matching the rendered size + no centering**.

**Affected sites (all collapse to this one root cause):**
| Primitive | file:line | Symptom |
|---|---|---|
| Button (icon + iconRight) | `src/ui/primitives/v2/button.tsx:149-161` | md box scaled(16)=19 vs SVG ~27; lg box scaled(20)=24 vs ~34. Icon sits low-and-right of label; gap:8 spacing collapses. Owner-reported "low-and-right + and check". Call sites: profile-edit.tsx:210/230, setup.tsx:198/241, intro.tsx:239, more.tsx:801, plus Export/Share PDF/Audit packet/Continue chevron. |
| IconBtn (sm/md/lg) | `src/ui/primitives/v2/icon-btn.tsx:82-84` | inner View=spec.icon, SVG=scaledIcon(spec.icon); outer Pressable centers the *undersized* View, so glyph lands ~5px up-left of true center. **Highest blast radius** — backs back/export/add/bell/about/sync/close on nearly every TopBar (Today, Records, Gear, Entry, Verify, Export, Account, Security, Attachments, Archives, Hours, Profile-edit, InfoSheet close). |
| SyncChip spin box | `src/ui/primitives/v2/sync-chip.tsx:119-121` | Animated.View 14×14 wraps icon painting at scaledIcon(14)=20. Static ~6px offset **plus** the rotate transform pivots on the 14-box center (7,7) while the icon's visual center is ~(10,10) → the syncing spinner **wobbles/orbits** instead of spinning in place. |
| Pill / StatusPill (sm) | `src/ui/primitives/v2/pill.tsx:83-89` | **Different shape of the same class:** Pill renders the icon **bare (no wrapper View)** at scaled(12)=14 → scaledIcon=20px, taller than the sm pill's lineHeight scaled(14)=17px. Effect is row-height/baseline nudge + icon-vs-cap-height misalignment, **not** a box-overflow. Fix is a height-matched container (or pre-divided literal), not the wrapper resize. Affects StatusPill everywhere (Draft/Signed/etc.). |

**Fix:** In Button/IconBtn/SyncChip, size the wrapper to the **rendered** dimension — `width/height: scaledIcon(spec.iconSize)` (import `scaledIcon` from `@/src/ui/scale`) — and add `alignItems:'center', justifyContent:'center'`; or drop the wrapper View and render `<Icon>` directly inside the already-centered Pressable (IconBtn) / row (Button gap+align). Do **not** hardcode 27/34. For **Pill**, wrap the icon in a fixed box equal to `spec.lineHeight` (alignItems is already center). For **SyncChip**, sizing the Animated.View to scaledIcon(14) fixes both the static offset and the spin wobble (pivot then coincides with the visual center). One primitive fix per file clears all downstream call sites.

> Note: the related secondary instance `IconBtn` was also logged separately at P3 by a different finder with the caveat that the Pressable's own centering largely masks it; that instance is the same root cause and is covered here.

---

### D2 — Disabled primary CTA never tells the verifier which step is missing (highest-stakes, least-familiar audience)

**Basis:** code-confirmed · **Confidence:** high · **Severity:** P2 · `app/verify/[code].tsx:200-209, 774-789`

`canSign` is a single AND of `hasName/certReady/siteFieldsReady/hasSignature/attestationAccepted` plus request/entry status (200-209). When false, the label ternary (782-789) falls through to a static **"Finish verification"** with no indication of the incomplete step. A site signer who typed name+cert but hasn't drawn the signature or ticked the attestation sees only a greyed button. This contradicts the project's `missingFields` surfacing pattern and is inconsistent with `archives/new.tsx:224` which DOES surface the blocker ("Add a label").

**Fix:** Compute a single "next missing step" string from the existing booleans (`hasName`→"Enter your name"; `certReady/siteFieldsReady`→"Add your cert number" / "Add role & employer"; `hasSignature`→"Draw your signature"; `attestationAccepted`→"Confirm the attestation") and render it as the disabled-button label in the `!canSign` branch. Keep "Submit remote signature" for the ready state.

---

### D3 — Verifier portal attests against only the FIRST work task / access method, not the full multi-value list

**Basis:** code-confirmed · **Confidence:** high · **Severity:** P2 · `app/verify/[code].tsx:537-538`

The verifier's WORK RECORD card renders `entry.work_task` / `entry.access_method` (singular legacy scalars). The in-person sign screen renders the joined multi-value list: `parseStringList(entry.work_task_list).join(', ') || entry.work_task || '—'` (`sign.tsx:368/373`). The data is present (`types.ts:52-53` carries `work_task_list`/`access_method_list`). Net: a remote verifier signing a multi-task/multi-access entry sees and **legally attests against only the first task** — a weaker record than the in-person signer sees, on the surface where the signer's view matters most. (This is the v5 multi-value feature shipping incompletely to the hosted verifier path.)

**Fix:** Mirror `sign.tsx`: `value={parseStringList(entry.work_task_list).join(', ') || entry.work_task || '—'}` and the same for access_method. Add `parseStringList` to the existing `@/src/domain/logbook/types` import at `verify/[code].tsx:32`.

---

### D4 — Onboarding slide body text renders in the SYSTEM font (missing `fontFamily`) — wrong typeface, not scale drift

**Basis:** code-confirmed · **Confidence:** high · **Severity:** P2 · `app/(onboarding)/intro.tsx:173-178`

`subStyle` sets fontSize/lineHeight/color/marginTop but **omits `fontFamily`**, applied at `:221` to the longest body copy on the first screen a new tech sees. `Text` is imported raw from `react-native` (`:7`) and there is **no global `Text.defaultProps` font default anywhere in the repo** (grep-confirmed), so RN falls back to San Francisco / Roboto, not Manrope. This is a genuine wrong-typeface render (distinct from the typography-scale drift umbrella in section 3) — and it is the only such Text in this file (skipStyle/titleStyle set explicit fontFamily; stepKicker spreads `type.monoKicker`).

**Fix:** `const subStyle: TextStyle = { ...type.body, color: tokens.text, marginTop: 14 };` (drops the bespoke 15/22 — body is 14/20 scaled). If the 15px size is intentional, at minimum add `fontFamily:'Manrope_500Medium', fontWeight:'500'`.

---

### D5 — Forge primary Button label fails text contrast — affects EVERY primary CTA

**Basis:** code-confirmed · **Confidence:** high · **Severity:** P2 · `src/ui/primitives/v2/button.tsx:66-69, 130-135`

Primary buttons set fg=`tokens.accentInk` on bg=`tokens.accent`. On the **Forge** palette accentInk `#FBF1DC` on accent `#DC5A28` = **3.38:1**, below WCAG AA 4.5:1 for the 14-15px regular-weight label. This is the single highest-traffic fg/bg pair in the app (Save/Sign/Done/Continue), pervasive on Forge only; all other palettes pass.

**Fix at the token source** (not per-component): in `src/ui/theme/themes.ts` darken Forge `accent` toward the danger weight (`#A82F22` already ~6.0 with the same accentInk) or to ~`#C24A1E` so accentInk/accent clears 4.5. Verify with the contrast table; **do not touch the other 5 palettes.**

---

### D6 — Forge accent-on-accentSoft selection states vanish (2.82:1 — below even the 3.0 non-text floor)

**Basis:** code-confirmed · **Confidence:** high · **Severity:** P2 · `app/entry/new.tsx:888-906` + siblings

Active selection states paint accent fg (icon + label) on an accentSoft fill: new-entry gear tile (bg accentSoft :889, accent icon :900, accent label :906); export FormatTile active (`export.tsx:492/504`); CareerHero `Pill tone='accent'` (`today.tsx:428`); the Pill primitive maps accent→{bg:accentSoft, fg:accent} (`pill.tsx:35-36`). On Forge accent `#DC5A28` / accentSoft `#F5D9C5` = **2.82:1**; Mercury also sub-AA at 4.20. (Correction carried from verify: the gear tile and FormatTile DO get an accent border on active — but the border only delineates the edge and does not change the 2.82 label/icon-vs-fill ratio, so the defect stands.)

**Fix:** Darken Forge `accentSoft` in `themes.ts`, OR for the active-chip pattern use a filled accent bg + accentInk fg. For Pill `accent` tone specifically, render label/icon in accentInk on a filled accent bg on light palettes.

---

### D7 — warn-on-warnSoft warning-banner body fails AA (the app already fixed this exact pattern elsewhere)

**Basis:** code-confirmed · **Confidence:** high · **Severity:** P2 · `app/entry/[id]/sign.tsx:336-341` and `app/entry/new.tsx:1090-1097`

Two blocking warning callouts render multi-line body copy in `tokens.warn` over a `tokens.warnSoft` fill. warn/warnSoft computes to **2.92:1 Mercury** (below the 3.0 floor), **3.40 Heliotype, 3.42 Forge** — all sub-AA for ~12px body text. The codebase already diagnosed and remedied exactly this at `gear.tsx` DeadlineRow (commented `:421-428`: "warn/danger over their own *Soft fill fails AA on the light palettes; render the caption in readable ink and let the colored icon carry the urgency"); `request-signature.tsx:181` and `amend.tsx:316` already use `tokens.text`. `sign.tsx` and `new.tsx` are the two that were missed. The `sign.tsx` banner blocks signing, so legibility under glare matters.

**Fix:** Change the body `<Text>` color from `tokens.warn` to `tokens.text` at `sign.tsx:339` and `new.tsx:1094`; keep the warnSoft fill + colored IconWarn as the urgency signal. **Correction to one finder:** `new.tsx` **already has** `IconWarn` at `:1093` (only its body color needs changing); `sign.tsx` is the one **missing** an icon — add `IconWarn` there.

> Related lower-severity instances of the same root pattern are tracked in section 3 (Pill warn tone, ActionTile icon, CertCard expiry).

---

### D8 — `new.tsx` ChoiceRow hard-codes `IconSign` for all three terminal actions (misleading on a glanceable decision screen)

**Basis:** code-confirmed · **Confidence:** high · **Severity:** P2 · `app/entry/new.tsx:1153-1168` (ChoiceRow defined :1116; configs :972-988)

ChoiceRow takes no `icon` prop and hard-codes `<IconSign size={24}/>` for every row. "Sign in person", "Request remote signature", and **"Save as draft"** all show the identical signing-document glyph — non-informative and actively misleading for the draft/request rows. (This ChoiceRow icon IS correctly centered — 38×38 box with center alignment at :1153-1162 — so this is purely an iconography issue, NOT the D1 box-size class.)

**Fix:** Add an `icon` field to ChoiceConfig and pass per-choice: sign→IconSign, request→IconExport, draft→IconDraft (all exist in `src/ui/icons`); render `<choice.icon/>`.

---

### D9 — Remote-request supervisor prefill never fires — param name mismatch (`supervisorId` vs `?supervisor=`)

**Basis:** code-confirmed · **Confidence:** high · **Severity:** P2 · `app/entry/[id]/request-signature.tsx:43-49`

`request-signature` reads `supervisorId` from params and prefills verifier name/contact/role/company (`:65-76`). But the wizard's `withSupervisor` (`new.tsx:216-217`, called for the request path at `:402`) appends `?supervisor=<id>`, and `sign.tsx:68` reads `supervisor`. So `request-signature`'s param is always null and the prefill effect is dead: choosing a supervisor then Request-remote arrives with **blank** verifier fields, even though the same selection DOES pre-fill on Sign-in-person. Silent drop of a user selection (user can still type manually).

**Fix:** Read `supervisor` in `request-signature.tsx` to match `withSupervisor` + `sign.tsx` (smaller change, matches the existing convention).

---

### D10 — `'Invalid range'` date error renders in faint grey, not warn/danger (blocking message looks like a neutral hint)

**Basis:** code-confirmed · **Confidence:** high · **Severity:** P2 · `app/entry/new.tsx:670`

The Date-to field passes `helper={valid ? undefined : 'Invalid range'}`. DateField renders `helper` in `helperStyle` color `tokens.textFaint` (`date-field.tsx:71-78`) — the lowest-contrast token — so a blocking validation message shows in the same faint grey as neutral hints, with no color/icon distinction. DateField has **no `error` prop**, unlike Field which switches helper to danger + thickens the border (`field.tsx:24,65-86,146-147`).

**Fix:** Add an `error` prop to DateField mirroring Field's, and pass `error="Invalid range"`; or surface invalid-range via the footer `missingStepHint`/warn pattern. (This primitive gap also blocks the inline-red redesign — see 2(e).)

---

### D11 — Entry-detail / Export / Gear-detail / Gear-list present FAILED queries as benign "nothing here" (misleading-empty, not thin-async)

These are query-failure → wrong-message defects (distinct from the cosmetic loading-skeleton gaps in section 3). Each kept individual because the resulting message actively misleads.

- **D11a — Audit export shows "Nothing to export" when the entries query has actually failed.** `app/export.tsx:110, 129, 341-348`. `allEntries = entriesQ.data ?? []` with no `isError`; on failure `previewCount=0` → "0 entries" headline + disabled "Nothing to export" (`:345`). An auditor is told nothing exists when the query threw. Chain verification has a dedicated error state (`:206-213`); the entries load does not. **Fix:** add an `entriesQ.isError` branch with "Couldn't load entries" + Retry (`entriesQ.refetch`), mirroring the verify portal connection-error card (`verify/[code].tsx:395-423`). · P3, but listed here because the empty state is *wrong*, not merely thin.
- **D11b — Entry detail has no `isError` branch → a transient error renders as definitive "Entry not found".** `app/entry/[id].tsx:128-150`. After `isLoading`, the only fallback is `!entry || !entryId` → "Entry not found" + "Back to records"; `detail.isError` is never checked, so a recoverable error becomes a dead-end. **Fix:** add `if (detail.isError)` with a distinct message + Retry (`detail.refetch()`); keep "Entry not found" only for genuine null-after-success. · P2.
- **D11c — Gear detail loading branch has NO TopBar / back affordance.** `app/gear/[id].tsx:100-106`. Returns a bare `padding:20` View with only "Loading gear…", no header/back, while the not-found branch (`:108-130`) does render TopBar + Back IconBtn; a stalled query strands the user. **Fix:** render the same TopBar (title "Gear", leading Back IconBtn) in the loading branch + a hero skeleton. · P2.
- **D11d — Gear list flashes the "No gear" empty Card during initial load.** `app/(tabs)/gear.tsx:142-148`. `allItems = gearItems.data ?? []` with no loading guard → on first mount FlatList data is `[]` and `ListEmptyComponent` (`:348-366`) renders "No gear in this category"; a user who *has* gear sees the empty card flash, and subLine counts (`:180`)/SectionH (`:343`) momentarily show 0. **Fix:** gate the empty component on a settled query (`isLoading` skeleton; show empty only when `!isLoading && filteredItems.length === 0`). · P2.

---

### D12 — Two side-by-side `full` Buttons don't split the row width (footer action rows pack left)

**Basis:** code-confirmed · **Confidence:** high · **Severity:** P2 · root cause `src/ui/primitives/v2/button.tsx:121`

`full` only sets `alignSelf: full ? 'stretch' : 'flex-start'`. In a **row** container `alignSelf:'stretch'` controls the **cross axis (height)**, not horizontal width — without `flex:1` neither button expands, so both size to text and pack left with trailing dead space. Recurs across:
| Site | file:line |
|---|---|
| New-entry wizard footer (ghost + primary) | `app/entry/new.tsx:485-494` |
| Entry detail SignatureBlock (Sign now / Request remote) | `app/entry/[id].tsx:929-946` |
| Entry detail FooterActions (Share PDF / Audit packet) | `app/entry/[id].tsx:992-1009` |
| Sign screen sticky footer (auto-width Cancel + primary `full`) | `app/entry/[id]/sign.tsx:613-636` (primary won't grow → intended Cancel-small / primary-fills layout broken) |

**Fix:** wrap each Button in `<View style={{ flex:1 }}>` (the pattern already used for paired Fields, e.g. `new.tsx:655-672`), or add a `grow` prop to Button that sets `flexGrow:1` so a row of `full` buttons distributes evenly. For the Sign footer, wrap the primary in `flex:1` so it fills after the auto-width Cancel.

---

## Owner-requested items

### (a) Icon-alignment fix — see **D1**

This is the systemic root cause already given full treatment as **D1** above (wrapper sized to `scaled()` pre-`scaledIcon`, no centering; `<Icon>` re-applies ×1.4). Owner-facing summary: the "+" and check sitting low-and-right of the label, off-center back/bell/close icons across nearly every screen, and the wobbling sync spinner are **one bug in four primitives**, fixed once per primitive. Affected sites recapped:

| Primitive | file:line | Notes |
|---|---|---|
| Button | `button.tsx:149-161` | resize wrapper to `scaledIcon()` + center |
| IconBtn | `icon-btn.tsx:82-84` | highest blast radius (every TopBar) |
| SyncChip | `sync-chip.tsx:119-121` | also fixes spin wobble |
| Pill / StatusPill | `pill.tsx:83-89` | different shape (no wrapper) → height-matched container |

There is **no design proposal** for this item; the fix is the mechanical primitive change in D1.

---

### (b) Cloud + chain icon swap (+ other weak icons)

No design proposal exists for this bucket; built from findings. Two root themes: **(i) raster-traced custom icons** that are muddy at functional sizes, and **(ii) the `Icon` (duotone) vs `CustomIcon` (currentColor) split** whose differing `fill`/`fillOpacity` contract makes the duotone holdouts mix poorly with the solid set. **Owner explicitly wants cloud + chain swapped.**

**Contract root cause (fix this to make everything consistent):** `Icon()` treats `fill` as a second-layer tint and honors `fillOpacity` (default 0.28; `index.tsx:72,80`); `CustomIcon()` computes `ink = color ?? fill ?? text` and **silently drops `fillOpacity`** (`:90-94`, SvgXml has no opacity prop). Identical props diverge — e.g. Pill passes `fill={fg} fillOpacity={0.28}` to every status icon (`pill.tsx:85`), so IconVerified (duotone) gets a 28% ghost while IconDraft/IconPending/IconVoid (custom) render flat. **Preferred fix:** finish migrating the duotone holdouts to CustomIcon so `fill`/`fillOpacity` become uniformly inert, then drop `fillOpacity` from IconProps and the Pill/SettingsRow call sites. (P2/medium; verifier struck a false sub-claim that `more.tsx:929` `fill` overrides ink — `color=tokens.text` is set there, so fill is inert for custom icons.)

| Icon | file:line | Problem | Live? | Fix |
|---|---|---|---|---|
| **IconCloudBackup** (+ dead IconCloud/IconCloudAlt) | `src/ui/icons/custom/cloud.ts:2` | raster trace, viewBox 1024 `scale(2 2)`, 10-30+ fragment subpaths; cloudAlt duplicates its main lobe block verbatim → self-overlapping seams. Live at `more.tsx:321,929` rendering 34px in a 38px box — fuzzy beside crisp IconExport. | cloudBackup live; cloud/cloudAlt **dead** | Regenerate as clean ~24px-optical single-path currentColor glyphs (backup adds a centered up-arrow). XML-string swap only. P2. |
| **IconChain** | `src/ui/icons/index.tsx:141-153` | inline duotone: 28% accent ghost link behind ink link; every call site passes the SAME color into both `color` and `fill` (today.tsx:604, export.tsx:308, pull-to-refresh.tsx:297, more.tsx:347) → faint accent-on-accent double image. In `more.tsx:347` it's a pale link beside thick solid neighbors; pull-to-refresh spinner is hard to track rotating. | live | Add `chain.ts` currentColor glyph (two solid interlocked links at family weight), route via CustomIcon, drop inline duotone. P2. (The "0.9" in the path is the arc corner radius, not stroke width — "lighter weight" is visual inference; the duotone mixing is the confirmed defect.) |
| **IconVoid / IconBrokenChain** | `src/ui/icons/custom/brokenChain.ts:2` | most fragment-heavy file (~20 subpaths, repeated micro-slivers). Backs **both** "Void" and "Amended" pills (`pill.tsx:102/104`) at ~20px (scaled(12)=14 → ×1.4) where the two-link break collapses into a blob. | live | Regen as a clean single-tone glyph: two interlocked rounded-rect links with a clear diagonal gap, minimal nodes; verify at ~20px. P2. |
| **IconWifi / IconOffline** | `src/ui/icons/index.tsx:320-345` | `Icon()` only ever **fills**; IconWifi's duotone `d` is two OPEN arc subpaths authored to be **stroked** → fill them and they become crescent/lens slivers. IconOffline's duotone is a lone disconnected accent dot. IconWifi has **no live call site (dead code)**; IconOffline IS live (SyncChip offline `sync-chip.tsx:120` ~20px; onboarding hero `intro.tsx:49/217` size 57 — dot most visible). | offline live; wifi dead | Regen wifi.ts/offline.ts as currentColor and route via CustomIcon; or add stroke support to the duotone `<G>`. P2 (offline 57px hero). |
| **IconVerified** | `src/ui/icons/index.tsx:208-218` | duotone shield is the only two-tone glyph in status pills ("Signed", `pill.tsx:101`, ~20px) beside flat siblings; also `more.tsx:723` (fillOpacity 0.4 works) and `more.tsx:1104` (fill=bg → ghost vanishes — inconsistent again). | live | Migrate to single-tone currentColor `verified.ts`; remove now-inert fillOpacity overrides at more.tsx:723/1104. P3. (Overlaps the contract root cause.) |
| **IconCalendar** | `src/ui/icons/index.tsx:292-302` | duotone layer is a bare `<Rect 18×15>` behind an inset keyline calendar → a faint accent rectangle peeks around the edges. DateField `:92` size 18 (~25px) textDim. | live | Single-tone currentColor `calendar.ts` via CustomIcon. P3. |
| **verify ClosedStateCard icons (lucide)** | `app/verify/[code].tsx:14-15,997` | the **only** lucide-react-native icons in app source; render at literal 24px, thin 2.2 stroke, bypassing scaledIcon (1.4×) → smaller/lighter than neighbors, don't track UI_SCALE. | live | Replace with custom set: BadgeCheck→IconVerified, ShieldOff→IconVoid, CalendarClock→IconClock/IconCalendar; remove the lucide import. P3. |
| **SettingsRow dead `fill`** | `app/(tabs)/more.tsx:929` | every row passes `fill={tokens.accent}`, ignored by CustomIcon, but IconChain's duotone renders the 28% accent underlay → "Chain integrity" is the only accent-tinted row in MANAGE. | live | Drop `fill={tokens.accent}` (resolves once IconChain is migrated). P3. |
| **IconLocation** | `src/ui/icons/index.tsx:308-318` | solid-pin duotone ghost behind keyline pin (geometry mismatch). | **dead** (no call site) | Migrate if used, else delete the holdout. P3, visual-conjecture/low. |
| **IconChevron** | `src/ui/icons/index.tsx:175-184` | inline single currentColor path; *may* read thinner than the bold custom set on every list row (entry-row:112, gear:457, catalog:225, more:652/941, intro:239). | live | If it reads thin, add `chevron.ts` at family weight. P3, **visual-conjecture/low** (the "0.9" is arc radius, not stroke — weight is an eyeball call). |
| **simple-bold tranche (lock.ts etc.)** | `src/ui/icons/custom/lock.ts:2` | also raster-traced (1024 `scale(2 2)`, micro-sliver subpaths); acceptable at the current large size but the same pipeline that muddied cloud/chain applies → latent risk at any smaller future use. | live | When regenerating cloud/chain, regenerate the whole tranche from clean vector sources so the family shares one authoring standard. P3 (class note, not a current defect). |

---

### (c) Today "Open work" redesign

**Why:** the "ON YOUR PLATE / Open work" section renders a fixed 2×2 stat grid (`today.tsx:258-265, 689-745`) that (1) for a new/caught-up tech shows **four big greyed zeros** — `ActionTile` maps all four tiles unconditionally and the empty state only swaps colors, not visibility (`:645-685,697`); (2) duplicates the SyncChip's `awaitingSignature` count (`:208` chip + `:655` tile); and (3) sits inside a stack of **five consecutive empty/zero blocks** on a fresh logbook (CareerHero :221 / QuickLogCard :227 "No prior entry" :513 / ChainHeadCard :245 "— — —" :610 / ActionTileGrid :258 / "No entries yet" :292-298) that reads as broken rather than as a clean start. **Code-confirmed asset the screen ignores:** `src/domain/logbook/today-derivations.ts` already exports `buildActions()` (zero-suppressed action list) and `buildAdvisories()` (priority-sorted gear+cert alerts with DO-NOT-DEPLOY copy); `today.tsx` imports neither. **Honesty flag:** there is a copy mismatch — the tile says "within 14d" but `buildAdvisories` OPS-07 says "due within 30 days"; reconcile to one source (SPRAT/IRATA handoff). The "tiles below the fold / gear clipped" concern is real but **visual-conjecture** (device-viewport dependent) — see section 4.

**Proposal 1 — Worklist that earns its space (suppress-when-empty action list)** *(recommended core)*
- *Summary:* Replace the fixed 2×2 grid with a single vertical list of only what's actually open, driven by the existing `buildActions()`. Zero categories aren't rendered; nothing open → one calm "all clear" EmptyState. Kills the clipping (1 column, variable height), the wasted zeros, and surfaces gear-overdue at the top.
- *Key changes:* delete ActionTileGrid/ActionTile; wire `buildActions({summary, overdueGearItems, dueSoonGearItems})`; render each `ActionItem` as a full-width interactive Card (left tone plate + `type.cardTitle` label + trailing IconChevron, same anatomy as the existing ChainHeadCard); order by severity (gear-overdue Pill `danger` first, then pending/drafts `warn`, reusing buildAdvisories PRIORITY_RANK); empty → v2 EmptyState "You're all caught up"; tones via dangerSoft/warnSoft/okSoft through Pill (no new hex); fix the 14d↔30d copy; deep-link each row via `router.push(item.route)` into Records `?filter=…`.
- *Tradeoffs:* loses the "big number" dashboard feel (counts move into the label "Finish 3 drafts"); a one-item list can look sparse — but that's honest.
- *Effort:* M

**Proposal 2 — Live worklist of the actual open entries** *(fast-follow)*
- *Summary:* Under one "Open work" header, render the actual draft/awaiting entries as `EntryRow` items (same primitive as RECENT), capped ~3 with "See all"; gear/cert advisories ride above from `buildAdvisories()`.
- *Key changes:* derive `openEntries` (status `draft`, split pending vs draft by `pending_signature_id`), slice 3; render via existing EntryRow → `/entry/[id]`; advisory Card per top advisory (respect `dismissible=false` for overdue gear); `SectionH` "See all" → `/records?filter=drafts`; empty → EmptyState.
- *Tradeoffs:* highest info value but heaviest; a draft is both "open" and "recent" → **needs a dedupe / framing boundary** with the RECENT section so it doesn't read as the same list twice.
- *Effort:* M

**Proposal 3 — One-line status ribbon + collapse** *(cheap interim / empty-state behavior)*
- *Summary:* Collapse the four tiles into a horizontal wrap of Pills, one per **non-zero** category; hide the whole block (incl. SectionH) when everything is zero. Pairs with nudging the TopBar trailing cluster off the status bar.
- *Key changes:* Pill-per-nonzero-category wrapped in a Pressable → same `?filter` route; render nothing when all four counts are 0; single wrap row never clips; hand SyncChip/Bell crowding to the UI agent.
- *Tradeoffs:* lowest effort, but least "useful" upgrade — Pills carry counts, not entry context (site/task). Good as interim or as the empty-state layered onto P1/P2.
- *Effort:* S

**Recommendation:** Ship **Proposal 1** as the core and fold in two cheap wins from Proposal 3 immediately — (a) collapse the whole section to a calm EmptyState when nothing is open, and (b) hand the SyncChip/Bell status-bar crowding to the UI agent (TopBar trailing inset). Reuses `buildActions()`/`buildAdvisories()` the domain layer already ships; a single column structurally eliminates the clipped-gear problem; zero-suppression eliminates the dead-zeros; gear-overdue stays at top. Hold Proposal 2 until the RECENT-section dedupe boundary is decided. **Do NOT add a top-of-screen "New entry" button** — the primary create CTA is the tab-bar `+`.

---

### (d) Gear density redesign

**Why:** every gear item is a ~78px GearCard (48px icon plate + name + dot-joined sub + one Pill + 4px bottom bar) → only ~6-7 per screen, flat single stream, status legible only via a small pill, and the standalone "Inspection deadlines" card **duplicates** the first 3 overdue/due-soon items. The row wastes the `latest_inspection` (result/inspector/date) already in the list payload.

**Honesty flags (data availability):**
- Density + status grouping + per-category counts need **ZERO new fetch** — `useGearItems()` already returns `GearItemDetail[]` with status, `latest_inspection`, `next_inspection_due`, etc.; grouping and counts are derivable in-memory. `GearSummary` has total/active/retired/overdue/dueSoon but **no per-category counts** (derive client-side).
- Any per-row **inspection COUNT / sparkline / trend** is **NOT in the payload** (only the single `latest_inspection`) and would require a **new domain hook** (count query or `listInspectionsForGear`). Do not assume it.

**Proposal 1 — Compact gear row (density lever)**
- *Summary:* Replace the tall GearCard with a lean EntryRow-analog: leading days numeral + small category icon + name + mfg/serial/last-result sub + status Pill + IconChevron; move the progress bar to a 3px left status rail. ~Halves row height (~11-12/screen) and finally surfaces the latest-inspection result already in the payload.
- *Key changes:* new `GearRow` primitive modeled on `entry-row.tsx`; leading 44px column with days numeral (`scaled(22)`, never hardcoded) + monoKicker caption ("TO GO"/"OVERDUE"/"NO DATE"); center column name (`cardTitle`) + monoSm sub ("Petzl · A12 · Passed Apr 3"); right status Pill + IconChevron; **3px left status rail** in danger/warn/ok/lineSoft replacing the bottom bar; body text stays `tokens.text` ink (never colored-on-*Soft — the DeadlineRow AA rule); wrap in existing SwipeableRow; keep `/gear/[id]`.
- *Tradeoffs:* biggest density win, smallest change, lowest risk — but still a flat list, so triage still leans on scanning. Trims the icon plate slightly.
- *Effort:* S

**Proposal 2 — Status-grouped gear list (triage + grouping lever)** *(recommended)*
- *Summary:* Adopt Proposal 1's compact row AND switch FlatList → SectionList grouped by status (Overdue → Due soon → Current → Unscheduled → Retired) with `SectionH` count headers; retire the standalone deadlines card (its job is now the pinned top sections), removing the duplicate data.
- *Key changes:* build P1's compact GearRow (shared dep); regroup the already-sorted array into 5 buckets in-memory; SectionList with sticky headers; DELETE the deadlines Card + DeadlineRow (keep the TopBar subLine summary); empty buckets collapse; keep the category ChipSelect as a cross-cut filter with in-screen per-category counts; section colors via leading rail + Pill, header tints ink-on-surface (no colored-on-*Soft headers).
- *Tradeoffs:* best answer to all three asks (density + at-a-glance status + grouping) with no domain work; cost is SectionList + filter interaction logic, and removing the deadlines card is a visible change to confirm with the owner.
- *Effort:* M

**Proposal 3 — Two-column dial grid (max-density lever)**
- *Summary:* CountdownDial-forward 2-up tiles (ring + days center + category icon + truncated name + Pill). Max items-per-screen, "inspection clock" hero.
- *Key changes:* new `GearTile` wrapping CountdownDial (~64-72); `numColumns={2}`; dial color + Pill + icon (status survives Heliotype's hue collapse); optional pinned "Overdue" strip.
- *Tradeoffs:* highest raw density but **shrinks tap targets below the current row and truncates mfg/serial** — a genuine cost under gloves/glare/one-handed, exactly the field constraints this product optimizes for; weakest for serial scanning (audit). Suited to a future "overview glance" mode, not the primary list.
- *Effort:* M

**Recommendation:** Ship **Proposal 2 (status-grouped list) built on Proposal 1's compact GearRow**. It's the only option satisfying all three owner asks at once with zero domain-layer changes (buckets + per-category counts derive from the in-memory array) and lets the duplicate deadlines card be retired. The tie-breaker that sinks Proposal 3 is gloved/glare one-handed tap-target size + truncated audit-critical serial text. Sequencing: land the compact GearRow first (small/low-risk/immediately denser), then layer the SectionList grouping. Two copy decisions to the SPRAT/IRATA agent before build: latest-result phrasing ("Passed Apr 3" vs "Pass · Apr 3") and section-header labels. All status rows follow the contrast rules: urgency via colored rail + icon + Pill, body in `tokens.text` ink (never colored-on-*Soft), days numeral via `scaled()`.

> Related secondary gear nits (image_url drop, deadline plate size mismatch, etc.) are in section 3 and feed this redesign.

---

### (e) Inline-red missing-field validation

**Why:** "what's missing" appears only as a top banner/pill far from the offending field. A tech reads "Finish required fields: site, hours, max height" then hunts a long form — gloved, in glare, greyed CTA, no path to the offender. Two structural faults make naive "turn it red" wrong: **(1) GATE vs INPUT split** — `sign.tsx` and `request-signature.tsx` have NO editable entry fields (the entry is read-only Rows; only supervisor/verifier inputs exist), so there's nothing to redden; their banner is a cross-screen gate. **(2) FOUR sources of "required" truth** — `entry-readiness.ts` (canonical 10), `edit.tsx` local `missingFields()`, `amend.tsx` local `isMissing`, `new.tsx` step-gating subset — so per-screen inline-red would perpetuate divergence.

**Honesty flags (data availability):**
- **Hash-safe:** `entry-readiness.ts`'s `getEntryVerificationReadiness` is verified **NOT** part of `canonicalizeEntry`/the hash chain, so its return shape is safe to change.
- **Primitive gap:** `Field` already has `error?: string` (danger border + thickened border + danger message; Heliotype-safe because the message is a text carrier) — but `ChipSelect`, `ClassificationChips`/`MultiClassificationChips`, and **`DateField` have NO error prop** (primitive work required; this is the same gap as **D10**).
- **Palette trap:** on Heliotype `danger === accent === #8B1F1A`, so a red border alone is indistinguishable from focus — the error signal must be a **text/label carrier**, never color alone.
- Verified corroborating finding: `edit.tsx`'s local list is **NOT** stricter than detail — both enumerate the same 10 fields (`entry-readiness.ts:13-37` vs `edit.tsx:70-95`), so the only real defect on Edit's hero is the redundant pill+text-line (see section 3), not a count mismatch.

**Proposal A — Per-screen inline-red, reuse existing lists (literal reading)**
- *Summary:* On the 3 INPUT screens, validate on submit-press, mark each offender inline, scroll+focus the first; replace the verbose comma-banner with a compact tappable count; drive each screen from its EXISTING list; leave gate screens' banner as-is.
- *Key changes:* add `error?: string` to DateField (mirror Field); add a "required" affordance to chip-group wrappers via the kicker label (REQUIRED token, not color-only); fold the requirement into each errored field's `accessibilityLabel`; **enable the CTA** so submit-press can validate; on press-with-errors set per-field flags + `announceForAccessibility` + `setAccessibilityFocus` + `scrollTo` first offender + live-clear; wizard validates per-step subset (first offender may be on another step → switch step then scroll).
- *Tradeoffs:* fastest, lowest blast radius, no domain change — but **perpetuates the 4 sources of truth** (hand-wired per screen → drifts again) and does nothing for the gate-screen dead-end.
- *Effort:* M

**Proposal B — Keyed readiness as single source + shared error map** *(recommended spine)*
- *Summary:* Change `entry-readiness` to emit keyed output (`{key,label}[]`) as THE definition for all input screens; thread a shared helper mapping key→field error that owns submit-validate / scroll-to-first / announce. Gate screens stop pretending to validate: keep a banner but make it ACTIONABLE — "Fix in editor" deep-links to `edit.tsx` with offenders pre-flagged.
- *Key changes:* `entry-readiness.ts` returns `missingFields: {key,label}[]` (hash-safe); retire edit/amend local lists (amend keeps its no-dates rule via an option, not a fork); `useMissingFieldErrors` helper (key→error, `showErrors()`/`clearOnChange`, scroll+focus+announce first offender); add `error?` to DateField + required/error state to chip-group wrappers (kicker label + glyph, Heliotype-safe); enable CTAs, reveal on first submit, live-clear after (don't paint a fresh form red on load); `sign.tsx`/`request-signature.tsx` banner → "N fields missing — Fix in editor" routes to `/entry/[id]/edit?flag=missing`.
- *Tradeoffs:* more upfront work (1 domain fn + 3 screens + 2 primitives + light test update) — but one source of truth, automatic field→error mapping, and it fixes the gate-screen dead-end. The clean foundation.
- *Effort:* L

**Proposal C — Missing-field checklist rail in the bottom bar** *(bold layer on B, long forms only)*
- *Summary:* On long edit/amend forms, render still-missing fields as a horizontal chip rail above the CTA; tap a chip to scroll+focus that field; chips disappear as fields fill → rail empties to zero and the CTA lights up.
- *Key changes:* bottom-bar chip rail bound to B's keyed `missingFields`; tap → scroll+focus (reuses B's orchestration); chips removed as filled ("4 left" → "0"); inline-red still marks the field (color = reinforcement, not sole signal); CTA below the rail; rail carries its own count so the top banner can be dropped entirely on these screens.
- *Tradeoffs:* best ergonomics under gloves/time-pressure + clearest progress model, but net-new UI surface + an empty/transition state; overkill on the short request-signature form; depends on B's keyed source.
- *Effort:* L

**Recommendation:** Build **B as the spine**, then add **C's rail only on the two long forms (edit, amend)**. Three rules carry across every direction: (1) the error signal must be a **text/label carrier, never color alone** (Heliotype danger===accent) — rely on Field's danger message, DateField's mirrored error string, chip-group kicker "REQUIRED" + glyph; (2) **enable the CTA and validate on submit-press** (don't redden a fresh form on load) — reveal on first attempt, live-clear after, matching the existing `missingStepHint` intent; (3) **don't uniformly "redden all 5"** — sign/request have no entry fields, so their banner becomes an actionable "Fix in editor" deep-link, not a dead-end. a11y: skip the non-existent `accessibilityState.invalid`; fold "required" into each field's `accessibilityLabel` and on submit-with-errors call `AccessibilityInfo.announceForAccessibility` + `setAccessibilityFocus`. Keep a compact tappable summary on long forms (inline-red answers "which," summary/rail answers "where"). Handoffs: danger glyph + rail visual = UI visionary; canonical 10 + amend no-dates rule = SPRAT/IRATA; keyed-readiness refactor + helper + deep-link param = engineer.

---

## Secondary findings

Remaining code-confirmed P2/P3, grouped by area. (Items already folded into Top Defects or owner buckets are not repeated.)

### Today
- **Redundant readiness on Today's stack & all-zero grid** — the all-zero ActionTileGrid (`today.tsx:689-745`), the five-stacked-empty-blocks first impression (`:220-298`), and the SyncChip/awaitingSignature duplication (`:208`/`:655`) are the *rationale* for redesign **2(c)**; fix via that redesign, not piecemeal. P2.
- **SyncChip in header is non-interactive but reads as tappable** — `today.tsx:206-209` rendered with no `onPress`; `sync-chip.tsx:128` `if(!onPress) return body` returns a bare View (no Pressable/accessibilityRole), beside a real IconBtn. P3. *Fix:* give it an `onPress` (open sync detail / route to `/records?filter=pending`) or visually downgrade to static text.
- **ChainHeadCard empty state announces as a button and gives a pressed affordance while inert** — `today.tsx:587-619`: `<Card interactive onPress={lastSignedEntry ? onPress : undefined}>` (:592); per `card.tsx:36` `interactive||onPress` renders a Pressable with `accessibilityRole='button'` (:39) + pressed scale/border (:44-45) even when onPress is undefined; opaque "— — —" placeholder (:610). P3. *Fix:* `interactive={!!lastSignedEntry}`; replace "— — —" with "Not yet sealed" in textFaint, or hide until first sign.
- **QuickLog active chips read as disabled** — `today.tsx:522-572`: active vs disabled differ only by `opacity 0.45` (:555); active chips carry no accent affordance on the low-contrast surface2/card pairing. P3, contrast. *Fix:* accentSoft bg + accent label for active chips.

### Records
- **No loading state** — `records.tsx:260` `!entries.data ? null` between handled error (:240-259) and empty (:260-298). P3. *Fix:* 3-5 skeleton EntryRows or centered ActivityIndicator on `isLoading`.

### Gear
- **Catalog pick captures `image_url` but the created item never renders it** — full chain dropped: `catalog.tsx:76` writes it, `gear-catalog-pick.ts:20/42` persists+returns, `gear.tsx:131-138` consume ignores it, `gear.tsx:155-160`+`types.ts CreateGearItemInput` omit it, `GearItem` has no `image_url`, so `gear-card.tsx:106` + hero `[id].tsx:250` always show the category icon. Catalog's visual richness is silently lost. P3. *Decide with the (d) density redesign:* thread image_url through + render with category-icon fallback, OR drop CatalogRow's image so the surfaces match.
- **isError unhandled on all gear queries** — `gear.tsx` (.data ?? [] at :142), `[id].tsx` (only isLoading/!data → misleading "Gear not found"), `catalog.tsx` (only isFetching :137 → errored search shows empty). P3. *Fix:* per-screen EmptyState "Couldn't load gear" + `refetch()`; distinguish isError from not-found in [id]. (Related to D11c/D11d.)
- **Catalog "Nothing matches" prints the raw lowercase enum** — `catalog.tsx:141` `Nothing matches "${trimmedQuery || filter}"` → "harness" not "Harness" when only a category is selected. P3. *Fix:* resolve `filter` to its label; disambiguate query-vs-filter ("Nothing in Harness").
- **Deadlines header plate (32px) vs DeadlineRow plate (30px) mismatch** — same size-21 icon, 2px box delta → uneven padding; InspectionRow=32, GearCard=48, so 30 is the outlier (`gear.tsx:293-308` vs `:437-448`; `[id].tsx:510-521`; `gear-card.tsx:96-106`). P3. *Fix:* normalize DeadlineRow to 32, or extract a shared `IconPlate`.
- **Detail action row has no `alignItems`** — `[id].tsx:332-351` `{flexDirection:'row', gap:10}` defaults to stretch; the md Button is forced to the lg IconBtn's height; benign now but height is implicitly governed by the IconBtn. P3. *Fix:* `alignItems:'center'`; align Button/IconBtn heights.
- **Detail hero name + "Next inspection" date hardcode 20pt Manrope** — `[id].tsx:258-272, 293-304` bypass UI_SCALE (no matching token). P3 (typography — see section 3 umbrella). *Fix:* nearest token or add a scaled 20pt token.
- **CountdownDial value/caption hardcoded** — `countdown-dial.tsx:44-62` value 22/18, caption 9 unscaled (rendered at size 90 from `[id].tsx:285-290`); caption 9px also a glare-legibility nit. P3.
- **ADD GEAR "From catalog" button truncates the manufacturer** — `gear.tsx:218-226` label `From catalog · ${mfg}` in a `numberOfLines={1}` Button (`button.tsx:154`). P3, low. *Fix:* "From catalog ✓" / surface mfg in the Name field.
- **Inspection notes Field capped at numberOfLines=3 / minHeight 60** — `[id].tsx:398-404` multiline scrolls inside a short box for long audit notes (`field.tsx:97-98,136`). P3, low. *Fix:* let multiline grow / expose a `rows` prop.

### Entry detail / Sign / Edit / Amend / Request
- **Remote-request status prints the raw enum + hardcoded warn tone** — `[id].tsx:647` `{remoteRequest.status}` with `tone="warn"` so completed/cancelled show yellow (text↔color disagree); everywhere else routes through StatusPill Title-case (`pill.tsx:96-105`). P3. *Fix:* map status→Title-case label + tone (pending→warn, completed→ok, cancelled→danger).
- **Amend "WHAT CHANGED" prints raw entry-kind enum** — `amend.tsx:606-613` pushes `entry_kind` ("rescue_drill") raw; `entryKindLabel` exists but isn't imported (it is in `[id].tsx:25`/`sign.tsx:15`). P3. *Fix:* wrap both sides in `entryKindLabel(...)`.
- **Missing-fields shown only as a count pill on detail hero** — `[id].tsx:365-371` `{N} missing` with no field list, while sign (:340) and edit (:298-302) name them. P3 — superseded by redesign **2(e)** (this is the current pattern, recorded not new).
- **Edit hero shows redundant pill + "Still needed" line** — `edit.tsx:287-302` (count duplicates the text line). Verified: the lists are NOT stricter than detail (same 10 fields), so the only defect is the in-hero redundancy. P3. *Fix:* drop one.
- **Amend hero shows "Complete"/"N missing" pill even when source is locked** — `amend.tsx:223-236` renders the readiness pill unconditionally alongside the "need a signed source" warn block (:302-326) → mixed signals. P3. *Fix:* suppress the readiness/hours pills when `sourceLocked`.
- **Amend source-locked form stays fully editable while the button only re-routes** — `amend.tsx:447-472` `disabled={false}` relabels to "Edit this draft instead" but fields (:332-430) stay editable → soft interaction trap. P3. *Fix:* render fields readOnly/disabled (Field supports it, `field.tsx:130`) when locked.
- **Edit/Amend Description Field has no label** — `edit.tsx:423-428`, `amend.tsx:396-401` rely on the section header + placeholder only. P3. *Fix:* add `label="Notes"` or adopt a consistent section-headed-single-field rule.
- **Remote-request action buttons (3-up) content-width, reflow on "Syncing…"** — `[id].tsx:669-697` `flexWrap:'wrap'`, no `full`. P3. *Fix:* flex:1 each, or reserve label width.
- **Request disclosure uses bare +/− glyphs + no expanded a11y state** — `request-signature.tsx:252-274` text `+`/`−` in monoSm; `accessibilityRole='button'` but no `accessibilityState={{expanded}}`. P3. *Fix:* chevron icon (rotate) + `accessibilityState`.
- **Saved-contact chip padding drift (7/12 vs 6/11 everywhere else)** — `request-signature.tsx:211-218` vs `sign.tsx:651-652`, `new.tsx:1105-1106`, `new.tsx:614-615`. P3. *Fix:* normalize to 6/11 via a shared SelectChip primitive.
- **warnSoft callout body color is inconsistent (warn / text / textDim)** — one root cause across `sign.tsx:339` (warn), `request-signature.tsx:181` (text), `new.tsx:1094` (warn), `edit.tsx:318`/`amend.tsx:319` (textDim). P3 token consistency (the AA failures are D7). *Fix:* one warn-callout component/token set.
- **Sign "Known" supervisor selected-state silently drops on a single keystroke** — `sign.tsx:166-172` derives the match by fuzzy name+normalized-cert equality; chip `selected` (:417) + Known pill (:410) drop if cert is edited or two supervisors share a name. P3, low. *Fix:* track the tapped id in state.
- **Seal overlay: unconditional 3s auto-advance + faint 10px skip hint** — `sign.tsx:242` `setTimeout(advancePastSeal, 3000)` not gated on reduced motion; hint in monoKicker textFaint (:266-276). (Corrected: SealAnim DOES honor reduced motion — `seal-anim.tsx:36-50`.) P3. *Fix:* gate/shorten the timeout on `useReducedMotion`; raise hint contrast.
- **Attestation checkbox box pins to top (flex-start)** — `sign.tsx:582-610`, `attestationStyle:660-673` `alignItems:'flex-start'`; 22px box vs lineHeight 19 reads slightly off on line 1. P3, cosmetic.
- **Edit/Amend/Request hero titles hardcode fontSize 26 (byte-identical ×3)** — `edit.tsx:250-258`, `amend.tsx:183-191`, `request-signature.tsx:118-126`. P3 (typography — section 3). *Fix:* one shared scaled token.
- **Known-supervisor chip overrides cardSub family/weight inline** — `sign.tsx:441-450`, `request-signature.tsx:220-227`. P3 (typography). *Fix:* shared `chipLabel` token / chip primitive.
- **SheetHeader hero title hardcodes fontSize 28** — `new.tsx:567-578`. P3 (typography). *Fix:* add scaled `sheetTitle` token.
- **Gear-tile grid `width:'22%'` may wrap to 3** — `new.tsx:870-916`. P3, visual-conjecture (device-width dependent) — section 4. *Fix:* `flexGrow:1, flexBasis:72`.
- **Height-unit ft/m toggle is sub-target visual size** — `new.tsx:793-824` paddingV:2/H:6, 11px, 4px gap; hitSlop mitigates touch but visual targets ~16px and the 8px slop zones overlap across the 4px gap. P3. *Fix:* reuse the `UnitToggle` primitive (44px, used in `edit.tsx:499`/`amend.tsx:478`).
- **Review Access stat truncates multi-value to one line** — `new.tsx:1011-1022` three flex:1 Stat columns, value `accessMethod.join(', ')` in `type.detailStat` `numberOfLines={1}` (`:1202`); v5 multi-select makes long joined values realistic. P3. *Fix:* smaller type / `numberOfLines={2}` / full-width labeled line for Access.

### More / Profile / Onboarding / Settings
- **SettingsRow disabled "Chain integrity" row still shows a chevron + button role** — `more.tsx:346-351,941`: `onPress=undefined` when no chain head, but SettingsRow always renders IconChevron (:941) + hardcodes `accessibilityRole="button"` (:901). P3. *Fix:* give SettingsRow a disabled notion (drop/dim chevron, clear role, skip pressed style).
- **Setup "Create logbook" CTA uses IconLock (security semantics)** — `setup.tsx:241` vs profile-edit's parallel save using IconCheck (`profile-edit.tsx:230`); IconLock is also the Security row glyph (`more.tsx:366`). P3. *Fix:* IconCheck or a seal/stamp glyph; reserve the padlock for security.
- **OperatorCard shows "No profile" during initial load; no isError** — `more.tsx:65,237-263` `const p = profile.data` with no loading/error gate → flash of empty/wrong state on cold open. P3. *Fix:* skeleton on `isLoading`, inline retry on `isError` (mirror account.tsx).
- **OperatorCard name truncates hard to 1 line** — `more.tsx:522-543` `numberOfLines={1}` in flex:1 beside a fixed Pill (flexbox prevents overlap; the issue is readability loss). P3. *Fix:* `numberOfLines={2}` / icon-only pill at small widths / adjustsFontSizeToFit.
- **Backup restore checkbox tick fills the box edge-to-edge** — `more.tsx:1091-1106`: 20×20 box (17px inner) holds IconVerified size 14 → 20px painted, zero inset. P3. *Fix:* box to 22-24 or tick size 12.
- **Restore TextInput is raw, not the Field primitive** — `more.tsx:1021-1042` inline borderWidth:1/JetBrainsMono, no focus ring (Field uses 1.5 + accent focus). P3. *Fix:* use Field (add a `mono` flag).
- **Attachments: subtitle "Loading…" but empty body + no isError** — `attachments.tsx:57-86`, EmptyState gated on `groups.length===0 && all.isFetched` (:71). P3. *Fix:* body skeleton on `!isFetched`, isError branch + refetch.

### Verify / Export / Archives / Hours
- **Archive detail is a dead-end blank for a stale/deleted id** — `archives/[id].tsx:39,63,121` `data ? ... : null`; `getArchive` returns null permanently for a missing row → only the TopBar + empty body, no way forward but Back. P3 (resolved-but-missing, distinct from first-load null). *Fix:* `archive.isFetched && !data` → EmptyState "Archive not found" + Button to `/archives`.
- **Concentric-ring decoration not clipped to the PreviewCard corner** — `export.tsx:388-412` Svg at right/top:-34 inside a Card with `borderRadius:18` and no `overflow:'hidden'` (`card.tsx:27-34`); bleed is only a few px near the top-right (the 94px figure was corrected away). P3, low. *Fix:* wrap decoration in an `inset:0, borderRadius:18, overflow:'hidden'` View, or add overflow:hidden to this Card usage.
- **Three-up archive photo grid may orphan the 3rd tile on 320px devices** — `archives/[id].tsx:78-91` `width:'31.5%'` + gap:8 doesn't reserve gap budget (~280.6 vs ~280). P3, low. *Fix:* `31%` or compute `(W - 2*8)/3`.
- **Archives empty-state CTA bypasses the EmptyState `action` slot** — `archives/index.tsx:58-75` reimplements the slot the primitive provides (`empty-state.tsx:11,88`). P3, low — reuse nit (the fix reproduces today's full-width layout only if wrapped in `alignSelf:'stretch'`).
- **BaselineRow overrides type.body weight/family inline** — `hours-baseline.tsx:244`. P3 (typography). *Fix:* numeric/emphasis token.

### Shared primitives (non-icon)
- **SwipeableRow hint wiggle ignores reduced motion** — `swipeable-row.tsx:25-43` runs the mount-time jolt unconditionally; every other animated primitive gates on `useReducedMotion`. P2. *Fix:* import `useReducedMotion` and early-return from the hint effect when reduced.
- **MultiChipSelect silently ignores ChipOption.icon/count** — `multi-chip-select.tsx:47-86` renders only `o.label` (:83-85), but the type carries icon+count and ChipSelect renders both (`chip-select.tsx:89-103`). P3. *Fix:* mirror ChipSelect's icon/count rendering.
- **HashGlyph bars are ~1px at the default size** — `hash-glyph.tsx:22` `barWidth=(size-gap*7)/8` → 1px at size 22, 1.25px in ChainLink (size 24). Identity value largely lost; sub-pixel blur. P3. *Fix:* gap=1, or fraction-of-size gap, or default size ~28.
- **InfoSheet backdrop is a labeled-but-roleless full-screen Pressable** — `info-sheet.tsx:90` `accessibilityLabel="Close sheet"` with no `accessibilityRole='button'`; wraps every bottom sheet. P3. *Fix:* add role; consider `accessibilityViewIsModal` on the sheet.
- **ToggleRow track/knob use raw px, don't scale with UI_SCALE** — `toggle-row.tsx:15-18` literals 40/24/20 while the label uses scaled `type.cardTitle`. P3. *Fix:* wrap constants in `scaled()`.
- **Field readOnly has no visual / a11y disabled cue** — `field.tsx:76-137` only sets `editable={false}` (:130); same bg/opacity/border as editable, no `accessibilityState`. P3. *Fix:* dim row + `accessibilityState={{disabled:true}}`.
- **Field error has no live region / a11y state** — `field.tsx:146-150` danger text + thicker border (good, not color-only) but no `accessibilityLiveRegion='polite'`/hint tying message to input. P3. *Fix:* add live region + hint. (Reinforces 2(e).)
- **ClassificationChips "More" uses a fullwidth `＋` (U+FF0B) baked into the label** — `classification-chips.tsx:91,150`. P3. *Fix:* render IconNew/plus + plain "More".
- **ChainLink rail top/bottom offsets hardcoded to a 56px row** — `chain-link.tsx:44-54` literal `top:28/bottom:28` while `railLeft` is computed; desyncs if row padding/typography (or HEAD Pill UI_SCALE) changes. P3, low. *Fix:* derive from bullet metrics / onLayout.
- **SigFill ignores the purpose-built `signatureScrawl` token** — `sig-fill.tsx:52-60` hardcodes Newsreader 26/30/0.4; `signatureScrawl` (type.ts) is referenced nowhere else. P3. *Fix:* spread `...type.signatureScrawl`.
- **SealAnim doesn't announce the sealed state** — `seal-anim.tsx:180-181` caption flips visually only, no live region, at the audit-critical moment. P3, low. *Fix:* `accessibilityLiveRegion='polite'` + role text.
- **SigPad dev/web mock Pressable lacks role/label** — `sig-pad.tsx:98-108`, __DEV__ + web-only so ~zero impact. P3, low — sweep nit.

---

## Nits & visual-conjecture (needs an on-device / screenshot pass)

These are `basis=visual-conjecture` or low-confidence items. **Pure-visual polish — exact spacing, "below the fold," off-center magnitude, crowding/overlap, truncation under glyphs — was NOT verifiable by static code reading.** The mechanism is confirmed where noted, but the *visible outcome* depends on device viewport, glyph metrics, and content length; it must be confirmed on a real device / screenshots.

- **Action-tile grid pushes gear tiles below the fold on first paint** — `today.tsx:258-265, 680-708`. Layout confirmed; "below the fold" is viewport-dependent. (Reference for redesign 2(c).) P2/visual-conjecture.
- **Header trailing cluster (chip + bell) crowds the status bar** — `top-bar.tsx:20-26,67-83`; translucent StatusBar (`theme-provider.tsx:64`). Using the raw safe-area inset is standard; crowding is device-dependent. P3. *Possible:* `paddingTop: Math.max(insets.top,12)+6`.
- **Records search suffix icon may crowd a truncating placeholder** — `records.tsx:216-221` (Field internals not opened). P3, low.
- **TopBar large-mode zero-width center `<View/>`** — `top-bar.tsx:73-79`; visually inert under space-between (the "asymmetric gap" claim was corrected away) — code-clarity nit only. P3, low.
- **TopBar compact title flex-centered between unequal clusters → off true screen-center** — `top-bar.tsx:36-45,67-83` (logged twice, same root). Mechanism real; magnitude depends on per-screen clusters. P3. *Fix if confirmed:* equal `minWidth` on leading/trailing, or absolutely-positioned centered title.
- **Catalog row: long manufacturer + category tag + chevron may clip** — `catalog.tsx:214-225`; priority inversion real but category labels are short. P3, low.
- **Catalog search Field has no visible label** — `catalog.tsx:100-106`; placeholder fallback covers the SR case. P3, low. *Fix:* `accessibilityLabel="Search gear catalog"`.
- **Gear-tile grid `width:'22%'` may wrap to 3** — `new.tsx:870-916`. P3, medium (also listed under section 3 with the fix).
- **Entry-detail hero status column may squeeze the title** — `[id].tsx:342-347`; depends on a 360px device + long site name + "Rescue drill". P3, low.
- **ChoiceRow "Default" Pill may crowd a 2-line hint** — `new.tsx:1169-1191`; verify on 360px with the longest hint. P3, low.
- **Field placeholder/cursor visual fusion for stem-initial placeholders** — `sign.tsx:480` / `request-signature.tsx:240` ("Jordan Lee"); fusion is glyph/caret-render dependent. P3, medium. *Fix:* non-stem placeholder ("Full name") or a focused-empty caret offset.
- **Onboarding intro: short slides leave a large dead gap before pager+CTA** — `intro.tsx:198-223` `justifyContent:'center'` (may be intentional). P3, medium — owner-adjacent.
- **Edit profile: single-cert form leaves a large gap before the pinned footer** — `profile-edit.tsx:171-223` (top-aligned scroll + absolute footer). Owner-flagged. P3, medium. *Fix:* helper card to fill, or move save inline.
- **OperatorCard avatar edit-badge ~2px crescent clipped by the rounded corner** — `more.tsx:467-520` (mechanism corrected: clip is from the rounded corner, not a flush-edge shave). P3, low.
- **PhotoStrip empty-slot labels (textFaint on bg) are weak readable text** — `photo-strip.tsx:94-114`; textFaint/bg = 2.52 Forge / 2.55 Mercury, sub-4.5 on all palettes for 10px. (The headline "on surface2" attribution was corrected — it's over bg.) P3. *Fix:* use `textDim` for slot labels; reserve textFaint for decorative.
- **IconChevron / IconBtn perceived weight & residual off-center** — `index.tsx:175-184` (chevron weight = eyeball call); `icon-btn.tsx:82-84` residual offset largely masked by the Pressable's own centering (the primitive fix is in D1). P3, low.

---

## Counts

Counting **post-dedup report items** (the actionable units in this report), not the ~80 raw finder findings (which collapse heavily via the dedup map — notably ~9 icon-box findings → D1, ~12 icon-quality findings → 2(b), ~15 typography-drift findings → the type-scale umbrella, and ~12 thin-async findings → D11 + the async umbrella).

**By severity (report items):**
- **P1:** 0 as a standalone tier (the one P1-tagged finder item — the icon box-size bug — is carried as **D1/P2** by blast-radius reasoning, with the severity contradiction noted at D1).
- **P2:** 12 top-defect items (D1–D12; D11 has 4 sub-instances a–d, of which D11b/c/d are P2 and D11a is P3) + 1 secondary primitive (SwipeableRow reduced-motion). The contrast P2 family (D5–D7) plus the AA-instance offshoots in section 3 are P2 root causes.
- **P3:** the bulk — ~40 secondary findings + ~12 owner-bucket sub-items (icon-quality table 2(b)) + ~17 nits/visual-conjecture in section 4.

**By basis:**
- **code-confirmed:** the entirety of sections 1–3 and most of 2(b) (every concrete fix is backed by a verified `file:line`).
- **visual-conjecture / low-confidence:** ~17 items, all isolated in section 4 (plus 2 dead-code icons in 2(b): IconWifi, IconLocation, flagged "no live call site").

**# affected files (unique paths across all items):** ~35, concentrated in:
- `src/ui/primitives/v2/` — button, icon-btn, sync-chip, pill, field, date-field, card, toggle-row, hash-glyph, info-sheet, chain-link, sig-fill, seal-anim, sig-pad, multi-chip-select, classification-chips, swipeable-row, top-bar, countdown-dial, empty-state, photo-strip
- `src/ui/icons/index.tsx` + `src/ui/icons/custom/{cloud,brokenChain,lock}.ts`
- `src/ui/theme/themes.ts` (D5/D6 token darkening)
- `src/domain/logbook/entry-readiness.ts`, `today-derivations.ts` (redesign spines)
- `app/(tabs)/{today,records,gear,more}.tsx`
- `app/entry/{new}.tsx`, `app/entry/[id].tsx`, `app/entry/[id]/{sign,edit,amend,request-signature}.tsx`
- `app/gear/{catalog,[id]}.tsx`, `app/verify/[code].tsx`, `app/export.tsx`, `app/archives/{index,[id]}.tsx`, `app/hours-baseline.tsx`, `app/attachments.tsx`, `app/profile-edit.tsx`, `app/(onboarding)/{intro,setup}.tsx`, `app/index.tsx`

**Highest fix-leverage (one change clears many sites):** D1 (4 primitives → app-wide icon centering), D5/D6/D7 (per-palette `themes.ts` token nudges → all primary CTAs / all accent selections / all warn callouts), the typography-scale umbrella (primitive-layer `type.*` migration → ~15 sites), and the icon-render contract in 2(b) (finish CustomIcon migration → kills the duotone-mixing root cause).
