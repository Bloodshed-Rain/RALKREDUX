# RALB Codex Edition — UI/UX Audit (2026-05-28)

**Method.** 29 finder agents across 9 screen groups × 4 lenses (UI design-system fidelity, UX field-context, code-bug + accessibility, rope-access compliance), each finding adversarially re-verified against the source by a skeptical verifier, then deduped + prioritized. 180 verified raw findings → 36 deduped findings below. Every agent was primed with the "known / intentional / fixed" baseline so this surfaces **new signal**, not settled decisions.

**Tags.** `NEW` = not previously on the board · `KNOWN-BACKLOG` = already tracked · `code-certain` = provable from source · `needs-on-device` = only confirmable on a running device.

**Raw counts:** P0 ×3 · P1 ×16 · P2 ×15 · P3 ×5 · (123 NEW / 57 KNOWN-BACKLOG · 161 code-certain / 19 needs-on-device).

---

## Verdict — `yes, fix now`

This is a mature, well-architected app with a sound design system — **not** a redesign candidate. The bulk of findings are known-backlog typography drift and async-state polish that can wait. What forces action is a small, **code-certain cluster of NEW correctness/safety/audit-integrity bugs on error and edge paths**:

- Silent save failures on edit / amend / gear / setup — a tech can believe an audit record saved when it did not.
- A green **"Verified"** pill that renders simultaneously with **"Chain mismatch"** on a tampered signed entry.
- Audit exports that label training/assessment hours "Rope access hours" and omit v3 fields the signature attests to.
- WCAG AA failures on the destructive-restore and auth-error copy — worst exactly in the glare conditions of the field-tech north star.
- Dead / dead-end controls (the "More" header button; verifier-portal terminal states with no back).
- An in-flight custom-icon rewrite that silently voids the theme color contract for tabs / FAB / status pills.

Most fixes are trivial-to-medium and concentrate at the **primitive/token layer**, so a few changes lift many screens at once.

> **P0s independently re-verified against live code by the orchestrator** (not just the workflow): edit `save()` has only `onSuccess`; amend & gear use `onError: () => haptics.error()` (haptic only); the `Verified` Pill at `app/entry/[id].tsx:833-835` renders unconditionally inside `if (signature)` with no `chainValid` reference, while `Chain mismatch` fires at `:348-352` — confirmed they can render together.

### Cross-cutting themes
1. **Silent write-failure on every mutating path except create** (edit-draft, amend, gear-inspection/retire, first-run profile-create). The create flow already does it right; these are the inconsistent outliers. On an audit logbook this is a data-integrity hazard, not just friction.
2. **Audit-export & trust-signal correctness** — mislabeled hours, dropped attested fields, blank site-signer authority, and the contradictory Verified/Chain-mismatch pair. Directly weakens the audit-readiness the product is built toward.
3. **Cross-palette WCAG contrast** — a systemic "saturated token over its own `*Soft` fill" pattern fails AA on the three light palettes + Mercury. One darkening pass in `themes.ts` + the owed on-device sweep clears most of it.
4. **Touch ergonomics under the gloved/harnessed north star** — `ChipSelect`, `ClassificationChips`, the `new.tsx` ft/m toggle, and several chips are ~28–33px with no `hitSlop`, below the 44px the repo's own `IconBtn` codifies. Fixable at the primitive level.
5. **Typography drift (known backlog)** — hero titles, list rows, chips, and primitives hand-roll raw `fontSize` that bypasses `UI_SCALE` (1.18), rendering ~15–18% small. Highest leverage is the shared layer.
6. **Thin async-state + dead affordances** — loading mostly returns `null`, `isError` essentially unhandled, so query failures read as "empty"/"not found"; plus the in-flight CustomIcon color-contract drop.

---

## P0 — fix before anything else (correctness / audit integrity)

### 1. Edit-draft and amend saves fail silently — no `onError` feedback on an audit record · `NEW` · `code-certain` · small
`app/entry/[id]/edit.tsx:163-188` · `app/entry/[id]/amend.tsx:142-149` · `src/domain/logbook/use-logbook.ts:101-108,152`
`edit.tsx` `save()` calls `updateDraft.mutate` with **only** `onSuccess`; `amend.tsx`'s `createAmendment.mutate` has `onError: () => haptics.error()` — a haptic only. Neither hook defines `onError`. If the local SQLite write fails (disk full, locked DB, corrupt WAL — all plausible deep into an offline shift), the screen stays as-is, the button re-enables, and the tech gets no message. The amend path is worst: the tech has re-typed an entire legally-significant correction and a missed buzz (gloves/wind/vibrating structure) reads as success, inviting a double-create. `new.tsx` already wraps every commit in try/catch + Alert.
**Fix:** add `onError` to both → `Alert.alert('Could not save draft' / 'Could not create amendment', err.message) + haptics.error()`, keep the form populated. Mirror `new.tsx`'s `commitDraft`.

