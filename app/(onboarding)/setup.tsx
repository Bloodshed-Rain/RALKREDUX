import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  certLevelToDigit,
  formatIrataNumber,
  irataNumberDigits,
  normalizeSpratNumber,
} from '@/src/domain/cert-number';
import { useCreateProfile } from '@/src/domain/profile/use-profile';
import type { CertLevel, CertScheme } from '@/src/domain/profile/types';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  Card,
  ChipSelect,
  Field,
  Pill,
  SectionH,
  TopBar,
} from '@/src/ui/primitives/v2';
import { IconCheck, IconClose, IconLock, IconPlus } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

interface CertEntry {
  level: CertLevel;
  number: string;
  expiresOn: string;
}

const emptyEntry = (): CertEntry => ({ level: 'II', number: '', expiresOn: '' });

const LEVEL_OPTIONS: Array<{ value: CertLevel; label: string }> = [
  { value: 'I', label: 'Level I' },
  { value: 'II', label: 'Level II' },
  { value: 'III', label: 'Level III' },
];

const SCHEME_OPTIONS: Array<{ value: CertScheme; label: string }> = [
  { value: 'sprat', label: 'SPRAT' },
  { value: 'irata', label: 'IRATA' },
];

function isIrataNumberValid(value: string) {
  const digits = irataNumberDigits(value);
  return digits.length === 5 || digits.length === 0;
}

function hasEntryDetails(entry: CertEntry) {
  return entry.number.trim().length > 0 || entry.expiresOn.trim().length > 0;
}

