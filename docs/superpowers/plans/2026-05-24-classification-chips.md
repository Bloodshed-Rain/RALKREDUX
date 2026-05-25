# Classification Chips (Part A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the preset vocabularies for `work_task` / `access_method` / `structure_type` / `hazards` and let technicians enter (and re-use) their own custom values, without any schema or hash change.

**Architecture:** A single domain module owns the vocabularies + a removed-presets denylist. A device-local "recents" query surfaces a tech's past custom values as quiet type-ahead. Two presentational primitives (`ClassificationChips`, `MultiClassificationChips`) wrap the existing chip rendering and add a "More…/Other…" sheet. The new-entry, edit, and amend screens consume them.

**Tech Stack:** React Native (Expo SDK 54, React 19, RN 0.81), TypeScript, `DbClient` raw SQL, `@tanstack/react-query`, Jest (jest-expo + better-sqlite3).

Spec: `docs/superpowers/specs/2026-05-24-classification-chips-and-date-pickers-design.md`.

---

## File Structure

- **Create** `src/domain/logbook/classification.ts` — preset lists, removed-presets denylist, and the pure suppression/cap helpers. Single source of truth for the vocabularies.
- **Create** `__tests__/domain/classification.test.ts` — tests for the helpers + denylist.
- **Modify** `src/domain/logbook/logbook-service.ts` — add two DB-only recents queries.
- **Modify** `__tests__/domain/logbook-service.test.ts` — recents query coverage (distinct, recency-ordered, denylist-filtered).
- **Modify** `src/domain/logbook/use-logbook.ts` — add `useRecentClassificationValues` / `useRecentHazardValues` query hooks.
- **Create** `src/ui/primitives/v2/classification-picker-sheet.tsx` — the `InfoSheet`-hosted browse+custom UI (shared by single + multi).
- **Create** `src/ui/primitives/v2/classification-chips.tsx` — `ClassificationChips` (single) + `MultiClassificationChips` (multi).
- **Modify** `app/entry/new.tsx`, `app/entry/[id]/edit.tsx`, `app/entry/[id]/amend.tsx` — consume the new primitives + import presets from `classification.ts`.

UI primitives are presentational (no domain hooks inside) — the screen fetches recents via the hook and passes them down, preserving the app/ → src/domain → src/ui layering.

---

## Task 1: `classification.ts` vocabularies + helpers

**Files:**
- Create: `src/domain/logbook/classification.ts`
- Test: `__tests__/domain/classification.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/domain/classification.test.ts
import {
  WORK_TASK_PRESETS,
  ACCESS_METHOD_PRESETS,
  STRUCTURE_PRESETS,
  REMOVED_WORK_TASK_PRESETS,
  isPresetValue,
  isSuppressedRecent,
  filterRecentValues,
  CUSTOM_VALUE_MAX_LENGTH,
} from '@/src/domain/logbook/classification';

describe('classification vocabularies', () => {
  it('does not contain the removed entry_kind-conflating presets', () => {
    for (const removed of REMOVED_WORK_TASK_PRESETS) {
      expect(WORK_TASK_PRESETS as readonly string[]).not.toContain(removed);
    }
  });

  it('matches presets case-insensitively', () => {
    expect(isPresetValue('work_task', 'inspection (visual)')).toBe(true);
    expect(isPresetValue('work_task', 'Inspection (visual)')).toBe(true);
    expect(isPresetValue('work_task', 'Cathodic protection survey')).toBe(false);
  });

  it('suppresses presets, blanks, and removed presets from recents', () => {
    expect(isSuppressedRecent('work_task', '')).toBe(true);
    expect(isSuppressedRecent('work_task', 'NDT / testing')).toBe(true); // current preset
    expect(isSuppressedRecent('work_task', 'Training')).toBe(true); // removed preset
    expect(isSuppressedRecent('work_task', 'training')).toBe(true); // case-insensitive
    expect(isSuppressedRecent('work_task', 'Cathodic protection survey')).toBe(false);
  });

  it('filterRecentValues drops suppressed entries, dedupes case-insensitively, and caps', () => {
    const raw = ['Cathodic protection survey', 'Training', 'NDT / testing', 'cathodic protection survey', 'Tensile test'];
    expect(filterRecentValues('work_task', raw, 8)).toEqual([
      'Cathodic protection survey',
      'Tensile test',
    ]);
    expect(filterRecentValues('work_task', ['a', 'b', 'c'], 2)).toEqual(['a', 'b']);
  });

  it('exposes a 64-char custom cap', () => {
    expect(CUSTOM_VALUE_MAX_LENGTH).toBe(64);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=classification`
