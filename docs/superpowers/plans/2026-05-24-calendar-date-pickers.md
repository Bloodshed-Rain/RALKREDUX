# Calendar Date Pickers (Part B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every plain ISO-text date `Field` with a themeable calendar opened in a sheet, calendar-only, while keeping ISO `YYYY-MM-DD` storage and avoiding the UTC off-by-one bug.

**Architecture:** Two new presentational primitives — `DateField` (a Field-styled pressable showing a formatted date) and `DatePickerSheet` (an `InfoSheet`-hosted calendar). All date math goes through pure helpers in `date-utils.ts` using **local** calendar parts. Screens swap their date `Field`s for `DateField`.

**Tech Stack:** React Native (Expo SDK 54, React 19, RN 0.81, react-native-web 0.21), `react-native-ui-datepicker` (+ `dayjs`), TypeScript, Jest.

Spec: `docs/superpowers/specs/2026-05-24-classification-chips-and-date-pickers-design.md`.

> **GATE:** Task 1 decides library-vs-custom. If the library fails the gate, Task 3's internals change to a hand-built calendar and **Part B's scope expands materially** (the project deliberately ships no reanimated/gesture-handler). Do not proceed past Task 1 on the library path without a green gate.

---

## File Structure

- **Modify** `src/domain/date-utils.ts` — add `calendarDateToIso`, `isoToLocalDate`, `formatIsoForDisplay`.
- **Create** `__tests__/domain/date-utils.test.ts` — local-date serialization + display formatting.
- **Modify** `package.json` — add `react-native-ui-datepicker` + `dayjs` (Task 1).
- **Create** `src/ui/primitives/v2/date-picker-sheet.tsx` — the calendar host.
- **Create** `src/ui/primitives/v2/date-field.tsx` — the field control.
- **Modify** `app/entry/new.tsx`, `app/entry/[id]/edit.tsx`, `app/entry/[id]/amend.tsx`, `app/(tabs)/gear.tsx`, `app/gear/[id].tsx`, `app/(onboarding)/setup.tsx`, `app/export.tsx` — swap date Fields for `DateField`.

---

## Task 1: Library compatibility gate (DECISION POINT)

**Files:**
- Modify: `package.json` (via installer)

- [ ] **Step 1: Install the library + dayjs**

```bash
npx expo install react-native-ui-datepicker dayjs
```
Expected: both added to `dependencies`; no peer-dependency error for React 19.1 / RN 0.81.

- [ ] **Step 2: Throwaway smoke render**

Temporarily add to any existing screen (e.g. top of `app/(tabs)/more.tsx` render) — DO NOT COMMIT this:

```tsx
import DateTimePicker, { useDefaultStyles } from 'react-native-ui-datepicker';
// ...inside render:
// const ds = useDefaultStyles();
// <DateTimePicker mode="single" date={new Date()} onChange={({ date }) => console.log(date)} styles={ds} />
```

- [ ] **Step 3: Verify on web AND native**

Run web: `npm run web -- --host localhost --port 8091` — the calendar renders and a tap logs a date.
Run native: `npm run start -- --host lan`, open in the EAS dev client — the calendar renders and responds.

- [ ] **Step 4: Confirm no forbidden native deps**

Run: `grep -rn "react-native-reanimated\|react-native-gesture-handler" node_modules/react-native-ui-datepicker/package.json`
Expected: **no matches** in `dependencies`/`peerDependencies`. If the library hard-requires either, that is a **GATE FAIL**.

- [ ] **Step 5: DECISION**

- **PASS** (renders on web + native, no reanimated/gesture-handler requirement): remove the throwaway snippet, keep the deps, proceed to Task 2 on the library path.
- **FAIL**: `npm uninstall react-native-ui-datepicker` (keep `dayjs` if useful), STOP, and re-plan Task 3 as a custom calendar built on `react-native-svg` + `Animated` + the helpers from Task 2 (month grid, header nav, `minDate`/`maxDate` disabling, web keyboard focus, a11y). Tasks 2, 4–11 are unchanged either way. Flag the scope increase to the requester before continuing.

- [ ] **Step 6: Commit (PASS path only)**

```bash
git add package.json package-lock.json
git commit -m "Add react-native-ui-datepicker + dayjs (compat gate passed)"
```

---

## Task 2: Date helpers (local-date serialization)

