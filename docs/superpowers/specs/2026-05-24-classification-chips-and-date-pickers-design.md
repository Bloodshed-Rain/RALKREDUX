# Design: Expandable + custom classification chips, and calendar date pickers

Date: 2026-05-24
Branch: `feat/classification-chips-and-date-pickers` (off `main`)
Status: design — approved approach, pending spec sign-off

## Summary

Two independent UX improvements to entry logging, requested together:

- **Part A — Classification chips.** Expand the preset vocabularies for `work_task`,
  `access_method`, `structure_type`, and `hazards`, and let technicians enter their own
  custom value when no preset fits. Custom values are remembered (device-local) and
  resurface unobtrusively as type-ahead suggestions.
- **Part B — Calendar date pickers.** Replace the plain ISO-text date `Field`s with a
  themeable calendar opened in a sheet, applied to every field that takes a date.

Neither part changes the entry schema or the entry hash. A separate latent audit defect in
the current `work_task` presets is corrected in the same pass (see A1).

Domain rationale for Part A is recorded in
`.claude/agent-memory/sprirata-rope-access-advisor/work-task-taxonomy-and-custom-entry.md`.

## Goals

- More realistic, rope-access-credible preset lists, taken from the domain advisor's ruling.
- A custom-entry path on every chip field, with sane guardrails for audit-readiness.
- Custom values remembered without cluttering the chip row.
- Real calendars on iOS, Android, and web preview, matching the v2 design system.
- No regressions to the offline-first / local-SQLite-canonical model.

## Non-goals (explicitly out of scope)

- No entry-schema or `ENTRY_HASH_VERSION` change. `work_task` / `access_method` /
  `structure_type` are already free-text and already in `canonicalizeEntry` at v3.