Expected: FAIL — `Cannot find module '@/src/domain/logbook/classification'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/domain/logbook/classification.ts
import { HAZARD_PRESETS } from './hazards';

// Ordered roughly by hour-share so the inline chips a tech taps without reading
// come first. Source: rope-access advisor ruling, recorded in
// .claude/agent-memory/sprirata-rope-access-advisor/work-task-taxonomy-and-custom-entry.md
export const WORK_TASK_PRESETS = [
  'Inspection (visual)',
  'NDT / testing',
  'Maintenance / servicing',
  'Cleaning / washing',
  'Painting / coating',
  'Bolting / torque / tensioning',
  'Welding / hot work',
  'Glazing / cladding',
  'Rigging / installation',
  'Wind turbine blade repair',
  'Geotechnical / rockfall',
  'Concrete repair',
  'Sealant / waterproofing',
  'Confined-space entry work',
  'Survey / measurement',
  'Photography / media',
  'Demolition / removal',
  'Rescue / recovery',
] as const;

export const ACCESS_METHOD_PRESETS = [
  'Two-rope access',
  'Work positioning (with backup)',
  'Fall restraint',
  'Fall arrest',
  'Aid climb',
  'Rope-to-rope / deviation',
  'Rescue cover / standby',
] as const;

export const STRUCTURE_PRESETS = [
  'Building / façade',
  'Wind turbine',
  'Communications tower / mast',
  'Industrial chimney / flare stack',
  'Bridge / viaduct',
  'Dam / lock',
  'Tank / vessel / silo',
  'Offshore platform / FPSO',
  'Stadium / arena roof',
  'Crane / gantry',
  'Theatrical / event rig',
  'Ship / hull',
  'Pipe rack / process plant',
  'Natural feature',
] as const;

// Re-exported so all four chip vocabularies live in one module.
export { HAZARD_PRESETS };

// Work-task presets removed in the 2026-05-24 taxonomy fix because they
// double-encoded the locked entry_kind enum / rescue_cover field. They must
// NEVER resurface as "recent custom" suggestions, or the audit fix is silently
// undone for any user with historical entries that used them.
export const REMOVED_WORK_TASK_PRESETS = ['Training', 'Assessment', 'Rescue standby'] as const;

export const CUSTOM_VALUE_MAX_LENGTH = 64;

export type ClassificationField = 'work_task' | 'access_method' | 'structure_type';

const PRESETS_BY_FIELD: Record<ClassificationField, readonly string[]> = {
  work_task: WORK_TASK_PRESETS,
  access_method: ACCESS_METHOD_PRESETS,
  structure_type: STRUCTURE_PRESETS,
};

const REMOVED_WORK_TASK_LOWER = new Set(REMOVED_WORK_TASK_PRESETS.map((p) => p.toLowerCase()));

export function isPresetValue(field: ClassificationField, value: string): boolean {
  const v = value.trim().toLowerCase();
  return PRESETS_BY_FIELD[field].some((p) => p.toLowerCase() === v);
}

// True when a historical value must not appear as a "recent custom" suggestion:
// blank, a current preset (already shown as a chip), or a removed work-task preset.
export function isSuppressedRecent(field: ClassificationField, value: string): boolean {
  const v = value.trim().toLowerCase();
  if (v.length === 0) return true;
  if (isPresetValue(field, value)) return true;
  if (field === 'work_task' && REMOVED_WORK_TASK_LOWER.has(v)) return true;
  return false;
}

// Filters raw recency-ordered DB values down to the custom values worth
// suggesting: drops suppressed entries, dedupes case-insensitively (keeping the
// first/most-recent casing), and caps the count.
export function filterRecentValues(
  field: ClassificationField,
  rawOrderedByRecency: readonly string[],
  cap: number,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of rawOrderedByRecency) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    if (isSuppressedRecent(field, trimmed)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= cap) break;
  }
  return out;
}

// Filters raw recency-ordered hazard values: drops blanks + current hazard
// presets, dedupes case-insensitively, caps.
const HAZARD_PRESETS_LOWER = new Set(HAZARD_PRESETS.map((p) => p.toLowerCase()));

export function filterRecentHazards(rawOrderedByRecency: readonly string[], cap: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of rawOrderedByRecency) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (key.length === 0 || seen.has(key) || HAZARD_PRESETS_LOWER.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= cap) break;
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=classification`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/logbook/classification.ts __tests__/domain/classification.test.ts
git commit -m "Add classification vocabularies + recents-suppression helpers"
```

---

## Task 2: Recents queries in the logbook service

**Files:**
- Modify: `src/domain/logbook/logbook-service.ts` (add to the returned object near `listEntries`, ~line 393)
- Test: `__tests__/domain/logbook-service.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `__tests__/domain/logbook-service.test.ts`. (The suite already builds an in-memory client + service via `createTestClient()` / `createLogbookService` — reuse that harness; mirror an existing test's setup for creating drafts.)

```ts
describe('recents queries', () => {
  it('returns distinct classification values most-recent-first', async () => {
    const { service } = await makeServiceWithEntries([
      { work_task: 'Cathodic protection survey', access_method: 'Two-rope access', structure_type: 'Jetty' },
      { work_task: 'Inspection (visual)', access_method: 'Two-rope access', structure_type: 'Jetty' },
      { work_task: 'Cathodic protection survey', access_method: 'Two-rope access', structure_type: 'Pontoon' },
    ]);
    const tasks = await service.listRecentClassificationValues('work_task');
    // Distinct, recency-ordered (later inserts first). Raw values include presets;
    // suppression happens in the helper layer (Task 1), not here.
    expect(tasks).toContain('Cathodic protection survey');
    expect(tasks).toContain('Inspection (visual)');
    expect(tasks.filter((t) => t === 'Cathodic protection survey')).toHaveLength(1);
    const structures = await service.listRecentClassificationValues('structure_type');
    expect(structures[0]).toBe('Pontoon'); // most recent insert
  });

  it('collects distinct hazard strings across entries', async () => {
    const { service } = await makeServiceWithEntries([
      { hazards: ['Falling objects', 'Tidal cutoff'] },
      { hazards: ['Tidal cutoff', 'Public access'] },
    ]);
    const hazards = await service.listRecentHazardValues();
    expect(new Set(hazards)).toEqual(new Set(['Falling objects', 'Tidal cutoff', 'Public access']));
  });
});
```

> Implementer note: if the suite has no shared `makeServiceWithEntries` helper, write a small local one in this file that creates a client via `createTestClient()`, builds the service, and calls `createDraft(...)` once per fixture (filling required fields with constants and overriding the ones the test sets). Insert order = recency since `created_at` advances per insert. Do NOT add a helper to the production service for test convenience.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=logbook-service`
Expected: FAIL — `service.listRecentClassificationValues is not a function`.

- [ ] **Step 3: Write the implementation**

In `src/domain/logbook/logbook-service.ts`, add these two methods to the object returned by `createLogbookService` (place them right after `listAmendmentsOf`, ~line 393). Add `parseHazards` to the existing import from `./types` if not already imported.

```ts
    // Distinct prior values of a classification column, most-recent-first.
    // Raw (unsuppressed) — the UI layer applies the preset/denylist filter via
    // `filterRecentValues`. The column name comes from a fixed allow-list, never
    // user input, so the interpolation is safe (SQLite can't bind identifiers).
    async listRecentClassificationValues(
      field: 'work_task' | 'access_method' | 'structure_type',
    ): Promise<string[]> {
      const allowed = { work_task: 'work_task', access_method: 'access_method', structure_type: 'structure_type' } as const;
      const column = allowed[field];
      if (!column) throw new Error('invalid_classification_field');
      const rows = await db.getAll<{ value: string }>(
        `SELECT ${column} AS value, MAX(created_at) AS last_used
         FROM entries
         WHERE ${column} IS NOT NULL AND TRIM(${column}) <> ''
         GROUP BY ${column}
         ORDER BY last_used DESC
         LIMIT 50`,
      );
      return rows.map((r) => r.value);
    },

    // Distinct hazard strings across all entries, most-recent-first. Hazards are
    // stored as canonical JSON, so we parse and flatten in JS.
    async listRecentHazardValues(): Promise<string[]> {
      const rows = await db.getAll<{ hazards: string | null }>(
        `SELECT hazards FROM entries
         WHERE hazards IS NOT NULL AND TRIM(hazards) <> ''
         ORDER BY created_at DESC
         LIMIT 200`,
      );
      const seen = new Set<string>();
      const out: string[] = [];
      for (const row of rows) {
        for (const hazard of parseHazards(row.hazards)) {
          const key = hazard.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            out.push(hazard);
          }
        }
      }
      return out;
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=logbook-service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/logbook/logbook-service.ts __tests__/domain/logbook-service.test.ts
git commit -m "Add device-local recents queries for classification + hazards"
```

---

## Task 3: Recents hooks

**Files:**
- Modify: `src/domain/logbook/use-logbook.ts`

- [ ] **Step 1: Add the hooks**

Add to `src/domain/logbook/use-logbook.ts` (import the helpers + type at top). These return already-filtered values so screens pass them straight to the primitives.

```ts
import {
  ClassificationField,
  filterRecentValues,
  filterRecentHazards,
} from './classification';

const RECENTS_CAP = 8;

export function useRecentClassificationValues(field: ClassificationField) {
  return useQuery<string[]>({
    queryKey: ['recentClassification', field],
    queryFn: async () => {
      const raw = await createLogbookService(getClient()).listRecentClassificationValues(field);
      return filterRecentValues(field, raw, RECENTS_CAP);
    },
  });
}

export function useRecentHazardValues() {
  return useQuery<string[]>({
    queryKey: ['recentHazards'],
    queryFn: async () => {
      const raw = await createLogbookService(getClient()).listRecentHazardValues();
      return filterRecentHazards(raw, RECENTS_CAP);
    },
  });
}
```

- [ ] **Step 2: Verify types**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/domain/logbook/use-logbook.ts
git commit -m "Add recents query hooks for classification chips"
```

---

## Task 4: `ClassificationPickerSheet` primitive

The shared browse+custom sheet, hosted in `InfoSheet`. Handles both single-select (closes on pick) and multi-select (stays open, toggles).

**Files:**
- Create: `src/ui/primitives/v2/classification-picker-sheet.tsx`

- [ ] **Step 1: Implement the component**

```tsx
// src/ui/primitives/v2/classification-picker-sheet.tsx
import React from 'react';
import { Pressable, Text, TextInput, View, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { InfoSheet } from './info-sheet';
import { CUSTOM_VALUE_MAX_LENGTH } from '@/src/domain/logbook/classification';

export interface ClassificationPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  presets: readonly string[];
  recents: readonly string[];
  selected: readonly string[]; // current selection (1 item for single, N for multi)
  multi?: boolean;
  customMaxLength?: number;
  // Single: pick a value (sheet closes). Multi: toggle a value (sheet stays open).
  onPick: (value: string) => void;
}

export function ClassificationPickerSheet({
  visible,
  onClose,
  title,
  presets,
  recents,
  selected,
  multi = false,
  customMaxLength = CUSTOM_VALUE_MAX_LENGTH,
  onPick,
}: ClassificationPickerSheetProps) {
  const { tokens } = useTheme();
  const [query, setQuery] = React.useState('');
  const selectedSet = React.useMemo(
    () => new Set(selected.map((s) => s.trim().toLowerCase())),
    [selected],
  );

  React.useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const q = query.trim();
  const qLower = q.toLowerCase();
  const matchingPresets = q ? presets.filter((p) => p.toLowerCase().includes(qLower)) : presets;
  const matchingRecents = q ? recents.filter((r) => r.toLowerCase().includes(qLower)) : recents;
  const exactExists =
    presets.some((p) => p.toLowerCase() === qLower) || recents.some((r) => r.toLowerCase() === qLower);
  const canCommitCustom = q.length > 0 && !exactExists;

  function handlePick(value: string) {
    onPick(value);
    if (!multi) onClose();
  }

  const groupLabel: TextStyle = {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: tokens.textFaint,
    marginTop: 8,
    marginBottom: 4,
  };
  const rowStyle = (active: boolean): ViewStyle => ({
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: active ? tokens.accentSoft : tokens.surface2 ?? tokens.surface,
    borderWidth: 1,
    borderColor: active ? tokens.accent : tokens.lineSoft,
    marginBottom: 6,
  });
  const rowLabel = (active: boolean): TextStyle => ({
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    color: active ? tokens.text : tokens.text,
  });
  const inputStyle: TextStyle = {
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    color: tokens.text,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.lineSoft,
    backgroundColor: tokens.surface,
  };

  return (
    <InfoSheet visible={visible} onClose={onClose} title={title} kicker="SELECT OR TYPE YOUR OWN">
      <TextInput
        value={query}
        onChangeText={(t) => setQuery(t.slice(0, customMaxLength))}
        placeholder="Search or type a custom value…"
        placeholderTextColor={tokens.textFaint}
        maxLength={customMaxLength}
        autoCapitalize="sentences"
        style={inputStyle}
        accessibilityLabel={`${title} search or custom entry`}
      />

      {canCommitCustom ? (
        <Pressable onPress={() => handlePick(q)} style={rowStyle(false)} accessibilityRole="button">
          <Text style={rowLabel(false)}>{`Use “${q}”`}</Text>
        </Pressable>
      ) : null}

      {matchingRecents.length > 0 ? (
        <>
          <Text style={groupLabel}>Recent</Text>
          {matchingRecents.map((value) => {
            const active = selectedSet.has(value.toLowerCase());
            return (
              <Pressable
                key={`recent:${value}`}
                onPress={() => handlePick(value)}
                style={rowStyle(active)}
                accessibilityRole={multi ? 'checkbox' : 'button'}
                accessibilityState={multi ? { checked: active } : { selected: active }}
              >
                <Text style={rowLabel(active)}>{value}</Text>
              </Pressable>
            );
          })}
        </>
      ) : null}

      <Text style={groupLabel}>Presets</Text>
      {matchingPresets.map((value) => {
        const active = selectedSet.has(value.toLowerCase());
        return (
          <Pressable
            key={`preset:${value}`}
            onPress={() => handlePick(value)}
            style={rowStyle(active)}
            accessibilityRole={multi ? 'checkbox' : 'button'}
            accessibilityState={multi ? { checked: active } : { selected: active }}
          >
            <Text style={rowLabel(active)}>{value}</Text>
          </Pressable>
        );
      })}
    </InfoSheet>
  );
}
```

> Implementer note: confirm `tokens.surface2` and `tokens.accentSoft` exist on `ThemeTokens` (grep `src/ui/theme/themes.ts`). If `surface2` is absent, use `tokens.surface`; the `?? tokens.surface` fallback above already guards it. Do not hardcode hex.

- [ ] **Step 2: Verify types**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/ui/primitives/v2/classification-picker-sheet.tsx
git commit -m "Add ClassificationPickerSheet (browse + custom entry)"
```

---

## Task 5: `ClassificationChips` + `MultiClassificationChips`

**Files:**
- Create: `src/ui/primitives/v2/classification-chips.tsx`

- [ ] **Step 1: Implement the components**

```tsx
// src/ui/primitives/v2/classification-chips.tsx
import React from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { ClassificationPickerSheet } from './classification-picker-sheet';

const DEFAULT_INLINE_COUNT = 8;

function chipStyles(tokens: ReturnType<typeof useTheme>['tokens'], active: boolean) {
  const item: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: active ? tokens.accent : tokens.surface,
    borderWidth: 1,
    borderColor: active ? tokens.accent : tokens.lineSoft,
  };
  const label: TextStyle = {
    fontFamily: 'Manrope_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
    color: active ? tokens.accentInk : tokens.text,
  };
  return { item, label };
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { tokens } = useTheme();
  const s = chipStyles(tokens, active);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [s.item, pressed ? { transform: [{ scale: 0.97 }] } : null]}
    >
      <Text selectable={false} style={s.label}>{label}</Text>
    </Pressable>
  );
}