### 2. Gear inspection/retire failure leaves life-safety gear ACTIVE with only a buzz · `NEW` · `code-certain` · small
`app/gear/[id].tsx:192,328-338` · `src/domain/gear/use-gear.ts:69-81` · `src/domain/gear/gear-service.ts:160,197-199`
`performSubmit`'s mutation `onError` is `haptics.error()` only — no Alert, form stays open unchanged. The dedicated **Retire** `IconBtn` routes through the same submit. Real silent-failure paths: `gear_retired` (stale screen after another-session retire), `gear_not_found`, SQLite ROLLBACK rethrow. A tech logging a **FAILED** inspection or retiring an item, under glare/time pressure, feels one buzz and reasonably believes it's retired and walks away — but it's still ACTIVE. The create-gear flow 20 lines away **does** Alert on error.
**Fix:** give `recordInspection` an `onError` that Alerts the reason (map `gear_retired` etc. to friendly copy making clear the item was NOT retired) and keeps the form populated. Match `gear.tsx:171-174`.

### 3. Signed-entry detail shows green "Verified" pill even when chain-hash validation FAILS · `NEW` · `code-certain` · small
`app/entry/[id].tsx:833-835,112,348-352` · `src/domain/logbook/entry-hash.ts:111,116`
In `SignatureBlock` the green `Verified` Pill renders **unconditionally** whenever a signature exists (833-835), with no reference to `chainValid`. The tamper check only drives a separate `Chain mismatch` danger pill in the hero (348-352). When `chainValid.data === false` (entry tampered post-sign, or out-of-range `hash_version`) the signature still exists, so the screen shows **both** `Chain mismatch` AND green `Verified` at once — contradictory trust signals on the exact screen an auditor reads, with the reassuring one winning. (The verify portal uses the more accurate "Signed" label for the same icon.)
**Fix:** gate the `SignatureBlock` pill on `chainValid`: green `Verified` only when `chainValid.data === true`; render danger / suppress green when `false`; neutral "Checking…"/"Signed" while `undefined`. The block already receives the signature; threading `chainValid` through is low-cost.

---

## P1 — high value (audit correctness, field-context, a11y)

### 4. Audit PDF/CSV mislabel non-work hours as "Rope access hours" and omit the v3 fields the signature attests to · `NEW` · `code-certain` · medium
`src/domain/logbook/export.ts:284,509,25-47,271-298` · `src/domain/logbook/entry-hash.ts:8,52-56`
`work_hours` renders under the fixed label "Rope access hours" for **every** entry — for `entry_kind` training/assessment/rescue_drill this is affirmatively false, and an assessor counting hours toward an L2/L3 threshold can't exclude them. Separately, `entry_kind`, `hazards`, `rescue_cover` (all hashed under `ENTRY_HASH_VERSION=3`, i.e. part of what the supervisor attested to) appear in neither the PDF nor `CSV_HEADERS`. JSON export is unaffected — the lossiness is confined to the human-readable artifacts, the inverse of "auditor can read without the app."
**Fix:** branch the hours label on `entry_kind`; add `entry_kind`/`hazards`/`rescue_cover` to `CSV_HEADERS` + both PDF builders. Presentation only — no hash bump.

### 5. Audit exports + on-device signed view print blank cert for site-authorised signers · `KNOWN-BACKLOG` · `code-certain` · medium
`src/domain/logbook/export.ts:288-289,516-519,43-44` · `app/entry/[id].tsx:837-852` · `src/domain/logbook/types.ts:87-94`
A `site` signer has no cert number; their authority is `supervisor_role` + `supervisor_employer`. PDF/CSV and the on-device `SignatureBlock` render only name + "Certification number", so a legitimate site signature prints with a blank cert cell — reading to an auditor as a *missing required field* rather than a complete-but-different authority basis.
**Fix:** render a scheme-appropriate signer line (SPRAT/IRATA cert, or "Site-authorised: \<role\>, \<employer\>") in PDF + CSV + the on-device signed branch; suppress the empty cert row when `scheme === 'site'`. No hash bump.

### 6. Dead "More" `IconBtn` in entry-detail header · `NEW` · `code-certain` · small
`app/entry/[id].tsx:287` · `src/ui/primitives/v2/icon-btn.tsx:31-36,57-72`
`<IconBtn icon={IconMore} label="More" />` has no `onPress` and isn't `disabled` — full opacity, announces `disabled:false`, flashes its pressed state, does nothing. Real actions live in the footer.
**Fix:** wire it to an action sheet (Amend / Audit packet / Delete-draft / Share JSON) or remove it; at minimum pass `disabled`.