**Files:**
- Modify: `src/domain/date-utils.ts`
- Test: `__tests__/domain/date-utils.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/domain/date-utils.test.ts
import {
  calendarDateToIso,
  isoToLocalDate,
  formatIsoForDisplay,
  todayLocalIsoDate,
} from '@/src/domain/date-utils';

describe('calendarDateToIso', () => {
  it('serializes the LOCAL calendar day, never the UTC day', () => {
    // Constructed from local parts; read back as local parts. In any timezone
    // east of UTC, toISOString().slice(0,10) would roll to 2027-01-01 — this
    // helper must stay on the local day.
    const localNye = new Date(2026, 11, 31, 23, 30, 0);
    expect(calendarDateToIso(localNye)).toBe('2026-12-31');
  });

  it('agrees with todayLocalIsoDate for the same instant', () => {
    const now = new Date(2026, 0, 1, 23, 55, 0);
    expect(calendarDateToIso(now)).toBe(todayLocalIsoDate(now));
  });
});

describe('isoToLocalDate', () => {
  it('parses YYYY-MM-DD to a local midnight Date round-tripping calendarDateToIso', () => {
    const d = isoToLocalDate('2026-05-24');
    expect(d).not.toBeNull();
    expect(calendarDateToIso(d as Date)).toBe('2026-05-24');
    expect((d as Date).getFullYear()).toBe(2026);
    expect((d as Date).getMonth()).toBe(4);
    expect((d as Date).getDate()).toBe(24);
  });

  it('returns null for blank/invalid input', () => {
    expect(isoToLocalDate(null)).toBeNull();
    expect(isoToLocalDate('not-a-date')).toBeNull();
  });
});

describe('formatIsoForDisplay', () => {
  it('formats ISO to a human day', () => {
    expect(formatIsoForDisplay('2026-05-24')).toBe('24 May 2026');
  });
  it('passes through null/garbage gracefully', () => {
    expect(formatIsoForDisplay(null)).toBeNull();
    expect(formatIsoForDisplay('garbage')).toBe('garbage');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=date-utils`
Expected: FAIL — `calendarDateToIso is not a function`.

- [ ] **Step 3: Add the helpers**

Append to `src/domain/date-utils.ts` (reuse the existing `ISO_DATE_PATTERN`):

```ts
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Serializes a Date to YYYY-MM-DD using LOCAL calendar parts — the day the user
// sees on the calendar. NEVER use toISOString(): it shifts across the UTC
// boundary and would freeze the wrong day into a signed entry.
export function calendarDateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parses YYYY-MM-DD into a LOCAL-midnight Date (so the calendar highlights the
// intended day regardless of timezone). Returns null for missing/invalid input.
export function isoToLocalDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const match = ISO_DATE_PATTERN.exec(iso);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

// Friendly display for a stored ISO date, e.g. '24 May 2026'. Parses the string
// parts directly (no Date) so there is no timezone drift. Echoes unexpected
// input unchanged rather than throwing.
export function formatIsoForDisplay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const match = ISO_DATE_PATTERN.exec(iso);
  if (!match) return iso;
  const monthIdx = Number(match[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return iso;
  return `${Number(match[3])} ${MONTHS_SHORT[monthIdx]} ${match[1]}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=date-utils`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/date-utils.ts __tests__/domain/date-utils.test.ts
git commit -m "Add local-date helpers for the calendar picker (no UTC off-by-one)"
```

---

## Task 3: `DatePickerSheet` primitive (library path)

**Files:**
- Create: `src/ui/primitives/v2/date-picker-sheet.tsx`

> If Task 1 chose the fallback, build the same public props (below) over a custom svg+Animated calendar instead of `<DateTimePicker>`.

- [ ] **Step 1: Implement**