const containerStyle: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: 6 };

export interface ClassificationChipsProps {
  value: string;
  onChange: (value: string) => void;
  presets: readonly string[];
  recents?: readonly string[];
  label: string; // sheet title + a11y
  inlineCount?: number;
  customMaxLength?: number;
}

export function ClassificationChips({
  value,
  onChange,
  presets,
  recents = [],
  label,
  inlineCount = DEFAULT_INLINE_COUNT,
  customMaxLength,
}: ClassificationChipsProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const inlinePresets = presets.slice(0, inlineCount);
  const trimmed = value.trim();
  const valueInInline =
    trimmed.length > 0 && inlinePresets.some((p) => p.toLowerCase() === trimmed.toLowerCase());
  // Inject the selected value as a leading chip when it isn't already shown inline
  // (covers both custom values and presets chosen from the "More" sheet).
  const injected = trimmed.length > 0 && !valueInInline ? [trimmed] : [];

  return (
    <View style={containerStyle}>
      {injected.map((v) => (
        <Chip key={`sel:${v}`} label={v} active onPress={() => onChange(v)} />
      ))}
      {inlinePresets.map((p) => (
        <Chip
          key={`p:${p}`}
          label={p}
          active={p.toLowerCase() === trimmed.toLowerCase()}
          onPress={() => onChange(p)}
        />
      ))}
      <Chip label="＋ More" active={false} onPress={() => setSheetOpen(true)} />
      <ClassificationPickerSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={label}
        presets={presets}
        recents={recents}
        selected={trimmed ? [trimmed] : []}
        customMaxLength={customMaxLength}
        onPick={(v) => onChange(v)}
      />
    </View>
  );
}