### 7. Verifier portal dead-ends: no-token / loading / not-found / hosted-completed states have no back affordance · `NEW` · `code-certain` · small
`app/verify/[code].tsx:289-359,227-285` · `src/ui/primitives/v2/top-bar.tsx:68` · `app/_layout.tsx:53`
These states render `headerShown:false` + a `TopBar` with no `leading`, so there's no back/close and the native header is suppressed. The portal is entered via deep link (often first on the stack → `canGoBack()` false). The hosted "Submitted" state gates "Return to logbook" on `!completedFromHosted`, so a hosted verifier who just submitted has zero dismissal.
**Fix:** pass a `leading` close `IconBtn` (`router.canGoBack() ? back() : replace('/')`) to all four terminal states; render a "Done" control in the hosted completed branch.

### 8. Offline / hosted-submit error states on the verifier portal mislead or dead-end at the highest-stakes moment · `NEW` · `code-certain` · medium
`app/verify/[code].tsx:344-359,200-223,662-668` · `src/cloud/supabase/remote-signing.ts:197-198`
`fetchHostedRemoteSigningRequest` returns `null` on any non-OK response, indistinguishable from a genuinely missing request; an offline throw lands in `error` with `data===undefined`, and the screen (which never reads `isError`) falls through to "Request not found." A verifier with a valid code retypes it. On submit failure (name + cert + drawn signature + attestation all entered) both paths show only "Remote signing failed… Refresh" — browser language, no Retry, no reassurance the input is preserved (it is).
**Fix:** split success-with-null-data from query error (+ Retry/refetch); relabel the submit failure CTA "Retry submit" and state the signature is saved; consider a hosted-fetch timeout.

### 9. Destructive cloud-restore warning + auth error banner fail WCAG AA on light/Mercury palettes · `NEW` · `code-certain` · small
`app/(tabs)/more.tsx:765-781` · `src/ui/auth/auth-screen.tsx:145-156` · `src/ui/theme/themes.ts`
Two safety-critical strings render a saturated token over its own `*Soft` fill as normal text. Restore warning (`warn`-on-`warnSoft` ~14px): heliotype 3.40 / forge 3.42 / mercury 2.92 — all fail. Auth error banner (the string telling a tech *why* sign-in failed; `danger`-on-`dangerSoft`): verdigris 4.09 / mercury 4.26 / tungsten 4.44 — all fail. Exactly the bright-glare/light-mode reading conditions of the north star.
**Fix:** render body copy in `tokens.text` over the `*Soft` fill; keep the saturated token for icon/border accent only. Don't darken the shared tokens app-wide for this one.

### 10. Sub-44px touch targets on selection/quick-fill chips across critical gloved flows · `NEW` · `code-certain` · medium
`src/ui/primitives/v2/chip-select.tsx:44-82` · `src/ui/primitives/v2/classification-chips.tsx:32-44` · `app/entry/new.tsx:737-764,557-572,1042-1051` · `app/entry/[id]/sign.tsx:613-620` · `app/(tabs)/today.tsx:508-540` · `app/verify/[code].tsx:629-644` (+others)
`ChipSelect` and the shared `ClassificationChips` Chip are ~30px with no `hitSlop` — the primary controls on sign/verify scheme+level, gear inspection result, entry-kind/hazards, and setup cert level. The `new.tsx` ft/m toggle is a bespoke ~16-18px in-suffix pill. The repo's own `IconBtn` codifies 44px and `MultiChipSelect` already adds `hitSlop` — so these are the outliers.
**Fix:** add `hitSlop` (~7px) or `minHeight:44` to the `ChipSelect` + `ClassificationChips` Pressables (fixes the bulk at the primitive level); replace the `new.tsx` ft/m toggle with the `UnitToggle` used by edit/amend (promote to a shared `SegmentedToggle`).

### 11. CustomIcon rewrite silently voids the theme color contract for tab focus, FAB ink, and status pills · `NEW` · `code-certain` · medium · *(in-flight working tree)*
`src/ui/icons/index.tsx:53-55,77,81,116` · `app/(tabs)/_layout.tsx:92,98-100,148` · `src/ui/primitives/v2/pill.tsx:85,100` · `app/(tabs)/today.tsx:704`
The in-flight icon rewrite routes `IconToday/Records/Profile/Plus/Draft/Bell/Harness/Rope/Carabiner` through `CustomIcon({xml,size})` (`<SvgXml>`) which never forwards `color`/`fill` (source SVGs bake fills). So: (a) the tab bar passes focused `color`/`fill` — no-op for the 3 CustomIcon tabs, so their glyph never brightens on focus while `IconGear` (still duotone) does — focus language splits 3-of-4 vs 1; (b) the FAB passes `accentInk` to `IconPlus` — ignored; (c) the canonical Draft status `Pill` renders `color={fg}` — ignored. Mechanism code-certain; on-device magnitude is palette-dependent.
**Fix:** make `CustomIcon` honor a single tint (normalize baked fills / drive `currentColor`), OR restrict custom raster icons to fixed illustrations and keep the duotone `Icon` for any tinted/active/tone/status context. Then reconcile every call site still passing `color`/`fill`.

