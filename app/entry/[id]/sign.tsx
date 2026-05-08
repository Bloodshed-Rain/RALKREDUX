import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  MapPin,
  PenLine,
  ShieldCheck,
  UserRound,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { getEntryVerificationReadiness } from '@/src/domain/logbook/entry-readiness';
import { useEntryDetail, useSignEntryLocal, useSupervisorContacts } from '@/src/domain/logbook/use-logbook';
import { Button, Card, CheckboxRow, Field, Screen, SignaturePad } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

const ATTESTATION_TEXT = 'I verify this entry matches the work performed and I am authorized to sign it.';

export default function LocalSignScreen() {
  const { colors, radii, spacing, typography } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = firstParam(id);
  const detail = useEntryDetail(entryId);
  const signEntry = useSignEntryLocal();
  const supervisors = useSupervisorContacts();
  const [supervisorName, setSupervisorName] = React.useState('');
  const [supervisorCertNumber, setSupervisorCertNumber] = React.useState('');
  const [signaturePath, setSignaturePath] = React.useState('');
  const [attestationAccepted, setAttestationAccepted] = React.useState(false);

  const entry = detail.data?.entry;
  const readiness = entry ? getEntryVerificationReadiness(entry) : null;
  const selectedKnownSupervisor = supervisors.data?.find(
    (supervisor) =>
      supervisor.name === supervisorName &&
      (supervisor.cert_number ?? '') === supervisorCertNumber,
  );
  const canSign =
    Boolean(entryId) &&
    entry?.status === 'draft' &&
    readiness?.ready === true &&
    supervisorName.trim().length > 1 &&
    supervisorCertNumber.trim().length > 1 &&
    signaturePath.trim().length > 0 &&
    attestationAccepted;

  function submit() {
    if (!canSign || !entryId) return;
    signEntry.mutate(
      {
        entry_id: entryId,
        supervisor_name: supervisorName,
        supervisor_cert_number: supervisorCertNumber,
        signature_path: signaturePath,
        attestation_accepted: attestationAccepted,
        signer_attestation: ATTESTATION_TEXT,
      },
      { onSuccess: (signed) => router.replace(`/entry/${signed.entry.id}`) },
    );
  }

  return (
    <Screen
      footer={
        <Button
          title={canSign ? 'Sign entry' : 'Finish sign-off'}
          icon={PenLine}
          onPress={submit}
          disabled={!canSign}
          loading={signEntry.isPending}
        />
      }
    >
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Pill icon={MapPin} label={entry?.site || 'Loading'} />
          <Pill icon={Clock3} label={entry ? `${entry.work_hours.toFixed(1)} h` : '-'} />
          <Pill
            icon={readiness?.ready ? CheckCircle2 : AlertTriangle}
            label={readiness?.ready ? 'Ready' : `${readiness?.missingFields.length ?? 0} missing`}
            tone={readiness?.ready ? 'ok' : 'warn'}
          />
        </View>
        {entry?.status === 'draft' && readiness && !readiness.ready ? (
          <View
            style={{
              borderRadius: radii.sm,
              backgroundColor: colors.statusWarnTint,
              padding: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <AlertTriangle size={18} color={colors.statusWarn} strokeWidth={2.2} />
            <Text selectable style={{ ...typography.caption, color: colors.statusWarn, flex: 1 }}>
              {readiness.missingFields.join(', ')}
            </Text>
          </View>
        ) : null}
      </Card>

      <Card>
        <SectionHeader
          icon={UserRound}
          title="Supervisor"
          pill={selectedKnownSupervisor ? 'Known' : undefined}
        />
        {supervisors.data?.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {supervisors.data.map((supervisor) => {
              const selected = supervisor.id === selectedKnownSupervisor?.id;

              return (
                <Pressable
                  key={supervisor.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setSupervisorName(supervisor.name);
                    setSupervisorCertNumber(supervisor.cert_number ?? '');
                  }}
                  style={({ pressed }) => ({
                    minHeight: 40,
                    justifyContent: 'center',
                    borderRadius: radii.sm,
                    borderWidth: 1,
                    borderColor: selected ? colors.accentPrimary : colors.border,
                    backgroundColor: selected ? colors.accentTint : colors.bgSurface,
                    opacity: pressed ? 0.82 : 1,
                    paddingHorizontal: spacing.sm,
                  })}
                >
                  <Text
                    selectable={false}
                    style={{
                      ...typography.caption,
                      color: selected ? colors.accentPrimary : colors.textSecondary,
                    }}
                  >
                    {supervisor.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <Field label="Supervisor name" value={supervisorName} onChangeText={setSupervisorName} placeholder="Jordan Lee" />
        <Field
          label="Certification number"
          value={supervisorCertNumber}
          onChangeText={setSupervisorCertNumber}
          placeholder="SPRAT / IRATA number"
        />
      </Card>

      <Card>
        <SectionHeader
          icon={PenLine}
          title="Signature"
          pill={signaturePath ? 'Captured' : undefined}
          tone={signaturePath ? 'ok' : 'default'}
        />
        <SignaturePad label="Draw signature" value={signaturePath} onChange={setSignaturePath} height={220} />
      </Card>

      <Card>
        <SectionHeader
          icon={ShieldCheck}
          title="Attestation"
          pill={attestationAccepted ? 'Accepted' : undefined}
          tone={attestationAccepted ? 'ok' : 'default'}
        />
        <CheckboxRow
          checked={attestationAccepted}
          label={ATTESTATION_TEXT}
          onChange={setAttestationAccepted}
        />
      </Card>

      {entry?.status && entry.status !== 'draft' ? (
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          Signed and amended records are locked.
        </Text>
      ) : null}
    </Screen>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  pill,
  tone = 'default',
}: {
  icon: LucideIcon;
  title: string;
  pill?: string;
  tone?: 'default' | 'ok';
}) {
  const { colors, radii, spacing, typography } = useTheme();
  const pillColor = tone === 'ok' ? colors.statusOk : colors.textSecondary;
  const pillBg = tone === 'ok' ? colors.statusOkTint : colors.bgMuted;

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
      <Text selectable={false} style={{ ...typography.title3, color: colors.textPrimary, flex: 1 }}>
        {title}
      </Text>
      {pill ? (
        <View
          style={{
            borderRadius: radii.pill,
            backgroundColor: pillBg,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
          }}
        >
          <Text selectable={false} style={{ ...typography.caption, color: pillColor }}>
            {pill}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Pill({
  icon: Icon,
  label,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  tone?: 'default' | 'ok' | 'warn';
}) {
  const { colors, radii, spacing, typography } = useTheme();
  const color = tone === 'ok' ? colors.statusOk : tone === 'warn' ? colors.statusWarn : colors.textSecondary;
  const bg = tone === 'ok' ? colors.statusOkTint : tone === 'warn' ? colors.statusWarnTint : colors.bgMuted;

  return (
    <View
      style={{
        minHeight: 32,
        borderRadius: radii.pill,
        backgroundColor: bg,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
      }}
    >
      <Icon size={14} color={color} strokeWidth={2.2} />
      <Text selectable={false} numberOfLines={1} style={{ ...typography.caption, color }}>
        {label}
      </Text>
    </View>
  );
}