export interface MultiClassificationChipsProps {
  values: readonly string[];
  onChange: (values: string[]) => void;
  presets: readonly string[];
  recents?: readonly string[];
  label: string;
  inlineCount?: number;
  customMaxLength?: number;
}

export function MultiClassificationChips({
  values,
  onChange,
  presets,
  recents = [],
  label,
  inlineCount = DEFAULT_INLINE_COUNT,
  customMaxLength,
}: MultiClassificationChipsProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const selectedLower = new Set(values.map((v) => v.trim().toLowerCase()));
  const inlinePresets = presets.slice(0, inlineCount);
  // Selected custom values (not in the inline presets) render as leading active chips.
  const injected = values
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && !inlinePresets.some((p) => p.toLowerCase() === v.toLowerCase()));

  function toggle(value: string) {
    const v = value.trim();
    if (v.length === 0) return;
    const key = v.toLowerCase();
    const next = values.filter((x) => x.trim().toLowerCase() !== key);
    if (next.length === values.length) next.push(v); // wasn't present → add
    onChange(next);
  }

  return (
    <View style={containerStyle}>
      {injected.map((v) => (
        <Chip key={`sel:${v}`} label={v} active onPress={() => toggle(v)} />
      ))}
      {inlinePresets.map((p) => (
        <Chip key={`p:${p}`} label={p} active={selectedLower.has(p.toLowerCase())} onPress={() => toggle(p)} />
      ))}
      <Chip label="＋ More" active={false} onPress={() => setSheetOpen(true)} />
      <ClassificationPickerSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={label}
        presets={presets}
        recents={recents}
        selected={values}
        multi
        customMaxLength={customMaxLength}
        onPick={(v) => toggle(v)}
      />
    </View>
  );
}
```

- [ ] **Step 2: Verify types**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/ui/primitives/v2/classification-chips.tsx
git commit -m "Add ClassificationChips + MultiClassificationChips composites"
```

