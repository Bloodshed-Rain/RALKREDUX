import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useCreateProfile } from '@/src/domain/profile/use-profile';
import { CertScheme } from '@/src/domain/profile/types';
import { Button, Card, Field, Screen } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

export default function SetupScreen() {
  const { colors, radii, spacing, typography } = useTheme();
  const createProfile = useCreateProfile();
  const [fullName, setFullName] = React.useState('');
  const [scheme, setScheme] = React.useState<CertScheme>('sprat');
  const [certId, setCertId] = React.useState('');
  const [expiresOn, setExpiresOn] = React.useState('');

  const canContinue = fullName.trim().length > 1;

  function submit() {
    if (!canContinue) return;
    createProfile.mutate(
      {
        full_name: fullName,
        primary_scheme: scheme,
        sprat_id: scheme === 'sprat' ? certId || null : null,
        sprat_level: scheme === 'sprat' ? 'II' : null,
        sprat_expires_on: scheme === 'sprat' ? expiresOn || null : null,
        irata_id: scheme === 'irata' ? certId || null : null,
        irata_level: scheme === 'irata' ? 'II' : null,
        irata_expires_on: scheme === 'irata' ? expiresOn || null : null,
      },
      { onSuccess: () => router.replace('/dashboard') },
    );
  }

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <Text selectable style={{ ...typography.title1, color: colors.textPrimary }}>
          Set up your logbook
        </Text>
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          Start local-first. Cloud backup, remote signing, and subscription ownership will layer onto this core.
        </Text>
      </View>

      <Card>
        <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Alex Morgan" />
        <View style={{ gap: spacing.sm }}>
          <Text selectable style={{ ...typography.label, color: colors.textPrimary }}>
            Primary certification
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {(['sprat', 'irata'] as const).map((item) => {
              const selected = item === scheme;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  onPress={() => setScheme(item)}
                  style={{
                    minHeight: 44,
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radii.sm,
                    borderWidth: 1,
                    borderColor: selected ? colors.accentPrimary : colors.border,
                    backgroundColor: selected ? colors.accentTint : colors.bgSurface,
                  }}
                >
                  <Text
                    selectable={false}
                    style={{
                      ...typography.label,
                      color: selected ? colors.accentPrimary : colors.textSecondary,
                      textTransform: 'uppercase',
                    }}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Field label="Certification number" value={certId} onChangeText={setCertId} placeholder="Optional for now" />
        <Field label="Expires on" value={expiresOn} onChangeText={setExpiresOn} placeholder="YYYY-MM-DD" />
      </Card>

      <Button
        title="Create logbook"
        onPress={submit}
        disabled={!canContinue}
        loading={createProfile.isPending}
      />
    </Screen>
  );
}