### 12. HashGlyph implies cryptographic sealing on drafts and is fed wrong, inconsistent data across the two list screens · `NEW` · `code-certain` · medium
`app/(tabs)/records.tsx:337` · `app/(tabs)/today.tsx:272` · `src/ui/primitives/v2/entry-row.tsx:110` · `src/domain/logbook/types.ts:22-51`
`EntryRow` renders the 8-bar `HashGlyph` for any truthy `chainHash`, no status guard. Records passes `chainHash={entry.id}` (an `entry_<uuid>`, **not** a hash) for every row including drafts — an unsigned draft displays a glyph visually identical to a sealed entry. Today passes the single global `chainHead.data`, so all 5 recent rows paint an identical glyph. `LogbookEntry` has no `chain_hash` field, so even signed rows show a fake fingerprint, and the glyph means two different wrong things across screens.
**Fix:** render the glyph only for `signed`/`amended` rows keyed off that row's real signature `chain_hash` (expose it on the entries hook). If unavailable, drop it from the list and reserve it for detail — never on a draft.

### 13. `new.tsx` Step 1/2 disabled Continue names no blocking field; Step 3 review has no Back · `NEW` · `code-certain` · medium
`app/entry/new.tsx:442-444,276,284,426-446,894-1040`
Continue greys out until `step1Ready`/`step2Ready` and `handleContinue` silently early-returns, but nothing near the footer names the blocking field (only the date sub-case is surfaced). The footer only renders when `step < 3`, so Step 3 (Review) has **no Back** — a tech who spots a wrong site at the seal-it moment has only a terminal action or the X (keep/delete, not back).
**Fix:** surface an inline "N to go" hint near the footer (mirror `edit.tsx`); render a "Back to edit" on Step 3 (or tap-to-jump-back review fields).

