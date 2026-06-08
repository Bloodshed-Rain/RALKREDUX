// src/ui/primitives/v2/classification-chips.tsx
import React from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type ThemeTokens } from '@/src/ui/theme/themes';
import { ClassificationPickerSheet } from './classification-picker-sheet';

const DEFAULT_INLINE_COUNT = 8;

function chipStyles(tokens: ThemeTokens, active: boolean) {
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
      hitSlop={7}
      style={({ pressed }) => [s.item, pressed ? { transform: [{ scale: 0.97 }] } : null]}
    >
      <Text selectable={false} style={s.label}>{label}</Text>
    </Pressable>
  );
}

const containerStyle: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: 6 };

// Wraps a chip group in a danger-bordered box when the group is a required
// field left empty — the border-only "invalid" treatment that matches Field /
// DateField. No message line: the screen's "Still needed: …" summary carries
// the non-visual (screen-reader) signal, so the box is purely the visual cue.
function InvalidWrap({ invalid, children }: { invalid?: boolean; children: React.ReactNode }) {
  const { tokens } = useTheme();
  if (!invalid) return <>{children}</>;
  return (
    <View
      style={{
        borderWidth: 1.5,
        borderColor: tokens.danger,
        borderRadius: 12,
        padding: 8,
      }}
    >
      {children}
    </View>
  );
}

export interface ClassificationChipsProps {
  value: string;
  onChange: (value: string) => void;
  presets: readonly string[];
  recents?: readonly string[];
  label: string; // sheet title + a11y
  inlineCount?: number;
  customMaxLength?: number;
  // Highlight the group as an empty required field (danger outline, no message).
  invalid?: boolean;
}

export function ClassificationChips({
  value,
  onChange,
  presets,
  recents = [],
  label,
  inlineCount = DEFAULT_INLINE_COUNT,
  customMaxLength,
  invalid,
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
    <InvalidWrap invalid={invalid}>
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
    </InvalidWrap>
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
  // Highlight the group as an empty required field (danger outline, no message).
  invalid?: boolean;
}

export function MultiClassificationChips({
  values,
  onChange,
  presets,
  recents = [],
  label,
  inlineCount = DEFAULT_INLINE_COUNT,
  customMaxLength,
  invalid,
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
    <InvalidWrap invalid={invalid}>
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
    </InvalidWrap>
  );
}