---

## Task 6: Wire `app/entry/new.tsx`

**Files:**
- Modify: `app/entry/new.tsx`

- [ ] **Step 1: Replace the hardcoded preset arrays with imports**

Delete the local `WORK_TASK_PRESETS`, `ACCESS_METHOD_PRESETS`, `STRUCTURE_PRESETS` consts (lines ~63–65) and import from the domain module. (Leave `ENTRY_KIND_OPTIONS` and `HAZARD_PRESETS` usage as-is for now; hazards switches to the multi composite below.)

```tsx
import {
  WORK_TASK_PRESETS,
  ACCESS_METHOD_PRESETS,
  STRUCTURE_PRESETS,
  HAZARD_PRESETS,
} from '@/src/domain/logbook/classification';
import {
  ClassificationChips,
  MultiClassificationChips,
} from '@/src/ui/primitives/v2/classification-chips';
import {
  useRecentClassificationValues,
  useRecentHazardValues,
} from '@/src/domain/logbook/use-logbook';
```

- [ ] **Step 2: Fetch recents in the component**

Near the other hooks at the top of the screen component:

```tsx
const recentWorkTask = useRecentClassificationValues('work_task');
const recentAccess = useRecentClassificationValues('access_method');
const recentStructure = useRecentClassificationValues('structure_type');
const recentHazards = useRecentHazardValues();
```