### 14. Amend dead-end: full form editable but Save permanently disabled when source is unsigned · `NEW` · `code-certain` · medium
`app/entry/[id]/amend.tsx:116-117,290-390,407-419`
`canSave` requires `entry.status === 'signed'`. On a draft source, `sourceLocked` shows a small warn card but all fields stay editable + pre-filled. A tech can re-type a whole correction and only discover at the bottom the button never enables — and the disabled label is a passive "Finish amendment."
**Fix:** when `sourceLocked`, make fields read-only and replace the CTA with a redirect ("Edit this draft instead" → `/entry/[id]/edit"), or gate the form behind the warn state.

### 15. Local-sign Back/Cancel and OS back gesture abandon all signing input with no warning · `NEW` · `needs-on-device` · medium
`app/entry/[id]/sign.tsx:259-269,588-590,76-86` · `app/entry/[id]/edit.tsx:230` · `app/entry/[id]/amend.tsx:172`
Sign-screen Back + Cancel both call `router.back()` with no dirty guard, no Android hardware/edge-back interception. By the bottom a supervisor has typed name/cert/role/employer, **drawn** a signature, and ticked attestation — all in `useState` — and one corner mis-tap discards it at the device-handoff moment. Same for the edit/amend modals (`presentation:'modal'`, swipe-down dismiss + unguarded Back), while `new.tsx` correctly guards close.
**Fix:** guard Back/Cancel + modal dismiss (`beforeRemove`/`usePreventRemove`) with a Keep-editing / Discard Alert once dirty. Mirror `new.tsx`'s `handleClose`.

### 16. Home + setup error/loading paths blank or misroute the user · `KNOWN-BACKLOG` · `code-certain` · medium
`app/(tabs)/today.tsx:119` · `app/index.tsx:54-59` · `app/(onboarding)/setup.tsx:118-124`
Today's `if (!profile.data) return null` blanks the primary entry point on slow/failed profile load. The splash gate has no `isError` branch, so a transient local-DB read error can route an established user back through `/setup`/`/intro` as if they had no logbook. First-run profile-create failure is handled only by `onError: () => haptics.error()` — the single most important first-run moment fails opaquely (AuthScreen has a full danger banner; setup has no equivalent).
**Fix:** split loading/error/ready on Today (skeleton + retry); add an `isError` branch on the splash that holds with a retry; surface a `dangerSoft` error banner on setup create failure.

### 17. Email-OTP code step has no Resend and no recovery if the code never arrives · `NEW` · `code-certain` · small
`src/ui/auth/auth-screen.tsx:211-247,40` · `src/providers/auth-gate.tsx:37`
In `enter_code` the only escape is "Use a different email" — no Resend, no cooldown. OTP latency is common in weak signal; the workaround forces re-typing the same email and can then hit the rate-limit branch. First sign-in is a hard gate, so a tech who can't get the code is fully locked out.
**Fix:** add "Resend code" with a ~30s cooldown calling `sendEmailOtp(email)` without leaving the step.

### 18. "Request signature" and "Photo log" QuickLog chips are label/action mismatches · `NEW` · `code-certain` · small
`app/(tabs)/today.tsx:199-211,491-492` · `app/(tabs)/records.tsx:49` · `app/entry/new.tsx:202,656`
"Request signature" routes to `/records?filter=pending` — entries that *already* have a pending request — so the common case (finished draft, zero pending) lands on an empty list with no path. "Photo log" calls the identical route as "Same as last" (`/entry/new?seed=last`), opening the wizard at step 1 where there is no shutter, despite its inline comment claiming otherwise. Two differently-labelled chips do the same thing.
**Fix:** relabel "Request signature" → "View pending" (or deep-link a real start-request flow); make "Photo log" open camera capture first, or remove it.

### 19. Compact `TopBar` silently drops the subtitle on attachments/account/security/catalog · `NEW` · `code-certain` · small
`src/ui/primitives/v2/top-bar.tsx:81-86` · `app/attachments.tsx:55-65` · `app/account.tsx:115-119` · `app/security.tsx:87-93` · `app/gear/catalog.tsx:86-88`
The compact (non-large) `TopBar` renders `subtitle` only inside its large branch. On **attachments** this is worst — the subtitle is the only surface carrying the total file count AND the "Loading…" state, so neither ever shows. account/security/catalog lose orienting context the same way.
**Fix:** render a compact subtitle line in `TopBar`'s non-large mode (one primitive fix covers all four callers).

---

## P2 — consistency / polish / lower-stakes correctness

### 20. WCAG: warn/danger/accent/ok over their `*Soft` fill fail AA on gear deadlines, export tiles, snapshot kicker · `NEW` · `code-certain` · medium
`app/(tabs)/gear.tsx:420-424,297-306,452` · `src/ui/primitives/v2/pill.tsx:40` · `src/ui/primitives/v2/gear-card.tsx:116` · `app/export.tsx:440-459` · `app/(tabs)/more.tsx:806-816`
Same systemic class as #9 on lower-stakes surfaces. Gear DeadlineRow caption + warn Pill: heliotype 3.40 / forge 3.42 / mercury 2.92 fail; mercury danger/dangerSoft 4.26 fails. Export selected `FormatTile` label (accent-on-accentSoft): forge 2.82 / mercury 4.20 fail — the *chosen* format reads weakest. Snapshot kicker (ok-on-okSoft) mercury 4.22 borderline. Dark palettes pass.
**Fix:** one token-level pass in `themes.ts` — body/label text in `tokens.text`, saturated token for icon/border only; widen to mercury danger. Hand the hex to the on-device sweep.

### 21. Typography drift: shared primitives + screens hand-roll raw `fontSize` that bypasses `UI_SCALE` · `KNOWN-BACKLOG` · `code-certain` · large
`top-bar.tsx:46-62` · `entry-row.tsx:52-85` · `field.tsx:51-106` · `date-field.tsx:38-76` · `section-h.tsx:26-43` · `sync-chip.tsx:103-110` · `info-sheet.tsx:67-74` · `sig-fill.tsx:52-60` · `entry/new.tsx`, `edit.tsx`, `amend.tsx`, `request-signature.tsx`, `gear/[id].tsx`, `export.tsx`, `intro.tsx`, `(tabs)/_layout.tsx` hero/label blocks
`UI_SCALE=1.18` lives only inside `type.*` via `scaled()`, so inline literals render ~15-18% smaller than scaled chrome beside them. Pervasive: TopBar hero 32/36 (should be 38/45), the entire input primitive family, display primitives, hero blocks, the tab label. `intro.tsx subStyle` also sets **no** `fontFamily` (system-font fallback).
**Fix:** fix the shared layer first (top-bar, entry-row, input + display primitive families, one shared scaled hero token) — primitives lift every consuming screen at once.

### 22. Thin async-state: query failures indistinguishable from empty/not-found app-wide · `KNOWN-BACKLOG` · `code-certain` · large
`records.tsx:238` · `today.tsx:256` · `gear.tsx:104-105,141` · `gear/[id].tsx:108-130` · `gear/catalog.tsx:137-149` · `entry/[id].tsx:114-144` · `edit/amend/sign/request` · `account.tsx:66-159` · `attachments.tsx:70-78`
`isError` essentially unhandled; loading mostly `return null`. A failed read tells a tech with a full logbook "No entries yet"; entry/gear detail show "not found" on a transient error; sign/request fall to a permanent "Loading entry…" with the button forever disabled. Cloud-backup list failure (`listBackups` returns `{ok:false}`, never throws) collapses to "No cloud backups yet" — the disaster-recovery screen tells a tech recovering a lost device they have nothing to restore.
**Fix:** a small shared loading/error/empty convention (skeleton + retry/refetch); branch cloud backup on `data.ok===false`; tiles show an unknown glyph, not 0, on failure.

### 23. Swipe-to-delete discovery hint decided by a render-phase mutation of a module global · `NEW` · `code-certain` · small
`records.tsx:345-346,23` · `swipeable-row.tsx:25-43`
`renderItem` does `const playHint = !swipeHintShown; if (playHint) swipeHintShown = true;` — a render side-effect on a module flag. Under StrictMode/concurrent a discarded render can set the one-way flag so the wiggle never plays; in a virtualized list it fires on whichever draft renders first (maybe off-screen). Never re-arms. Bounded (swipe + long-press still work).
**Fix:** move the one-shot decision into an effect/ref tied to the first mounted draft; consider a persistent trailing-overflow delete affordance.

### 24. "N missing" guidance is count-only; verifier-side CTA is opaque · `KNOWN-BACKLOG` · `code-certain` · small
`edit.tsx:140-153,248-250` · `amend.tsx:104-115` · `entry/[id].tsx:341-347` · `verify/[code].tsx:693-697`
`missingFields()` computes a precise list but edit/amend/detail render only "N missing" and discard the strings (sign + request screens *do* inline the names — the most-visited surfaces withhold it). The verifier disabled CTA reads "Finish verification" with no hint of what's outstanding.
**Fix:** make the pill tap-to-scroll / render field names; add a verifier hint ("Add your signature / Tick the attestation to continue").

### 25. "Due ≤14d" copy contradicts the 30-day due-soon threshold · `NEW` · `code-certain` · trivial
`gear.tsx:179,313` · `gear-service.ts:16,31`
The subtitle + Deadlines header label the count "due ≤14d", but `dueSoonItems` is `status==='due_soon'` = `daysUntilDue <= DUE_SOON_DAYS (30)`. An item 25 days out is counted yet the label promises ≤14d — a tech budgeting their week mis-plans.
**Fix:** reconcile the copy and derive the suffix from `DUE_SOON_DAYS`.

### 26. Passing an inspection with a blank Next-due silently drops gear to a "No date" warning · `NEW` · `code-certain` · small
`gear/[id].tsx:368-376,453` · `gear-service.ts:171,24`
On pass / pass-with-concerns the Next-due `DateField` is optional. Blank stores `next_inspection_due=null` → `unscheduled` → the warn "No date" pill. A clean pass moves a healthy "Current" item into a perpetual warning with no explanation.
**Fix:** prefill Next-due from the re-inspection interval on a pass, or warn inline before submit.

### 27. Catalog thumbnail has no load-error fallback — offline rows will render empty boxes (regression-guard) · `NEW` · `code-certain` · trivial
`gear/catalog.tsx:200-208` · `migrations.ts:472-485`
`CatalogRow` shows the category icon only when `image_url` is falsy, never when a remote image fails to load. Latent today (no backfill), but the migration plans a curation pass — the moment it lands, any offline image fails to an empty grey box.
**Fix:** add an `onError` to the `<Image>` that flips a per-row failed flag and swaps to the category Icon.

### 28. Accessibility holes: status suppressed by explicit labels, missing roles/state, label-only toggles · `NEW` · `code-certain` · medium
`entry-row.tsx:90` · `gear-card.tsx:88` · `toggle-row.tsx:71-86` · `gear.tsx:427` · `today.tsx:240` · `request-signature.tsx:241-262` · `new.tsx:737-764` · `verify/[code].tsx:646-652`
`EntryRow`/`GearCard` set an explicit `accessibilityLabel` on the accessible Pressable, **overriding** the child StatusPill/inspection-Pill text — so a screen-reader user never hears "Draft"/"Signed" or "Xd overdue" (the most decision-critical attribute each conveys). `DeadlineRow` has role but no label; "See all" has neither; the request disclosure lacks `expanded`; the ft/m toggle + supervisor radios convey selection by color only; the verifier `SigPad` exposes no label/role.
**Fix:** fold status/days into the Row labels (and humanize the ISO date); add labels/roles/`expanded`/`selected` to the rest; label the SigPad container.

### 29. Several silent or unhandled share/export error paths on data-export surfaces · `NEW` · `code-certain` · medium
`entry/[id].tsx:163-170,201-225` · `more.tsx:98-105` · `export.tsx:170-178`
`shareEntryPacket` (JSON audit packet) awaits export + `Share.share` with no try/catch — a failed build (e.g. evicted offline photo) → unhandled rejection, no feedback (the sibling PDF path has try/catch). `shareBackupSnapshot` has no try/catch. The verifier "Share link" silently falls back to a local `ralb://` deep link on hosted-sync failure with identical copy, so an offline configured tech can believe a remote verifier can sign a link they can't open. JSON/CSV ship as raw `Share.share` message text, not named files.
**Fix:** wrap the share handlers in try/catch (swallow cancel, surface failures); adapt copy when the link fell back to local; write JSON/CSV to `cacheDirectory` + `Sharing.shareAsync` as named files like the PDF path.

### 30. Verifier-side state contradictions and stale-data leak · `KNOWN-BACKLOG` · `code-certain` · medium
`verify/[code].tsx:117-125,304-311,125-143,478-483,56-57`
The CTA branches only on `hasVerifierName`, so on a not-ready entry the banner says "Finish the entry first" while the button says "Add verifier name." The request-changed reset clears most fields but **not** `supervisorRole`/`supervisorEmployer`, so a delegated "site" signer can submit request B carrying request A's role+employer (wrong identity on an audit record). The integrity section is titled "Tamper proof / proves the record has not changed" — contradicting the deliberate "Tamper-evident" framing. The fixed attestation "I am the requested verifier" is forced even on the supported delegated/"Different signer" path.
**Fix:** one priority order for label+banner; add `setSupervisorRole('')/setSupervisorEmployer('')` to the reset; relabel to "Record integrity"/"Tamper-evident"; branch the attestation copy on whether signer matches recipient.

### 31. Primitive correctness: ToggleRow off-knob dark-on-dark, dead prop, gesture/keyboard traps · `NEW` · `code-certain` · medium
`toggle-row.tsx:38-41,96-110` · `chip-select.tsx:15` · `classification-picker-sheet.tsx:97-148` · `sign.tsx:280` · `verify/[code].tsx:387` · `swipeable-row.tsx:25-43`
ToggleRow's OFF knob is `tokens.bg` over a `surface2` track — on dark palettes a dark disc on dark, distinguished only by a drop shadow (weak in glare). `ChipSelect` declares a `scrollable` prop never used (gear screens worked around it). The classification picker's rows lack `keyboardShouldPersistTaps`, so the first tap with the keyboard up is eaten. Signature scroll-lock (`scrollEnabled={!signatureActive}`) can latch on if a stroke's `onStrokeEnd` is missed (gesture cancel/backgrounding), leaving the form unscrollable. SwipeableRow's mount wiggle ignores `useReducedMotion`.
**Fix:** light/bordered OFF knob; remove/implement `ChipSelect.scrollable`; `keyboardShouldPersistTaps='handled'`; reset `signatureActive` on blur/cancel/timeout; guard the wiggle with `useReducedMotion`.

### 32. Remote verifier cannot review gear or attached evidence — structural parity gap · `KNOWN-BACKLOG` · `code-certain` · large
`verify/[code].tsx:438-476` · `types.ts:186-190` · `remote-signing.ts:63-78`
The attestation states the signer "reviewed this work record," but the WORK RECORD card omits the gear register and photo evidence. Structural: `RemoteSignatureRequestDetail` carries only `{entry, request, signature}`, and the hosted payload never sends gear/attachments. Both remote paths carry identical attestation text with materially less basis than a local supervisor physically reviews.
**Fix:** widen the detail type + hosted payload to carry gear+attachments and render them before authorization. Until parity exists, the attestation shouldn't claim the full record was reviewed.

### 33. Boot/lock/tamper providers can strand or interrupt the user mid-task · `NEW` · `needs-on-device` · medium
`app-providers.tsx:46-67` · `app-lock.tsx:106-148` · `tamper-guard.tsx:9-26`
`BootSplash` shows the DB/font-init failure in danger but exposes **no retry** (an unresolved `useFonts` keeps `booting=true` with no timeout). `AppLock` returns the overlay instead of `{children}` on lock → unmounts the subtree and resets all `useState`; an idle re-lock during a supervisor handoff destroys the in-memory captured signature. `TamperGuard` can flip to a full-screen takeover mid-task.
**Fix:** add "Try again" + a fonts timeout to the failed BootSplash; overlay the lock as an absolute-fill modal (keep the subtree mounted) or exclude dirty routes from idle re-lock; hold the TamperGuard takeover behind first render.

### 34. Copy promises a non-existent "subscription"; attachment rows show raw ISO dates · `NEW` · `code-certain` · trivial
`account.tsx:117` · `more.tsx:253` · `attachments.tsx:147-149`
Account subtitle "Sign-in and subscription" + the more.tsx row "Sign-in, subscription, and sign out" — there is no subscription surface anywhere (and unconfigured mode has no sign-out). Attachment rows render `item.entry_date` (raw ISO) while the rest of the app uses `formatDateOrDash`.
**Fix:** drop "subscription" until it ships; wrap attachment dates in `formatDateOrDash`.

---

## P3 — minor polish

- **35. Minor a11y/state polish** (`NEW`, medium) — wizard progress / splash sweep / boot-lock-auth holds carry no `progressbar`/`busy` role; OTP step swap moves no SR focus; PhotoStrip CaptureTile no `busy`; InfoSheet inner tap-swallow Pressable accessible with no role; dead Chain-integrity row shows a chevron + depresses; Apple button stays active-looking while another flow is busy.
- **36. Latent / dead code in primitives** (`NEW`, medium) — `Field` no-op `paddingVertical: multiline ? 10 : 10` + unused `readOnly`; `classification-picker-sheet` dead `surface2 ?? surface`; SyncChip spins a size-17 icon in a 14×14 box; DatePickerSheet reset keyed on `[visible, value]` clobbers a live draft; multi-classification can drop both case-variant duplicates; SealAnim replays on a non-memoized `onSealed`; ChainLink rail fixed offsets detach under large Dynamic Type; seal screen can strand if `signed.entry.id` is falsy.
- **(within 36) Field has no invalid-state treatment** — validity is signalled only by the faintest helper copy (no red border/icon); add an `error?`/`invalid?` prop respecting Heliotype's outlined-ink danger. PhotoTile scrim hardcodes `rgba(0,0,0,0.5)`+`#FFFFFF` — correct over arbitrary imagery but undocumented; add a one-line comment marking the intentional exception.
- **account/security/attachments not declared in the root Stack** (`KNOWN-BACKLOG`, trivial) — **not** broken nav and **not** a double-header (expo-router auto-registers; each self-declares `headerShown:false`). Residual risk is consistency only: no shared `screenOptions`, possible native-header flash, and a future contributor removing the inline override silently reintroduces the double-header. Add explicit `<Stack.Screen … headerShown:false />` entries.
- **Auth wall minor friction** (`needs-on-device`) — no proactive "first sign-in needs internet" note; email/code Fields stay editable mid-flight and `verifyEmailOtp` re-reads live email; BootSplash can flash tungsten before the persisted theme resolves.

---

## Recommended action plan

**Now (small, high-value, mostly P0/P1):**
1. Add `onError` Alerts to the three silent mutating paths (edit save, amend create, gear inspection/retire) + a `dangerSoft` error banner to setup profile-create — mirror the create-flow pattern. *(#1, #2, #16)*
2. Gate the green "Verified" pill on `chainValid.data===true`; wire-or-disable the dead "More" button; add back/close to the four verifier-portal terminal states. *(#3, #6, #7)*
3. Swap saturated-token-on-Soft-fill text to `tokens.text` on the destructive cloud-restore warning + the auth error banner (keep the colored border). *(#9)*

**Next (medium, leverage):**
4. Fix export compliance: branch the hours label on `entry_kind`; add `entry_kind`/`hazards`/`rescue_cover` + site-signer authority to PDF + CSV + the on-device signed view. *(#4, #5)*
5. Primitive/token pass: `hitSlop`/`minHeight` on `ChipSelect` + `ClassificationChips`; make `CustomIcon` honor `color` (or restrict it to fixed illustrations); spread `type.*` into top-bar/entry-row/primitive families + one shared scaled hero token; run the `themes.ts` contrast darkening pass + the owed on-device 6-palette sweep. *(#10, #11, #20, #21)*
6. Guard edit/amend modals + sign screen against swipe/back data loss; add Resend-with-cooldown to OTP; fix the QuickLog chip label/action mismatches and the gear "≤14d" copy. *(#13, #14, #15, #17, #18, #25)*

**Later (structural, non-gating):**
7. Build a shared async loading/error/empty convention (skeleton + retry) and roll it across Today/Records/Gear/detail/sign/request/account/attachments; finish verifier gear+evidence parity (schema + hosted payload + UI); complete the full typography sweep + boot/lock/tamper interruption-recovery hardening. *(#22, #32, #33)*

---

## Coverage limitation

This is a **static source read**. It proves code logic, navigation registration, prop wiring, and exact WCAG contrast math from the token hex — but it cannot confirm anything that only manifests on a running device across the six palettes. Owed to an on-device pass: (1) cross-palette visual contrast *feel* and the marginal cases (Mercury danger 4.26 / ok 4.22; the dark-on-dark ToggleRow off-knob) + the still-owed 6-palette sweep; (2) the on-device visibility magnitude of the CustomIcon color-drop; (3) gesture/keyboard conflicts (modal swipe-dismiss data loss; signature scroll-lock latch; classification picker first-tap eaten); (4) keyboard avoidance on the long sign/verify/new forms; (5) native-header flash on the unregistered account/security/attachments routes; (6) timing-dependent provider behavior (app-lock unmount during handoff, tamper-guard mid-session takeover, cold-boot theme flash); (7) ChainLink rail detaching under large OS Dynamic Type. Sub-44px hit-target *sizes* are code-certain; only the real-world mis-tap rate is on-device.
