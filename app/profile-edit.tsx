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
  isIrataNumberValid,
  SCHEME_OPTIONS,
  type CertEntry,
} from '@/src/ui/profile/cert-form';
import { useProfile, useUpdateProfile } from '@/src/domain/profile/use-profile';
import type { CertScheme, Profile } from '@/src/domain/profile/types';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import {
  Button,
  Card,
  ChipSelect,
  Field,
  IconBtn,
  SectionH,
  TopBar,
} from '@/src/ui/primitives/v2';
import { IconArrowLeft, IconCheck, IconPlus } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

// Seed a CertEntry from the persisted profile columns for one scheme. The
// CertCard re-derives the displayed digits, so the raw stored id is fine here.
function entryFor(scheme: CertScheme, p: Profile): CertEntry {
  if (scheme === 'sprat') {
    return {
      level: p.sprat_level ?? 'II',
      number: p.sprat_id ?? '',
      expiresOn: p.sprat_expires_on ?? '',
    };
  }
  return {
    level: p.irata_level ?? 'II',
    number: p.irata_id ?? '',
    expiresOn: p.irata_expires_on ?? '',
  };
}

function heldScheme(scheme: CertScheme, p: Profile): boolean {
  return scheme === 'sprat'
    ? p.sprat_level != null || p.sprat_id != null
    : p.irata_level != null || p.irata_id != null;
}

export default function ProfileEditScreen() {
  const { tokens } = useTheme();
  const profile = useProfile();

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title="Edit profile"
        leading={<IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.back()} />}
      />
      {profile.data ? <EditForm profile={profile.data} /> : null}
    </View>
  );
}

// Inner form is mounted only once the profile has loaded so its state can be
// seeded directly from the persisted row (no post-load prefill dance).
function EditForm({ profile }: { profile: Profile }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const updateProfile = useUpdateProfile();

  const [fullName, setFullName] = React.useState(profile.full_name);
  const [primaryScheme, setPrimaryScheme] = React.useState<CertScheme>(profile.primary_scheme);
  const [secondaryEnabled, setSecondaryEnabled] = React.useState(
    heldScheme('sprat', profile) && heldScheme('irata', profile),
  );
  const [sprat, setSprat] = React.useState<CertEntry>(() => entryFor('sprat', profile));
  const [irata, setIrata] = React.useState<CertEntry>(() => entryFor('irata', profile));

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

  function save() {
    if (!canSubmit) return;
    const includesSprat = primaryScheme === 'sprat' || secondaryEnabled;
    const includesIrata = primaryScheme === 'irata' || secondaryEnabled;
    const spratNumber = includesSprat ? normalizeSpratNumber(sprat.number) : '';
    const irataNumber = includesIrata ? formatIrataNumber(irata.level, irata.number) : '';

    updateProfile.mutate(
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
          router.back();
        },
        onError: (err) => {
          haptics.error();
          Alert.alert(
            'Could not save changes',
            (err instanceof Error ? err.message : 'Something went wrong updating your profile.') +
              '\n\nYour edits are still on this screen — please try again.',
          );
        },
      },
    );
  }

  const labelStyle: TextStyle = { ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 };
  const noteStyle: TextStyle = { ...type.cardSub, color: tokens.textDim, marginTop: 6 };

  const footerStyle: ViewStyle = {
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
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <SectionH kicker="01 IDENTITY" title="Your name" />
        <View style={{ paddingHorizontal: 20 }}>
          <Field
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Alex Morgan"
            autoCapitalize="words"
            helper="As it appears on signed entries and exports. Editing it does not change past signatures."
          />
        </View>

        <SectionH kicker="02 CERTIFICATION" title="Your scheme" />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <View>
            <Text style={labelStyle}>{secondaryEnabled ? 'PRIMARY SCHEME' : 'SCHEME'}</Text>
            <ChipSelect<CertScheme>
              value={primaryScheme}
              options={SCHEME_OPTIONS}
              onChange={setPrimaryScheme}
            />
            {secondaryEnabled ? (
              <Text style={noteStyle}>Primary appears first in headers and exports.</Text>
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
      </ScrollView>

      <View style={footerStyle}>
        <Button
          variant="primary"
          size="lg"
          full
          icon={IconCheck}
          onPress={save}
          disabled={!canSubmit || updateProfile.isPending}
        >
          {updateProfile.isPending ? 'Saving…' : nameValid ? 'Save changes' : 'Add your name'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
