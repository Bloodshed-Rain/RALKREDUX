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
import { formatIsoForDisplay } from '@/src/domain/date-utils';
import {
  useDeclareHoursBaseline,
  useProfile,
  useVoidHoursBaseline,
} from '@/src/domain/profile/use-profile';
import type { Profile } from '@/src/domain/profile/types';
import { useTheme } from '@/src/ui/theme/theme-provider';
import { type } from '@/src/ui/theme/type';
import { Button, Card, DateField, Field, IconBtn, Pill, SectionH, TopBar } from '@/src/ui/primitives/v2';
import { IconArrowLeft, IconCheck, IconLock } from '@/src/ui/icons';
import { haptics } from '@/src/ui/haptics';

function heldScheme(scheme: 'sprat' | 'irata', p: Profile): boolean {
  return scheme === 'sprat'
    ? p.sprat_level != null || p.primary_scheme === 'sprat'
    : p.irata_level != null || p.primary_scheme === 'irata';
}

function sanitizeHours(value: string): string {
  // Digits + a single decimal point.
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  return parts.length <= 1 ? cleaned : `${parts[0]}.${parts.slice(1).join('')}`;
}

export default function HoursBaselineScreen() {
  const { tokens } = useTheme();
  const profile = useProfile();

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        title="Starting hours"
        leading={<IconBtn icon={IconArrowLeft} label="Back" size="md" onPress={() => router.back()} />}
      />
      {profile.data ? <BaselineBody profile={profile.data} /> : null}
    </View>
  );
}

function BaselineBody({ profile }: { profile: Profile }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const declare = useDeclareHoursBaseline();
  const voidBaseline = useVoidHoursBaseline();

  const declared = Boolean(profile.hours_baseline_declared_at);
  const showSprat = heldScheme('sprat', profile);
  const showIrata = heldScheme('irata', profile);

  const [spratHours, setSpratHours] = React.useState('');
  const [irataHours, setIrataHours] = React.useState('');
  const [transitionDate, setTransitionDate] = React.useState<string | null>(null);

  const spratNum = spratHours ? Number(spratHours) : 0;
  const irataNum = irataHours ? Number(irataHours) : 0;
  const anyHours = (showSprat && spratNum > 0) || (showIrata && irataNum > 0);
  const canDeclare = Boolean(transitionDate) && anyHours && !declare.isPending;

  function onDeclare() {
    if (!canDeclare || !transitionDate) return;
    declare.mutate(
      {
        sprat_hours_baseline: showSprat ? spratNum : null,
        irata_hours_baseline: showIrata ? irataNum : null,
        transition_date: transitionDate,
      },
      {
        onSuccess: () => {
          haptics.success();
          router.back();
        },
        onError: (err) => {
          haptics.error();
          Alert.alert(
            'Could not save baseline',
            err instanceof Error ? err.message : 'Something went wrong saving your starting hours.',
          );
        },
      },
    );
  }

  function onVoid() {
    Alert.alert(
      'Void starting hours?',
      'This clears the carried-forward balance so you can re-declare it. Your signed entries are unaffected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Void',
          style: 'destructive',
          onPress: () =>
            voidBaseline.mutate(undefined, {
              onSuccess: () => haptics.success(),
              onError: () => haptics.error(),
            }),
        },
      ],
    );
  }

  const introStyle: TextStyle = { ...type.cardSub, color: tokens.textDim, lineHeight: 20 };
  const labelStyle: TextStyle = { ...type.monoKicker, color: tokens.textFaint, marginBottom: 6 };
  const lockNoteStyle: TextStyle = { ...type.cardSub, color: tokens.textDim, marginTop: 8 };

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

  if (declared) {
    return (
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 + insets.bottom, gap: 12 }}>
        <Card padding={16}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Pill tone="accent" icon={IconLock}>Carried forward</Pill>
            <Text style={{ ...type.cardSub, color: tokens.textDim }}>self-declared</Text>
          </View>
          {showSprat ? (
            <BaselineRow label="SPRAT" value={`${(profile.sprat_hours_baseline ?? 0).toFixed(1)} h`} />
          ) : null}
          {showIrata ? (
            <BaselineRow label="IRATA" value={`${(profile.irata_hours_baseline ?? 0).toFixed(1)} h`} />
          ) : null}
          <BaselineRow
            label="Transition"
            value={formatIsoForDisplay(profile.hours_baseline_date) ?? '—'}
          />
          <Text style={lockNoteStyle}>
            Starting hours are locked once declared. Void to re-declare — your signed entries and
            their totals are never affected.
          </Text>
        </Card>
        <Button
          variant="outline"
          size="lg"
          full
          onPress={onVoid}
          disabled={voidBaseline.isPending}
        >
          {voidBaseline.isPending ? 'Voiding…' : 'Void & re-declare'}
        </Button>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <Text style={introStyle}>
            Carry over the hours from your paper logbook so this app continues your total instead of
            restarting at zero. This is a one-time, self-declared baseline — it&apos;s shown
            separately from in-app signed hours and never alters a signature.
          </Text>
        </View>

        <SectionH kicker="01 HOURS" title="Carried from paper" />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {showSprat ? (
            <Field
              label="SPRAT hours"
              value={spratHours}
              onChangeText={(v) => setSpratHours(sanitizeHours(v))}
              placeholder="e.g. 1200"
              keyboardType="decimal-pad"
              helper="Total rope-access hours in your paper SPRAT logbook."
            />
          ) : null}
          {showIrata ? (
            <Field
              label="IRATA hours"
              value={irataHours}
              onChangeText={(v) => setIrataHours(sanitizeHours(v))}
              placeholder="e.g. 800"
              keyboardType="decimal-pad"
              helper="Total rope-access hours in your paper IRATA logbook."
            />
          ) : null}
        </View>

        <SectionH kicker="02 TRANSITION" title="Paper → digital date" />
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={labelStyle}>WHEN YOU SWITCHED</Text>
          <DateField
            value={transitionDate}
            onChange={setTransitionDate}
            placeholder="Select date"
            title="Transition date"
            maxDate={null}
          />
        </View>
      </ScrollView>

      <View style={footerStyle}>
        <Button
          variant="primary"
          size="lg"
          full
          icon={IconCheck}
          onPress={onDeclare}
          disabled={!canDeclare}
        >
          {declare.isPending ? 'Saving…' : 'Declare starting hours'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

function BaselineRow({ label, value }: { label: string; value: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
      <Text style={{ ...type.monoKicker, color: tokens.textFaint }}>{label}</Text>
      <Text style={{ ...type.body, color: tokens.text, fontFamily: 'Manrope_700Bold', fontWeight: '700' }}>
        {value}
      </Text>
    </View>
  );
}