export default function SetupScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const createProfile = useCreateProfile();

  const [fullName, setFullName] = React.useState('');
  const [primaryScheme, setPrimaryScheme] = React.useState<CertScheme>('sprat');
  const [secondaryEnabled, setSecondaryEnabled] = React.useState(false);
  const [sprat, setSprat] = React.useState<CertEntry>(emptyEntry);
  const [irata, setIrata] = React.useState<CertEntry>(emptyEntry);

  const secondaryScheme: CertScheme = primaryScheme === 'sprat' ? 'irata' : 'sprat';
  const setEntry = primaryScheme === 'sprat' ? setSprat : setIrata;
  const setSecondaryEntry = secondaryScheme === 'sprat' ? setSprat : setIrata;
  const primaryEntry = primaryScheme === 'sprat' ? sprat : irata;
  const secondaryEntry = secondaryScheme === 'sprat' ? sprat : irata;

  const nameValid = fullName.trim().length > 1;
  const primaryNumberValid = primaryScheme === 'sprat' || isIrataNumberValid(primaryEntry.number);
  const secondaryNumberValid =
    !secondaryEnabled || secondaryScheme === 'sprat' || isIrataNumberValid(secondaryEntry.number);
  const canSubmit = nameValid && primaryNumberValid && secondaryNumberValid;

  function enableSecondary() {
    haptics.selection();
    setSecondaryEnabled(true);
  }

  function removeSecondary() {
    haptics.selection();
    setSecondaryEnabled(false);
    setSecondaryEntry(emptyEntry());
  }

  function submit() {
    if (!canSubmit) return;
    const includesSprat = primaryScheme === 'sprat' || secondaryEnabled;
    const includesIrata = primaryScheme === 'irata' || secondaryEnabled;
    const spratNumber = includesSprat ? normalizeSpratNumber(sprat.number) : '';
    const irataNumber = includesIrata ? formatIrataNumber(irata.level, irata.number) : '';

    createProfile.mutate(
      {
        full_name: fullName,
        primary_scheme: primaryScheme,
        sprat_id: includesSprat ? spratNumber || null : null,
        sprat_level: includesSprat ? sprat.level : null,
        sprat_expires_on: includesSprat ? sprat.expiresOn || null : null,
        irata_id: includesIrata ? irataNumber || null : null,
        irata_level: includesIrata ? irata.level : null,
        irata_expires_on: includesIrata ? irata.expiresOn || null : null,
      },
      {
        onSuccess: () => {
          haptics.success();
          router.replace('/today');
        },
        onError: () => haptics.error(),
      },
    );
  }

  const screenStyle: ViewStyle = { flex: 1, backgroundColor: tokens.bg };
  const heroKickerStyle: TextStyle = { ...type.monoKicker, color: tokens.textFaint };
  const heroTitleStyle: TextStyle = {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 26,
    letterSpacing: -0.7,
    lineHeight: 30,
    color: tokens.text,
    marginTop: 4,
  };
  const heroSubStyle: TextStyle = { ...type.cardSub, color: tokens.textDim, marginTop: 4 };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={screenStyle}
    >
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <TopBar title="Set up" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Card padding={18}>
            <Text style={heroKickerStyle}>FIRST RUN · ENTRY-HASH V2</Text>
            <Text style={heroTitleStyle} numberOfLines={2}>
              {fullName.trim() || 'Set up your logbook'}
            </Text>
            <Text style={heroSubStyle}>
              Offline-first ledger · hash-chained signatures · your record.
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              <Pill tone={nameValid ? 'ok' : 'warn'} icon={nameValid ? IconCheck : undefined}>
                {nameValid ? 'Identity OK' : 'Name needed'}
              </Pill>
              <Pill tone="chip">
                {secondaryEnabled
                  ? `${primaryScheme.toUpperCase()} + ${secondaryScheme.toUpperCase()}`
                  : primaryScheme.toUpperCase()}
              </Pill>
              {hasEntryDetails(primaryEntry) ||
              (secondaryEnabled && hasEntryDetails(secondaryEntry)) ? (
                <Pill tone="accent">Cert details added</Pill>
              ) : null}
            </View>
          </Card>
        </View>

        <SectionH kicker="01 IDENTITY" title="Who's logging?" />
        <View style={{ paddingHorizontal: 20 }}>
          <Field
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Alex Morgan"
            autoCapitalize="words"
            helper="As it should appear on signed entries and exports."
          />
        </View>

        <SectionH kicker="02 CERTIFICATION" title="Your scheme" />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <View>
            <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>
              {secondaryEnabled ? 'PRIMARY SCHEME' : 'SCHEME'}
            </Text>
            <ChipSelect<CertScheme>
              value={primaryScheme}
              options={SCHEME_OPTIONS}
              onChange={setPrimaryScheme}
            />
            {secondaryEnabled ? (
              <Text style={{ ...type.cardSub, color: tokens.textDim, marginTop: 6 }}>
                Primary appears first in headers and exports.
              </Text>
            ) : null}
          </View>

          <CertCard
            scheme={primaryScheme}
            entry={primaryEntry}
            onChange={(next) => setEntry(next)}
            badge={secondaryEnabled ? 'PRIMARY' : null}
          />

          {!secondaryEnabled ? (
            <Button variant="outline" full icon={IconPlus} onPress={enableSecondary}>
              {`Add ${secondaryScheme.toUpperCase()} cert`}
            </Button>
          ) : (
            <CertCard
              scheme={secondaryScheme}
              entry={secondaryEntry}
              onChange={(next) => setSecondaryEntry(next)}
              badge="SECONDARY"
              onRemove={removeSecondary}
            />
          )}
        </View>

        <SectionH kicker="03 WHAT THIS BUILDS" title="On your device" />
        <View style={{ paddingHorizontal: 20 }}>
          <Card padding={16}>
            <Bullet text="Local-first SQLite ledger, fully offline." />
            <Bullet text="Audit-grade signed entries with hash chain." />
            <Bullet text="Local + remote signing flows for supervisors." />
            <Bullet text="Gear inventory and inspection schedule." />
          </Card>
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: tokens.bg,
          borderTopWidth: 1,
          borderTopColor: tokens.lineSoft,
        }}
      >
        <Button
          variant="primary"
          size="lg"
          full
          icon={IconLock}
          onPress={submit}
          disabled={!canSubmit || createProfile.isPending}
        >
          {createProfile.isPending
            ? 'Creating logbook…'
            : nameValid
              ? 'Create logbook'
              : 'Add your name'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

interface CertCardProps {
  scheme: CertScheme;
  entry: CertEntry;
  onChange: (next: CertEntry) => void;
  badge: string | null;
  onRemove?: () => void;
}

function CertCard({ scheme, entry, onChange, badge, onRemove }: CertCardProps) {
  const { tokens } = useTheme();
  const numberInputValue =
    scheme === 'irata' ? irataNumberDigits(entry.number) : normalizeSpratNumber(entry.number);
  const numberValid =
    scheme === 'sprat' || numberInputValue.length === 0 || numberInputValue.length === 5;

  function setLevel(level: CertLevel) {
    onChange({
      ...entry,
      level,
      number:
        scheme === 'irata' ? formatIrataNumber(level, entry.number) : entry.number,
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
        <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>
          {scheme.toUpperCase()}
        </Text>
        {badge ? <Pill tone={badge === 'PRIMARY' ? 'accent' : 'chip'}>{badge}</Pill> : null}
        <View style={{ flex: 1 }} />
        {onRemove ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove secondary scheme"
            onPress={onRemove}
            hitSlop={10}
            style={({ pressed }) => ({
              padding: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <IconClose size={16} color={tokens.textDim} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        <View>
          <Text style={{ ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 }}>
            LEVEL
          </Text>
          <ChipSelect<CertLevel>
            value={entry.level}
            options={LEVEL_OPTIONS}
            onChange={setLevel}
          />
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
        <Field
          label="Expires on"
          value={entry.expiresOn}
          onChangeText={setExpiry}
          placeholder="YYYY-MM-DD (optional)"
          autoCapitalize="none"
        />
      </View>
    </Card>
  );
}

function Bullet({ text }: { text: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginVertical: 4 }}>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: tokens.accent,
          marginTop: 8,
        }}
      />
      <Text style={{ ...type.body, color: tokens.text, flex: 1 }}>{text}</Text>
    </View>
  );
}