- [ ] **Step 3: Swap the three single-select rows**

Replace the WORK TASK block (the `<ChipSelect options={WORK_TASK_PRESETS.map(...)} ... />` around line 668):

```tsx
<SectionKicker>WORK TASK</SectionKicker>
<ClassificationChips
  label="Work task"
  value={draft.workTask}
  onChange={(v) => setDraft((d) => ({ ...d, workTask: v }))}
  presets={WORK_TASK_PRESETS}
  recents={recentWorkTask.data ?? []}
/>
```

Apply the same swap to STRUCTURE (`presets={STRUCTURE_PRESETS}`, `value={draft.structureType}`, `onChange` sets `structureType`) and ACCESS METHOD (`presets={ACCESS_METHOD_PRESETS}`, `value={draft.accessMethod}`, `onChange` sets `accessMethod`). Match the exact `draft` field names already used in this file's `setDraft` calls.

- [ ] **Step 4: Swap the hazards multi-select**

Replace the `<MultiChipSelect options={[...HAZARD_PRESETS]} ... />` (around line 774):

```tsx
<MultiClassificationChips
  label="Hazards"
  values={draft.hazards}
  onChange={(next) => setDraft((d) => ({ ...d, hazards: next }))}
  presets={HAZARD_PRESETS}
  recents={recentHazards.data ?? []}
/>
```

