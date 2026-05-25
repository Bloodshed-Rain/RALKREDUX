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
    presets.some((p) => p.toLowerCase() === qLower) ||
    recents.some((r) => r.toLowerCase() === qLower);
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
    backgroundColor: active ? tokens.accentSoft : (tokens.surface2 ?? tokens.surface),
    borderWidth: 1,
    borderColor: active ? tokens.accent : tokens.lineSoft,
    marginBottom: 6,
  });

  const rowLabel = (_active: boolean): TextStyle => ({
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    color: tokens.text,
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
          <Text style={rowLabel(false)}>{`Use "${q}"`}</Text>
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
