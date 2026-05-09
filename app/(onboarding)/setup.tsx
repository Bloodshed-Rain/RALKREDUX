import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  UserRound,
} from 'lucide-react-native';
import { useCreateProfile } from '@/src/domain/profile/use-profile';
import type { CertLevel, CertScheme } from '@/src/domain/profile/types';
import { Button, Card, DateField, Field, Screen } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

const schemes: CertScheme[] = ['sprat', 'irata'];
const levels: CertLevel[] = ['I', 'II', 'III'];

export default function SetupScreen() {
  const { colors, radii, spacing, typography } = useTheme();
  const createProfile = useCreateProfile();
  const [fullName, setFullName] = React.useState('');
  const [scheme, setScheme] = React.useState<CertScheme>('sprat');
  const [level, setLevel] = React.useState<CertLevel>('II');
  const [certId, setCertId] = React.useState('');
  const [expiresOn, setExpiresOn] = React.useState('');
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  const canContinue = fullName.trim().length > 1;
  const hasCertDetails = certId.trim().length > 0 || expiresOn.trim().length > 0;

  function submit() {
    if (!canContinue) return;
    createProfile.mutate(
      {
        full_name: fullName,
        primary_scheme: scheme,
        sprat_id: scheme === 'sprat' ? certId || null : null,
        sprat_level: scheme === 'sprat' ? level : null,
        sprat_expires_on: scheme === 'sprat' ? expiresOn || null : null,
        irata_id: scheme === 'irata' ? certId || null : null,
        irata_level: scheme === 'irata' ? level : null,
        irata_expires_on: scheme === 'irata' ? expiresOn || null : null,
      },
      { onSuccess: () => router.replace('/dashboard') },
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Set up' }} />
      <Screen
        safeTop
        footer={
          <Button
            title={canContinue ? 'Create logbook' : 'Add name'}
            icon={ShieldCheck}
            onPress={submit}
            disabled={!canContinue}
            loading={createProfile.isPending}
          />
        }
      >
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            <Text selectable style={{ ...typography.title1, color: colors.textPrimary }}>
              Set up
            </Text>
            <Text selectable style={{ ...typography.bodyMed, color: colors.textSecondary }}>
              {fullName.trim() || 'Your logbook'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Pill icon={BadgeCheck} label={`${scheme.toUpperCase()} ${level}`} tone="accent" />
            <Pill icon={CalendarDays} label={expiresOn.trim() || 'Expiry later'} />
          </View>
        </View>

        <Card>
          <SectionHeader icon={UserRound} title="Identity" />
          <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Alex Morgan" />
        </Card>

        <Card>
          <View style={{ gap: spacing.sm }}>
            <SectionHeader icon={BadgeCheck} title="Certification" />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {schemes.map((item) => {
                const selected = item === scheme;
                return (
                  <ChoiceChip
                    key={item}
                    label={item.toUpperCase()}
                    selected={selected}
                    onPress={() => setScheme(item)}
                    flex
                  />
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {levels.map((item) => (
              <ChoiceChip
                key={item}
                label={`Level ${item}`}
                selected={item === level}
                onPress={() => setLevel(item)}
                flex
              />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setDetailsOpen((current) => !current)}
            style={({ pressed }) => ({
              minHeight: 48,
              borderRadius: radii.sm,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: hasCertDetails ? colors.statusOkTint : colors.bgSurface,
              opacity: pressed ? 0.82 : 1,
              paddingHorizontal: spacing.md,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: spacing.sm,
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
              {hasCertDetails ? (
                <CheckCircle2 size={18} color={colors.statusOk} strokeWidth={2.2} />
              ) : (
                <CalendarDays size={18} color={colors.textSecondary} strokeWidth={2.2} />
              )}
              <Text selectable={false} style={{ ...typography.label, color: colors.textPrimary }}>
                {hasCertDetails ? 'Cert details added' : 'Cert details'}
              </Text>
            </View>
            {detailsOpen ? (
              <ChevronUp size={18} color={colors.textSecondary} strokeWidth={2.2} />
            ) : (
              <ChevronDown size={18} color={colors.textSecondary} strokeWidth={2.2} />
            )}
          </Pressable>

          {detailsOpen ? (
            <View style={{ gap: spacing.md }}>
              <Field
                label="Certification number"
                value={certId}
                onChangeText={setCertId}
                placeholder="Optional"
                autoCapitalize="characters"
              />
              <DateField
                label="Expires on"
                value={expiresOn}
                onChange={setExpiresOn}
                placeholder="Expiry later"
                optional
              />
            </View>
          ) : null}
        </Card>
      </Screen>
    </>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: typeof UserRound; title: string }) {
  const { colors, radii, spacing, typography } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: radii.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bgMuted,
        }}
      >
        <Icon size={18} color={colors.textSecondary} strokeWidth={2.2} />
      </View>
      <Text selectable={false} style={{ ...typography.title3, color: colors.textPrimary }}>
        {title}
      </Text>
    </View>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
  flex = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  flex?: boolean;
}) {
  const { colors, radii, spacing, typography } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        flex: flex ? 1 : undefined,
        minWidth: flex ? undefined : 88,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: selected ? colors.accentPrimary : colors.border,
        backgroundColor: selected ? colors.accentTint : colors.bgSurface,
        opacity: pressed ? 0.82 : 1,
        paddingHorizontal: spacing.md,
      })}
    >
      <Text
        selectable={false}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          ...typography.label,
          color: selected ? colors.accentPrimary : colors.textSecondary,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Pill({
  icon: Icon,
  label,
  tone = 'default',
}: {
  icon: typeof BadgeCheck;
  label: string;
  tone?: 'default' | 'accent';
}) {
  const { colors, radii, spacing, typography } = useTheme();
  const isAccent = tone === 'accent';

  return (
    <View
      style={{
        minHeight: 32,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: isAccent ? colors.accentPrimary : colors.border,
        backgroundColor: isAccent ? colors.accentTint : colors.bgSurface,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
      }}
    >
      <Icon size={14} color={isAccent ? colors.accentPrimary : colors.textSecondary} strokeWidth={2.2} />
      <Text
        selectable={false}
        numberOfLines={1}
        style={{
          ...typography.caption,
          color: isAccent ? colors.accentPrimary : colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