Match the exact hazards state field name + setter shape already in this file.

- [ ] **Step 5: Confirm the Review step shows custom values verbatim**

Locate the Step 3 (Review) summary (~line 930) that renders `draft.workTask` / task. Verify the work task, access, structure, and hazards render the raw stored strings (they should already — they're plain text). If any uses a preset-label lookup, change it to render the raw value. This is the show-before-sign integrity control.

- [ ] **Step 6: Verify + manually smoke test**

Run: `npm run typecheck` → exit 0.
Run: `npm run web -- --host localhost --port 8091`, open New Entry, confirm: top-8 work tasks show inline; "＋ More" opens the sheet; typing "Cathodic protection survey" shows a `Use "…"` row; picking it injects it as a selected chip and it appears in Review.

- [ ] **Step 7: Commit**

```bash
git add app/entry/new.tsx
git commit -m "Wire new-entry screen to classification chips + custom entry"
```

---

## Task 7: Wire `app/entry/[id]/edit.tsx`

**Files:**
- Modify: `app/entry/[id]/edit.tsx`

- [ ] **Step 1: Apply the same swap as Task 6**

Add the same imports (Task 6 Step 1), the same four recents hooks (Task 6 Step 2), and replace this screen's `ChipSelect` rows for work task / structure / access and its hazards `MultiChipSelect` with `ClassificationChips` / `MultiClassificationChips`, using this screen's local state field names. The component usage is identical to Task 6 Steps 3–4:

```tsx
<ClassificationChips
  label="Work task"
  value={/* this screen's work-task state */}
  onChange={/* this screen's work-task setter */}
  presets={WORK_TASK_PRESETS}
  recents={recentWorkTask.data ?? []}
/>
```

(Repeat for access/structure/hazards exactly as in Task 6.)

- [ ] **Step 2: Verify**

Run: `npm run typecheck` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/entry/[id]/edit.tsx
git commit -m "Wire edit-draft screen to classification chips"
```

---

## Task 8: Wire `app/entry/[id]/amend.tsx`

**Files:**
- Modify: `app/entry/[id]/amend.tsx`

- [ ] **Step 1: Apply the same swap as Task 6/7**

Same imports + recents hooks + `ClassificationChips` / `MultiClassificationChips` substitutions, using this screen's state field names. Usage identical to Task 6.

- [ ] **Step 2: Verify**

Run: `npm run typecheck` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/entry/[id]/amend.tsx
git commit -m "Wire amend screen to classification chips"
```

---

## Task 9: Final verification

- [ ] **Step 1: Full typecheck + test**

Run: `npm run typecheck` → exit 0.
Run: `npm test` → all suites pass (existing + classification + logbook-service recents).

- [ ] **Step 2: Grep for stray old preset definitions**

Run: `grep -rn "Rescue standby\|WORK_TASK_PRESETS = \[" app src` → expect no remaining local `WORK_TASK_PRESETS = [` definitions (all import from `classification.ts`) and no `Rescue standby` literal in app code.

- [ ] **Step 3: Commit any cleanup**

```bash
git add -A
git commit -m "Classification chips: final cleanup + verification"
```

---

## Self-Review (completed against the spec)

- **A1 (no hash change; drop 3 presets):** Task 1 omits the three presets + denylists them; Task 9 step 2 greps to confirm. No `canonicalizeEntry` touched. ✓
- **A2 (single vocabulary source):** Task 1 creates `classification.ts`; Tasks 6–8 import from it. ✓
- **A3 (recents + denylist back-door):** Tasks 2–3 implement recents; Task 1's `filterRecentValues` + `isSuppressedRecent` enforce the denylist, with an explicit test asserting `Training` never returns. ✓
- **A4 (composite UI, inline cap 8, More + Other ≤64):** Tasks 4–5; `inlineCount` default 8; `CUSTOM_VALUE_MAX_LENGTH` 64; custom value injected as a chip. ✓
- **A5 (show-before-sign):** Task 6 step 5 verifies the Review step renders raw values. ✓
- **Hazards multi-custom UX:** `MultiClassificationChips` toggles, injects custom selected chips, sheet shows presets + recents. ✓
- **Placeholder scan:** no TBD/TODO; all code steps contain code. ✓
- **Type consistency:** `ClassificationField`, `filterRecentValues`, `listRecentClassificationValues`, `useRecentClassificationValues` names match across tasks. ✓
