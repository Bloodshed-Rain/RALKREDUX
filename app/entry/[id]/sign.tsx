import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MapPin,
  PenLine,
  UserRound,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import {
  certLevelToDigit,
  formatIrataNumber,
  irataLevelFromNumber,
  irataNumberDigits,
  normalizeSpratNumber,
} from '@/src/domain/cert-number';
import { getEntryVerificationReadiness } from '@/src/domain/logbook/entry-readiness';
import { useEntryDetail, useSignEntryLocal, useSupervisorContacts } from '@/src/domain/logbook/use-logbook';
import type { CertLevel } from '@/src/domain/profile/types';
import { Button, Card, CheckboxRow, Field, Screen, SignaturePad } from '@/src/ui/primitives';
import { useTheme } from '@/src/ui/theme/theme-provider';

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

const ATTESTATION_TEXT = 'I verify this entry matches the work performed and I am authorized to sign it.';

export default function LocalSignScreen() {
  const { colors, radii, spacing, typography, touchTarget } = useTheme();
  const { id, supervisorId } = useLocalSearchParams<{
    id?: string | string[];
    supervisorId?: string | string[];
  }>();
  const entryId = firstParam(id);
  const supervisorIdParam = firstParam(supervisorId);
  const detail = useEntryDetail(entryId);
  const signEntry = useSignEntryLocal();
  const supervisors = useSupervisorContacts();
  const [supervisorName, setSupervisorName] = React.useState('');
  const [supervisorCertNumber, setSupervisorCertNumber] = React.useState('');
  const [supervisorIrataLevel, setSupervisorIrataLevel] = React.useState<CertLevel>('II');
  const [signaturePath, setSignaturePath] = React.useState('');
  const [signatureActive, setSignatureActive] = React.useState(false);
  const [attestationAccepted, setAttestationAccepted] = React.useState(false);
  const didPrefillSupervisor = React.useRef(false);

  const entry = detail.data?.entry;
  const readiness = entry ? getEntryVerificationReadiness(entry) : null;
  const requiresCertNumber = Boolean(entry?.irata_level_snapshot);

  React.useEffect(() => {
    if (didPrefillSupervisor.current || !supervisorIdParam || !entry) return;
    const supervisor = supervisors.data?.find((item) => item.id === supervisorIdParam);
    if (!supervisor) return;

    didPrefillSupervisor.current = true;
    setSupervisorName(supervisor.name);
    setSupervisorIrataLevel(irataLevelFromNumber(supervisor.cert_number, supervisorIrataLevel));
    setSupervisorCertNumber(
      requiresCertNumber
        ? irataNumberDigits(supervisor.cert_number ?? '')
        : normalizeSpratNumber(supervisor.cert_number ?? ''),
    );
  }, [entry, requiresCertNumber, supervisorIdParam, supervisorIrataLevel, supervisors.data]);

  const selectedKnownSupervisor = supervisors.data?.find(
    (supervisor) =>
      supervisor.name === supervisorName &&
      (requiresCertNumber
        ? irataNumberDigits(supervisor.cert_number ?? '') === irataNumberDigits(supervisorCertNumber)
        : normalizeSpratNumber(supervisor.cert_number ?? '') === normalizeSpratNumber(supervisorCertNumber)),
  );
  const canSign =
    Boolean(entryId) &&
    entry?.status === 'draft' &&
    readiness?.ready === true &&
    supervisorName.trim().length > 1 &&
    (!requiresCertNumber || irataNumberDigits(supervisorCertNumber).length === 5) &&
    signaturePath.trim().length > 0 &&
    attestationAccepted;
  const missingToSign = [
    ...(readiness?.missingFields ?? []),
    supervisorName.trim().length > 1 ? null : 'supervisor name',
    !requiresCertNumber || irataNumberDigits(supervisorCertNumber).length === 5 ? null : '5-digit IRATA verifier number',
    signaturePath.trim() ? null : 'drawn signature',
    attestationAccepted ? null : 'authorization checkbox',
    entry?.status && entry.status !== 'draft' ? 'draft entry' : null,
  ].filter(Boolean) as string[];

  function submit() {
    if (!canSign || !entryId) return;
    signEntry.mutate(
      {
        entry_id: entryId,
        supervisor_name: supervisorName,
        supervisor_cert_number: requiresCertNumber
          ? formatIrataNumber(supervisorIrataLevel, supervisorCertNumber)
          : normalizeSpratNumber(supervisorCertNumber),
        signature_path: signaturePath,
        attestation_accepted: attestationAccepted,
        signer_attestation: ATTESTATION_TEXT,
      },
      { onSuccess: (signed) => router.replace(`/entry/${signed.entry.id}`) },
    );
  }

  return (
    <Screen
      preserveChildTouches
      scrollEnabled={!signatureActive}
      footer={
        <View style={{ gap: spacing.sm }}>
          {!canSign ? <RequirementList title="Before signing" items={missingToSign} /> : null}
          <Button
            title={canSign ? 'Sign entry' : 'Finish sign-off'}
            icon={PenLine}
            onPress={submit}
            disabled={!canSign}
            loading={signEntry.isPending}
          />
        </View>
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
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={{ ...typography.label, color: colors.statusWarn }}>
                Finish the entry first
              </Text>
              <Text selectable style={{ ...typography.caption, color: colors.statusWarn }}>
                Add {readiness.missingFields.join(', ')}
              </Text>
            </View>
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
                    setSupervisorIrataLevel(irataLevelFromNumber(supervisor.cert_number, supervisorIrataLevel));
                    setSupervisorCertNumber(requiresCertNumber
                      ? irataNumberDigits(supervisor.cert_number ?? '')
                      : normalizeSpratNumber(supervisor.cert_number ?? ''));
                  }}
                  style={({ pressed }) => ({
                    minHeight: touchTarget.min,
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
          label="SPRAT / IRATA number"
          value={requiresCertNumber ? irataNumberDigits(supervisorCertNumber) : normalizeSpratNumber(supervisorCertNumber)}
          onChangeText={(value) => {
            setSupervisorCertNumber(requiresCertNumber ? formatIrataNumber(supervisorIrataLevel, value) : normalizeSpratNumber(value));
          }}
          placeholder={requiresCertNumber ? '12345' : 'Optional'}
          keyboardType="number-pad"
          maxLength={requiresCertNumber ? 5 : 12}
          hint={requiresCertNumber
            ? `Required for IRATA entries. Saved as ${certLevelToDigit(supervisorIrataLevel)}/12345.`
            : 'Optional for SPRAT entries. Add it when the supervisor has a SPRAT or IRATA card/member number.'}
        />
        {requiresCertNumber ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {(['I', 'II', 'III'] as const).map((level) => (
              <LevelChip
                key={level}
                label={certLevelToDigit(level)}
                selected={level === supervisorIrataLevel}
                onPress={() => {
                  setSupervisorIrataLevel(level);
                  setSupervisorCertNumber(formatIrataNumber(level, supervisorCertNumber));
                }}
              />
            ))}
          </View>
        ) : null}
      </Card>

      <View style={{ gap: spacing.md }}>
        <SectionHeader
          icon={PenLine}
          title="Signature & attestation"
          pill={signaturePath && attestationAccepted ? 'Ready' : undefined}
          tone={signaturePath && attestationAccepted ? 'ok' : 'default'}
        />
        <SignaturePad
          label="Draw signature"
          value={signaturePath}
          onChange={setSignaturePath}
          height={240}
          onStrokeStart={() => setSignatureActive(true)}
          onStrokeEnd={() => setSignatureActive(false)}
        />
        <CheckboxRow
          checked={attestationAccepted}
          label={ATTESTATION_TEXT}
          onChange={setAttestationAccepted}
        />
      </View>

      {entry?.status && entry.status !== 'draft' ? (
        <Text selectable style={{ ...typography.body, color: colors.textSecondary }}>
          Signed and amended records are locked.
        </Text>
      ) : null}
    </Screen>
  );
}

function LevelChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors, radii, spacing, typography } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        flex: 1,
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
      <Text selectable={false} style={{ ...typography.label, color: selected ? colors.accentPrimary : colors.textSecondary }}>
        Level {label}
      </Text>
    </Pressable>
  );
}

function RequirementList({ title, items }: { title: string; items: string[] }) {
  const { colors, radii, spacing, typography } = useTheme();
  if (!items.length) return null;

  return (
    <View
      style={{
        borderRadius: radii.sm,
        backgroundColor: colors.statusWarnTint,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      <Text selectable={false} style={{ ...typography.label, color: colors.statusWarn }}>
        {title}
      </Text>
      {items.map((item) => (
        <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <AlertTriangle size={14} color={colors.statusWarn} strokeWidth={2.2} />
          <Text selectable={false} style={{ ...typography.caption, color: colors.statusWarn, flex: 1 }}>
            Needs {item}
          </Text>
        </View>
      ))}
    </View>
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