```tsx
// src/ui/primitives/v2/date-picker-sheet.tsx
import React from 'react';
import { View } from 'react-native';
import DateTimePicker, { useDefaultStyles, type DateType } from 'react-native-ui-datepicker';
import { InfoSheet } from './info-sheet';
import { Button } from './button';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { calendarDateToIso, isoToLocalDate, todayLocalIsoDate } from '@/src/domain/date-utils';

export interface DatePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  value: string | null; // ISO yyyy-mm-dd
  onChange: (iso: string | null) => void;
  minDate?: string | null; // ISO
  maxDate?: string | null; // ISO
  clearable?: boolean;
}

// Normalizes the library's DateType (Date | string | dayjs) to a JS Date.
function toDate(value: DateType): Date {
  if (value instanceof Date) return value;
  return new Date(value as unknown as number); // dayjs valueOf() / ISO string both work
}

export function DatePickerSheet({
  visible,
  onClose,
  title,
  value,
  onChange,
  minDate,
  maxDate,
  clearable = false,
}: DatePickerSheetProps) {
  const { tokens } = useTheme();
  const defaultStyles = useDefaultStyles();
  const [draftIso, setDraftIso] = React.useState<string | null>(value);

  React.useEffect(() => {
    if (visible) setDraftIso(value);
  }, [visible, value]);

  const themedStyles = React.useMemo(
    () => ({
      ...defaultStyles,
      today: { borderColor: tokens.accent, borderWidth: 1 },
      selected: { backgroundColor: tokens.accent },
      selected_label: { color: tokens.accentInk },
    }),
    [defaultStyles, tokens.accent, tokens.accentInk],
  );

  return (
    <InfoSheet visible={visible} onClose={onClose} title={title} kicker="PICK A DATE">
      <DateTimePicker
        mode="single"
        date={isoToLocalDate(draftIso) ?? undefined}
        onChange={({ date }) => setDraftIso(date ? calendarDateToIso(toDate(date)) : null)}
        minDate={isoToLocalDate(minDate) ?? undefined}
        maxDate={isoToLocalDate(maxDate) ?? undefined}
        styles={themedStyles}
      />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Button variant="ghost" size="sm" onPress={() => setDraftIso(todayLocalIsoDate())}>
          Today
        </Button>
        {clearable ? (
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              onChange(null);
              onClose();
            }}
          >
            Clear
          </Button>
        ) : null}
        <View style={{ flex: 1 }} />
        <Button
          variant="primary"
          size="sm"
          onPress={() => {
            onChange(draftIso);
            onClose();
          }}
        >
          Done
        </Button>
      </View>
    </InfoSheet>
  );
}
```

> Implementer note: confirm the `Button` primitive's children/label API matches usage (check `src/ui/primitives/v2/button.tsx` — it may take a `label` prop or `children`). Adjust the four `<Button>`s to the real API. Confirm `tokens.accentInk` exists (it's used across v2 primitives).

- [ ] **Step 2: Verify types**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/ui/primitives/v2/date-picker-sheet.tsx
git commit -m "Add DatePickerSheet (themed calendar in a sheet, local-date output)"
```

---

## Task 4: `DateField` primitive

**Files:**
- Create: `src/ui/primitives/v2/date-field.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/ui/primitives/v2/date-field.tsx
import React from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { formatIsoForDisplay } from '@/src/domain/date-utils';
import { DatePickerSheet } from './date-picker-sheet';

export interface DateFieldProps {
  label?: string;
  value: string | null; // ISO yyyy-mm-dd
  onChange: (iso: string | null) => void;
  placeholder?: string;
  helper?: string;
  minDate?: string | null;
  maxDate?: string | null;
  clearable?: boolean;
  title?: string; // sheet title; defaults to label
}

export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  helper,
  minDate,
  maxDate,
  clearable = false,
  title,
}: DateFieldProps) {
  const { theme, tokens } = useTheme();
  const [open, setOpen] = React.useState(false);
  const isHeliotype = theme.key === 'heliotype';
  const display = formatIsoForDisplay(value);

  const labelStyle: TextStyle = {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 1.5,
    color: tokens.textDim,
    textTransform: 'uppercase',
  };
  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: isHeliotype ? 1.5 : 1,
    borderColor: isHeliotype ? tokens.line : tokens.lineSoft,
  };
  const valueStyle: TextStyle = {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 21,
    color: display ? tokens.text : tokens.textFaint,
  };
  const helperStyle: TextStyle = {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    lineHeight: 14,
    color: tokens.textFaint,
    paddingLeft: 2,
  };

  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={labelStyle}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? title ?? 'Date'}: ${display ?? 'not set'}`}
        style={({ pressed }) => [rowStyle, pressed ? { transform: [{ scale: 0.99 }] } : null]}
      >
        <Text style={valueStyle}>{display ?? placeholder}</Text>
        <CalendarDays size={18} color={tokens.textDim} />
      </Pressable>
      {helper ? <Text style={helperStyle}>{helper}</Text> : null}
      <DatePickerSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={title ?? label ?? 'Select date'}
        value={value}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
        clearable={clearable}
      />
    </View>
  );
}
```

