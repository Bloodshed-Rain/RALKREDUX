import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatIrataNumber, normalizeSpratNumber } from '@/src/domain/cert-number';
import {
  CertCard,
  emptyEntry,
  hasEntryDetails,
  isIrataNumberValid,
  SCHEME_OPTIONS,
  type CertEntry,
} from '@/src/ui/profile/cert-form';
import { useCreateProfile } from '@/src/domain/profile/use-profile';
import type { CertScheme } from '@/src/domain/profile/types';
import { ENTRY_HASH_VERSION } from '@/src/domain/logbook/entry-hash';
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
import { IconCheck, IconLock, IconPlus } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

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
        onError: (err) => {
          haptics.error();
          Alert.alert(
            'Could not create your logbook',
            (err instanceof Error ? err.message : 'Something went wrong setting up your profile.') +
              '\n\nYour details are still on this screen — please try again.',
          );
        },
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
            <Text style={heroKickerStyle}>{`FIRST RUN · ENTRY-HASH V${ENTRY_HASH_VERSION}`}</Text>
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
