import React from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import {
  certLevelToDigit,
  formatIrataNumber,
  irataNumberDigits,
  normalizeSpratNumber,
} from '@/src/domain/cert-number';
import type { CertLevel, CertScheme } from '@/src/domain/profile/types';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { Card, ChipSelect, DateField, Field, Pill } from '@/src/ui/primitives/v2';
import { IconClose } from '@/src/ui/icons';

// Shared cert-entry form used by both first-run setup and post-onboarding edit,
// so the two stay in lockstep (number formatting, validation, the year-first
// expiry picker). Profile cert fields are never part of an entry signature.

export interface CertEntry {
  level: CertLevel;
  number: string;
  expiresOn: string;
}

export const emptyEntry = (): CertEntry => ({ level: 'II', number: '', expiresOn: '' });

export const LEVEL_OPTIONS: Array<{ value: CertLevel; label: string }> = [
  { value: 'I', label: 'Level I' },
  { value: 'II', label: 'Level II' },
  { value: 'III', label: 'Level III' },
];

export const SCHEME_OPTIONS: Array<{ value: CertScheme; label: string }> = [
  { value: 'sprat', label: 'SPRAT' },
  { value: 'irata', label: 'IRATA' },
];

export function isIrataNumberValid(value: string) {
  const digits = irataNumberDigits(value);
  return digits.length === 5 || digits.length === 0;
}

export function hasEntryDetails(entry: CertEntry) {
  return entry.number.trim().length > 0 || entry.expiresOn.trim().length > 0;
}

interface CertCardProps {
  scheme: CertScheme;
  entry: CertEntry;
  onChange: (next: CertEntry) => void;
  badge: string | null;
  onRemove?: () => void;
}

export function CertCard({ scheme, entry, onChange, badge, onRemove }: CertCardProps) {
  const { tokens } = useTheme();
  const numberInputValue =
    scheme === 'irata' ? irataNumberDigits(entry.number) : normalizeSpratNumber(entry.number);
  const numberValid =
    scheme === 'sprat' || numberInputValue.length === 0 || numberInputValue.length === 5;

  function setLevel(level: CertLevel) {
    onChange({
      ...entry,
      level,
      number: scheme === 'irata' ? formatIrataNumber(level, entry.number) : entry.number,
    });
  }

  function setNumber(value: string) {
    onChange({
      ...entry,
      number:
        scheme === 'irata' ? formatIrataNumber(entry.level, value) : normalizeSpratNumber(value),
    });
  }

  function setExpiry(value: string) {
    onChange({ ...entry, expiresOn: value });
  }

  const headerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  };

  return (
    <Card padding={16}>
      <View style={headerStyle}>
        <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>{scheme.toUpperCase()}</Text>
        {badge ? <Pill tone={badge === 'PRIMARY' ? 'accent' : 'chip'}>{badge}</Pill> : null}
        <View style={{ flex: 1 }} />
        {onRemove ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${scheme.toUpperCase()} cert`}
            onPress={onRemove}
            hitSlop={10}
            style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.7 : 1 })}
          >
            <IconClose size={19} color={tokens.textDim} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        <View>
          <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>LEVEL</Text>
          <ChipSelect<CertLevel> value={entry.level} options={LEVEL_OPTIONS} onChange={setLevel} />
        </View>
        <Field
          label={
            scheme === 'irata' ? `IRATA number (${certLevelToDigit(entry.level)}/12345)` : 'SPRAT number'
          }
          value={numberInputValue}
          onChangeText={setNumber}
          placeholder={scheme === 'irata' ? '12345' : 'Optional'}
          keyboardType="number-pad"
          maxLength={scheme === 'irata' ? 5 : 12}
          helper={
            scheme === 'irata' && !numberValid
              ? '5 digits required.'
              : scheme === 'irata'
                ? `Saved as ${certLevelToDigit(entry.level)}/12345.`
                : 'Optional for SPRAT.'
          }
          autoCapitalize="none"
        />
        <DateField
          label="Expires on"
          value={entry.expiresOn || null}
          onChange={(iso) => setExpiry(iso ?? '')}
          placeholder="Optional"
          clearable
          initialView="year"
        />
      </View>
    </Card>
  );
}