> Implementer note: prefer a v2 icon if one exists — `grep -n "IconCalendar\|Calendar" src/ui/icons/index.tsx`. If present, use it instead of lucide's `CalendarDays` (lucide is already a dep and used on the verify screen, so it's an acceptable fallback).

- [ ] **Step 2: Verify types**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/ui/primitives/v2/date-field.tsx
git commit -m "Add DateField (calendar-only date control)"
```

---

## Task 5: Entry From/To in `app/entry/new.tsx`

**Files:**
- Modify: `app/entry/new.tsx`

- [ ] **Step 1: Import DateField**

```tsx
import { DateField } from '@/src/ui/primitives/v2/date-field';
```

- [ ] **Step 2: Replace the two date `Field`s**

Find the Date-from / Date-to `Field`s (the block near the `isValidIsoDateRange(...)` helper, ~line 611) and replace them with two `DateField`s. `To` is constrained to ≥ `From`; the range helper stays as `DateField.helper` on the To field.

```tsx
<DateField
  label="Date from"
  value={draft.dateFrom || null}
  onChange={(iso) => setDraft((d) => ({ ...d, dateFrom: iso ?? '' }))}
  maxDate={draft.dateTo || null}
/>
<DateField
  label="Date to"
  value={draft.dateTo || null}
  onChange={(iso) => setDraft((d) => ({ ...d, dateTo: iso ?? '' }))}
  minDate={draft.dateFrom || null}
  helper={
    isValidIsoDateRange(draft.dateFrom, draft.dateTo || draft.dateFrom)
      ? undefined
      : 'Invalid range'
  }
/>
```

Match the exact `draft` field names + `setDraft` shape in this file. Keep the existing submit-time `isValidIsoDateRange` gate untouched.

- [ ] **Step 3: Verify + smoke**

Run: `npm run typecheck` → exit 0.
Web: open New Entry → tapping Date from opens the calendar; picking a day shows "24 May 2026"; Date to disallows earlier-than-From.

- [ ] **Step 4: Commit**

```bash
git add app/entry/new.tsx
git commit -m "New-entry: calendar pickers for entry From/To"
```

---

## Task 6: Entry From/To in edit + amend

**Files:**
- Modify: `app/entry/[id]/edit.tsx`, `app/entry/[id]/amend.tsx`

- [ ] **Step 1: Apply the Task 5 swap to both screens**

Add `import { DateField } from '@/src/ui/primitives/v2/date-field';` and replace each screen's Date-from/Date-to `Field`s with the two `DateField`s from Task 5 Step 2, bound to that screen's local date state field names. Keep each screen's existing `isValidIsoDateRange` submit gate.

- [ ] **Step 2: Verify**

Run: `npm run typecheck` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/entry/[id]/edit.tsx app/entry/[id]/amend.tsx
git commit -m "Edit + amend: calendar pickers for entry From/To"
```

---

## Task 7: Gear next-due in `app/(tabs)/gear.tsx`

**Files:**
- Modify: `app/(tabs)/gear.tsx`

- [ ] **Step 1: Swap the Add-gear "Next due" Field**

Add the `DateField` import. Replace the Next-due `Field` in the inline Add-gear card with:

```tsx
<DateField
  label="Next due"
  value={/* this screen's next-due state */ || null}
  onChange={(iso) => /* set next-due state to iso ?? '' */}
  clearable
/>
```

Bind to the existing add-gear form state. (Next-due is optional → `clearable`.)

- [ ] **Step 2: Verify + commit**

Run: `npm run typecheck` → exit 0.
```bash
git add app/(tabs)/gear.tsx
git commit -m "Gear: calendar picker for next-due date"
```

---

## Task 8: Inspection dates in `app/gear/[id].tsx`

**Files:**
- Modify: `app/gear/[id].tsx`

- [ ] **Step 1: Swap the Record-inspection date Fields**

Add the `DateField` import. In the inline "NEW INSPECTION" card, replace the **Inspected on** and **Next due** `Field`s with `DateField`s bound to that form's state:

```tsx
<DateField
  label="Inspected on"
  value={/* inspected-on state */ || null}
  onChange={(iso) => /* set inspected-on to iso ?? '' */}
  maxDate={todayLocalIsoDate()}
/>
<DateField
  label="Next due"
  value={/* next-due state */ || null}
  onChange={(iso) => /* set next-due to iso ?? '' */}
  clearable
/>
```