- No managed "edit my saved types" settings screen (the curated-list option was declined).
- No range-selection-in-one-calendar; range fields stay as two single-date pickers.
- No `anchor_method` split out of `access_method` — that is a genuine v4 entry-shape change
  and stays parked (see the advisor's hash-version-bump candidates memory).
- `entry_kind` (work / training / assessment / rescue_drill) stays a fixed, locked enum.

---

## Part A — Classification chips

### A1. Data model & integrity (no schema/hash change)

`work_task`, `access_method`, `structure_type` are `TEXT` columns; `hazards` is a canonical
sorted-JSON `TEXT` column. All are already part of `canonicalizeEntry` at `ENTRY_HASH_VERSION = 3`
and stored **as typed**. Therefore:

- A custom value hashes exactly like a preset value — **no v4 bump, no canonicalization change.**
- CSV/spreadsheet injection is already neutralized by `csvCell` in `export.ts`; custom text
  flows through it unchanged.
- The only residual risk is human (a misleading label sealed into a signed record). The control
  is **show-before-sign** (A5), not input validation.

**Latent defect fixed in this pass (approved):** remove `Training`, `Assessment`, and
`Rescue standby` from the `work_task` presets. They double-encode the locked `entry_kind` enum
(`training` / `assessment`) and the `rescue_cover` field, which can freeze contradictory facts
into a signed, hashed entry. After this change, `work_task` is purely the technical activity.

### A2. Preset vocabulary — single source of truth

Create `src/domain/logbook/classification.ts` exporting the four preset lists plus the
removed-presets denylist (A3). Today the lists are hardcoded inline in `app/entry/new.tsx` and
duplicated in `edit.tsx` / `amend.tsx`; all three screens import from this module after the change.

Ordered by rough hour-share (most-tapped first); the static inline cap (A4) keeps the common
ones visible without scrolling.

**`WORK_TASK_PRESETS`** (18):
Inspection (visual) · NDT / testing · Maintenance / servicing · Cleaning / washing ·
Painting / coating · Bolting / torque / tensioning · Welding / hot work · Glazing / cladding ·
Rigging / installation · Wind turbine blade repair · Geotechnical / rockfall · Concrete repair ·
Sealant / waterproofing · Confined-space entry work · Survey / measurement · Photography / media ·
Demolition / removal · Rescue / recovery

**`ACCESS_METHOD_PRESETS`** (7):
Two-rope access · Work positioning (with backup) · Fall restraint · Fall arrest · Aid climb ·
Rope-to-rope / deviation · Rescue cover / standby
(`Fall restraint` and `Fall arrest` are deliberately distinct controls. Do **not** add an
unqualified "Single-rope" chip — single-rope working is outside SPRAT/IRATA industrial scope.)

**`STRUCTURE_PRESETS`** (14):
Building / façade · Wind turbine · Communications tower / mast · Industrial chimney / flare stack ·
Bridge / viaduct · Dam / lock · Tank / vessel / silo · Offshore platform / FPSO ·
Stadium / arena roof · Crane / gantry · Theatrical / event rig · Ship / hull ·
Pipe rack / process plant · Natural feature
(Physical form only. "Confined space" is a **hazard**, not a structure, and stays in
`HAZARD_PRESETS`.)

**`HAZARD_PRESETS`** — keep the existing list from `src/domain/logbook/hazards.ts`; re-export or
reference from `classification.ts` so all chip vocabularies live together. (No content change
required unless the advisor's hazard list is expanded later.)

### A3. Recents (auto-remember, kept out of the way)

- New domain query: distinct prior values of each field from the user's own `entries`, ordered
  most-recent-first, capped at 8. For `hazards`, parse each entry's hazards JSON and collect
  distinct strings. This is device-local by construction (local SQLite) and reuses the existing
  "recent sites" pattern — **no new table**.
- **Denylist filter (advisor blocker — must implement):** recents MUST be filtered against the
  current preset list **and** the removed-presets denylist (`Training`, `Assessment`,
  `Rescue standby`, plus any future removals). Without this, a user with historical entries
  containing the dropped presets would see them resurface as "recent custom" suggestions and
  re-introduce the exact `entry_kind` conflation A1 removes. The denylist lives in
  `classification.ts` next to the presets.
- **Presentation:** recents are **not** rendered as always-on chips. They appear (a) as a quiet
  "Recent" group inside the picker sheet, and (b) as **case-insensitive type-ahead suggestions
  inside the "Other…" custom input**. This satisfies the "auto-remember but keep it out of the
  way / not obnoxious" requirement.

### A4. UI — `ClassificationChips` / `MultiClassificationChips`

A composite that wraps the existing `ChipSelect` / `MultiChipSelect` (reusing their chip
rendering and Heliotype branches) and adds the overflow + custom affordances. New files under
`src/ui/primitives/v2/`.

Inline row composition (lowest-variance, static rule — advisor sharpening):

1. The currently-selected value(s), if not already in the inline preset set, injected as
   active chip(s). (`ChipSelect` cannot render a value outside its `options`; the composite
   prepends it. This single rule covers both custom values and overflow presets chosen via
   the sheet.)
2. The first **8** presets in static order.
3. A trailing **"＋ More"** chip, always present, that opens the picker sheet.

Picker sheet (hosted in the existing `InfoSheet`):

- Full preset list (searchable for the long `work_task` / `structure_type` lists).
- A quiet "Recent" group (A3), filtered by the denylist.
- An **"Other…"** custom input: max **64 characters** (longer belongs in Description), stored
  **exactly as typed** (no silent normalization — the tech attests to the string they saw),
  with case-insensitive type-ahead from recents. Confirming sets the value and closes the sheet.

`MultiClassificationChips` (hazards): adding a custom hazard appends it to the array and renders
it as a selected chip; tapping a selected chip toggles it off; the sheet shows preset hazards
plus the user's previously-added custom hazards in the Recent group.

### A5. Show-before-sign (integrity control)

Confirm the **custom** value renders verbatim wherever the entry is reviewed before sealing:
the new-entry Review step, the sign screen context card, and the amend/edit summaries. This is
what lets a tech catch a bad label ("Various") before it is frozen into the hash. No new
validation gauntlet.

### A. Screens touched

`app/entry/new.tsx`, `app/entry/[id]/edit.tsx`, `app/entry/[id]/amend.tsx` (the three
single-select rows + the hazards multi-select), plus the new `classification.ts` module and the
two new composites.

---

## Part B — Calendar date pickers

### B1. Approach + compatibility gate

Themeable JS calendar rendered in a sheet (chosen over OS-native and fully-custom).

- **Primary:** `react-native-ui-datepicker` (pure JS, themeable, depends on `dayjs`).
- **Step 1 is a hard compatibility gate:** verify it builds and renders on **Expo SDK 54 /
  React 19.1 / RN 0.81.5 / react-native-web 0.21** before any screen work. If it does not slot
  in cleanly, fall back to a custom calendar built on `react-native-svg` + `Animated` + the
  existing `date-utils`.
- **Honest scope note (advisor):** the custom fallback is **not** a quick swap. The project
  deliberately does not install `reanimated` or `react-native-gesture-handler`, so a hand-built
  calendar (month navigation, range-aware `minDate`, web keyboard nav, accessibility) is real
  work. If the gate trips, Part B's effort expands materially — plan accordingly.

Either path exposes the **same** primitive API (B2), so screen code is identical regardless.

### B2. New primitives

- `DateField` (`src/ui/primitives/v2/date-field.tsx`) — visually matches `Field`: label kicker,
  bordered row, helper. Read-only, shows a friendly formatted date (e.g. `24 May 2026`) and a
  trailing calendar glyph; the whole row is a `Pressable` that opens the picker. Empty state
  shows a placeholder.
- `DatePickerSheet` (`src/ui/primitives/v2/date-picker-sheet.tsx`) — `InfoSheet`-hosted calendar
  with footer actions **Today**, **Clear** (for nullable fields), **Done**. Accepts `value` (ISO
  or null), `onChange(iso | null)`, optional `minDate` / `maxDate` (ISO).

**Calendar-only:** there is no keyboard/manual typing path on these fields (chosen). This removes
the ISO-parse fragility and is far better for gloved field use.

### B3. Date model (unchanged storage) + local-date correctness

- Storage stays **ISO `YYYY-MM-DD`**. `DateField` only changes the display.
- **Local-date serialization (advisor blocker — must implement + test):** the calendar must
  serialize the day the user tapped using **local** parts, mirroring `todayLocalIsoDate`
  (`getFullYear` / `getMonth` / `getDate`). It must **never** use `toISOString().slice(0,10)`,
  which shifts the date across the UTC boundary. Add a pure helper, e.g.
  `calendarDateToIso(date: Date): string`, in `date-utils.ts` and route all picker output
  through it.
  - **Required test:** picking "today" at 23:55 local in a UTC-12 zone yields an ISO equal to
    `todayLocalIsoDate()` for that same local clock — i.e. no off-by-one. Guards against freezing
    tomorrow's date into a late-evening signature.
- Existing helpers reused unchanged: `isValidIsoDateRange`, `daysFromTodayIso`, `compareIsoDates`.
- **Range fields** (entry From/To; export From/To) remain two separate `DateField`s. `To` is
  given `minDate = From`; `isValidIsoDateRange` validation and the "Invalid range" helper stay.

### B4. Sites (confirmed)

Date **input** fields that become `DateField`:

- Entry **From / To** — `app/entry/new.tsx`, `app/entry/[id]/edit.tsx`, `app/entry/[id]/amend.tsx`
- Gear **next-due** (add-gear form) — `app/(tabs)/gear.tsx`
- Inspection **inspected-on** + **next-due** — `app/gear/[id].tsx`
- Cert **expiry** — `app/(onboarding)/setup.tsx`
- Export **custom range From / To** — `app/export.tsx`

Confirmed **not** a user date input: `app/entry/[id]/request-signature.tsx` — `expires_at` is
defaulted, not entered (its Fields are verifier name/contact/role/company). Implementer should
still grep for any straggler date inputs before declaring B done.

---

## Testing

Node-side jest (better-sqlite3 + domain services). UI composites are not unit-tested (consistent
with the existing suite); their logic is pushed into testable pure/domain units:

- `classification.ts` — presets are well-formed; denylist excludes the three removed work tasks.
- Recents query — returns distinct prior values, most-recent-first, capped, **and excludes both
  presets and denylisted values** (explicit assertion for the dropped presets).
- `calendarDateToIso` — the UTC-12 late-evening local-date test above; plus mid-zone and DST
  sanity cases.
- `isValidIsoDateRange` interplay unchanged (existing coverage stands).

`npm run typecheck` and `npm test` green from a clean DB.

## Sequencing

Two independent tracks:

1. **Part B first** — isolated primitives (`DateField`, `DatePickerSheet`, `calendarDateToIso`)
   then mechanical per-screen swaps. The compatibility gate (B1) is the first task overall.
2. **Part A second** — the richer composite UI (`ClassificationChips`), the `classification.ts`
   vocabulary + denylist, and the recents query.

## Risks

- **Library compat gate (B1).** If it trips, the custom-calendar fallback is substantial work,
  not a swap. Surface immediately if so; do not silently absorb the scope.
- **Recents back-door (A3).** Forgetting the denylist filter would quietly undo the A1 audit fix.
  Covered by an explicit test.
- **Local-date off-by-one (B3).** The single highest-severity correctness bug for date pickers.
  Covered by the required UTC-12 test.
- **Scope creep into v4.** Do not let `anchor_method` splitting or any canonicalization change
  ride along; that is a separate hash-version decision.