Import `todayLocalIsoDate` from `@/src/domain/date-utils` (inspections can't be in the future).

- [ ] **Step 2: Verify + commit**

Run: `npm run typecheck` → exit 0.
```bash
git add app/gear/[id].tsx
git commit -m "Gear detail: calendar pickers for inspection dates"
```

---

## Task 9: Cert expiry in `app/(onboarding)/setup.tsx`

**Files:**
- Modify: `app/(onboarding)/setup.tsx`

- [ ] **Step 1: Swap the expiry Field(s)**

Add the `DateField` import. Replace each `CertCard`'s optional expiry `Field` with:

```tsx
<DateField
  label="Expiry (optional)"
  value={/* this cert card's expiry state */ || null}
  onChange={(iso) => /* set expiry to iso ?? '' */}
  clearable
  minDate={todayLocalIsoDate()}
/>
```

There may be two (primary + secondary cert cards) — swap both, each bound to its own expiry state.

- [ ] **Step 2: Verify + commit**

Run: `npm run typecheck` → exit 0.
```bash
git add app/(onboarding)/setup.tsx
git commit -m "Setup: calendar picker for cert expiry"
```

---

## Task 10: Export custom range in `app/export.tsx`

**Files:**
- Modify: `app/export.tsx`

- [ ] **Step 1: Swap the From/To range Fields**

Add the `DateField` import. The custom range is revealed when Range = "Custom" with `customFrom` / `customTo` `Field`s. Replace them:

```tsx
<DateField
  label="From"
  value={customFrom || null}
  onChange={(iso) => setCustomFrom(iso ?? '')}
  maxDate={customTo || null}
  clearable
/>
<DateField
  label="To"
  value={customTo || null}
  onChange={(iso) => setCustomTo(iso ?? '')}
  minDate={customFrom || null}
  clearable
/>
```

Match the actual state variable + setter names in this file. Keep the existing `customRangeValid` gate (open-ended single-sided ranges still allowed → `clearable`).

- [ ] **Step 2: Verify + commit**

Run: `npm run typecheck` → exit 0.
```bash
git add app/export.tsx
git commit -m "Export: calendar pickers for custom date range"
```

---

## Task 11: Final sweep + verification

- [ ] **Step 1: Sweep for any remaining date text Fields**

Run: `grep -rn "isValidIsoDateRange\|YYYY-MM-DD\|todayLocalIsoDate" app` — confirm every user-facing date **input** now routes through `DateField`. Display-only sites (`today.tsx`, `records.tsx`, `entry-row.tsx`, `sign.tsx`, `verify/[code].tsx`) keep their text rendering. `request-signature.tsx` has no date input (confirmed in the spec).

- [ ] **Step 2: Full typecheck + tests**

Run: `npm run typecheck` → exit 0.
Run: `npm test` → all suites pass (including the new `date-utils` tests).

- [ ] **Step 3: Cross-platform smoke**

Web (`npm run web ...`) and EAS dev client: open New Entry, Gear add, Gear detail inspection, Setup, Export custom range — each date field opens the themed calendar, picks a date shown as "DD Mon YYYY", and stores ISO.

- [ ] **Step 4: Commit any cleanup**

```bash
git add -A
git commit -m "Calendar date pickers: final sweep + verification"
```

---

## Self-Review (completed against the spec)

- **B1 (JS calendar in a sheet + compat gate + honest fallback cost):** Task 1 is the gate with explicit PASS/FAIL and a fallback-scope warning. ✓
- **B2 (DateField + DatePickerSheet primitives):** Tasks 3–4. ✓
- **B3 (ISO storage unchanged; local-date serialization + UTC test; range minDate):** Task 2 adds `calendarDateToIso`/`isoToLocalDate`/`formatIsoForDisplay` with the local-day regression test; range tasks set `minDate`/`maxDate`. Calendar-only (no keyboard path). ✓
- **B4 (all input sites; expires_at excluded):** Tasks 5–10 cover entry From/To, gear next-due, inspection dates, cert expiry, export range; Task 11 step 1 sweeps for stragglers and confirms display-only + `request-signature` exclusions. ✓
- **Placeholder scan:** code steps contain code; screen-swap "bind to this screen's state" notes are intentional (the surrounding 300–800-line screens aren't reprinted) and paired with exact `DateField` usage + the known state-field names from the spec. ✓
- **Type consistency:** `calendarDateToIso` / `isoToLocalDate` / `formatIsoForDisplay` and `DateFieldProps` / `DatePickerSheetProps` names are consistent across tasks. ✓
